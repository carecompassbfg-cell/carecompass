import logging
import os
from typing import Optional, Tuple, Union

import requests
from googlemaps import Client as GoogleMapsClient
from pydantic import BaseModel

logger = logging.getLogger(__name__)

ONEMAP_SEARCH_URL = "https://www.onemap.gov.sg/api/common/elastic/search"
REQUEST_TIMEOUT_SECONDS = 8

_gmaps_client: Optional[GoogleMapsClient] = None


def getCoordFromAddress(address: str) -> Union[Tuple[float, float], None]:
    """
    Get the latitude and longitude of an address or postal code using OneMap.

    Returns None (never raises) if OneMap is unreachable or finds nothing.
    When the query is a 6-digit postal code, a result with that exact postal
    code is preferred over OneMap's first (fuzzy) hit.
    """
    query = (address or "").strip()
    if not query:
        return None

    try:
        response = requests.get(
            ONEMAP_SEARCH_URL,
            params={
                "searchVal": query,
                "returnGeom": "Y",
                "getAddrDetails": "Y",
                "pageNum": 1,
            },
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        data = response.json()
    except (requests.RequestException, ValueError) as e:
        logger.warning("OneMap lookup failed for %r: %s", query, e)
        return None

    results = data.get("results") or []
    if not results:
        return None

    match = next(
        (r for r in results if query.isdigit() and r.get("POSTAL") == query),
        results[0],
    )
    try:
        return (float(match["LATITUDE"]), float(match["LONGITUDE"]))
    except (KeyError, TypeError, ValueError):
        return None


class RouteDistance(BaseModel):
    distance: int
    duration: int


def _get_gmaps_client() -> Optional[GoogleMapsClient]:
    global _gmaps_client
    if _gmaps_client is None:
        key = os.getenv("GOOGLE_MAPS_API_KEY")
        if not key:
            logger.warning("GOOGLE_MAPS_API_KEY is not set; skipping route lookups")
            return None
        _gmaps_client = GoogleMapsClient(key=key, timeout=REQUEST_TIMEOUT_SECONDS)
    return _gmaps_client


def getRouteDistance(
    origin: Union[str, Tuple[float, float]],
    destination: Union[str, Tuple[float, float]],
    mode: str = "driving",
) -> Optional[RouteDistance]:
    """
    Get route distance (metres) and duration (seconds) via the Google Maps
    Distance Matrix API.

    Returns None (never raises) when Google can't provide a route — missing or
    invalid key, billing/quota errors, timeouts, or no route found — so callers
    can fall back to straight-line distance instead of failing the request.
    """
    gmaps = _get_gmaps_client()
    if gmaps is None:
        return None

    kwargs = {"origins": [origin], "destinations": [destination], "mode": mode}
    if mode == "transit":
        kwargs["transit_routing_preference"] = "less_walking"

    try:
        dist = gmaps.distance_matrix(**kwargs)  # type: ignore[attr-defined]
        route = dist["rows"][0]["elements"][0]
    except Exception as e:  # googlemaps raises several unrelated exception types
        logger.warning("Google Distance Matrix (%s) failed: %s", mode, e)
        return None

    if route.get("status") != "OK":
        return None

    return RouteDistance(
        distance=route["distance"]["value"],
        duration=route["duration"]["value"],
    )
