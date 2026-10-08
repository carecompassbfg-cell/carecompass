"""Refresh Google reviews for every day care centre.

Google returns at most 5 reviews per request, so for each centre we ask for
both:
  - the 5 "most relevant" (Places API (New), the API the rest of this
    scraper uses), and
  - the 5 newest (Place Details (Legacy) with reviews_sort=newest — the only
    Google API that can sort reviews; skipped with a warning if the Google
    project doesn't have the legacy Places API enabled).

That gives up to 10 per centre: a mix of top and recent reviews. Reviews are
upserted through the backend's /reviews/google-reviews/{id} endpoint, matched
on the reviewer's Google contributor id, so re-running never duplicates a
review even when it moves between "newest" and "most relevant".

Usage:  BACKEND_URL=... GOOGLE_MAPS_API_KEY=... python refresh_reviews.py
        add --dry-run to print what would change without writing anything.
"""

import hashlib
import logging
import os
import re
import sys
from datetime import datetime, timezone
from typing import Dict, List, Optional

import requests
from dotenv import load_dotenv

TARGET_TYPE = "CARESERVICE::DEMENTIA_DAY_CARE"
TIMEOUT = 30
CONTRIB_RE = re.compile(r"/contrib/(\d+)")

log = logging.getLogger("refresh_reviews")


def contributor_id(author_url: Optional[str]) -> Optional[str]:
    match = CONTRIB_RE.search(author_url or "")
    return match.group(1) if match else None


def from_places_new(place_id: str, api_key: str) -> List[dict]:
    """Up to 5 'most relevant' reviews from Places API (New)."""
    response = requests.get(
        f"https://places.googleapis.com/v1/places/{place_id}",
        headers={"X-Goog-Api-Key": api_key, "X-Goog-FieldMask": "reviews"},
        timeout=TIMEOUT,
    )
    response.raise_for_status()
    reviews = []
    for r in response.json().get("reviews", []):
        author = r.get("authorAttribution") or {}
        reviews.append(
            {
                "google_review_id": r["name"].split("/")[-1],
                "author_name": author.get("displayName") or "Google user",
                "google_author_url": author.get("uri") or "",
                "google_author_photo_url": author.get("photoUri") or "",
                "overall_rating": int(r.get("rating", 0)),
                "content": (r.get("text") or {}).get("text"),
                "published_time": r.get("publishTime"),
            }
        )
    return reviews


class LegacyUnavailable(Exception):
    pass


def from_places_legacy_newest(place_id: str, api_key: str) -> List[dict]:
    """Up to 5 newest reviews from Place Details (Legacy)."""
    response = requests.get(
        "https://maps.googleapis.com/maps/api/place/details/json",
        params={
            "place_id": place_id,
            "fields": "reviews",
            "reviews_sort": "newest",
            "language": "en",
            "key": api_key,
        },
        timeout=TIMEOUT,
    )
    response.raise_for_status()
    data = response.json()
    if data.get("status") == "REQUEST_DENIED":
        raise LegacyUnavailable(data.get("error_message", "REQUEST_DENIED"))
    if data.get("status") not in ("OK", "ZERO_RESULTS"):
        log.warning("Legacy details for %s: %s", place_id, data.get("status"))
        return []

    reviews = []
    for r in (data.get("result") or {}).get("reviews", []):
        author_url = r.get("author_url") or ""
        # The legacy API has no review id; derive a stable one
        key = contributor_id(author_url) or f"{r.get('author_name')}|{r.get('time')}"
        reviews.append(
            {
                "google_review_id": "legacy-"
                + hashlib.sha1(f"{place_id}|{key}".encode()).hexdigest()[:24],
                "author_name": r.get("author_name") or "Google user",
                "google_author_url": author_url,
                "google_author_photo_url": r.get("profile_photo_url") or "",
                "overall_rating": int(r.get("rating", 0)),
                "content": r.get("text") or None,
                "published_time": datetime.fromtimestamp(
                    r["time"], tz=timezone.utc
                ).isoformat()
                if r.get("time")
                else None,
            }
        )
    return reviews


def existing_ids_by_author(backend_url: str, centre_id: int) -> Dict[str, str]:
    """Contributor id -> google_review_id already stored for this centre."""
    response = requests.get(
        f"{backend_url}/reviews",
        params={"target_type": TARGET_TYPE, "target_id": centre_id, "review_source": "GOOGLE"},
        timeout=TIMEOUT,
    )
    response.raise_for_status()
    out = {}
    for r in response.json():
        cid = contributor_id(r.get("googleAuthorUrl"))
        if cid and r.get("googleReviewId"):
            out[cid] = r["googleReviewId"]
    return out


def merge(existing: Dict[str, str], *batches: List[dict]) -> List[dict]:
    """One review per reviewer; reuse the stored id so updates don't duplicate."""
    merged: Dict[str, dict] = {}
    for batch in batches:
        for review in batch:
            cid = contributor_id(review["google_author_url"])
            key = cid or review["google_review_id"]
            if cid and cid in existing:
                review = {**review, "google_review_id": existing[cid]}
            merged.setdefault(key, review)
    return list(merged.values())


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    load_dotenv()
    dry_run = "--dry-run" in sys.argv
    backend_url = os.getenv("BACKEND_URL", "").rstrip("/")
    api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not backend_url or not api_key:
        log.error("BACKEND_URL and GOOGLE_MAPS_API_KEY must be set")
        return 1

    centres = requests.get(
        f"{backend_url}/services/dementia-daycare", timeout=TIMEOUT
    ).json()
    use_legacy = True
    written = failed = 0

    for centre in centres:
        place_id = centre.get("googleMapPlaceId")
        if not place_id:
            continue
        try:
            relevant = from_places_new(place_id, api_key)
        except requests.RequestException as e:
            log.warning("%s: Places (New) failed: %s", centre["name"], e)
            relevant = []
        newest: List[dict] = []
        if use_legacy:
            try:
                newest = from_places_legacy_newest(place_id, api_key)
            except LegacyUnavailable as e:
                use_legacy = False
                log.warning(
                    "Newest-first reviews unavailable (Places API (Legacy) not "
                    "enabled for this key: %s). Using most relevant only.",
                    e,
                )
            except requests.RequestException as e:
                log.warning("%s: legacy details failed: %s", centre["name"], e)

        reviews = merge(
            existing_ids_by_author(backend_url, centre["id"]), newest, relevant
        )
        log.info(
            "%s: %d reviews (%d newest, %d most relevant)",
            centre["name"], len(reviews), len(newest), len(relevant),
        )
        for review in reviews:
            payload = {
                **review,
                "review_source": "GOOGLE",
                "target_type": TARGET_TYPE,
                "target_id": centre["id"],
            }
            if dry_run:
                continue
            response = requests.put(
                f"{backend_url}/reviews/google-reviews/{review['google_review_id']}",
                json=payload,
                timeout=TIMEOUT,
            )
            if response.ok:
                written += 1
            else:
                failed += 1
                log.warning("Upsert failed (%s): %s", response.status_code, response.text[:200])

    log.info("Done: %d upserted, %d failed%s", written, failed, " (dry run)" if dry_run else "")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
