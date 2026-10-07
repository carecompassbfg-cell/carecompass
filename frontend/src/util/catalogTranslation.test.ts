import { describe, expect, it } from "vitest";
import schemesSgCatalog from "../../public/data/catalog.schemessg.json";
import schemesSgZh from "../../public/data/catalog.schemessg.zh.json";
import tier1Catalog from "../../public/data/catalog.tier1.json";
import tier1Zh from "../../public/data/catalog.tier1.zh.json";
import { CatalogScheme } from "@/types/scheme";
import {
  applyCatalogOverlay,
  canonicalSourceText,
  fnv1a32,
  overlayUrl,
  sourceHash,
} from "@/util/catalogTranslation";

// Same vectors as scrapers/schemessg/tests/test_zh_status.py, so the browser
// and Python hashes can't drift apart
const SCHEME = {
  id: "X",
  name: "Home Caregiving Grant",
  agency: "AIC",
  summary: 'Monthly cash.\nLine "two"',
  whatYouGet: ["$600 a month", "护联局"],
  valueText: null,
  link: "https://example.sg",
} as unknown as CatalogScheme;

const english = (overrides: Partial<CatalogScheme> = {}): CatalogScheme =>
  ({
    id: "HOME-CAREGIVING-GRANT",
    source: "carecompass",
    sourceId: null,
    tier: 1,
    name: "Home Caregiving Grant",
    agency: "AIC",
    summary: "Monthly cash.",
    description: "Monthly cash.",
    whatYouGet: ["$600 a month"],
    valueText: "Up to $600 a month",
    payFor: "monthly_payouts",
    area: { kind: "islandwide" },
    link: "https://www.aic.sg/hcg",
    sources: [{ name: "AIC", url: "https://www.aic.sg/hcg" }],
    checkerId: "HOME-CAREGIVING-GRANT",
    eligibility: "- Singapore Citizen",
    ...overrides,
  }) as CatalogScheme;

const zh = {
  name: "居家看护津贴",
  agency: "护联局",
  summary: "每月现金。",
  whatYouGet: ["每月$600"],
  valueText: "每月最高$600",
};

describe("hash", () => {
  it("matches the Python implementation", () => {
    expect(fnv1a32("")).toBe("811c9dc5");
    expect(fnv1a32("a")).toBe("e40c292c");
    expect(fnv1a32("居家看护津贴 $600")).toBe("d0856d28");
    expect(canonicalSourceText(SCHEME)).toBe(
      '{"name":"Home Caregiving Grant","agency":"AIC",' +
        '"summary":"Monthly cash.\\nLine \\"two\\"","description":null,' +
        '"whatYouGet":["$600 a month","护联局"],"valueText":null,' +
        '"eligibility":null,"nextSteps":null}',
    );
    expect(sourceHash(SCHEME)).toBe("6d692190");
  });

  it("ignores fields that aren't translated", () => {
    expect(sourceHash(english({ link: "https://other.sg" }))).toBe(
      sourceHash(english()),
    );
  });
});

describe("applyCatalogOverlay", () => {
  it("uses a translation that matches the current English", () => {
    const scheme = english();
    const [out] = applyCatalogOverlay([scheme], {
      [scheme.id]: { _en: sourceHash(scheme), ...zh },
    });
    expect(out).toMatchObject(zh);
    // Untranslated fields and everything else stay as they were
    expect(out.description).toBe("Monthly cash.");
    expect(out.eligibility).toBe("- Singapore Citizen");
    expect(out.id).toBe(scheme.id);
    expect(out.link).toBe(scheme.link);
    expect(out.checkerId).toBe(scheme.checkerId);
  });

  it("falls back to English when the English changed since translating", () => {
    const before = english();
    const after = english({ summary: "Monthly cash, now more." });
    const [out] = applyCatalogOverlay([after], {
      [after.id]: { _en: sourceHash(before), ...zh },
    });
    expect(out).toBe(after);
  });

  it("only translates the matching scheme", () => {
    const a = english({ id: "A" });
    const b = english({ id: "B", summary: "Other" });
    const out = applyCatalogOverlay([a, b], {
      A: { _en: sourceHash(a), ...zh },
    });
    expect(out[0].name).toBe("居家看护津贴");
    expect(out[1]).toBe(b);
  });

  it("never overwrites ids, links or check logic, and ignores bad values", () => {
    const scheme = english({ valueText: undefined });
    const [out] = applyCatalogOverlay([scheme], {
      [scheme.id]: {
        _en: sourceHash(scheme),
        id: "HACKED",
        link: "https://evil.example",
        checkerId: "NONE",
        payFor: "transport",
        name: "居家看护津贴",
        summary: 42,
        agency: "  ",
        whatYouGet: "not a list",
        valueText: "English had none",
      },
    });
    expect(out.id).toBe(scheme.id);
    expect(out.link).toBe(scheme.link);
    expect(out.checkerId).toBe(scheme.checkerId);
    expect(out.payFor).toBe(scheme.payFor);
    expect(out.name).toBe("居家看护津贴");
    expect(out.summary).toBe(scheme.summary);
    expect(out.agency).toBe("AIC");
    expect(out.whatYouGet).toEqual(scheme.whatYouGet);
    expect(out.valueText).toBeUndefined();
  });

  it("leaves everything in English when the overlay is unusable", () => {
    const schemes = [english()];
    for (const overlay of [null, undefined, "x", 3, [], { other: 1 }]) {
      expect(applyCatalogOverlay(schemes, overlay)).toEqual(schemes);
    }
  });

  it("finds the overlay file next to the catalog", () => {
    expect(overlayUrl("/data/catalog.tier1.json", "zh")).toBe(
      "/data/catalog.tier1.zh.json",
    );
  });
});

// The committed overlays apply cleanly. They may go stale when the English
// changes (that scheme then shows in English and the sync report lists it,
// see scrapers/schemessg/zh_status.py), so staleness isn't a test failure.
describe("committed overlays", () => {
  const catalogs: [string, CatalogScheme[], unknown][] = [
    ["tier1", tier1Catalog as unknown as CatalogScheme[], tier1Zh],
    ["schemessg", schemesSgCatalog as unknown as CatalogScheme[], schemesSgZh],
  ];

  it.each(catalogs)("%s: change only text fields", (_, schemes, overlay) => {
    const out = applyCatalogOverlay(schemes, overlay);
    expect(out).toHaveLength(schemes.length);
    out.forEach((scheme, index) => {
      const { id, link, payFor, area, sources, tier, checkerId } =
        schemes[index];
      expect({
        id: scheme.id,
        link: scheme.link,
        payFor: scheme.payFor,
        area: scheme.area,
        sources: scheme.sources,
        tier: scheme.tier,
        checkerId: scheme.checkerId,
      }).toEqual({ id, link, payFor, area, sources, tier, checkerId });
      expect(scheme.whatYouGet).toHaveLength(schemes[index].whatYouGet.length);
    });
  });
});
