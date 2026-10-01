import { describe, expect, it } from "vitest";
import tier1Catalog from "../../public/data/catalog.tier1.json";
import { CatalogScheme, ProfileQuestionId } from "@/types/scheme";
import {
  Citizenship,
  Relationship,
  Residence,
  UserDataFull,
} from "@/types/user";
import { CheckAnswers } from "@/util/eligibilityChecker";
import { getSchemeStatus } from "@/util/schemeStatus";

// All rules follow docs/schemes/tier1-schemes.md. One fixed date so nothing
// depends on when the tests run.
const TODAY = new Date("2026-10-01T12:00:00+08:00");
const TIER1 = tier1Catalog as CatalogScheme[];

const Q = ProfileQuestionId;

// The test profile from the step 4 brief: aged 78, SC, lives at home, no
// income given, caring for a parent
const makeUser = (overrides: Partial<UserDataFull> = {}): UserDataFull => ({
  citizenship: Citizenship.CITIZEN,
  care_recipient_age: 78,
  care_recipient_citizenship: Citizenship.CITIZEN,
  care_recipient_residence: Residence.HOME,
  care_recipient_relationship: Relationship.PARENT,
  household_size: 2,
  total_monthly_household_income: null as unknown as number,
  annual_property_value: null as unknown as number,
  monthly_pchi: null as unknown as number,
  ...overrides,
});

const withIncome = (pchi: number, annualValue = 15000) => ({
  monthly_pchi: pchi,
  annual_property_value: annualValue,
});

const status = (
  id: string,
  user: UserDataFull = makeUser(),
  answers: CheckAnswers = {},
  today: Date = TODAY,
) => {
  const scheme = TIER1.find((s) => s.id === id);
  if (!scheme) throw new Error(`${id} not in catalog.tier1.json`);
  return getSchemeStatus(scheme, user, { answers, today });
};

const SEVERE: CheckAnswers = { adlCount: 3, adlFullHelp: "yes" };

describe("test profile (78, SC, at home, no income given)", () => {
  const before = (id: string) => status(id).status;
  const after = (id: string) =>
    status(id, makeUser(), { ...SEVERE, ltcInsurance: "eldershield" }).status;

  it("before answering", () => {
    expect(before("PARENT-RELIEF")).toBe("likely");
    expect(before("MIGRANT-DOMESTIC-WORKER-LEVY")).toBe("likely");
    expect(before("CAREGIVERS-TRAINING-GRANT")).toBe("likely");
    for (const id of [
      "HOME-CAREGIVING-GRANT",
      "MOH-NR-LTC-SUBSIDY",
      "SENIORS-MOBILITY-ENABLING-FUND",
      "MEDISAVE-CARE",
      "CARESHIELD-ELDERSHIELD-CLAIM",
    ]) {
      expect(before(id)).toBe("needs_answers");
    }
  });

  it("after answering 3 activities, full help, ElderShield", () => {
    expect(after("PARENT-RELIEF")).toBe("likely");
    expect(after("MIGRANT-DOMESTIC-WORKER-LEVY")).toBe("likely");
    expect(after("CAREGIVERS-TRAINING-GRANT")).toBe("likely");
    expect(after("MEDISAVE-CARE")).toBe("likely");
    expect(after("CARESHIELD-ELDERSHIELD-CLAIM")).toBe("likely");
    // Still waiting for household income
    for (const id of [
      "HOME-CAREGIVING-GRANT",
      "MOH-NR-LTC-SUBSIDY",
      "SENIORS-MOBILITY-ENABLING-FUND",
    ]) {
      const result = status(id, makeUser(), SEVERE);
      expect(result.status).toBe("needs_answers");
      expect(result.questionsToAsk).toEqual([Q.HOUSEHOLD_INCOME]);
    }
  });
});

