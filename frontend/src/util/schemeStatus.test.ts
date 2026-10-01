import { describe, expect, it } from "vitest";
import schemesSgCatalog from "../../public/data/catalog.schemessg.json";
import tier1Catalog from "../../public/data/catalog.tier1.json";
import {
  CatalogScheme,
  PayForCategory,
  ProfileQuestionId,
} from "@/types/scheme";
import {
  Citizenship,
  Relationship,
  Residence,
  UserDataFull,
} from "@/types/user";
import { getSchemeStatus } from "@/util/schemeStatus";

const TIER1 = tier1Catalog as CatalogScheme[];
const SCHEMES_SG = schemesSgCatalog as CatalogScheme[];

const findScheme = (id: string): CatalogScheme => {
  const scheme = TIER1.find((s) => s.id === id);
  if (!scheme) throw new Error(`Scheme ${id} not in the Tier 1 catalog`);
  return scheme;
};

const TIER2_SCHEME: CatalogScheme = {
  id: "ssg-example",
  source: "schemes_sg",
  sourceId: "abc",
  tier: 2,
  name: "Example",
  agency: "Agency",
  summary: "",
  description: "",
  whatYouGet: [],
  payFor: PayForCategory.TRANSPORT,
  area: { kind: "islandwide" },
  link: "https://example.com",
  sources: [],
  lastRefreshed: "2026-09-29",
};

const makeUser = (overrides: Partial<UserDataFull> = {}): UserDataFull => ({
  citizenship: Citizenship.CITIZEN,
  care_recipient_age: 75,
  care_recipient_citizenship: Citizenship.CITIZEN,
  care_recipient_residence: Residence.HOME,
  care_recipient_relationship: Relationship.PARENT,
  household_size: 3,
  total_monthly_household_income: 3000,
  annual_property_value: 15000,
  monthly_pchi: 1000,
  ...overrides,
});

// The profile stores null until the caregiver shares household income,
// even though UserDataFull types it as number.
const withoutPchi = (user: UserDataFull): UserDataFull => ({
  ...user,
  monthly_pchi: null as unknown as number,
});

