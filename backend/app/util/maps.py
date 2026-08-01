import os
import requests

from typing import Tuple, Union
from pydantic import BaseModel

from googlemaps import Client as GoogleMapsClient

# TODO: Add return type hints

def getCoordFromAddress(address: str) -> Union[Tuple[float, float], None]:
    """
    Get the latitude and longitude of an address using OneMap API.

    Args:
        address (str): The address to search for

    Returns:
        Tuple[float, float]: The latitude and longitude of the address
    """
    url = f"https://www.onemap.gov.sg/api/common/elastic/search?searchVal={address}&returnGeom=Y&getAddrDetails=Y&pageNum=1"
    response = requests.get(url)
    data = response.json()
    if data['found'] == 0:
        return None

    print(address, data['results'][0]['LATITUDE'], data['results'][0]['LONGITUDE'], end='\n\n')
    return (float(data['results'][0]['LATITUDE']), float(data['results'][0]['LONGITUDE']))

class RouteDistance(BaseModel):
    distance: int
    duration: int

# TODO: make this async
def getRouteDistance(
    origin: Union[str, Tuple[float, float]],
    destination: Union[str, Tuple[float, float]],
    mode: str = "driving"
) -> RouteDistance:
    """
    Get the distance between two locations using Google Maps API.

    Args:
        - origin (Union[str, Tuple[float, float]]): The origin location (address or lat/lng coordinates)
        - destination (Union[str, Tuple[float, float]]): The destination location (address or lat/lng coordinates)
        - mode (str): The mode of transport to use when calculating directions.
        Valid values are "driving", "walking", "transit" or "bicycling". Defaults to "driving"

    Returns:
        - RouteDistance: The distance between the two locations and the estimated travel duration
    """
    gmaps = GoogleMapsClient(key=os.getenv('GOOGLE_MAPS_API_KEY'))
    dist = gmaps.distance_matrix( # type: ignore[attr-defined]
        origins=[origin],
        destinations=[destination],
        mode=mode,
        transit_routing_preference=["less_walking", "fewer_transfers"]
    )

    route = dist.get('rows')[0].get('elements')[0]

    if route.get('status') != "OK":
        return RouteDistance(distance=0, duration=0)

    return RouteDistance(
        distance=route.get('distance').get('value'),
        duration=route.get('duration').get('value')
    )
