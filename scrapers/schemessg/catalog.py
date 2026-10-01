"""Turn classified Schemes.sg records into CareCompass outputs.

Pure functions: overrides, stable ids, catalog/other outputs and the diff
between runs. No network or file IO.
"""

import re
from collections import Counter
from datetime import date
from typing import Dict, List, Optional, Tuple

import classify as c

PUBLISHED = "published"
OTHER = "other"
EXCLUDED = "excluded"
UNCLASSIFIED = "unclassified"
TIER1 = "tier1"

ID_PREFIX = "ssg-"
SCHEMESSG_SITE_URL = "https://schemes.sg/schemes/{scheme_id}"

# Fields compared between runs (sourceId is left out on purpose: IDs differ
# between dev and production, so a change there is not a content change).
DIFF_FIELDS = [
    "name",
    "agency",
    "summary",
    "description",
    "valueText",
    "eligibility",
    "whatItGives",
    "link",
    "kind",
    "status",
    "payFor",
    "area",
]


# Text we may override by hand for a Tier 2 scheme. Each override needs a
# "reason" and a "checked_on" date, and is flagged in the report when the
# Schemes.sg text it replaces changes.
CONTENT_FIELDS = ["summary", "description", "valueText"]

# what_it_gives values too generic to be worth showing under "What you get"
GENERIC_GIVES = {
    "financial assistance (general)",
    "information services",
    "referral services",
    "referral and information services",
}

# ---------------------------------------------------------------------------
# Overrides
# ---------------------------------------------------------------------------


def validate_overrides(overrides: dict) -> List[str]:
    """Problems with overrides.json; an empty list means it is valid."""
    problems = []
    for override in overrides.get("schemes", []):
        label = override.get("match", {}).get("name") or override.get("match", {}).get("link")
        if not label:
            problems.append("A scheme override has no match name or link")
            continue
        if override.get("action") not in (None, "include", "exclude"):
            problems.append(f"{label}: action must be include or exclude")
        if any(field in override for field in CONTENT_FIELDS):
            if not override.get("reason"):
                problems.append(f"{label}: text overrides need a reason")
            checked_on = override.get("checked_on")
            if not checked_on or not _is_iso_date(checked_on):
                problems.append(f"{label}: text overrides need checked_on as YYYY-MM-DD")
    return problems


def _is_iso_date(value: str) -> bool:
    try:
        date.fromisoformat(value)
        return True
    except (TypeError, ValueError):
        return False


def _matches(match: dict, record: dict, require_all: bool) -> bool:
    checks = []
    if match.get("link"):
        checks.append(c.normalise_link(match["link"]) == record["normLink"])
    if match.get("name"):
        checks.append(c.normalise_name(match["name"]) == record["normName"])
    if not checks:
        return False
    return all(checks) if require_all else any(checks)


def find_override(overrides: dict, record: dict) -> Optional[dict]:
    """Scheme overrides match when every given key (link, name) matches."""
    for override in overrides.get("schemes", []):
        if _matches(override.get("match", {}), record, require_all=True):
            return override
    return None


def extra_include_matches(entry: dict, record: dict) -> bool:
    """An extra include matches on name or link; a given agency must also
    match, to pick the right scheme when a name is generic."""
    if not _matches(entry, record, require_all=False):
        return False
    agency = c.normalise_name(entry.get("agency"))
    full_agency = record.get("agencyFull") or record.get("agency")
    return not agency or agency in c.normalise_name(full_agency)


def find_extra_include(overrides: dict, record: dict) -> Optional[dict]:
    for entry in overrides.get("extra_includes", []):
        if extra_include_matches(entry, record):
            return entry
    return None


def match_extra_includes(
    overrides: dict, listed: List[dict], known_ids: set
) -> Tuple[List[str], List[dict]]:
    """Find overrides.json extra_includes in the full (unfiltered) catalogue.

    Returns (scheme_ids to fetch, entries not found). Schemes already in the
    category are not fetched twice.
    """
    to_fetch: List[str] = []
    missing: List[dict] = []
    for entry in overrides.get("extra_includes", []):
        found = [
            item
            for item in listed
            if extra_include_matches(
                entry,
                {
                    "normLink": c.normalise_link(item.get("link")),
                    "normName": c.normalise_name(item.get("scheme")),
                    "agency": item.get("agency"),
                },
            )
        ]
        if not found:
            missing.append(entry)
        for item in found:
            if item["scheme_id"] not in known_ids and item["scheme_id"] not in to_fetch:
                to_fetch.append(item["scheme_id"])
    return to_fetch, missing


