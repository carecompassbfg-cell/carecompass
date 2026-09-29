"""Render the human review report (data/report.md) and API feedback."""

from collections import Counter
from typing import Dict, List, Optional

import catalog as cat
import classify as c

PAY_FOR_LABELS = {
    "care_services": "Care services",
    "monthly_payouts": "Monthly payouts",
    "helper_costs": "Helper costs",
    "caregiver_courses": "Caregiver courses",
    "equipment_home": "Equipment and home",
    "transport": "Transport",
    "medical_bills": "Medical bills",
    "tax_cpf": "Tax and CPF",
}

# Behaviour we noticed that can't be measured from a single run's data.
STATIC_FEEDBACK = [
    "In a category-filtered list, `scheme_type` only contains that category's "
    "types, so every scheme needs a detail call to get its full `scheme_type`.",
    "`planning_area` is the agency's office rather than where the scheme applies, "
    "which is easy to misread. A separate field, or documentation, would help.",
    "`service_area` is free text: islandwide shows up as both "
    '"No Service Boundaries" and "Singapore", and districts mix CDC districts, '
    "town names, street names and block ranges. A controlled list (islandwide, "
    "CDC district, planning areas) would make it usable for filtering.",
    "Only one filter can be used per request, so we can't ask for "
    '"Seniors & Caregiving" and "Financial Assistance" together.',
]


def _area_text(area: Optional[dict]) -> str:
    if not area:
        return "-"
    return "Islandwide" if area.get("kind") == "islandwide" else area.get("name", "-")


def _md(text: Optional[str]) -> str:
    """Keep table cells on one line."""
    return (text or "").replace("|", "\\|").replace("\n", " ").strip()


def _quote(text: Optional[str]) -> str:
    if not text:
        return "> _(empty)_"
    return "\n".join(f"> {line}" if line else ">" for line in text.split("\n"))


def api_feedback(raw_details: List[dict], raw_listed: List[dict]) -> List[str]:
    """Observations measured from this run's raw responses."""
    notes: List[str] = []
    total = len(raw_details)
    if not total:
        return notes

    eligibility = sum(1 for d in raw_details if d.get("eligibility"))
    if eligibility:
        notes.append(
            f"`eligibility` is filled in for {eligibility} of {total} schemes, "
            "although it was described as null everywhere. We don't publish it yet."
        )
    null_status = sum(1 for d in raw_details if d.get("status") is None)
    if null_status:
        statuses = Counter(d.get("status") for d in raw_details if d.get("status"))
        notes.append(
            f"`status` is null for {null_status} of {total} schemes "
            f"(other values: {dict(statuses) or 'none'}). Is null the same as active?"
        )
    listed_areas = sum(1 for d in raw_listed if d.get("service_area"))
    if raw_listed and "service_area" in raw_listed[0] and not listed_areas:
        notes.append(
            "List responses include a `service_area` key, but it is always null; "
            "the value only appears in detail responses."
        )
    split = [
        d.get("scheme")
        for d in raw_details
        if len(c.fix_split_items(d.get("what_it_gives")))
        != len([x for x in d.get("what_it_gives") or [] if x.strip()])
    ]
    if split:
        notes.append(
            f"`what_it_gives` has items split inside parentheses for {len(split)} "
            'scheme(s), e.g. "Benefits and perks for PWDs (transport", "discounts", '
            f'"facilities)". We rejoin them. Affected: {", ".join(sorted(split))}.'
        )
    replacement = sorted(
        {
            d.get("scheme")
            for d in raw_details
            for field in ("scheme", "agency", "service_area", "description", "summary")
            if "\ufffd" in (d.get(field) or "")
        }
    )
    if replacement:
        notes.append(
            "Some text has U+FFFD replacement characters where an apostrophe or dash "
            f"was lost (encoding issue upstream). Affected: {', '.join(replacement)}."
        )
    links = Counter(c.normalise_link(d.get("link")) for d in raw_details if d.get("link"))
    shared = sorted(link for link, n in links.items() if n > 1)
    if shared:
        notes.append(
            f"{len(shared)} official link(s) are shared by more than one scheme "
            "(usually an agency's general services page), so a link alone can't "
            "identify a scheme. Shared: " + ", ".join(shared) + "."
        )
    names = Counter(d.get("scheme") for d in raw_details)
    repeated = sorted(n for n, k in names.items() if k > 1)
    if repeated:
        notes.append(
            "Several schemes share a generic name ("
            + ", ".join(f'"{n}" x{names[n]}' for n in repeated)
            + "); including the operator in the name would help users."
        )
    phone_types = Counter(type(d.get("phone")).__name__ for d in raw_details)
    if len(phone_types) > 1:
        notes.append(
            f"`phone` has mixed types ({dict(phone_types)}): sometimes a string, "
            "sometimes a list."
        )
    who = Counter(w for d in raw_details for w in d.get("who_is_it_for") or [])
    by_lower: Dict[str, set] = {}
    for value in who:
        by_lower.setdefault(value.lower(), set()).add(value)
    variants = sorted(v for vals in by_lower.values() if len(vals) > 1 for v in vals)
    if variants:
        notes.append(
            "`who_is_it_for` values differ only by case: " + ", ".join(variants) + "."
        )
    agencies = {}
    for d in raw_details:
        name = (d.get("agency") or "").strip()
        agencies.setdefault(c.normalise_name(name), set()).add(name)
    agency_variants = sorted(
        " / ".join(sorted(v)) for v in agencies.values() if len(v) > 1
    )
    if agency_variants:
        notes.append(
            "The same agency is written in different ways: "
            + "; ".join(agency_variants)
            + "."
        )
    return notes


