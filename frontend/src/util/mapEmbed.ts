// Google Maps Embed API (free, unlimited). Set NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY
// in Vercel to CareCompass's own key, restricted to the Maps Embed API and to
// the *.carecompass.sg referrers. Until then we fall back to the key that was
// previously hard-coded here (borrowed from embed-map.com, which we don't
// control and which can stop working at any time).
const FALLBACK_EMBED_KEY = "AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8";

export interface MapEmbedPlace {
  name: string;
  postalCode?: string | null;
}

/** The search text for the map pin: centre name plus postal code. */
export function mapEmbedQuery({ name, postalCode }: MapEmbedPlace): string {
  return [name, postalCode ? `Singapore ${postalCode}` : "Singapore"]
    .filter(Boolean)
    .join(", ");
}

export function buildMapEmbedUrl(place: MapEmbedPlace): string {
  const key =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY || FALLBACK_EMBED_KEY;
  const params = new URLSearchParams({ key, q: mapEmbedQuery(place) });
  return `https://www.google.com/maps/embed/v1/place?${params}`;
}