# ---------------------------------------------------------------------------
# Agency short names
# ---------------------------------------------------------------------------

_AGENCY_SPLIT = re.compile(r"\s*\|\s*|,\s*(?=[A-Z])")


def first_agency(agency: Optional[str]) -> str:
    """The first agency when several are listed, e.g. "Ministry of Health
    (MOH), Central Provident Fund (CPF)" → "Ministry of Health (MOH)"."""
    text = " ".join((agency or "").split())
    return _AGENCY_SPLIT.split(text)[0].strip() if text else ""


def short_agency(agency: Optional[str], short_names: Dict[str, str]) -> str:
    """Short label from overrides.json agency_short_names (matched after
    normalising case and punctuation), else the first agency's own text."""
    first = first_agency(agency)
    lookup = {c.normalise_name(full): short for full, short in short_names.items()}
    return lookup.get(c.normalise_name(first), first)


def normalise_agency_case(records: List[dict]) -> None:
    """Use one spelling for agency names that differ only in case
    ("TOUCH Community Services" / "Touch Community Services"): the one with
    the fewest capitals, then alphabetical, so the choice is stable."""
    variants: Dict[str, set] = {}
    for record in records:
        variants.setdefault(record["agency"].lower(), set()).add(record["agency"])
    preferred = {
        key: sorted(names, key=lambda n: (sum(ch.isupper() for ch in n), n))[0]
        for key, names in variants.items()
    }
    for record in records:
        record["agency"] = preferred[record["agency"].lower()]


def find_tier1_match(overrides: dict, record: dict) -> Optional[str]:
    """Tier 1 matches are keyed by link or name, never by Schemes.sg ID."""
    for match in overrides.get("tier1_matches", []):
        if _matches(match, record, require_all=False):
            return match["tier1_id"]
    return None


# ---------------------------------------------------------------------------
# Classification pipeline
# ---------------------------------------------------------------------------


def normalise_record(raw: dict) -> dict:
    """The fields we keep from a Schemes.sg detail record."""
    return {
        "sourceId": raw.get("scheme_id"),
        "name": (raw.get("scheme") or "").strip(),
        "agency": (raw.get("agency") or "").strip(),
        "agencyFull": " ".join((raw.get("agency") or "").split()),
        "summary": c.clean_text(raw.get("summary")),
        "description": c.clean_text(raw.get("description")),
        "eligibility": c.clean_text(raw.get("eligibility")) or None,
        "whoIsItFor": [w.strip() for w in raw.get("who_is_it_for") or []],
        "whatItGives": c.fix_split_items(raw.get("what_it_gives")),
        "schemeType": [t.strip() for t in raw.get("scheme_type") or []],
        "link": (raw.get("link") or "").strip(),
        "serviceArea": raw.get("service_area"),
        "phone": raw.get("phone"),
        "email": raw.get("email"),
        "address": raw.get("address"),
        "normLink": c.normalise_link(raw.get("link")),
        "normName": c.normalise_name(raw.get("scheme")),
        # Schemes.sg's own text, kept even when overrides.json replaces it
        "sourceSummary": c.clean_text(raw.get("summary")),
        "sourceDescription": c.clean_text(raw.get("description")),
    }


def classify_record(raw: dict, overrides: dict) -> dict:
    record = normalise_record(raw)
    record["agency"] = short_agency(
        record["agencyFull"], overrides.get("agency_short_names", {})
    )
    kind = c.classify_kind(raw)
    keep, reason = c.classify_relevance(raw, kind)
    pay_for = c.classify_pay_for(raw) if kind == c.MONEY else None
    area = c.classify_area(raw)
    notes: List[str] = []

    tier1_id = find_tier1_match(overrides, record)
    override = find_override(overrides, record)
    extra = find_extra_include(overrides, record)
    if extra and not override:
        override = {**extra, "action": "include"}
        override.setdefault("reason", "extra include from the full catalogue")
    if override:
        action = override.get("action")
        if action == "exclude":
            keep = False
            reason = f"Override: {override.get('reason', 'excluded by hand')}"
        elif action == "include":
            keep = True
            reason = f"Override: {override.get('reason', 'included by hand')}"
        if override.get("payFor"):
            kind = c.MONEY
            pay_for = override["payFor"]
            notes.append(f"payFor set by override to {pay_for}")
        if override.get("area"):
            area = override["area"]
            notes.append("area set by override")
        content_fields = [f for f in CONTENT_FIELDS if f in override]
        if content_fields:
            for field in content_fields:
                record[field] = override[field]
            record["contentOverride"] = {
                "fields": content_fields,
                "reason": override.get("reason"),
                "checkedOn": override.get("checked_on"),
            }

    if tier1_id:
        status = TIER1
    elif not keep:
        status = EXCLUDED
    elif kind == c.MONEY and pay_for == c.UNCLASSIFIED:
        status = UNCLASSIFIED
    elif kind == c.MONEY:
        status = PUBLISHED
    else:
        status = OTHER

    record.update(
        {
            "kind": kind,
            "relevant": keep,
            "reason": reason,
            "payFor": pay_for if kind == c.MONEY else None,
            "payForScores": c.score_pay_for(raw) if kind == c.MONEY else {},
            "area": area,
            "status": status,
            "tier1Id": tier1_id,
            "notes": notes,
        }
    )
    return record


