import { PCHIBase } from "./pchi";

export type SchemeData = {
  id: string;
  name: string;
  shortDescription: string;
  description: string;
  benefits: string;
  eligibility: string;
  nextSteps: string;
  pchiRequired: boolean;
};

export type EligibilityCriteria = {
  description: string;
  satisfied: boolean;
};

// ---- Schemes catalog (redesign) ----

export enum PayForCategory {
  CARE_SERVICES = "care_services",
  MONTHLY_PAYOUTS = "monthly_payouts",
  HELPER_COSTS = "helper_costs",
  CAREGIVER_COURSES = "caregiver_courses",
  EQUIPMENT_HOME = "equipment_home",
  TRANSPORT = "transport",
  MEDICAL_BILLS = "medical_bills",
  TAX_CPF = "tax_cpf",
}

// Facts we can ask the caregiver for. The first group is not yet collected
// anywhere; the second group is collected at onboarding and is only asked
// when the caregiver is signed out.
export enum ProfileQuestionId {
  HOUSEHOLD_INCOME = "household_income",
  ADL_NEEDS = "adl_needs",
  HAS_FAR = "has_far",
  HOUSING_TYPE = "housing_type",
  LTC_INSURANCE = "ltc_insurance",
  CARE_RECIPIENT_AGE = "care_recipient_age",
  CARE_RECIPIENT_CITIZENSHIP = "care_recipient_citizenship",
  CARE_RECIPIENT_RESIDENCE = "care_recipient_residence",
  CAREGIVER_CITIZENSHIP = "caregiver_citizenship",
}

export type SchemeSource = "carecompass" | "schemes_sg";

export type SchemeTier = 1 | 2;

export type SchemeArea =
  | { kind: "islandwide" }
  | { kind: "district"; name: string };

export interface SchemeSourceLink {
  name: string;
  url: string;
}

export interface CatalogScheme {
  id: string;
  source: SchemeSource;
  sourceId: string | null;
  tier: SchemeTier;
  name: string;
  agency: string;
  summary: string;
  description: string;
  whatYouGet: string[];
  valueText?: string;
  payFor: PayForCategory;
  area: SchemeArea;
  link: string;
  sources: SchemeSourceLink[];
  lastRefreshed: string;
  checkerId?: string;
  // Carried over from SchemeData so Tier 1 content is not lost (markdown)
  eligibility?: string;
  nextSteps?: string;
}

export type SchemeStatusKind =
  | "likely"
  | "needs_answers"
  | "provider_decides"
  | "not_a_match";

export interface SchemeStatus {
  status: SchemeStatusKind;
  reasonsMet: string[];
  reasonsNotMet: string[];
  questionsToAsk: ProfileQuestionId[];
  agencyWillCheck: string[];
}

export interface SubsidyInfo extends PCHIBase {
  subsidyLevel: number;
}
export interface MohNrLtcSubsidy extends SubsidyInfo {
  pchiBand: string;
  correctAsOf: string;
}
