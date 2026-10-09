"""Unit tests for app.util.maps — no network, no database."""

from unittest.mock import MagicMock, patch

import requests

from app.util import maps


def _onemap_response(results):
    resp = MagicMock()
    resp.raise_for_status.return_value = None
    resp.json.return_value = {"found": len(results), "results": results}
    return resp


def test_coord_prefers_exact_postal_match():
    results = [
        {"POSTAL": "560124", "LATITUDE": "1.0", "LONGITUDE": "103.0"},
        {"POSTAL": "560123", "LATITUDE": "1.37", "LONGITUDE": "103.84"},
    ]
    with patch.object(maps.requests, "get", return_value=_onemap_response(results)):
        assert maps.getCoordFromAddress("560123") == (1.37, 103.84)


def test_coord_none_when_not_found_or_onemap_down():
    with patch.object(maps.requests, "get", return_value=_onemap_response([])):
        assert maps.getCoordFromAddress("000000") is None
    with patch.object(
        maps.requests, "get", side_effect=requests.ConnectionError("down")
    ):
        assert maps.getCoordFromAddress("560123") is None
    assert maps.getCoordFromAddress("  ") is None


def test_route_none_without_key(monkeypatch):
    monkeypatch.delenv("GOOGLE_MAPS_API_KEY", raising=False)
    monkeypatch.setattr(maps, "_gmaps_client", None)
    assert maps.getRouteDistance((1.3, 103.8), (1.35, 103.85)) is None


def test_route_none_when_google_errors(monkeypatch):
    client = MagicMock()
    client.distance_matrix.side_effect = Exception("REQUEST_DENIED")
    monkeypatch.setattr(maps, "_gmaps_client", client)
    assert maps.getRouteDistance((1.3, 103.8), (1.35, 103.85), "transit") is None


def test_route_ok(monkeypatch):
    client = MagicMock()
    client.distance_matrix.return_value = {
        "rows": [
            {
                "elements": [
                    {
                        "status": "OK",
                        "distance": {"value": 4200},
                        "duration": {"value": 900},
                    }
                ]
            }
        ]
    }
    monkeypatch.setattr(maps, "_gmaps_client", client)
    route = maps.getRouteDistance((1.3, 103.8), (1.35, 103.85), "driving")
    assert route == maps.RouteDistance(distance=4200, duration=900)
    # Driving requests must not carry the transit-only parameter
    assert "transit_routing_preference" not in client.distance_matrix.call_args.kwargs
