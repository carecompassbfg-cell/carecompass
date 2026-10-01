# Schemes.sg Sync

Pulls schemes in the "Seniors & Caregiving" category from the Schemes.sg partner API and turns the financial ones into Tier 2 entries for the CareCompass schemes pages. It runs weekly from `.github/workflows/schemessg-sync.yml`, which opens a PR into `staging` when anything changed.

Tier 1 schemes (the ones we maintain in `frontend/public/data/catalog.tier1.json`) are ours. The sync never writes to that file; when Schemes.sg has an equivalent scheme it is listed under "Tier 1 matches" in the report so we can check our copy.

## Setup

```bash
cp .env.template .env   # then paste the key into .env (git-ignored)
pipenv install --dev
```

`sync.py` only uses the Python standard library; pytest is for the tests.

| Variable | Default | |
|---|---|---|
| `SCHEMESSG_API_KEY` | (required) | Sent as the `X-API-Key` header. Never printed, logged or committed, and never reaches the frontend. |
| `SCHEMESSG_BASE_URL` | dev partner API | |
| `SCHEMESSG_ENV` | `dev` | `prod` also adds a schemes.sg link to each scheme's sources (dev IDs don't exist on schemes.sg). |

Environment variables win over `.env`.

## Running

```bash
pipenv run python sync.py          # fetch, classify, write outputs if anything changed
pipenv run python sync.py --force  # write outputs even when nothing changed
pipenv run pytest                  # tests, no network
```

## What it does

1. Lists every scheme in the category (plus any `extra_includes` from the full catalogue), then fetches each one's detail (the filtered list trims `scheme_type` and has no `service_area`). Retired schemes are skipped and listed in the report. Requests are spaced out and retried on 429/5xx with backoff, respecting `Retry-After`.
2. Classifies each scheme (`classify.py`):
   - **kind**: `money` when financial help is the point of the scheme (at least a third of `what_it_gives` is financial help, or the name says grant/fund/subsidy and it lists financial help). Providers that list financial help as one item among many are `service_or_programme`.
   - **relevance**: kept if `scheme_type` has "Caregiver Support", `who_is_it_for` has "Caregivers" or "Elderly with dementia", or it's money aimed at "Elderly"/"Low income elderly". Children/youth programmes and family-only items are dropped.
   - **payFor** (money only): scored from name, agency, `what_it_gives` and summary keywords. A category needs a clear lead; otherwise the scheme is `unclassified` and not published.
   - **area**: islandwide when `service_area` is empty, "No Service Boundaries" or "Singapore"; CDC funds use the CDC district; otherwise the `service_area` text. `planning_area` is the agency's office and is ignored.
3. Applies `overrides.json`, gives each scheme a stable id and writes the outputs. Generic `what_it_gives` values ("Financial assistance (general)", "Information services", "Referral services", "Referral and information services") are left out of "What you get".

## Outputs

| File | |
|---|---|
| `frontend/public/data/catalog.schemessg.json` | Published Tier 2 money schemes as `CatalogScheme[]`, including Schemes.sg's `eligibility` text when it has one. |
| `data/other.json` | Relevant services and programmes, for Care services and Help and support later. Not used by the frontend yet. |
| `data/report.md` | Review report: counts, published by category, unclassified, excluded with reasons, retired, Tier 1 description changes, changes since the last run and feedback for Schemes.sg. |
| `data/state.json` | This run's normalised records, used to diff the next run. |

When nothing changed since the last run, no file is rewritten, so the weekly job opens no PR.

## Stable ids

Schemes.sg IDs differ between dev and production, so we never key on them. Each scheme gets our own id (`ssg-<site>-<last link segment>`, plus the name when several schemes share a link). On later runs a scheme keeps its id by matching the previous run's records on normalised link and name, then link alone, then name alone.

## overrides.json

Hand-edited and committed. Matches use the official link and/or the scheme name, compared after normalising; every key given must match.

```json
{
  "tier1_matches": [
    { "tier1_id": "HOME-CAREGIVING-GRANT", "name": "Home Caregiving Grant (HCG)", "link": "https://www.aic.sg/financial-assistance/home-caregiving-grant" }
  ],
  "schemes": [
    { "match": { "name": "Mobile Access for Seniors" }, "action": "exclude", "reason": "Phone plans, not care costs" },
    { "match": { "name": "South West Caregiver Support Fund" }, "action": "include", "payFor": "monthly_payouts",
      "area": { "kind": "district", "name": "South West District" } }
  ],
  "extra_includes": [
    { "name": "Medifund", "agency": "Agency for Integrated Care", "payFor": "medical_bills" }
  ]
}
```

- `agency_short_names`: full agency name → short label shown in the app (e.g. "Agency for Integrated Care (AIC)" → "AIC"). Matched ignoring case and punctuation. When several agencies are listed, the first one is used ("MOH, CPF, AIC" → "MOH"). Names not in the map keep their own text, with case variants ("TOUCH" / "Touch") collapsed to one spelling. Sources keep the full name.
- `tier1_matches`: a Schemes.sg scheme that is one of our Tier 1 schemes. It matches on link **or** name, is never published, and is tracked in the report.
- `action`: `include` forces a scheme to be kept, `exclude` drops it.
- `payFor`: sets the category (and treats the scheme as money), which publishes an unclassified scheme.
- `area`: `{ "kind": "islandwide" }` or `{ "kind": "district", "name": "..." }`.
- `summary`, `description`, `valueText`: replace Schemes.sg's text for a Tier 2 scheme when it is wrong. These need a `reason` and a `checked_on` date (YYYY-MM-DD); the sync refuses to run without them. The Schemes.sg text is still recorded, and the report lists every text override under "Overrides to review", flagging it when the Schemes.sg text it replaces changes.
- `extra_includes`: schemes outside the "Seniors & Caregiving" category. The sync lists the full catalogue (no category filter), matches each entry by normalised name or link (plus `agency` when given, to tell apart generic names), fetches its detail and classifies it like the rest, forced in with the given `payFor`/`area`. Entries that can't be found are flagged in the report.
