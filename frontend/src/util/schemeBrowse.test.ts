import { describe, expect, it } from "vitest";
import {
  CatalogScheme,
  PayForCategory,
  SchemeStatusKind,
} from "@/types/scheme";
import {
  applyFilters,
  areaKey,
  buildBrowseQuery,
  chipLabel,
  EMPTY_FILTERS,
  firstNotMetReason,
  getAlsoMatching,
  getAreaOptions,
  getOptionCounts,
  getPayForOptions,
  groupByStatus,
  hasActiveFilters,
  matchesSearch,
  parseBrowseQuery,
  sortFlat,
} from "@/util/schemeBrowse";
import { SchemeWithStatus } from "@/util/schemeCatalog";

const scheme = (
  name: string,
  overrides: Partial<CatalogScheme> = {},
): CatalogScheme => ({
  id: name.toLowerCase().replace(/\W+/g, "-"),
  source: "schemes_sg",
  sourceId: "x",
  tier: 2,
  name,
  agency: "AIC",
  summary: "",
  description: "",
  whatYouGet: [],
  payFor: PayForCategory.MEDICAL_BILLS,
  area: { kind: "islandwide" },
  link: "https://example.com",
  sources: [],
  ...overrides,
});

const item = (
  s: CatalogScheme,
  status: SchemeStatusKind,
  reasonsNotMet: string[] = [],
): SchemeWithStatus => ({
  scheme: s,
  status: {
    status,
    reasonsMet: [],
    reasonsNotMet,
    questionsToAsk: [],
    agencyWillCheck: [],
  },
});

const CHAS = item(
  scheme("Community Health Assist Scheme (CHAS)", {
    agency: "MOH",
    summary: "Subsidies for medical and dental care at clinics.",
  }),
  "provider_decides",
);
const MEDIFUND = item(
  scheme("Medifund", { summary: "Help with medical bills" }),
  "provider_decides",
);
const MEDISAVE_CARE = item(
  scheme("MediSave Care", {
    tier: 1,
    source: "carecompass",
    agency: "AIC / CPF",
    payFor: PayForCategory.MONTHLY_PAYOUTS,
    whatYouGet: ["$200 a month with $20,000+ in MediSave"],
  }),
  "likely",
);
const TRANSPORT = item(
  scheme("Singapore Red Cross' TransportAid", {
    agency: "Singapore Red Cross",
    payFor: PayForCategory.TRANSPORT,
  }),
  "provider_decides",
);
const SOUTH_WEST = item(
  scheme("South West Caregiver Support Fund", {
    agency: "South West CDC",
    payFor: PayForCategory.MONTHLY_PAYOUTS,
    area: { kind: "district", name: "South West District" },
  }),
  "provider_decides",
);
const MDW = item(
  scheme("Migrant Domestic Worker Levy Concession", {
    tier: 1,
    source: "carecompass",
    agency: "MOM",
    payFor: PayForCategory.HELPER_COSTS,
  }),
  "not_a_match",
  ["Must live with you at the same address"],
);
const HCG = item(
  scheme("Home Caregiving Grant", {
    tier: 1,
    source: "carecompass",
    payFor: PayForCategory.MONTHLY_PAYOUTS,
  }),
  "needs_answers",
);
const ALL = [CHAS, MEDIFUND, MEDISAVE_CARE, TRANSPORT, SOUTH_WEST, MDW, HCG];
const names = (items: SchemeWithStatus[]) => items.map((i) => i.scheme.name);

describe("matchesSearch", () => {
  it("is case-insensitive and needs every word to match", () => {
    expect(matchesSearch(CHAS.scheme, "MEDICAL")).toBe(true);
    expect(matchesSearch(CHAS.scheme, "medical dental")).toBe(true);
    expect(matchesSearch(CHAS.scheme, "medical transport")).toBe(false);
  });

  it("looks at name, agency, summary and what you get", () => {
    expect(matchesSearch(TRANSPORT.scheme, "transportaid")).toBe(true);
    expect(matchesSearch(CHAS.scheme, "moh")).toBe(true);
    expect(matchesSearch(CHAS.scheme, "clinics")).toBe(true);
    expect(matchesSearch(MEDISAVE_CARE.scheme, "medisave $20,000")).toBe(true);
  });

  it("matches everything when empty", () => {
    expect(matchesSearch(CHAS.scheme, "   ")).toBe(true);
  });
});

