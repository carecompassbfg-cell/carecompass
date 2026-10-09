import { describe, expect, it } from "vitest";
import { haversineKm, isPostalCode, pickPostalResult } from "./geo";
import { AddressResponse } from "@/types/onemap";
import { buildMapEmbedUrl, mapEmbedQuery } from "./mapEmbed";

const result = (POSTAL: string, LATITUDE: string, LONGITUDE: string) => ({
  POSTAL,
  LATITUDE,
  LONGITUDE,
  SEARCHVAL: "",
  BLK_NO: "",
  ROAD_NAME: "",
  BUILDING: "",
  ADDRESS: "",
  X: "",
  Y: "",
});

const response = (results: ReturnType<typeof result>[]): AddressResponse => ({
  found: results.length,
  totalNumPages: 1,
  pageNum: 1,
  results,
});

describe("isPostalCode", () => {
  it("accepts exactly six digits", () => {
    expect(isPostalCode("560123")).toBe(true);
    expect(isPostalCode(" 560123 ")).toBe(true);
    expect(isPostalCode("56012")).toBe(false);
    expect(isPostalCode("5601234")).toBe(false);
    expect(isPostalCode("Bishan")).toBe(false);
  });
});

describe("haversineKm", () => {
  it("is zero for the same point and ~11km between Bishan and Woodlands", () => {
    const bishan = { lat: 1.3505, lng: 103.8485 };
    const woodlands = { lat: 1.4382, lng: 103.789 };
    expect(haversineKm(bishan, bishan)).toBe(0);
    expect(haversineKm(bishan, woodlands)).toBeGreaterThan(10);
    expect(haversineKm(bishan, woodlands)).toBeLessThan(12);
  });
});

describe("pickPostalResult", () => {
  it("prefers the exact postal match over the first hit", () => {
    const data = response([
      result("560124", "1.0", "103.0"),
      result("560123", "1.37", "103.84"),
    ]);
    expect(pickPostalResult("560123", data)).toEqual({
      lat: 1.37,
      lng: 103.84,
    });
  });

  it("returns null when nothing is found", () => {
    expect(pickPostalResult("000000", response([]))).toBeNull();
  });
});

describe("mapEmbedQuery / buildMapEmbedUrl", () => {
  const place = {
    name: "St Luke's Eldercare Hub @ Bishan",
    postalCode: "572152",
  };

  it("includes the full name and postal code", () => {
    expect(mapEmbedQuery(place)).toBe(
      "St Luke's Eldercare Hub @ Bishan, Singapore 572152",
    );
  });

  it("encodes every character of the query", () => {
    const url = new URL(buildMapEmbedUrl(place));
    expect(url.searchParams.get("q")).toBe(mapEmbedQuery(place));
    expect(url.search).not.toContain(" ");
  });
});
