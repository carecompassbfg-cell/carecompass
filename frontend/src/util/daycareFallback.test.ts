import { describe, expect, it } from "vitest";
import { fallbackRecommendations } from "./daycareFallback";
import { DDCBase } from "@/types/ddc";

const centre = (id: number, lat: number, lng: number): DDCBase => ({
  id,
  friendlyId: `c${id}`,
  name: `Centre ${id}`,
  lat,
  lng,
  postalCode: "000000",
  operatingHours: [],
  minPrice: null,
  maxPrice: null,
  description: null,
});

const centres = [
  centre(1, 1.44, 103.79), // Woodlands
  centre(2, 1.35, 103.85), // Bishan
  centre(3, 1.3, 103.9), // East
  centre(4, 1.37, 103.85), // Ang Mo Kio
];

describe("fallbackRecommendations", () => {
  it("lists the first centres, without distance, when there's no home", () => {
    const recs = fallbackRecommendations(centres, null);
    expect(recs.map((r) => r.id)).toEqual([1, 2, 3]);
    expect(recs.every((r) => r.distanceFromHome === undefined)).toBe(true);
    expect(recs[0].reviewCount).toBe(0);
  });

  it("puts the nearest centres first, with distance in metres", () => {
    const recs = fallbackRecommendations(centres, { lat: 1.37, lng: 103.84 });
    expect(recs.map((r) => r.id)).toEqual([4, 2, 1]);
    expect(recs[0].distanceFromHome).toBeLessThan(2000);
    expect(recs[0].drivingDuration).toBeUndefined();
  });
});