describe("1. Parent Relief", () => {
  it("is likely for a parent aged 55+ living at home", () => {
    const result = status("PARENT-RELIEF");
    expect(result.status).toBe("likely");
    expect(result.reasonsMet).toContain("$9,000 (living with you)");
  });

  it("refers to last calendar year, not the current one", () => {
    expect(status("PARENT-RELIEF").agencyWillCheck).toContain(
      "Dependant's income in 2025 was $8,000 or less",
    );
    const in2027 = status(
      "PARENT-RELIEF",
      makeUser(),
      {},
      new Date("2027-03-01T12:00:00+08:00"),
    );
    expect(in2027.agencyWillCheck).toContain(
      "Dependant's income in 2026 was $8,000 or less",
    );
  });

  it("applies the relationship rule", () => {
    expect(
      status(
        "PARENT-RELIEF",
        makeUser({ care_recipient_relationship: Relationship.SPOUSE }),
      ).status,
    ).toBe("not_a_match");
    expect(
      status(
        "PARENT-RELIEF",
        makeUser({ care_recipient_relationship: Relationship.NON_FAMILY }),
      ).reasonsNotMet,
    ).toContain("For parents, grandparents and in-laws");
    const otherFamily = status(
      "PARENT-RELIEF",
      makeUser({ care_recipient_relationship: Relationship.OTHER_FAMILY }),
    );
    expect(otherFamily.status).toBe("likely");
    expect(otherFamily.agencyWillCheck).toContain(
      "Must be your parent, grandparent or in-law",
    );
  });

  it("ignores the age rule on the disability route", () => {
    const young = makeUser({ care_recipient_age: 50 });
    const disability = status("PARENT-RELIEF", young, { adlCount: 1 });
    expect(disability.status).toBe("likely");
    expect(disability.reasonsMet).toContain(
      "May qualify for Parent Relief (Disability): $14,000 / $10,000",
    );
    const unknown = status("PARENT-RELIEF", young);
    expect(unknown.status).toBe("needs_answers");
    expect(unknown.questionsToAsk).toEqual([Q.ADL_NEEDS]);
    expect(status("PARENT-RELIEF", young, { adlCount: 0 }).status).toBe(
      "not_a_match",
    );
  });

  it("uses the $5,500 line when they don't live with you", () => {
    const result = status(
      "PARENT-RELIEF",
      makeUser({ care_recipient_residence: Residence.OTHER }),
    );
    expect(result.reasonsMet).toContain(
      "$5,500 if you spent $2,000 or more supporting them",
    );
  });
});

describe("2. Caregivers Training Grant", () => {
  it("is likely for an SC aged 65+", () => {
    expect(status("CAREGIVERS-TRAINING-GRANT").status).toBe("likely");
  });

  it("needs at least 1 daily activity under 65", () => {
    const young = makeUser({ care_recipient_age: 60 });
    expect(
      status("CAREGIVERS-TRAINING-GRANT", young, { adlCount: 1 }).status,
    ).toBe("likely");
    expect(
      status("CAREGIVERS-TRAINING-GRANT", young, { adlCount: 0 }).status,
    ).toBe("not_a_match");
    const unknown = status("CAREGIVERS-TRAINING-GRANT", young);
    expect(unknown.status).toBe("needs_answers");
    expect(unknown.questionsToAsk).toEqual([Q.ADL_NEEDS]);
  });

  it("is not a fit for someone who isn't SC or PR", () => {
    expect(
      status(
        "CAREGIVERS-TRAINING-GRANT",
        makeUser({ care_recipient_citizenship: Citizenship.OTHER }),
      ).status,
    ).toBe("not_a_match");
  });

  it("keeps agency-only conditions out of the way", () => {
    expect(status("CAREGIVERS-TRAINING-GRANT").agencyWillCheck).toContain(
      "The course is on the approved list",
    );
  });
});