describe("filters", () => {
  it("combines search, status, pay-for and area", () => {
    expect(
      names(applyFilters(ALL, { ...EMPTY_FILTERS, q: "medical" })),
    ).toEqual(["Community Health Assist Scheme (CHAS)", "Medifund"]);
    expect(
      names(
        applyFilters(ALL, {
          ...EMPTY_FILTERS,
          status: ["provider_decides"],
          payFor: [PayForCategory.MONTHLY_PAYOUTS],
        }),
      ),
    ).toEqual(["South West Caregiver Support Fund"]);
    expect(
      names(
        applyFilters(ALL, { ...EMPTY_FILTERS, area: ["south-west-district"] }),
      ),
    ).toEqual(["South West Caregiver Support Fund"]);
    expect(
      applyFilters(ALL, {
        ...EMPTY_FILTERS,
        status: ["likely", "not_a_match"],
      }),
    ).toHaveLength(2);
  });

  it("counts each option given the search and the other filters", () => {
    const counts = getOptionCounts(ALL, {
      ...EMPTY_FILTERS,
      q: "medical",
      status: ["provider_decides"],
    });
    // Status counts ignore the status filter itself
    expect(counts.status).toEqual({
      likely: 0,
      needs_answers: 0,
      provider_decides: 2,
      not_a_match: 0,
    });
    expect(counts.payFor[PayForCategory.MEDICAL_BILLS]).toBe(2);
    expect(counts.payFor[PayForCategory.TRANSPORT]).toBe(0);
    expect(counts.area).toEqual({ islandwide: 2 });
  });

  it("lists areas: islandwide, then each district in the catalogue", () => {
    expect(getAreaOptions(ALL)).toEqual([
      { value: "islandwide", label: "Islandwide" },
      { value: "south-west-district", label: "South West District" },
    ]);
    expect(areaKey(SOUTH_WEST.scheme)).toBe("south-west-district");
  });

  it("orders pay-for options by how many schemes they have", () => {
    expect(getPayForOptions(ALL)).toEqual([
      PayForCategory.MONTHLY_PAYOUTS,
      PayForCategory.MEDICAL_BILLS,
      PayForCategory.HELPER_COSTS,
      PayForCategory.TRANSPORT,
    ]);
  });

  it("labels chips with the selection", () => {
    const areas = getAreaOptions(ALL);
    expect(chipLabel("status", EMPTY_FILTERS, areas)).toBe("Status");
    expect(
      chipLabel(
        "status",
        { ...EMPTY_FILTERS, status: ["provider_decides"] },
        areas,
      ),
    ).toBe("Check with agency");
    expect(
      chipLabel(
        "payFor",
        {
          ...EMPTY_FILTERS,
          payFor: [PayForCategory.MEDICAL_BILLS, PayForCategory.TRANSPORT],
        },
        areas,
      ),
    ).toBe("Medical bills +1");
    expect(
      chipLabel(
        "area",
        { ...EMPTY_FILTERS, area: ["south-west-district"] },
        areas,
      ),
    ).toBe("South West District");
  });
});

describe("URL query", () => {
  const areas = ["islandwide", "south-west-district"];
  const parse = (query: string) =>
    parseBrowseQuery(new URLSearchParams(query), areas);

  it("parses every filter", () => {
    expect(
      parse(
        "q= medical &status=provider_decides,likely&payFor=medical_bills&area=islandwide",
      ),
    ).toEqual({
      q: "medical",
      status: ["likely", "provider_decides"],
      payFor: [PayForCategory.MEDICAL_BILLS],
      area: ["islandwide"],
    });
  });

  it("ignores unknown values and duplicates", () => {
    expect(
      parse(
        "status=likely,bogus,likely&payFor=nope&area=mars,south-west-district&x=1",
      ),
    ).toEqual({
      q: "",
      status: ["likely"],
      payFor: [],
      area: ["south-west-district"],
    });
  });

  it("builds a query with readable commas, leaving out empty filters", () => {
    expect(buildBrowseQuery(EMPTY_FILTERS)).toBe("");
    expect(
      buildBrowseQuery({
        ...EMPTY_FILTERS,
        q: "medical bills",
        status: ["likely", "needs_answers"],
      }),
    ).toBe("?q=medical+bills&status=likely,needs_answers");
  });

  it("round-trips", () => {
    const filters = {
      q: "transport",
      status: ["provider_decides" as SchemeStatusKind],
      payFor: [PayForCategory.TRANSPORT],
      area: ["islandwide"],
    };
    expect(parse(buildBrowseQuery(filters).slice(1))).toEqual(filters);
  });

  it("knows when anything is active", () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, q: "x" })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, area: ["islandwide"] })).toBe(
      true,
    );
  });
});

describe("grouping and sorting", () => {
  it("groups by status, Tier 1 first, then by name", () => {
    const groups = groupByStatus(ALL);
    expect(names(groups.likely)).toEqual(["MediSave Care"]);
    expect(names(groups.needs_answers)).toEqual(["Home Caregiving Grant"]);
    expect(names(groups.provider_decides)).toEqual([
      "Community Health Assist Scheme (CHAS)",
      "Medifund",
      "Singapore Red Cross' TransportAid",
      "South West Caregiver Support Fund",
    ]);
    expect(names(groups.not_a_match)).toEqual([
      "Migrant Domestic Worker Levy Concession",
    ]);
  });

  it("sorts a flat list by status, then tier, then name", () => {
    expect(names(sortFlat([TRANSPORT, MDW, HCG, MEDISAVE_CARE]))).toEqual([
      "MediSave Care",
      "Home Caregiving Grant",
      "Singapore Red Cross' TransportAid",
      "Migrant Domestic Worker Levy Concession",
    ]);
  });
});

describe("also matching", () => {
  it("lists search matches from the other statuses", () => {
    const also = getAlsoMatching(
      [...ALL, item(scheme("MediSave Care (medical)", { tier: 1 }), "likely")],
      { ...EMPTY_FILTERS, q: "medical", status: ["provider_decides"] },
    );
    expect(names(also)).toEqual(["MediSave Care (medical)"]);
  });

  it("is empty without search text or a status filter", () => {
    expect(getAlsoMatching(ALL, { ...EMPTY_FILTERS, q: "medical" })).toEqual(
      [],
    );
    expect(
      getAlsoMatching(ALL, { ...EMPTY_FILTERS, status: ["likely"] }),
    ).toEqual([]);
  });
});

describe("not a fit", () => {
  it("collects the not-a-fit schemes with their first reason", () => {
    const groups = groupByStatus(ALL);
    expect(groups.not_a_match.map(firstNotMetReason)).toEqual([
      "Must live with you at the same address",
    ]);
  });

  it("strips markdown links from the reason", () => {
    const elderFund = item(scheme("CareShield"), "not_a_match", [
      "Only if covered. See [ElderFund](/dashboard/schemes?id=x) instead",
    ]);
    expect(firstNotMetReason(elderFund)).toBe(
      "Only if covered. See ElderFund instead",
    );
  });
});