# ---------------------------------------------------------------------------
# Stable ids
# ---------------------------------------------------------------------------


def _unique_index(records: List[dict], key: str) -> Dict[str, dict]:
    counts = Counter(r[key] for r in records if r.get(key))
    return {r[key]: r for r in records if r.get(key) and counts[r[key]] == 1}


def assign_ids(records: List[dict], previous: List[dict]) -> None:
    """Give each record our own stable id, reusing last run's where possible.

    Matching order, as Schemes.sg IDs differ between environments:
    1. same normalised link and name
    2. same normalised link, when only one scheme had that link
    3. same normalised name, when only one scheme had that name
    New records get a slug from the link, or link + name when several
    schemes share a link, or name when there is no link.
    """
    by_pair = {(p["normLink"], p["normName"]): p for p in previous}
    prev_by_link = _unique_index(previous, "normLink")
    prev_by_name = _unique_index(previous, "normName")
    link_counts = Counter(r["normLink"] for r in records if r["normLink"])

    used = set()
    for record in records:
        record.pop("id", None)
    # One pass per rule, so a weaker match never takes an id that a stronger
    # match elsewhere in this run should get.
    lookups = [
        lambda r: by_pair.get((r["normLink"], r["normName"])),
        lambda r: prev_by_link.get(r["normLink"]),
        lambda r: prev_by_name.get(r["normName"]),
    ]
    for lookup in lookups:
        for record in records:
            if "id" in record:
                continue
            match = lookup(record)
            if match and match["id"] not in used:
                record["id"] = match["id"]
                used.add(match["id"])

    for record in (r for r in records if "id" not in r):
        if record["normLink"] and link_counts[record["normLink"]] == 1:
            base = c.link_slug(record["link"])
        elif record["normLink"]:
            base = f"{c.link_slug(record['link'])}-{c.slugify(record['normName'], 30)}"
        else:
            base = c.slugify(record["normName"])
        candidate = f"{ID_PREFIX}{base}"
        suffix = 2
        while candidate in used:
            candidate = f"{ID_PREFIX}{base}-{suffix}"
            suffix += 1
        record["id"] = candidate
        used.add(candidate)


# ---------------------------------------------------------------------------
# Outputs
# ---------------------------------------------------------------------------


def to_catalog_scheme(record: dict, synced_on: str, env: str) -> dict:
    """A published record as a frontend CatalogScheme (Tier 2)."""
    sources = [
        {
            "name": record.get("agencyFull") or record["agency"] or "Official page",
            "url": record["link"],
        }
    ]
    if env == "prod" and record["sourceId"]:
        sources.append(
            {
                "name": "Schemes.sg",
                "url": SCHEMESSG_SITE_URL.format(scheme_id=record["sourceId"]),
            }
        )
    return {
        "id": record["id"],
        "source": "schemes_sg",
        "sourceId": record["sourceId"],
        "tier": 2,
        "name": record["name"],
        "agency": record["agency"],
        "summary": record["summary"],
        "description": record["description"],
        **({"eligibility": record["eligibility"]} if record["eligibility"] else {}),
        **({"valueText": record["valueText"]} if record.get("valueText") else {}),
        "whatYouGet": [
            item
            for item in record["whatItGives"]
            if item.strip().lower() not in GENERIC_GIVES
        ],
        "payFor": record["payFor"],
        "area": record["area"],
        "link": record["link"],
        "sources": sources,
        "lastRefreshed": synced_on,
    }