describe("3. Home Caregiving Grant", () => {
  const known = { ...withIncome(1000) };

  it("needs income and daily activities for the test profile", () => {
    const result = status("HOME-CAREGIVING-GRANT");
    expect(result.status).toBe("needs_answers");
    expect(result.questionsToAsk).toEqual([Q.HOUSEHOLD_INCOME, Q.ADL_NEEDS]);
  });

  it("does not show likely without knowing daily activities", () => {
    const result = status("HOME-CAREGIVING-GRANT", makeUser(known));
    expect(result.status).toBe("needs_answers");
    expect(result.questionsToAsk).toEqual([Q.ADL_NEEDS]);
  });

  it("needs 3 or more daily activities", () => {
    expect(
      status("HOME-CAREGIVING-GRANT", makeUser(known), { adlCount: 2 }).status,
    ).toBe("not_a_match");
    const likely = status("HOME-CAREGIVING-GRANT", makeUser(known), {
      adlCount: 3,
    });
    expect(likely.status).toBe("likely");
    expect(likely.reasonsMet).toContain(
      "$600 a month (household income per person $1,500 or less)",
    );
  });

  it("lets PRs qualify through an SC parent, child or spouse", () => {
    const pr = { ...known, care_recipient_citizenship: Citizenship.PR };
    const viaChild = status("HOME-CAREGIVING-GRANT", makeUser(pr), {
      adlCount: 3,
    });
    expect(viaChild.status).toBe("likely");
    expect(viaChild.agencyWillCheck).not.toContain(
      "PRs qualify only if a parent, child or spouse is a Singapore Citizen",
    );
    const otherPr = status(
      "HOME-CAREGIVING-GRANT",
      makeUser({ ...pr, citizenship: Citizenship.PR }),
      { adlCount: 3 },
    );
    expect(otherPr.status).toBe("likely");
    expect(otherPr.agencyWillCheck).toContain(
      "PRs qualify only if a parent, child or spouse is a Singapore Citizen",
    );
    expect(
      status(
        "HOME-CAREGIVING-GRANT",
        makeUser({ ...known, care_recipient_citizenship: Citizenship.OTHER }),
        { adlCount: 3 },
      ).status,
    ).toBe("not_a_match");
  });

  it("uses the income tiers and $4,800 cut-off", () => {
    const tier = (pchi: number, av?: number) =>
      status("HOME-CAREGIVING-GRANT", makeUser(withIncome(pchi, av)), {
        adlCount: 3,
      });
    expect(tier(3600).reasonsMet).toContain(
      "$400 a month (household income per person $1,501 to $3,600)",
    );
    expect(tier(4800).reasonsMet).toContain(
      "$200 a month (household income per person $3,601 to $4,800)",
    );
    expect(tier(4801).status).toBe("not_a_match");
    expect(tier(0, 21000).status).toBe("likely");
    expect(tier(0, 21001).status).toBe("not_a_match");
  });

  it("leaves the multiple-properties $200 rule to the agency", () => {
    expect(status("HOME-CAREGIVING-GRANT").agencyWillCheck).toContain(
      "Property ownership: households that own more than one property get $200",
    );
  });

  it("checks where they live", () => {
    expect(
      status(
        "HOME-CAREGIVING-GRANT",
        makeUser({ care_recipient_residence: Residence.NURSING_HOME_LTCF }),
      ).status,
    ).toBe("not_a_match");
    expect(
      status(
        "HOME-CAREGIVING-GRANT",
        makeUser({ ...known, care_recipient_residence: Residence.OTHER }),
        { adlCount: 3 },
      ).questionsToAsk,
    ).toEqual([Q.CARE_RECIPIENT_RESIDENCE]);
  });
});

describe("4. Migrant Domestic Worker Levy Concession", () => {
  it("is likely for an SC aged 67+ living at home", () => {
    expect(status("MIGRANT-DOMESTIC-WORKER-LEVY").status).toBe("likely");
  });

  it("checks the age for Singapore Citizens too", () => {
    const sc60 = makeUser({ care_recipient_age: 60 });
    const unknown = status("MIGRANT-DOMESTIC-WORKER-LEVY", sc60);
    expect(unknown.status).toBe("needs_answers");
    expect(unknown.questionsToAsk).toEqual([Q.ADL_NEEDS]);
    const none = status("MIGRANT-DOMESTIC-WORKER-LEVY", sc60, { adlCount: 0 });
    expect(none.status).toBe("not_a_match");
    expect(none.reasonsNotMet).toContain(
      "For someone 67 or older, or who needs help with at least one daily activity",
    );
  });

  it("applies the PR rule on the elderly route", () => {
    const pr = { care_recipient_citizenship: Citizenship.PR };
    expect(
      status("MIGRANT-DOMESTIC-WORKER-LEVY", makeUser(pr)).agencyWillCheck,
    ).not.toContain("You or your spouse must be a Singapore Citizen");
    const prCaregiver = status(
      "MIGRANT-DOMESTIC-WORKER-LEVY",
      makeUser({ ...pr, citizenship: Citizenship.PR }),
    );
    expect(prCaregiver.status).toBe("likely");
    expect(prCaregiver.agencyWillCheck).toContain(
      "You or your spouse must be a Singapore Citizen",
    );
  });

  it("has a disability route with 1+ daily activity", () => {
    const result = status(
      "MIGRANT-DOMESTIC-WORKER-LEVY",
      makeUser({ care_recipient_age: 40 }),
      { adlCount: 1 },
    );
    expect(result.status).toBe("likely");
    expect(result.agencyWillCheck).toContain("An AIC recommendation letter");
  });

  it("must live at home", () => {
    expect(
      status(
        "MIGRANT-DOMESTIC-WORKER-LEVY",
        makeUser({ care_recipient_residence: Residence.OTHER }),
      ).status,
    ).toBe("not_a_match");
  });
});

