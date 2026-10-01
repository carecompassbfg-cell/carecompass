"""Weekly sync of Tier 2 schemes from the Schemes.sg partner API.

Usage:
    python sync.py            # fetch, classify and write outputs
    python sync.py --force    # write outputs even if nothing changed

Reads SCHEMESSG_API_KEY, SCHEMESSG_BASE_URL and SCHEMESSG_ENV from the
environment, falling back to scrapers/schemessg/.env. The API key is only
sent in the X-API-Key header and is never printed or written anywhere.
"""

import argparse
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Optional

import catalog as cat
import client as api
import report
import watch_sources

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent.parent
ENV_FILE = HERE / ".env"
OVERRIDES_FILE = HERE / "overrides.json"
DATA_DIR = HERE / "data"
STATE_FILE = DATA_DIR / "state.json"
OTHER_FILE = DATA_DIR / "other.json"
REPORT_FILE = DATA_DIR / "report.md"
CATALOG_FILE = REPO_ROOT / "frontend" / "public" / "data" / "catalog.schemessg.json"
TIER1_CATALOG_FILE = REPO_ROOT / "frontend" / "public" / "data" / "catalog.tier1.json"
TIER1_SOURCES_FILE = DATA_DIR / "tier1_sources.json"

SINGAPORE = timezone(timedelta(hours=8))


def read_env_file(path: Path) -> Dict[str, str]:
    values: Dict[str, str] = {}
    if not path.exists():
        return values
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def load_settings() -> Dict[str, str]:
    file_values = read_env_file(ENV_FILE)

    def setting(name: str, default: str = "") -> str:
        return os.environ.get(name) or file_values.get(name) or default

    return {
        "api_key": setting("SCHEMESSG_API_KEY"),
        "base_url": setting("SCHEMESSG_BASE_URL", api.DEFAULT_BASE_URL),
        "env": setting("SCHEMESSG_ENV", "dev").lower(),
    }


def read_json(path: Path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def write_text(path: Path, text: str) -> None:
    # Always LF, so runs on Windows and on the Linux runner produce the same files
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as file:
        file.write(text)


def write_json(path: Path, data) -> None:
    write_text(path, json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def run(
    raw_details: List[dict],
    raw_listed: List[dict],
    retired: List[dict],
    overrides: dict,
    previous_state: Optional[dict],
    synced_on: str,
    env: str,
    extra_missing: Optional[List[dict]] = None,
    source_watch: Optional[Dict[str, List[dict]]] = None,
) -> dict:
    """Classify and build every output. Pure apart from its inputs."""
    problems = cat.validate_overrides(overrides)
    if problems:
        raise ValueError("overrides.json is invalid: " + "; ".join(problems))
    records = [cat.classify_record(raw, overrides) for raw in raw_details]
    cat.normalise_agency_case(records)
    previous_records = previous_state["records"] if previous_state else []
    cat.assign_ids(records, previous_records)

    catalog_items, other_items = cat.build_outputs(records, synced_on, env)
    state_records = sorted(
        (cat.state_record(r) for r in records), key=lambda r: r["id"]
    )
    diff = cat.diff_runs(previous_records, state_records) if previous_state else None
    tier1 = cat.tier1_description_changes(previous_records, state_records)
    to_review = cat.overrides_to_review(previous_records, state_records)
    has_changes = (
        previous_state is None
        or bool(diff and (diff["added"] or diff["removed"] or diff["changed"]))
        or any(m["changed"] for m in tier1)
        or any(o["sourceChanged"] for o in to_review)
        or bool(source_watch and source_watch["changed"])
    )
    report_md = report.render_report(
        synced_on=synced_on,
        env=env,
        records=records,
        retired=retired,
        diff=diff,
        tier1_changes=tier1,
        overrides_to_review=to_review,
        source_watch_lines=(
            watch_sources.render_section(source_watch) if source_watch else None
        ),
        extra_includes=overrides.get("extra_includes", []),
        extra_missing=extra_missing or [],
        feedback=report.api_feedback(raw_details, raw_listed),
    )
    return {
        "records": records,
        "catalog": catalog_items,
        "other": other_items,
        "state": {"syncedOn": synced_on, "env": env, "records": state_records},
        "report": report_md,
        "has_changes": has_changes,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument(
        "--force",
        action="store_true",
        help="write outputs even when nothing changed since the last run",
    )
    args = parser.parse_args()

    settings = load_settings()
    if not settings["api_key"]:
        print("SCHEMESSG_API_KEY is not set (environment or .env).", file=sys.stderr)
        return 1

    client = api.SchemesSgClient(settings["api_key"], settings["base_url"])
    print(f"Fetching schemes from the {settings['env']} environment...")
    overrides = read_json(OVERRIDES_FILE, {})
    raw_listed = list(client.list_schemes())
    raw_details, retired = api.fetch_details(client, raw_listed)

    # overrides.json extra_includes: schemes outside the category, found in
    # the full catalogue
    extra_missing: List[dict] = []
    if overrides.get("extra_includes"):
        full_catalogue = list(client.list_schemes(category=None))
        known_ids = {item["scheme_id"] for item in raw_listed}
        extra_ids, extra_missing = cat.match_extra_includes(
            overrides, full_catalogue, known_ids
        )
        extra_listed = [i for i in full_catalogue if i["scheme_id"] in extra_ids]
        extra_details, extra_retired = api.fetch_details(client, extra_listed)
        raw_details += extra_details
        retired += extra_retired
        print(f"Fetched {len(extra_details)} extra include(s) from the full catalogue.")
    print(f"Fetched {len(raw_details) + len(retired)} schemes ({len(retired)} retired or missing).")

    synced_on = datetime.now(SINGAPORE).date().isoformat()

    # Watch the official pages behind Tier 1. Never fails the sync.
    source_state, source_watch = None, None
    try:
        tier1_catalog = read_json(TIER1_CATALOG_FILE, [])
        source_state, source_watch = watch_sources.watch(
            tier1_catalog, read_json(TIER1_SOURCES_FILE, {}), synced_on
        )
        print(
            f"Tier 1 sources: {len(source_watch['changed'])} changed, "
            f"{len(source_watch['unwatchable'])} can't be watched."
        )
    except Exception as error:  # noqa: BLE001 - watching is best effort
        print(f"Tier 1 source watch skipped: {type(error).__name__}")

    result = run(
        raw_details=raw_details,
        raw_listed=raw_listed,
        retired=retired,
        overrides=overrides,
        extra_missing=extra_missing,
        source_watch=source_watch,
        previous_state=read_json(STATE_FILE, None),
        synced_on=synced_on,
        env=settings["env"],
    )

    if not result["has_changes"] and not args.force:
        # Leave every file untouched so the weekly job opens no PR.
        print("No changes since the last run; outputs left as they are.")
        return 0

    write_json(CATALOG_FILE, result["catalog"])
    write_json(OTHER_FILE, result["other"])
    write_json(STATE_FILE, result["state"])
    if source_state is not None:
        write_json(TIER1_SOURCES_FILE, source_state)
    write_text(REPORT_FILE, result["report"])

    statuses: Dict[str, int] = {}
    for record in result["records"]:
        statuses[record["status"]] = statuses.get(record["status"], 0) + 1
    print(f"Wrote {len(result['catalog'])} published schemes; counts: {statuses}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
