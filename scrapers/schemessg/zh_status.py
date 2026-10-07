"""Chinese (zh) translations of the scheme catalogs: which are missing or stale.

The translations live next to the English catalogs as overlays:

    frontend/public/data/catalog.tier1.zh.json
    frontend/public/data/catalog.schemessg.zh.json

Each overlay is keyed by scheme id and holds only the translated text fields,
plus "_en": a hash of the English text the translation was made from. The app
uses a translation only when "_en" matches the current English, so a scheme
whose English changed (e.g. after a Schemes.sg sync) shows in English until
someone updates its translation.

The hash: FNV-1a 32-bit over the UTF-8 bytes of a canonical JSON string of
TEXT_FIELDS (in that order, missing fields as null, no spaces, non-ASCII kept
as is), written as 8 lowercase hex digits. frontend/src/util/catalogTranslation.ts
computes exactly the same thing; keep the two in step.

Usage:
    python zh_status.py                 # list missing and stale translations
    python zh_status.py --stamp ID ...  # after re-translating a scheme, record
                                        # the current English hash for it
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

HERE = Path(__file__).resolve().parent
DATA = HERE.parent.parent / "frontend" / "public" / "data"

# (label, English catalog, Chinese overlay)
CATALOGS = [
    ("Tier 1", DATA / "catalog.tier1.json", DATA / "catalog.tier1.zh.json"),
    ("Schemes.sg", DATA / "catalog.schemessg.json", DATA / "catalog.schemessg.zh.json"),
]

# The user-visible text fields that are translated. Order matters for the hash.
TEXT_FIELDS = (
    "name",
    "agency",
    "summary",
    "description",
    "whatYouGet",
    "valueText",
    "eligibility",
    "nextSteps",
)

OK = "ok"
MISSING = "missing"
STALE = "stale"


def canonical_text(scheme: dict) -> str:
    return json.dumps(
        {field: scheme.get(field) for field in TEXT_FIELDS},
        ensure_ascii=False,
        separators=(",", ":"),
    )


def fnv1a32(text: str) -> str:
    value = 0x811C9DC5
    for byte in text.encode("utf-8"):
        value ^= byte
        value = (value * 0x01000193) & 0xFFFFFFFF
    return f"{value:08x}"


def source_hash(scheme: dict) -> str:
    """Hash of a scheme's English text, stored as "_en" in its translation."""
    return fnv1a32(canonical_text(scheme))


def check(catalog: List[dict], overlay: Optional[dict]) -> Dict[str, List[dict]]:
    """Group the catalog's schemes by translation status. Overlay entries for
    schemes no longer in the catalog are listed as "orphaned"."""
    overlay = overlay if isinstance(overlay, dict) else {}
    groups: Dict[str, List[dict]] = {OK: [], MISSING: [], STALE: [], "orphaned": []}
    ids = set()
    for scheme in catalog:
        ids.add(scheme.get("id"))
        entry = overlay.get(scheme.get("id"))
        item = {"id": scheme.get("id"), "name": scheme.get("name")}
        if not isinstance(entry, dict):
            groups[MISSING].append(item)
        elif entry.get("_en") != source_hash(scheme):
            groups[STALE].append(item)
        else:
            groups[OK].append(item)
    groups["orphaned"] = [{"id": key, "name": None} for key in overlay if key not in ids]
    return groups


def render_section(results: List[Tuple[str, Optional[Dict[str, List[dict]]]]]) -> List[str]:
    """Markdown for the sync report. results: (label, check() output, or None
    when the overlay couldn't be read)."""
    lines = [
        "## Chinese translations",
        "",
        "Schemes without an up-to-date Chinese translation show in English in "
        "the Chinese app. To fix one, update its entry in the `.zh.json` file "
        "and run `python zh_status.py --stamp <id>` (see docs/i18n/README.md).",
        "",
    ]
    for label, groups in results:
        if groups is None:
            lines += [f"- **{label}**: couldn't read the translation file.", ""]
            continue
        total = sum(len(groups[k]) for k in (OK, MISSING, STALE))
        lines.append(f"- **{label}**: {len(groups[OK])} of {total} translated and up to date.")
        for key, text in (
            (STALE, "English changed since translating (showing English)"),
            (MISSING, "Not translated yet"),
            ("orphaned", "Translation for a scheme no longer in the catalog"),
        ):
            for item in groups[key]:
                name = f": {item['name']}" if item.get("name") else ""
                lines.append(f"  - {text}: `{item['id']}`{name}")
    lines.append("")
    return lines


def _read(path: Path):
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}


def stamp(ids: List[str]) -> int:
    """Record the current English hash for the given scheme ids."""
    remaining = set(ids)
    for _, catalog_path, overlay_path in CATALOGS:
        catalog = {s["id"]: s for s in _read(catalog_path) or []}
        overlay = _read(overlay_path)
        changed = False
        for scheme_id in sorted(remaining & set(catalog)):
            if scheme_id not in overlay:
                print(f"{scheme_id}: no translation in {overlay_path.name}; add it first.")
                continue
            overlay[scheme_id]["_en"] = source_hash(catalog[scheme_id])
            remaining.discard(scheme_id)
            changed = True
            print(f"{scheme_id}: stamped in {overlay_path.name}")
        if changed:
            with open(overlay_path, "w", encoding="utf-8", newline="\n") as file:
                file.write(json.dumps(overlay, indent=2, ensure_ascii=False) + "\n")
    for scheme_id in sorted(remaining):
        print(f"{scheme_id}: not stamped")
    return 1 if remaining else 0


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--stamp", nargs="+", metavar="ID")
    args = parser.parse_args(argv)
    if args.stamp:
        return stamp(args.stamp)
    results = [
        (label, check(_read(catalog_path) or [], _read(overlay_path)))
        for label, catalog_path, overlay_path in CATALOGS
    ]
    print("\n".join(render_section(results)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
