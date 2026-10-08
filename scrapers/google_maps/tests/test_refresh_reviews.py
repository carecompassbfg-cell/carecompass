import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import refresh_reviews as rr  # noqa: E402

URL = "https://www.google.com/maps/contrib/{}/reviews"


def review(rid, contrib, **extra):
    return {"google_review_id": rid, "google_author_url": URL.format(contrib), **extra}


def test_contributor_id():
    assert rr.contributor_id(URL.format("1234")) == "1234"
    assert rr.contributor_id("") is None


def test_merge_dedupes_by_reviewer_and_reuses_stored_ids():
    newest = [review("legacy-a", "1"), review("legacy-b", "2")]
    relevant = [review("new-x", "2"), review("new-y", "3")]
    merged = rr.merge({"3": "stored-3"}, newest, relevant)
    ids = sorted(r["google_review_id"] for r in merged)
    # reviewer 2 appears once; reviewer 3 keeps the id already in the database
    assert ids == ["legacy-a", "legacy-b", "stored-3"]


def test_legacy_newest_parses_and_ids_are_stable():
    payload = {
        "status": "OK",
        "result": {
            "reviews": [
                {
                    "author_name": "Ann",
                    "author_url": URL.format("42"),
                    "profile_photo_url": "https://x/p.png",
                    "rating": 4,
                    "text": "Kind staff",
                    "time": 1758000000,
                }
            ]
        },
    }
    resp = MagicMock(json=MagicMock(return_value=payload))
    resp.raise_for_status.return_value = None
    with patch.object(rr.requests, "get", return_value=resp):
        first = rr.from_places_legacy_newest("place1", "k")
        second = rr.from_places_legacy_newest("place1", "k")
    assert first[0]["google_review_id"] == second[0]["google_review_id"]
    assert first[0]["google_review_id"].startswith("legacy-")
    assert first[0]["published_time"].startswith("2025-09-16")
    assert first[0]["overall_rating"] == 4


def test_legacy_request_denied_raises():
    resp = MagicMock(json=MagicMock(return_value={"status": "REQUEST_DENIED", "error_message": "legacy"}))
    resp.raise_for_status.return_value = None
    with patch.object(rr.requests, "get", return_value=resp):
        try:
            rr.from_places_legacy_newest("p", "k")
        except rr.LegacyUnavailable:
            return
    raise AssertionError("expected LegacyUnavailable")