def render_report(
    *,
    synced_on: str,
    env: str,
    records: List[dict],
    retired: List[dict],
    diff: Optional[dict],
    tier1_changes: List[dict],
    feedback: List[str],
) -> str:
    by_status = Counter(r["status"] for r in records)
    fetched = len(records) + len(retired)
    lines: List[str] = [
        "# Schemes.sg sync report",
        "",
        f"Synced on {synced_on} from the **{env}** environment, category "
        '"Seniors & Caregiving".',
        "",
        "## Counts",
        "",
        "| | Count |",
        "|---|---:|",
        f"| Fetched | {fetched} |",
        f"| Published (money, Tier 2) | {by_status[cat.PUBLISHED]} |",
        f"| Other services and programmes (`other.json`) | {by_status[cat.OTHER]} |",
        f"| Excluded | {by_status[cat.EXCLUDED]} |",
        f"| Unclassified money (not published) | {by_status[cat.UNCLASSIFIED]} |",
        f"| Tier 1 matches (ours, not published) | {by_status[cat.TIER1]} |",
        f"| Retired or not found | {len(retired)} |",
        "",
    ]

    # Changes since last run
    lines += ["## Changes since the last run", ""]
    if diff is None:
        lines += ["First run: nothing to compare against.", ""]
    elif not (diff["added"] or diff["removed"] or diff["changed"]):
        lines += ["No changes.", ""]
    else:
        for title, items in (("Added", diff["added"]), ("Removed", diff["removed"])):
            if items:
                lines += [f"### {title} ({len(items)})", ""]
                lines += [
                    f"- {r['name']} ({r['status']}"
                    + (f", {r['payFor']}" if r.get("payFor") else "")
                    + ")"
                    for r in items
                ]
                lines.append("")
        if diff["changed"]:
            lines += [f"### Changed ({len(diff['changed'])})", ""]
            for change in diff["changed"]:
                after = change["after"]
                lines.append(f"- **{after['name']}**: {', '.join(change['fields'])}")
                for field in change["fields"]:
                    if field in ("status", "payFor", "kind", "link"):
                        lines.append(
                            f"  - {field}: `{change['before'].get(field)}` → "
                            f"`{after.get(field)}`"
                        )
            lines.append("")

    # Tier 1
    lines += [
        "## Tier 1 matches",
        "",
        "These are our own schemes. The sync never publishes or overwrites them; "
        "check whether our copy needs updating when the Schemes.sg text changes.",
        "",
    ]
    if not tier1_changes:
        lines += ["No Tier 1 matches found.", ""]
    for match in tier1_changes:
        state = (
            "first seen this run"
            if match["firstSeen"]
            else ("**description changed**" if match["changed"] else "no change")
        )
        lines += [
            f"### {match['tier1Id']}: {match['name']}",
            "",
            f"{match['link']} ({state})",
            "",
        ]
        if match["changed"]:
            lines += ["Old:", "", _quote(match["old"]), "", "New:", "", _quote(match["new"]), ""]

    # Published
    published = [r for r in records if r["status"] == cat.PUBLISHED]
    lines += [f"## Published schemes ({len(published)})", ""]
    for key, label in PAY_FOR_LABELS.items():
        group = sorted(
            (r for r in published if r["payFor"] == key), key=lambda r: r["normName"]
        )
        if not group:
            continue
        lines += [f"### {label} ({len(group)})", "", "| Scheme | Agency | Area |", "|---|---|---|"]
        lines += [
            f"| [{_md(r['name'])}]({r['link']}) | {_md(r['agency'])} | {_md(_area_text(r['area']))} |"
            for r in group
        ]
        lines.append("")

    # Unclassified
    unclassified = sorted(
        (r for r in records if r["status"] == cat.UNCLASSIFIED), key=lambda r: r["normName"]
    )
    lines += [
        f"## Unclassified money schemes ({len(unclassified)})",
        "",
        "Financial help that doesn't map cleanly to one category, so it is not "
        "published. Set `payFor` in overrides.json to publish one.",
        "",
    ]
    if unclassified:
        lines += ["| Scheme | Agency | What it gives | Scores |", "|---|---|---|---|"]
        lines += [
            f"| [{_md(r['name'])}]({r['link']}) | {_md(r['agency'])} | "
            f"{_md(', '.join(r['whatItGives']))} | {_md(str(r['payForScores']) if r['payForScores'] else '-')} |"
            for r in unclassified
        ]
        lines.append("")

    # Excluded
    excluded = sorted(
        (r for r in records if r["status"] == cat.EXCLUDED),
        key=lambda r: (r["reason"], r["normName"]),
    )
    lines += [f"## Excluded ({len(excluded)})", ""]
    if excluded:
        lines += ["| Scheme | Agency | Kind | Reason |", "|---|---|---|---|"]
        lines += [
            f"| {_md(r['name'])} | {_md(r['agency'])} | {r['kind']} | {_md(r['reason'])} |"
            for r in excluded
        ]
        lines.append("")

    # Retired
    lines += [f"## Retired or not found ({len(retired)})", ""]
    if retired:
        lines += [
            f"- {r.get('scheme') or r['scheme_id']} ({r['outcome']}"
            + (f", merged into {r['merged_into']}" if r.get("merged_into") else "")
            + ")"
            for r in retired
        ]
    else:
        lines.append("None.")
    lines.append("")

    # Feedback
    lines += ["## Feedback for Schemes.sg", ""]
    lines += [f"- {note}" for note in feedback + STATIC_FEEDBACK]
    lines.append("")
    return "\n".join(lines)
