import { AddressResponse } from "@/types/onemap";

export type LatLng = { lat: number; lng: number };

const ONEMAP_SEARCH_URL = "https://www.onemap.gov.sg/api/common/elastic/search";

/** Singapore postal codes are exactly 6 digits. */
export function isPostalCode(value: string): boolean {
  return /^\d{6}$/.test(value.trim());
}

/** Straight-line distance between two points, in kilometres. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Picks the result with this exact postal code, else OneMap's first hit. */
export function pickPostalResult(
  postal: string,
  data: AddressResponse,
): LatLng | null {
  const results = data.results ?? [];
  const match = results.find((r) => r.POSTAL === postal) ?? results[0];
  if (!match) return null;
  const lat = parseFloat(match.LATITUDE);
  const lng = parseFloat(match.LONGITUDE);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

/**
 * Looks up a postal code with OneMap. Resolves to null if the postal code
 * doesn't exist; rejects if OneMap can't be reached.
 */
export async function lookupPostalCode(
  postal: string,
  signal?: AbortSignal,
): Promise<LatLng | null> {
  const params = new URLSearchParams({
    searchVal: postal.trim(),
    returnGeom: "Y",
    getAddrDetails: "Y",
    pageNum: "1",
  });
  const res = await fetch(`${ONEMAP_SEARCH_URL}?${params}`, { signal });
  if (!res.ok) throw new Error(`OneMap responded ${res.status}`);
  return pickPostalResult(postal.trim(), (await res.json()) as AddressResponse);
}
