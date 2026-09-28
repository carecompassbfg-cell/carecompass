import { describe, expect, it } from "vitest";
import catalog from "../../public/data/catalog.sample.json";
import {
  CatalogScheme,
  PayForCategory,
  SchemeStatus,
  SchemeStatusKind,
} from "@/types/scheme";
import {
  countByCategory,
  countByStatus,
  pickBestMatches,
  SchemeWithStatus,
  sortBestMatches,
} from "@/util/schemeCatalog";

const makeScheme = (
  id: string,
  tier: 1 | 2,
  payFor: PayForCategory = PayForCategory.CARE_SERVICES,
): CatalogScheme => ({
  id,
  source: tier === 1 ? "carecompass" : "schemes_sg",
  sourceId: null,
  tier,
  name: id,
  agency: "Agency",
  summary: "",
  description: "",
  whatYouGet: [],
  payFor,
  area: { kind: "islandwide" },
  link: "https://example.com",
  sources: [],
  lastRefreshed: "2026-09-28",
});

const makeStatus = (status: SchemeStatusKind): SchemeStatus => ({
  status,
  reasonsMet: [],
  reasonsNotMet: [],
  questionsToAsk: [],
  agencyWillCheck: [],
});

const item = (
  id: string,
  tier: 1 | 2,
  status: SchemeStatusKind,
): SchemeWithStatus => ({
  scheme: makeScheme(id, tier),
  status: makeStatus(status),
});

const ids = (items: SchemeWithStatus[]) => items.map(({ scheme }) => scheme.id);

describe("pickBestMatches", () => {
  const items = [
    item("t2-needs", 2, "needs_answers"),
    item("t1-provider", 1, "provider_decides"),
    item("t1-needs", 1, "needs_answers"),
    item("t2-likely", 2, "likely"),
    item("t1-nomatch", 1, "not_a_match"),
    item("t1-likely-a", 1, "likely"),
    item("t1-likely-b", 1, "likely"),
  ];

  it("keeps only likely and needs_answers, likely first, Tier 1 before Tier 2", () => {
    expect(ids(sortBestMatches(items))).toEqual([
      "t1-likely-a",
      "t1-likely-b",
      "t2-likely",
      "t1-needs",
      "t2-needs",
    ]);
  });

  it("returns at most 4 by default", () => {
    expect(ids(pickBestMatches(items))).toEqual([
      "t1-likely-a",
      "t1-likely-b",
      "t2-likely",
      "t1-needs",
    ]);
  });

  it("returns nothing when no scheme is likely or needs answers", () => {
    expect(
      pickBestMatches([
        item("a", 2, "provider_decides"),
        item("b", 1, "not_a_match"),
      ]),
    ).toEqual([]);
  });
});

describe("countByCategory", () => {
  it("counts schemes per category and leaves out empty categories", () => {
    const counts = countByCategory([
      makeScheme("a", 1, PayForCategory.TAX_CPF),
      makeScheme("b", 2, PayForCategory.TAX_CPF),
      makeScheme("c", 2, PayForCategory.TRANSPORT),
    ]);
    expect(counts).toEqual({
      [PayForCategory.TAX_CPF]: 2,
      [PayForCategory.TRANSPORT]: 1,
    });
    expect(counts[PayForCategory.MEDICAL_BILLS]).toBeUndefined();
  });

  it("covers every scheme in the sample catalog", () => {
    const schemes = catalog as CatalogScheme[];
    const counts = countByCategory(schemes);
    const total = Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0);
    expect(total).toBe(schemes.length);
    expect(counts[PayForCategory.CARE_SERVICES]).toBe(2);
  });
});

describe("countByStatus", () => {
  it("counts each status, including zeroes", () => {
    expect(
      countByStatus([
        item("a", 1, "likely"),
        item("b", 1, "likely"),
        item("c", 2, "provider_decides"),
      ]),
    ).toEqual({
      likely: 2,
      needs_answers: 0,
      provider_decides: 1,
      not_a_match: 0,
    });
  });
});
