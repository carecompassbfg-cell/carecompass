# Schemes.sg Sync

Pulls schemes in the "Seniors & Caregiving" category from the **production** Schemes.sg partner API and turns the financial ones into Tier 2 entries for the CareCompass schemes pages. It also reads the official pages behind our Tier 1 schemes each week. It runs every Monday at 02:00 SGT (and on "Run workflow") from `.github/workflows/schemessg-sync.yml`, which opens or updates one PR into `main` on branch `bot/schemessg-sync`.

Production is the source of truth; the dev environment is outdated, and scheme IDs differ between the two, so nothing is ever keyed on a Schemes.sg ID.

Tier 1 schemes (the ones we maintain in `frontend/public/data/catalog.tier1.json`) are ours. The sync only ever moves their `lastChecked` date (see below); when Schemes.sg has an equivalent scheme it is listed under "Tier 1 matches" in the report so we can check our copy.

## Setup

```bash
cp .env.template .env   # then paste the key into .env (git-ignored)
pipenv install --dev
```

`sync.py` uses the Python standard library, plus Playwright (`requirements.txt`) to read the Tier 1 pages that only render with JavaScript. Without Playwright or its browser it still runs and lists those pages as "couldn't read this week". To install the browser locally: `pipenv run python -m playwright install --only-shell chromium`.

| Variable | Default | |
|---|---|---|
| `SCHEMESSG_API_KEY` | (required) | Sent as the `X-API-Key` header. Never printed, logged or committed, and never reaches the frontend. |
| `SCHEMESSG_BASE_URL` | `https://asia-southeast1-schemessg.cloudfunctions.net/partner_api` (production) | The docs' `.../partner_api/v1` form works too. |
| `SCHEMESSG_ENV` | `prod` | `prod` also adds a schemes.sg link (`https://schemes.sg/schemes/{id}`) to each scheme's sources. Use `dev` only for the outdated dev API. |

Environment variables win over `.env`.

## Running

```bash
pipenv run python sync.py   # fetch, classify, read Tier 1 pages, write outputs
pipenv run pytest           # tests, no network
```

## What it does

1. Lists every scheme in the category (plus any `extra_includes` from the full catalogue), then fetches each one's detail (the filtered list trims `scheme_type` and has no `service_area`). Retired schemes are skipped and listed in the report. Requests are spaced out and retried on 429/5xx with backoff, respecting `Retry-After`.
2. Classifies each scheme (`classify.py`):
   - **kind**: `money` when financial help is the point of the scheme (at least a third of `what_it_gives` is financial help, or the name says grant/fund/subsidy and it lists financial help). Providers that list financial help as one item among many are `service_or_programme`.
   - **relevance**: kept if `scheme_type` has "Caregiver Support", `who_is_it_for` has "Caregivers" or "Elderly with dementia", or it's money aimed at "Elderly"/"Low income elderly". Children/youth programmes and family-only items are dropped.
   - **payFor** (money only): scored from name, agency, `what_it_gives` and summary keywords. A category needs a clear lead; otherwise the scheme is `unclassified` and not published.
   - **area**: from `service_area` only (detail responses; list responses leave it empty). Islandwide when it is empty, "No Service Boundaries", "Singapore" or "Nationwide"; otherwise the places it lists, with a "Singapore" part dropped ("South West District, Singapore" → "South West District"). `planning_area` is the agency's own location, by design, and is never used; neither is the agency's name. Corrections go in `overrides.json`.
3. Applies `overrides.json`, gives each scheme a stable id and writes the outputs. Generic `what_it_gives` values ("Financial assistance (general)", "Information services", "Referral services", "Referral and information services") are left out of "What you get".

## Outputs