def to_other_item(record: dict, synced_on: str) -> dict:
    return {
        "id": record["id"],
        "sourceId": record["sourceId"],
        "name": record["name"],
        "agency": record["agency"],
        "summary": record["summary"],
        "description": record["description"],
        "eligibility": record["eligibility"],
        "whoIsItFor": record["whoIsItFor"],
        "whatItGives": record["whatItGives"],
        "schemeType": record["schemeType"],
        "area": record["area"],
        "link": record["link"],
        "phone": record["phone"],
        "email": record["email"],
        "address": record["address"],
        "lastRefreshed": synced_on,
    }


def build_outputs(
    records: List[dict], synced_on: str, env: str
) -> Tuple[List[dict], List[dict]]:
    order = {cat: i for i, cat in enumerate(c.PAY_FOR_CATEGORIES)}
    published = sorted(
        (r for r in records if r["status"] == PUBLISHED),
        key=lambda r: (order.get(r["payFor"], 99), r["normName"], r["id"]),
    )
    other = sorted(
        (r for r in records if r["status"] == OTHER),
        key=lambda r: (r["normName"], r["id"]),
    )
    return (
        [to_catalog_scheme(r, synced_on, env) for r in published],
        [to_other_item(r, synced_on) for r in other],
    )


def state_record(record: dict) -> dict:
    """What we keep from each run to diff against next time."""
    keys = [
        "id",
        "sourceId",
        "normLink",
        "normName",
        "tier1Id",
        "sourceSummary",
        "sourceDescription",
        "contentOverride",
    ] + DIFF_FIELDS
    return {key: record.get(key) for key in keys}


# ---------------------------------------------------------------------------
# Diff
# ---------------------------------------------------------------------------


def diff_runs(previous: List[dict], current: List[dict]) -> dict:
    """Added, removed and changed records between two runs, by our id."""
    prev_by_id = {r["id"]: r for r in previous}
    curr_by_id = {r["id"]: r for r in current}
    added = [curr_by_id[i] for i in sorted(curr_by_id.keys() - prev_by_id.keys())]
    removed = [prev_by_id[i] for i in sorted(prev_by_id.keys() - curr_by_id.keys())]
    changed = []
    for record_id in sorted(curr_by_id.keys() & prev_by_id.keys()):
        before, after = prev_by_id[record_id], curr_by_id[record_id]
        # Fields missing from last run's state (added to the sync since) are
        # skipped, so adding a field doesn't flag every scheme as changed.
        fields = [
            f for f in DIFF_FIELDS if f in before and before.get(f) != after.get(f)
        ]
        if fields:
            changed.append({"before": before, "after": after, "fields": fields})
    return {"added": added, "removed": removed, "changed": changed}


def tier1_description_changes(previous: List[dict], current: List[dict]) -> List[dict]:
    """For each Tier 1 match: whether its Schemes.sg description changed."""
    prev_by_tier1 = {r["tier1Id"]: r for r in previous if r.get("tier1Id")}
    results = []
    for record in sorted(
        (r for r in current if r.get("tier1Id")), key=lambda r: r["tier1Id"]
    ):
        before = prev_by_tier1.get(record["tier1Id"])
        results.append(
            {
                "tier1Id": record["tier1Id"],
                "name": record["name"],
                "link": record["link"],
                "firstSeen": before is None,
                "changed": before is not None
                and before.get("description") != record.get("description"),
                "old": before.get("description") if before else None,
                "new": record.get("description"),
            }
        )
    return results


# ---------------------------------------------------------------------------
# Text overrides to review
# ---------------------------------------------------------------------------


def overrides_to_review(previous: List[dict], current: List[dict]) -> List[dict]:
    """Every active text override, flagged when the Schemes.sg text it
    replaces changed since the last run."""
    prev_by_id = {r["id"]: r for r in previous}
    results = []
    for record in sorted(
        (r for r in current if r.get("contentOverride")), key=lambda r: r["name"]
    ):
        before = prev_by_id.get(record["id"])
        has_baseline = before is not None and "sourceSummary" in before
        changed_fields = []
        if has_baseline:
            if before.get("sourceSummary") != record.get("sourceSummary"):
                changed_fields.append("summary")
            if before.get("sourceDescription") != record.get("sourceDescription"):
                changed_fields.append("description")
        results.append(
            {
                "name": record["name"],
                "link": record["link"],
                "override": record["contentOverride"],
                "hasBaseline": has_baseline,
                "sourceChanged": bool(changed_fields),
                "changedFields": changed_fields,
                "before": before if has_baseline else None,
                "after": record,
            }
        )
    return results