describe("5. Subsidies for day care and home care", () => {
  const rate = (overrides: Partial<UserDataFull>) =>
    status(
      "MOH-NR-LTC-SUBSIDY",
      makeUser({ ...withIncome(1000), ...overrides }),
    ).reasonsMet[0];

  it("needs household income for the test profile", () => {
    const result = status("MOH-NR-LTC-SUBSIDY");
    expect(result.status).toBe("needs_answers");
    expect(result.questionsToAsk).toEqual([Q.HOUSEHOLD_INCOME]);
  });

  it("uses the 95% / 80% / 55% columns", () => {
    expect(rate({})).toMatch(
      /^95% off fees \(Singapore Citizen born 1969 or earlier/,
    );
    expect(rate({ care_recipient_age: 50 })).toMatch(
      /^80% off fees \(Singapore Citizen born after 1969/,
    );
    expect(rate({ care_recipient_citizenship: Citizenship.PR })).toMatch(
      /^55% off fees \(Permanent Resident/,
    );
  });

  it("works out the birth cohort from age", () => {
    expect(rate({ care_recipient_age: 57 })).toMatch(/^95%/);
    expect(rate({ care_recipient_age: 55 })).toMatch(/^80%/);
    const age56 = status(
      "MOH-NR-LTC-SUBSIDY",
      makeUser({ ...withIncome(1000), care_recipient_age: 56 }),
    );
    expect(age56.reasonsMet[0]).toMatch(/^80%/);
    expect(age56.agencyWillCheck).toContain("Could be higher if born in 1969");
    expect(
      status(
        "MOH-NR-LTC-SUBSIDY",
        makeUser({ ...withIncome(1000), care_recipient_age: 55 }),
      ).agencyWillCheck,
    ).not.toContain("Could be higher if born in 1969");
  });

  it("uses the new table up to the $4,800 cut-off", () => {
    expect(rate(withIncome(2300))).toMatch(/^85%/);
    expect(rate(withIncome(2600))).toMatch(/^75%/);
    expect(rate(withIncome(3600))).toMatch(/^55%/);
    expect(rate(withIncome(4800))).toMatch(/^35%/);
    expect(
      status("MOH-NR-LTC-SUBSIDY", makeUser(withIncome(4801))).status,
    ).toBe("not_a_match");
    expect(rate(withIncome(0, 21000))).toMatch(/^95%/);
    expect(
      status("MOH-NR-LTC-SUBSIDY", makeUser(withIncome(0, 21001))).status,
    ).toBe("not_a_match");
  });

  it("is not for nursing home residents", () => {
    const result = status(
      "MOH-NR-LTC-SUBSIDY",
      makeUser({
        ...withIncome(1000),
        care_recipient_residence: Residence.NURSING_HOME_LTCF,
      }),
    );
    expect(result.status).toBe("not_a_match");
    expect(result.reasonsNotMet).toContain("For care at home or at a centre");
  });
});

describe("6. Seniors' Mobility and Enabling Fund", () => {
  it("needs household income for the test profile", () => {
    expect(status("SENIORS-MOBILITY-ENABLING-FUND").questionsToAsk).toEqual([
      Q.HOUSEHOLD_INCOME,
    ]);
  });

  it("is likely for 60+, SC/PR, at home, income up to $4,800", () => {
    expect(
      status("SENIORS-MOBILITY-ENABLING-FUND", makeUser(withIncome(4800)))
        .status,
    ).toBe("likely");
    expect(
      status("SENIORS-MOBILITY-ENABLING-FUND", makeUser(withIncome(0, 21000)))
        .status,
    ).toBe("likely");
  });

  it("is not a fit above $4,800, under 60 or in a nursing home", () => {
    const notFit = (overrides: Partial<UserDataFull>) =>
      status(
        "SENIORS-MOBILITY-ENABLING-FUND",
        makeUser({ ...withIncome(1000), ...overrides }),
      ).status;
    expect(notFit(withIncome(4801))).toBe("not_a_match");
    expect(notFit(withIncome(0, 21001))).toBe("not_a_match");
    expect(notFit({ care_recipient_age: 59 })).toBe("not_a_match");
    expect(
      notFit({ care_recipient_residence: Residence.NURSING_HOME_LTCF }),
    ).toBe("not_a_match");
    expect(notFit({ care_recipient_citizenship: Citizenship.OTHER })).toBe(
      "not_a_match",
    );
  });
});

describe("7. MediSave Care", () => {
  it("needs daily activities for the test profile", () => {
    expect(status("MEDISAVE-CARE").questionsToAsk).toEqual([Q.ADL_NEEDS]);
  });

  it("is likely with 3+ activities and full help", () => {
    expect(status("MEDISAVE-CARE", makeUser(), SEVERE).status).toBe("likely");
  });

  it("is not a fit with fewer than 3 activities", () => {
    const result = status("MEDISAVE-CARE", makeUser(), { adlCount: 2 });
    expect(result.status).toBe("not_a_match");
    expect(result.reasonsNotMet).toContain(
      "For severe disability: needs full help with at least 3 daily activities",
    );
  });

  it("keeps asking about full help when it's not sure or no", () => {
    for (const adlFullHelp of ["not_sure", "no"] as const) {
      const result = status("MEDISAVE-CARE", makeUser(), {
        adlCount: 3,
        adlFullHelp,
      });
      expect(result.status).toBe("needs_answers");
      expect(result.questionsToAsk).toEqual([Q.ADL_FULL_HELP]);
    }
  });
});

describe("8. CareShield Life and ElderShield payouts", () => {
  it("needs daily activities for the test profile, and doesn't ask about insurance yet", () => {
    expect(status("CARESHIELD-ELDERSHIELD-CLAIM").questionsToAsk).toEqual([
      Q.ADL_NEEDS,
    ]);
  });

  it("asks about insurance once 3+ activities are ticked (age 46+)", () => {
    const result = status("CARESHIELD-ELDERSHIELD-CLAIM", makeUser(), SEVERE);
    expect(result.status).toBe("needs_answers");
    expect(result.questionsToAsk).toEqual([Q.LTC_INSURANCE]);
  });

  it("shows only the covered plan's payout", () => {
    const elder = status("CARESHIELD-ELDERSHIELD-CLAIM", makeUser(), {
      ...SEVERE,
      ltcInsurance: "eldershield",
    });
    expect(elder.status).toBe("likely");
    expect(elder.reasonsMet.some((r) => r.startsWith("ElderShield 400"))).toBe(
      true,
    );
    expect(elder.reasonsMet.some((r) => r.startsWith("CareShield Life:"))).toBe(
      false,
    );
    const careShield = status("CARESHIELD-ELDERSHIELD-CLAIM", makeUser(), {
      ...SEVERE,
      ltcInsurance: "careshield_life",
    });
    expect(
      careShield.reasonsMet.some((r) => r.startsWith("CareShield Life:")),
    ).toBe(true);
    expect(careShield.reasonsMet.some((r) => r.startsWith("ElderShield"))).toBe(
      false,
    );
  });

  it("assumes CareShield Life for age 45 or under without asking", () => {
    const result = status(
      "CARESHIELD-ELDERSHIELD-CLAIM",
      makeUser({ care_recipient_age: 45 }),
      SEVERE,
    );
    expect(result.status).toBe("likely");
    expect(result.questionsToAsk).toEqual([]);
  });

  it("is not a fit when covered by neither, pointing to ElderFund", () => {
    const result = status("CARESHIELD-ELDERSHIELD-CLAIM", makeUser(), {
      ...SEVERE,
      ltcInsurance: "neither",
    });
    expect(result.status).toBe("not_a_match");
    expect(result.reasonsNotMet[0]).toContain("ElderFund");
  });

  it("is not a fit with fewer than 3 activities", () => {
    expect(
      status("CARESHIELD-ELDERSHIELD-CLAIM", makeUser(), { adlCount: 2 })
        .status,
    ).toBe("not_a_match");
  });
});