| File | |
|---|---|
| `frontend/public/data/catalog.schemessg.json` | Published Tier 2 money schemes as `CatalogScheme[]`, including Schemes.sg's `eligibility` text when it has one. |
| `data/other.json` | Relevant services and programmes, for Care services and Help and support later. Not used by the frontend yet. |
| `data/report.md` | Review report: counts, published by category, unclassified, excluded with reasons, retired, Tier 1 description changes, changes since the last run and feedback for Schemes.sg. |
| `data/state.json` | This run's normalised records, used to diff the next run. |
| `data/tier1_sources.json` | Hash of each Tier 1 source page's visible text, used to spot changes next run. |

The report also lists Chinese translations (`catalog.*.zh.json`) that are missing or stale, using `zh_status.py`. The sync only reads those files. See `docs/i18n/README.md`.

Every run rewrites the outputs, because dates move forward: Tier 2 schemes' `lastRefreshed` follows the sync date, and Tier 1 `lastChecked` dates move as described below. The PR title says which kind of week it was:

- **"Schemes.sg weekly sync: changes to review"**: schemes added, removed or changed, a Tier 1 description or overridden text changed on Schemes.sg, a Tier 1 official page changed, or the environment changed.
- **"Schemes.sg weekly sync: no content changes (dates only)"**: only dates moved. Reviewers can merge it after a quick look. Pages that couldn't be read are still listed in the body.

A second run on the same day produces identical files, so no PR is opened.

## Watching Tier 1 official pages

`watch_sources.py` (run by `sync.py`) reads every source URL in `frontend/public/data/catalog.tier1.json`, keeps only the visible text (the `<main>` element when there is one; scripts, styles, menus and footers are dropped), hashes it and compares with `data/tier1_sources.json`.

- Pages are fetched plainly. A page that comes back without real content (at the moment, two CPF articles that only render with JavaScript) is loaded again in headless Chromium (Playwright) and compared the same way. The workflow caches the browser.
- Each page is **changed**, **unchanged**, **read for the first time** (nothing to compare yet) or **couldn't read this week**. Not being able to read a page is never treated as unchanged, and never fails the run; the page keeps its last good hash for next week.
- A changed page is listed under "Changed. Re-check docs/schemes/tier1-schemes.md" and makes the PR a "changes to review" week.

### Automatic "Last checked" dates

- When **every** source of a Tier 1 scheme was read and is unchanged, its `lastChecked` in `catalog.tier1.json` moves to the run date.
- When **any** source changed, couldn't be read or was read for the first time, the date stays, and the scheme is listed under "Re-check before the date can move" with the URL and reason.
- `docs/schemes/tier1-schemes.md` is never edited automatically. After reviewing a change, a person updates it and the scheme, and the date moves again on the next run where all its pages are unchanged.

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
- `tier1_matches`: a Schemes.sg scheme that is one of our Tier 1 schemes. It matches on link **or** name (so a duplicate entry with another link is caught too), is never published, and is tracked in the report.
- Matches that find nothing in a run (a renamed scheme, a changed link) are listed under "Matches that found nothing" in the report, rather than guessed.
- `schemes[].match`: name and official link; both must match.
- `action`: `include` forces a scheme to be kept, `exclude` drops it.
- `payFor`: sets the category (and treats the scheme as money), which publishes an unclassified scheme.
- `area`: `{ "kind": "islandwide" }` or `{ "kind": "district", "name": "..." }`.
- `summary`, `description`, `valueText`: replace Schemes.sg's text for a Tier 2 scheme when it is wrong. These need a `reason` and a `checked_on` date (YYYY-MM-DD); the sync refuses to run without them. The Schemes.sg text is still recorded, and the report lists every text override under "Overrides to review", flagging it when the Schemes.sg text it replaces changes.
- `extra_includes`: schemes outside the "Seniors & Caregiving" category. The sync lists the full catalogue (no category filter), matches each entry by normalised name or link (plus `agency` when given, to tell apart generic names), fetches its detail and classifies it like the rest, forced in with the given `payFor`/`area`. Entries that can't be found are flagged in the report.
