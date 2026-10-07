# Translations (中文)

The app is in English and Simplified Chinese. Words, official names and style for Chinese are in [glossary.md](glossary.md); every translation should follow it.

## Where translations live

| What | English | Chinese |
|---|---|---|
| App text (buttons, labels, questions, reasons) | `frontend/src/i18n/messages/en.json` | `frontend/src/i18n/messages/zh.json` |
| Tier 1 schemes (the 8 we maintain) | `frontend/public/data/catalog.tier1.json` | `frontend/public/data/catalog.tier1.zh.json` |
| Schemes.sg schemes (synced weekly) | `frontend/public/data/catalog.schemessg.json` | `frontend/public/data/catalog.schemessg.zh.json` |

- **App text**: anything missing from `zh.json` shows in English (`frontend/src/i18n/index.ts`).
- **Scheme catalogs**: the `.zh.json` files are overlays, not copies. They are keyed by scheme id and hold only the translated text: `name`, `agency`, `summary`, `description`, `whatYouGet`, `valueText`, `eligibility`, `nextSteps`. Ids, links, categories, areas, sources and eligibility checks always come from the English file. In Chinese, `useSchemeCatalog` loads the overlay as well and puts the translated text over the English (`frontend/src/util/catalogTranslation.ts`). If the overlay can't be loaded, everything shows in English.

## Stale translations

Each overlay entry has an `_en` value: a fingerprint of the English text it was translated from.

```json
"HOME-CAREGIVING-GRANT": {
  "_en": "1a2b3c4d",
  "name": "居家看护津贴",
  ...
}
```

The app uses a translation only when `_en` matches the scheme's current English. When the English changes (a weekly Schemes.sg sync, or an edit to a Tier 1 scheme), the fingerprint no longer matches and **that scheme shows in English** until its translation is updated. Chinese text that no longer matches the English is never shown.

The fingerprint is FNV-1a 32-bit, as 8 hex digits, over the UTF-8 bytes of a canonical JSON string of the eight text fields above (in that order, missing ones as `null`, no spaces). It is computed the same way in `frontend/src/util/catalogTranslation.ts` and `scrapers/schemessg/zh_status.py`; both have tests with the same fixed values, so the two can't drift apart. Dates (`lastChecked`, `lastRefreshed`) are not part of it, so the weekly date changes don't make translations stale.

### Seeing what needs translating

```bash
cd scrapers/schemessg
python zh_status.py
```

lists, for both catalogs, schemes whose translation is missing, stale (English changed) or left over for a scheme that's gone. The weekly Schemes.sg sync adds the same list to its PR description (`data/report.md`, section "Chinese translations") and to the workflow run's summary. It never fails the sync or changes the PR title.

## Updating a scheme's translation

1. Run `python zh_status.py` to find the scheme id.
2. Compare the English in the catalog file with the Chinese in the `.zh.json` file. For a Schemes.sg scheme, the sync PR's "Changes since the last run" section shows which fields changed.
3. Edit the Chinese in the `.zh.json` file. Follow [glossary.md](glossary.md). Translate only fields the English has; keep markdown (lists, tables, `[links](...)`) and URLs as they are, and keep `whatYouGet` the same length as the English.
4. Record that the translation now matches the current English:
   ```bash
   python zh_status.py --stamp <scheme-id> [<scheme-id> ...]
   ```
   This only updates `_en`, so run it after you have checked the Chinese, never instead.
5. Run `python zh_status.py` again; the scheme should be "up to date".

A new Schemes.sg scheme shows in English until someone adds an entry for it (with all its text fields) and stamps it.
