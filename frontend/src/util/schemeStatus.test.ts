import { describe, expect, it } from "vitest";
import catalog from "../../public/data/catalog.sample.json";
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

const CATALOG = catalog as CatalogScheme[];

const findScheme = (id: string): CatalogScheme => {
  const scheme = CATALOG.find((s) => s.id === id);
  if (!scheme) throw new Error(`Scheme ${id} not in sample catalog`);
  return scheme;
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
    const tier2 = CATALOG.find((s) => s.tier === 2)!;
    expect(getSchemeStatus(tier2, makeUser()).status).toBe("provider_decides");
    expect(getSchemeStatus(tier2, null).status).toBe("provider_decides");
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

  it("returns needs_answers with questions for every Tier 1 scheme when signed out", () => {
    for (const scheme of CATALOG.filter((s) => s.tier === 1)) {
      const result = getSchemeStatus(scheme, null);
      expect(result.status).toBe("needs_answers");
      expect(result.questionsToAsk.length).toBeGreaterThan(0);
    }
  });
});

describe("catalog.sample.json", () => {
  it("has well-formed entries", () => {
    const payFor = Object.values(PayForCategory) as string[];
    for (const scheme of CATALOG) {
      expect(payFor).toContain(scheme.payFor);
      expect(Number.isNaN(Date.parse(scheme.lastRefreshed))).toBe(false);
      if (scheme.tier === 1) {
        expect(scheme.source).toBe("carecompass");
        expect(scheme.checkerId).toBeDefined();
      } else {
        expect(scheme.source).toBe("schemes_sg");
        expect(scheme.name.startsWith("[Sample]")).toBe(true);
      }
    }
  });
});