describe("getSchemeStatus", () => {
  it("returns provider_decides for a Tier 2 scheme", () => {
    expect(getSchemeStatus(TIER2_SCHEME, makeUser()).status).toBe(
      "provider_decides",
    );
    expect(getSchemeStatus(TIER2_SCHEME, null).status).toBe("provider_decides");
  });

  it("keeps a Tier 1 scheme with only agency checks as likely", () => {
    const result = getSchemeStatus(
      findScheme("CAREGIVERS-TRAINING-GRANT"),
      makeUser(),
    );
    expect(result.status).toBe("likely");
    expect(result.questionsToAsk).toEqual([]);
    expect(result.agencyWillCheck).toContain(
      "Selected course is on the approved list of courses",
    );
  });

  it("asks for household income when monthly_pchi is missing", () => {
    const result = getSchemeStatus(
      findScheme("HOME-CAREGIVING-GRANT"),
      withoutPchi(makeUser()),
    );
    expect(result.status).toBe("needs_answers");
    expect(result.questionsToAsk).toEqual([ProfileQuestionId.HOUSEHOLD_INCOME]);
    // Income tiers are questions for the caregiver, not agency checks
    expect(
      result.agencyWillCheck.some((d) =>
        d.includes("household monthly income"),
      ),
    ).toBe(false);
    expect(result.agencyWillCheck).toHaveLength(1);
  });

  it("asks for household income for the MOH subsidy too", () => {
    const result = getSchemeStatus(
      findScheme("MOH-NR-LTC-SUBSIDY"),
      withoutPchi(makeUser()),
    );
    expect(result.status).toBe("needs_answers");
    expect(result.questionsToAsk).toEqual([ProfileQuestionId.HOUSEHOLD_INCOME]);
    expect(result.agencyWillCheck).toEqual([
      "The service provider is government-funded",
    ]);
  });

  it("returns not_a_match for an ineligible profile", () => {
    const result = getSchemeStatus(
      findScheme("HOME-CAREGIVING-GRANT"),
      makeUser({ care_recipient_citizenship: Citizenship.OTHER }),
    );
    expect(result.status).toBe("not_a_match");
    expect(result.reasonsNotMet).toContain(
      "Care recipient is a Singapore Citizen (SC)",
    );
  });

  it("asks for the age instead of treating 0 as aged 0", () => {
    for (const id of ["PARENT-RELIEF", "CAREGIVERS-TRAINING-GRANT"]) {
      const result = getSchemeStatus(
        findScheme(id),
        makeUser({ care_recipient_age: 0 }),
      );
      expect(result.status).toBe("needs_answers");
      expect(result.questionsToAsk).toContain(
        ProfileQuestionId.CARE_RECIPIENT_AGE,
      );
      expect(result.reasonsNotMet).toEqual([]);
    }
  });

  it("asks for the age of a PR care recipient for the MDW levy concession", () => {
    const result = getSchemeStatus(
      findScheme("MIGRANT-DOMESTIC-WORKER-LEVY"),
      makeUser({
        care_recipient_age: null as unknown as number,
        care_recipient_citizenship: Citizenship.PR,
      }),
    );
    expect(result.status).toBe("needs_answers");
    expect(result.questionsToAsk).toEqual([
      ProfileQuestionId.CARE_RECIPIENT_AGE,
    ]);
  });

  it("marks signed-out questions as needing sign-in", () => {
    const result = getSchemeStatus(findScheme("PARENT-RELIEF"), null);
    expect(result.requiresSignIn).toBe(true);
  });

  it("returns needs_answers with questions for every Tier 1 scheme when signed out", () => {
    for (const scheme of TIER1) {
      const result = getSchemeStatus(scheme, null);
      expect(result.status).toBe("needs_answers");
      expect(result.questionsToAsk.length).toBeGreaterThan(0);
    }
  });
});

const GENERIC_GIVES = [
  "financial assistance (general)",
  "information services",
  "referral services",
  "referral and information services",
];

describe("catalog files", () => {
  const payFor = Object.values(PayForCategory) as string[];

  it("catalog.tier1.json has our 5 Tier 1 schemes, each with a checker", () => {
    expect(TIER1).toHaveLength(5);
    for (const scheme of TIER1) {
      expect(scheme.tier).toBe(1);
      expect(scheme.source).toBe("carecompass");
      expect(scheme.checkerId).toBeDefined();
      expect(payFor).toContain(scheme.payFor);
      // Tier 1 records when we checked it, not a sync date
      expect(Number.isNaN(Date.parse(scheme.lastChecked ?? ""))).toBe(false);
      expect(scheme.lastRefreshed).toBeUndefined();
    }
  });

  it("catalog.schemessg.json has only published Tier 2 schemes", () => {
    expect(SCHEMES_SG.length).toBeGreaterThan(0);
    for (const scheme of SCHEMES_SG) {
      expect(scheme.tier).toBe(2);
      expect(scheme.source).toBe("schemes_sg");
      expect(scheme.sourceId).toBeTruthy();
      expect(scheme.checkerId).toBeUndefined();
      // valueText only comes from a reviewed override in overrides.json
      if (scheme.valueText !== undefined) {
        expect(scheme.valueText.length).toBeGreaterThan(0);
      }
      for (const item of scheme.whatYouGet) {
        expect(GENERIC_GIVES).not.toContain(item.toLowerCase());
      }
      expect(scheme.name.startsWith("[Sample]")).toBe(false);
      expect(payFor).toContain(scheme.payFor);
      expect(Number.isNaN(Date.parse(scheme.lastRefreshed ?? ""))).toBe(false);
      expect(scheme.lastChecked).toBeUndefined();
    }
  });

  it("ids are unique across both files", () => {
    const ids = [...TIER1, ...SCHEMES_SG].map((scheme) => scheme.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
