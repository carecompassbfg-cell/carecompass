This directory houses the various scrapers used to aggregate the data used by the app.

The scrapers are currently just simple scripts which are running on-demand locally. Eventually, each scraper will be deployed as a separate containers and scheduled to run at fixed intervals.

### List of scrapers
- dementiahub
- sgw (supportgowhere), for schemes and dementia day care centres
- schemessg (Schemes.sg partner API), for Tier 2 financial schemes; runs weekly via GitHub Actions
