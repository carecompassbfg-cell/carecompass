import { DDCBase, DDCRecommendation } from "@/types/ddc";
import { haversineKm, LatLng } from "@/util/geo";

/**
 * Builds recommendation cards from the plain centre list, for when the
 * recommendations API can't be used. With a home location the nearest centres
 * come first and carry a straight-line distance (no travel times, so the card
 * labels it "about"); without one, the first centres in the list are shown.
 */
export function fallbackRecommendations(
  centres: DDCBase[],
  home: LatLng | null,
  limit = 3,
): DDCRecommendation[] {
  const withDistance = centres.map((centre) => ({
    centre,
    distanceKm: home
      ? haversineKm(home, { lat: centre.lat, lng: centre.lng })
      : undefined,
  }));

  if (home) {
    withDistance.sort((a, b) => a.distanceKm! - b.distanceKm!);
  }

  return withDistance.slice(0, limit).map(({ centre, distanceKm }) => ({
    ...centre,
    photos: [],
    reviewCount: 0,
    averageRating: 0,
    reviews: [],
    distanceFromHome:
      distanceKm === undefined ? undefined : Math.round(distanceKm * 1000),
  }));
}
