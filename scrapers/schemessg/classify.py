"""Classify Schemes.sg records for CareCompass.

Pure functions only (no network, no file IO) so they are easy to test.
"""

import re
import unicodedata
from typing import Dict, List, Optional, Tuple
from urllib.parse import urlsplit

MONEY = "money"
SERVICE = "service_or_programme"
UNCLASSIFIED = "unclassified"

PAY_FOR_CATEGORIES = [
    "care_services",
    "monthly_payouts",
    "helper_costs",
    "caregiver_courses",
    "equipment_home",
    "transport",
    "medical_bills",
    "tax_cpf",
]

ISLANDWIDE_AREAS = {"", "no service boundaries", "singapore"}

# ---------------------------------------------------------------------------
# Normalisation
# ---------------------------------------------------------------------------


def clean_text(value: Optional[str]) -> str:
    """Normalise line endings and trim whitespace."""
    if not value:
        return ""
    return value.replace("\r\n", "\n").replace("\r", "\n").strip()


def normalise_link(link: Optional[str]) -> str:
    """Comparable form of an official link.

    Drops the scheme, "www.", the fragment (Schemes.sg links sometimes carry
    "#:~:text=" highlights) and any trailing slash; lowercases the host.
    """
    if not link:
        return ""
    parts = urlsplit(link.strip())
    host = parts.netloc.lower()
    if host.startswith("www."):
        host = host[4:]
    path = parts.path.rstrip("/")
    query = f"?{parts.query}" if parts.query else ""
    return f"{host}{path}{query}"


def normalise_name(name: Optional[str]) -> str:
    """Comparable form of a scheme name: lowercase words, no punctuation."""
    if not name:
        return ""
    text = unicodedata.normalize("NFKD", name).lower()
    text = re.sub(r"[’'`]", "", text)
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return text.strip()


def slugify(text: str, max_length: int = 60) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    if len(slug) > max_length:
        slug = slug[:max_length].rstrip("-")
    return slug


def link_slug(link: str) -> str:
    """Short readable slug from a link: the site's name plus the last path
    segment, e.g. https://www.aic.sg/financial-assistance/elderfund →
    "aic-elderfund"."""
    normalised = normalise_link(link)
    host, _, rest = normalised.partition("/")
    site = host.split(".")[0] if host else ""
    path, _, query = rest.partition("?")
    segments = [s for s in path.split("/") if s]
    last = re.sub(r"\.(html?|aspx?|php)$", "", segments[-1]) if segments else ""
    return slugify(" ".join(part for part in (site, last, query) if part))


def fix_split_items(items: Optional[List[str]]) -> List[str]:
    """Rejoin list items that were split inside parentheses.

    Schemes.sg splits on commas, so "Benefits and perks for PWDs (transport,
    discounts, facilities)" arrives as three items.
    """
    fixed: List[str] = []
    buffer: List[str] = []
    for raw in items or []:
        item = raw.strip()
        if not item:
            continue
        if buffer:
            buffer.append(item)
            if ")" in item:
                fixed.append(", ".join(buffer))
                buffer = []
            continue
        if item.count("(") > item.count(")"):
            buffer = [item]
        else:
            fixed.append(item)
    if buffer:
        fixed.append(", ".join(buffer))
    return fixed


def _lower_set(items: Optional[List[str]]) -> set:
    return {item.strip().lower() for item in items or []}


# ---------------------------------------------------------------------------
# Kind: money vs service_or_programme
# ---------------------------------------------------------------------------

_FINANCIAL_ITEM = re.compile(
    r"^(financial assistance|subsidies\b|transport subsidies$)", re.IGNORECASE
)
_MONEY_NAME = re.compile(
    r"\b(grant|fund|financial|subsid\w*|concession|assistance scheme|"
    r"assistance programme|relief|payout)\b",
    re.IGNORECASE,
)


def financial_items(record: dict) -> List[str]:
    return [
        item
        for item in fix_split_items(record.get("what_it_gives"))
        if _FINANCIAL_ITEM.search(item)
    ]


def classify_kind(record: dict) -> str:
    """"money" when financial help is the point of the scheme.

    A scheme is money when at least a third of what it gives is financial help
    ("Financial assistance…", "Subsidies…", "Transport subsidies"), or when its
    name says it is a grant/fund/subsidy and it lists any financial help.
    Service providers that list financial help as one item among many (a home
    care provider that also has a needy-patient fund) are service_or_programme.
    """
    gives = fix_split_items(record.get("what_it_gives"))
    money_items = financial_items(record)
    types = _lower_set(record.get("scheme_type"))
    if gives and len(money_items) / len(gives) >= 1 / 3:
        return MONEY
    has_financial_signal = bool(money_items) or "financial assistance" in types
    if has_financial_signal and _MONEY_NAME.search(record.get("scheme") or ""):
        return MONEY
    return SERVICE


# ---------------------------------------------------------------------------
# Relevance
# ---------------------------------------------------------------------------

_SENIOR_AUDIENCES = {
    "elderly",
    "low income elderly",
    "elderly with dementia",
    "elderly with disabilities",
    "elderly with mobility issues",
    "persons with dementia",
}
_YOUNG = {
    "children",
    "youth",
    "youth-at-risk",
    "young adults",
    "students",
    "student care support",
}
_FAMILY = {"families", "low income families", "single parents", "family"}


