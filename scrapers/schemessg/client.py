"""Small client for the Schemes.sg partner API.

The API key is only ever placed in the X-API-Key request header. It is never
logged, printed or included in exceptions.
"""

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Callable, Dict, Iterator, List, Optional, Tuple

# Production, per schemes.sg/developers. Production is the source of truth;
# the dev environment is outdated. Paths below add /v1 themselves.
DEFAULT_BASE_URL = "https://asia-southeast1-schemessg.cloudfunctions.net/partner_api"
CATEGORY = "Seniors & Caregiving"
PAGE_SIZE = 50
REQUEST_DELAY_SECONDS = 0.15  # well under the 600 requests/minute limit
MAX_ATTEMPTS = 5
RETRYABLE_STATUS = {429, 500, 502, 503, 504}


class ApiError(Exception):
    """A request failed after retries. Never includes request headers."""


class SchemesSgClient:
    def __init__(
        self,
        api_key: str,
        base_url: str = DEFAULT_BASE_URL,
        sleep: Callable[[float], None] = time.sleep,
    ):
        if not api_key:
            raise ValueError("SCHEMESSG_API_KEY is not set")
        self._api_key = api_key
        self._base_url = normalise_base_url(base_url)
        self._sleep = sleep

    def _request(self, path: str) -> Tuple[int, Optional[dict]]:
        url = f"{self._base_url}{path}"
        for attempt in range(1, MAX_ATTEMPTS + 1):
            request = urllib.request.Request(
                url, headers={"X-API-Key": self._api_key, "Accept": "application/json"}
            )
            try:
                with urllib.request.urlopen(request, timeout=60) as response:
                    return response.status, json.loads(response.read())
            except urllib.error.HTTPError as error:
                status = error.code
                try:
                    body = json.loads(error.read())
                except (ValueError, OSError):
                    body = None
                if status not in RETRYABLE_STATUS or attempt == MAX_ATTEMPTS:
                    return status, body
                self._sleep(_retry_delay(error.headers.get("Retry-After"), attempt))
            except (urllib.error.URLError, TimeoutError) as error:
                if attempt == MAX_ATTEMPTS:
                    raise ApiError(
                        f"GET {path} failed: {type(error).__name__}"
                    ) from None
                self._sleep(_retry_delay(None, attempt))
        raise ApiError(f"GET {path} failed")  # pragma: no cover

    def list_schemes(self, category: Optional[str] = CATEGORY) -> Iterator[dict]:
        """Every scheme in a category, or the full catalogue when None."""
        cursor: Optional[str] = None
        while True:
            query: Dict[str, object] = {"limit": PAGE_SIZE}
            if category:
                query["category"] = category
            if cursor:
                query["cursor"] = cursor
            status, body = self._request(
                "/v1/schemes?" + urllib.parse.urlencode(query)
            )
            if status != 200 or body is None:
                raise ApiError(f"Listing schemes failed with HTTP {status}")
            yield from body.get("data", [])
            if not body.get("has_more"):
                return
            cursor = body.get("next_cursor")
            self._sleep(REQUEST_DELAY_SECONDS)

    def get_scheme(self, scheme_id: str) -> Tuple[str, dict]:
        """Returns ("ok", data), ("retired", error body) or ("not_found", body)."""
        status, body = self._request(
            "/v1/schemes/" + urllib.parse.quote(scheme_id, safe="")
        )
        self._sleep(REQUEST_DELAY_SECONDS)
        if status == 200 and body is not None:
            return "ok", body.get("data", {})
        if status == 404:
            if body and _error_code(body) == "scheme_retired":
                return "retired", body
            return "not_found", body or {}
        raise ApiError(f"Fetching scheme {scheme_id} failed with HTTP {status}")


def normalise_base_url(base_url: str) -> str:
    """Accept the base URL with or without the trailing /v1 that the
    official docs include, since every path here starts with /v1."""
    base = base_url.strip().rstrip("/")
    if base.endswith("/v1"):
        base = base[: -len("/v1")]
    return base


def _error_code(body: dict) -> Optional[str]:
    if "code" in body:
        return body["code"]
    error = body.get("error")
    if isinstance(error, dict):
        return error.get("code")
    return None


def merged_into(body: dict) -> Optional[str]:
    if "merged_into" in body:
        return body["merged_into"]
    error = body.get("error")
    if isinstance(error, dict):
        return error.get("merged_into")
    return None


def _retry_delay(retry_after: Optional[str], attempt: int) -> float:
    if retry_after:
        try:
            return max(float(retry_after), 0.0)
        except ValueError:
            pass
    return float(min(2**attempt, 60))


def fetch_details(
    client: SchemesSgClient, listed_items: List[dict]
) -> Tuple[List[dict], List[dict]]:
    """Detail records for listed schemes. Returns (details, retired).

    scheme_type and service_area come from the detail response because the
    filtered list trims scheme_type to the category's own types and leaves
    service_area empty.
    """
    details: List[dict] = []
    retired: List[dict] = []
    for listed in listed_items:
        outcome, body = client.get_scheme(listed["scheme_id"])
        if outcome == "ok":
            details.append(body)
        else:
            retired.append(
                {
                    "scheme_id": listed["scheme_id"],
                    "scheme": listed.get("scheme"),
                    "link": listed.get("link"),
                    "outcome": outcome,
                    "merged_into": merged_into(body),
                }
            )
    return details, retired
