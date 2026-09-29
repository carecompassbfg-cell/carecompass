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

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent.parent
ENV_FILE = HERE / ".env"
OVERRIDES_FILE = HERE / "overrides.json"
DATA_DIR = HERE / "data"
STATE_FILE = DATA_DIR / "state.json"
OTHER_FILE = DATA_DIR / "other.json"
REPORT_FILE = DATA_DIR / "report.md"
CATALOG_FILE = REPO_ROOT / "frontend" / "public" / "data" / "catalog.schemessg.json"

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
) -> dict:
    """Classify and build every output. Pure apart from its inputs."""
    records = [cat.classify_record(raw, overrides) for raw in raw_details]
    previous_records = previous_state["records"] if previous_state else []
    cat.assign_ids(records, previous_records)

    catalog_items, other_items = cat.build_outputs(records, synced_on, env)
    state_records = sorted(
        (cat.state_record(r) for r in records), key=lambda r: r["id"]
    )
    diff = cat.diff_runs(previous_records, state_records) if previous_state else None
    tier1 = cat.tier1_description_changes(previous_records, state_records)
    has_changes = (
        previous_state is None
        or bool(diff and (diff["added"] or diff["removed"] or diff["changed"]))
        or any(m["changed"] for m in tier1)
    )
    report_md = report.render_report(
        synced_on=synced_on,
        env=env,
        records=records,
        retired=retired,
        diff=diff,
        tier1_changes=tier1,
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
    raw_listed, raw_details, retired = api.fetch_all(client)
    print(f"Fetched {len(raw_listed)} schemes ({len(retired)} retired or missing).")

    synced_on = datetime.now(SINGAPORE).date().isoformat()
    result = run(
        raw_details=raw_details,
        raw_listed=raw_listed,
        retired=retired,
        overrides=read_json(OVERRIDES_FILE, {}),
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
    write_text(REPORT_FILE, result["report"])

    statuses: Dict[str, int] = {}
    for record in result["records"]:
        statuses[record["status"]] = statuses.get(record["status"], 0) + 1
    print(f"Wrote {len(result['catalog'])} published schemes; counts: {statuses}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