def classify_relevance(record: dict, kind: str) -> Tuple[bool, str]:
    """Return (keep, reason)."""
    who = _lower_set(record.get("who_is_it_for"))
    types = _lower_set(record.get("scheme_type"))
    audience = who | types

    has_senior = bool(who & _SENIOR_AUDIENCES) or "elderly" in types

    # Children's and youth programmes can list "Caregivers" (their parents),
    # so they are dropped unless they also serve seniors.
    if audience & _YOUNG and not has_senior:
        return False, "Aimed at children or youth"
    if not has_senior and who and who <= _FAMILY:
        return False, "Aimed at families only"

    if "caregiver support" in types:
        return True, "Scheme type includes Caregiver Support"
    if "caregivers" in who:
        return True, "For caregivers"
    if "elderly with dementia" in who:
        return True, "For elderly with dementia"
    if kind == MONEY and who & {"elderly", "low income elderly"}:
        return True, "Financial help for seniors"
    return False, "Not aimed at caregivers or seniors with a care need"


# ---------------------------------------------------------------------------
# payFor (money only)
# ---------------------------------------------------------------------------

# (category, field, pattern, weight). Name and agency are the strongest
# signals; what_it_gives items next; summary last.
_PAY_FOR_RULES: List[Tuple[str, str, str, int]] = [
    ("helper_costs", "gives", r"foreign domestic workers|domestic worker", 3),
    ("helper_costs", "name", r"\blevy\b|domestic worker|\bmdw\b|\bfdw\b", 4),
    ("caregiver_courses", "gives", r"financial assistance for training", 3),
    ("caregiver_courses", "name", r"training grant|caregiver training", 4),
    (
        "equipment_home",
        "gives",
        r"assistive technology and medical equipment|financial assistance for housing|"
        r"home retrofit|furnish",
        3,
    ),
    ("equipment_home", "name", r"mobility|enabling|active seniors|\bease\b", 4),
    ("transport", "gives", r"transport subsidies|medical transport", 3),
    ("transport", "name", r"transport", 4),
    (
        "medical_bills",
        "gives",
        r"financial assistance for (healthcare|chronic|dental)",
        2,
    ),
    (
        "medical_bills",
        "name",
        r"medical|\bchas\b|medifund|health assist|dialysis|generation package",
        4,
    ),
    ("tax_cpf", "agency", r"central provident fund|\bcpf\b|\biras\b", 4),
    ("tax_cpf", "name", r"\bcpf\b|medisave|retirement|tax relief", 4),
    ("tax_cpf", "gives", r"retirement", 2),
    (
        "monthly_payouts",
        "name",
        r"disability assistance|elderfund|careshield|eldershield|caregiving grant|"
        r"long term assistance|public assistance",
        4,
    ),
    ("monthly_payouts", "summary", r"\bmonthly\b.*\b(cash|payout|aid|grant)\b", 2),
    ("care_services", "gives", r"nursing home fees|subsidised care|day care", 3),
    ("care_services", "name", r"long.term care|\biltc\b|care services", 4),
]

# A category wins only with at least this score and a clear lead over the next.
_MIN_SCORE = 3
_MIN_LEAD = 2


def score_pay_for(record: dict) -> Dict[str, int]:
    fields = {
        "name": record.get("scheme") or "",
        "agency": record.get("agency") or "",
        "summary": record.get("summary") or "",
        "gives": fix_split_items(record.get("what_it_gives")),
    }
    scores: Dict[str, int] = {}
    for category, field, pattern, weight in _PAY_FOR_RULES:
        value = fields[field]
        texts = value if isinstance(value, list) else [value]
        if any(re.search(pattern, text, re.IGNORECASE) for text in texts):
            scores[category] = scores.get(category, 0) + weight
    return scores


def classify_pay_for(record: dict) -> str:
    scores = score_pay_for(record)
    if not scores:
        return UNCLASSIFIED
    ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
    best, best_score = ranked[0]
    runner_up = ranked[1][1] if len(ranked) > 1 else 0
    if best_score < _MIN_SCORE or best_score - runner_up < _MIN_LEAD:
        return UNCLASSIFIED
    return best


# ---------------------------------------------------------------------------
# Area
# ---------------------------------------------------------------------------


def _readable_area(text: str) -> str:
    text = text.replace("�", "'")
    parts = [part.strip() for part in re.split(r"\s*,\s*", text) if part.strip()]
    return ", ".join(parts)


def classify_area(record: dict) -> dict:
    """Where the scheme applies. planning_area is the agency's office and is
    ignored on purpose."""
    agency = record.get("agency") or ""
    cdc = re.search(r"([A-Za-z ]+?)\s+CDC\b", agency)
    if cdc:
        return {"kind": "district", "name": cdc.group(1).strip()}
    service_area = (record.get("service_area") or "").strip()
    if service_area.lower() in ISLANDWIDE_AREAS:
        return {"kind": "islandwide"}
    return {"kind": "district", "name": _readable_area(service_area)}
