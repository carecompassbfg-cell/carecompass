import { CatalogScheme } from "@/types/scheme";

// Translated scheme text lives in overlays next to the English catalogs
// (e.g. /data/catalog.tier1.zh.json), keyed by scheme id. Each entry holds
// the translated text fields plus "_en": a hash of the English text it was
// translated from. A translation is used only when that hash matches the
// current English, so a scheme whose English changed shows in English until
// its translation is updated (see docs/i18n/README.md).
//
// The hash: FNV-1a 32-bit over the UTF-8 bytes of a canonical JSON string of
// TRANSLATED_FIELDS (in this order, missing fields as null, no spaces), as 8
// lowercase hex digits. scrapers/schemessg/zh_status.py computes the same
// thing; keep the two in step.

export const TRANSLATED_FIELDS = [
  "name",
  "agency",
  "summary",
  "description",
  "whatYouGet",
  "valueText",
  "eligibility",
  "nextSteps",
] as const;

type TranslatedField = (typeof TRANSLATED_FIELDS)[number];

export type CatalogOverlayEntry = { _en: string } & Partial<
  Pick<CatalogScheme, TranslatedField>
>;

export type CatalogOverlay = Record<string, CatalogOverlayEntry>;

export const fnv1a32 = (text: string): string => {
  let hash = 0x811c9dc5;
  const bytes = new TextEncoder().encode(text);
  for (let i = 0; i < bytes.length; i++) {
    hash ^= bytes[i];
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
};

export const canonicalSourceText = (scheme: Partial<CatalogScheme>): string =>
  JSON.stringify(
    Object.fromEntries(
      TRANSLATED_FIELDS.map((field) => [field, scheme[field] ?? null]),
    ),
  );

// The "_en" value a translation of this scheme's current English should have
export const sourceHash = (scheme: Partial<CatalogScheme>): string =>
  fnv1a32(canonicalSourceText(scheme));

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

// Only fields the English has, with the same type, are taken from the
// overlay; ids, links, categories and check logic always stay English.
const translatedFields = (
  scheme: CatalogScheme,
  entry: Record<string, unknown>,
): Partial<CatalogScheme> => {
  const out: Partial<Record<TranslatedField, unknown>> = {};
  for (const field of TRANSLATED_FIELDS) {
    const english = scheme[field];
    const value = entry[field];
    if (english === undefined || english === null) continue;
    if (field === "whatYouGet") {
      if (isStringArray(value)) out[field] = value;
    } else if (typeof value === "string" && value.trim()) {
      out[field] = value;
    }
  }
  return out as Partial<CatalogScheme>;
};

// Puts translated text over the English catalog, scheme by scheme. Schemes
// with no translation, a stale one (English changed since) or a malformed
// one stay in English. A bad overlay leaves the whole catalog in English.
export const applyCatalogOverlay = (
  schemes: CatalogScheme[],
  overlay: unknown,
): CatalogScheme[] => {
  if (typeof overlay !== "object" || overlay === null || Array.isArray(overlay))
    return schemes;
  const entries = overlay as Record<string, unknown>;
  return schemes.map((scheme) => {
    const entry = Object.prototype.hasOwnProperty.call(entries, scheme.id)
      ? entries[scheme.id]
      : undefined;
    if (typeof entry !== "object" || entry === null) return scheme;
    const record = entry as Record<string, unknown>;
    if (record._en !== sourceHash(scheme)) return scheme;
    return { ...scheme, ...translatedFields(scheme, record) };
  });
};

// The overlay file for an English catalog URL, e.g.
// /data/catalog.tier1.json → /data/catalog.tier1.zh.json
export const overlayUrl = (catalogUrl: string, locale: string): string =>
  catalogUrl.replace(/\.json$/, `.${locale}.json`);
