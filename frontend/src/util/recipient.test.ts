import { describe, expect, it } from "vitest";
import { CatalogScheme, PayForCategory } from "@/types/scheme";
import {
  Citizenship,
  Relationship,
  Residence,
  UserDataFull,
} from "@/types/user";
import {
  capitalise,
  getProfileFacts,
  getRecipientName,
  getRecipientTitleName,
} from "@/util/recipient";
import { getLastUpdated, getSourceLine } from "@/util/schemeCatalog";

const user: UserDataFull = {
  citizenship: Citizenship.CITIZEN,
  care_recipient_age: 78,
  care_recipient_citizenship: Citizenship.CITIZEN,
  care_recipient_residence: Residence.HOME,
  care_recipient_relationship: Relationship.PARENT,
  household_size: 2,
  total_monthly_household_income: 2000,
  annual_property_value: 10000,
  monthly_pchi: 1000,
};

describe("recipient names", () => {
  it("uses a title form for headings and a sentence form for body text", () => {
    expect(getRecipientTitleName(user)).toBe("you and your loved one");
    expect(getRecipientName(user)).toBe("your loved one");
    expect(capitalise(getRecipientName(user))).toBe("Your loved one");
  });
});

describe("getProfileFacts", () => {
  it("lists age, citizenship and where they live", () => {
    expect(getProfileFacts(user)).toEqual([
      "Aged 78",
      "Singapore Citizen",
      "Lives at home",
    ]);
  });

  it("leaves out an age of 0 or null", () => {
    expect(getProfileFacts({ ...user, care_recipient_age: 0 })).toEqual([
      "Singapore Citizen",
      "Lives at home",
    ]);
    expect(
      getProfileFacts({
        ...user,
        care_recipient_age: null as unknown as number,
      }),
    ).not.toContain("Aged 0");
  });
});

const scheme = (tier: 1 | 2): CatalogScheme => ({
  id: "x",
  source: tier === 1 ? "carecompass" : "schemes_sg",
  sourceId: null,
  tier,
  name: "X",
  agency: "AIC",
  summary: "",
  description: "",
  whatYouGet: [],
  payFor: PayForCategory.CARE_SERVICES,
  area: { kind: "islandwide" },
  link: "https://example.com",
  sources: [],
  ...(tier === 1
    ? { lastChecked: "2026-09-30" }
    : { lastRefreshed: "2026-09-29" }),
});

describe("getSourceLine", () => {
  it("puts the agency first", () => {
    expect(getSourceLine(scheme(1))).toBe("AIC · Reviewed by CareCompass");
    expect(getSourceLine(scheme(2))).toBe("AIC · From Schemes.sg");
  });
});

describe("getLastUpdated", () => {
  it("uses lastChecked for Tier 1 and lastRefreshed for Tier 2", () => {
    expect(getLastUpdated(scheme(1))).toBe("2026-09-30");
    expect(getLastUpdated(scheme(2))).toBe("2026-09-29");
  });
});
