// Tier 1 eligibility checks. Every rule, figure and wording follows
// docs/schemes/tier1-schemes.md ("Rules" and "The agency will check" for each
// scheme). Don't change a figure here without changing that file first.
//
// Each check returns what it could confirm (met), any hard "no" (notMet),
// the answers it still needs (questions) and the conditions only the agency
// can confirm (agencyWillCheck). schemeStatus.ts turns that into a status.

import { ProfileQuestionId } from "../types/scheme";
import {
  Citizenship,
  Relationship,
  Residence,
  UserDataFull,
} from "../types/user";
import { isKnownAge } from "./profileInput";
import { t } from "@/i18n";

export type AdlFullHelp = "yes" | "no" | "not_sure";
export type LtcPlan =
  | "careshield_life"
  | "eldershield"
  | "neither"
  | "not_sure";

// Answers from the question sheet (not yet saved to the profile)
export interface CheckAnswers {
  // Daily activities needing help, 0–6. Undefined/null means not known yet.
  adlCount?: number | null;
  adlFullHelp?: AdlFullHelp;
  ltcInsurance?: LtcPlan;
}

export interface EligibilityResult {
  id: string;
  met: string[];
  notMet: string[];
  questions: ProfileQuestionId[];
  agencyWillCheck: string[];
}

export type EligibilityCheck = (
  user: UserDataFull,
  answers?: CheckAnswers,
  today?: Date,
) => EligibilityResult;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const newResult = (id: string): EligibilityResult => ({
  id,
  met: [],
  notMet: [],
  questions: [],
  agencyWillCheck: [],
});

const ask = (result: EligibilityResult, question: ProfileQuestionId) => {
  if (!result.questions.includes(question)) result.questions.push(question);
};

const isCitizen = (citizenship: Citizenship) =>
  citizenship === Citizenship.CITIZEN;
const isCitizenOrPr = (citizenship: Citizenship) =>
  citizenship === Citizenship.CITIZEN || citizenship === Citizenship.PR;

const knownAdlCount = (answers: CheckAnswers): number | null =>
  typeof answers.adlCount === "number" ? answers.adlCount : null;

// A PR qualifies for HCG (and the MDW disability route) if they have a living
// SC parent, child or spouse. We can only see the caregiver: an SC caregiver
// who is their child (relationship PARENT) or spouse settles it.
const prHasScFamilyCaregiver = (user: UserDataFull) =>
  isCitizen(user.citizenship) &&
  (user.care_recipient_relationship === Relationship.PARENT ||
    user.care_recipient_relationship === Relationship.SPOUSE);

type Income =
  | { kind: "unknown" }
  | { kind: "no_income"; lowAnnualValue: boolean }
  | { kind: "pchi"; pchi: number };

const household = (user: UserDataFull): Income => {
  const pchi = user.monthly_pchi as number | null | undefined;
  if (pchi === null || pchi === undefined) return { kind: "unknown" };
  if (pchi === 0) {
    const av = user.annual_property_value as number | null | undefined;
    if (av === null || av === undefined) return { kind: "unknown" };
    return { kind: "no_income", lowAnnualValue: av <= 21000 };
  }
  return { kind: "pchi", pchi };
};

// ---------------------------------------------------------------------------
// 1. Parent Relief / Parent Relief (Disability)
// ---------------------------------------------------------------------------

export const checkParentRelief: EligibilityCheck = (
  user,
  answers = {},
  today = new Date(),
) => {
  const result = newResult("PARENT-RELIEF");
  // For Year of Assessment N the conditions apply to calendar year N - 1
  const lastYear = today.getFullYear() - 1;
  const adl = knownAdlCount(answers);
  const age = user.care_recipient_age;

  switch (user.care_recipient_relationship) {
    case Relationship.PARENT:
      result.met.push(t("elig.s01"));
      break;
    case Relationship.OTHER_FAMILY:
      result.met.push(t("elig.s02"));
      result.agencyWillCheck.push(t("elig.s03"));
      break;
    default:
      result.notMet.push(t("elig.s04"));
  }

  if (isKnownAge(age) && age >= 55) {
    result.met.push(t("elig.s05"));
  } else if (adl !== null && adl >= 1) {
    // Parent Relief (Disability): the age rule does not count
    result.met.push(t("elig.s06"));
  } else if (!isKnownAge(age)) {
    ask(result, ProfileQuestionId.CARE_RECIPIENT_AGE);
  } else if (adl === 0) {
    result.notMet.push(t("elig.s07"));
  } else {
    ask(result, ProfileQuestionId.ADL_NEEDS);
  }

  result.met.push(
    user.care_recipient_residence === Residence.HOME
      ? t("elig.s08")
      : t("elig.s09"),
  );
  if (adl !== null && adl >= 1) {
    result.met.push(t("elig.s10"));
  }

  result.agencyWillCheck.push(
    t("elig.parentRelief.dependantIncome", { year: lastYear }),
    t("elig.s11"),
    t("elig.s12"),
  );
  return result;
};

// ---------------------------------------------------------------------------
// 2. Caregivers Training Grant
// ---------------------------------------------------------------------------

export const checkCaregiversTrainingGrant: EligibilityCheck = (
  user,
  answers = {},
) => {
  const result = newResult("CAREGIVERS-TRAINING-GRANT");
  const adl = knownAdlCount(answers);
  const age = user.care_recipient_age;

  if (isCitizenOrPr(user.care_recipient_citizenship)) {
    result.met.push(t("elig.s13"));
  } else {
    result.notMet.push(t("elig.s14"));
  }

  if (isKnownAge(age) && age >= 65) {
    result.met.push(t("elig.s15"));
  } else if (adl !== null && adl >= 1) {
    result.met.push(t("elig.s16"));
    result.agencyWillCheck.push(t("elig.s17"));
  } else if (!isKnownAge(age)) {
    ask(result, ProfileQuestionId.CARE_RECIPIENT_AGE);
  } else if (adl === 0) {
    result.notMet.push(t("elig.s18"));
  } else {
    ask(result, ProfileQuestionId.ADL_NEEDS);
  }

  result.agencyWillCheck.push(t("elig.s19"), t("elig.s20"), t("elig.s21"));
  return result;
};

// ---------------------------------------------------------------------------
// 3. Home Caregiving Grant
// ---------------------------------------------------------------------------

export const checkHomeCaregivingGrant: EligibilityCheck = (
  user,
  answers = {},
) => {
  const result = newResult("HOME-CAREGIVING-GRANT");
  const adl = knownAdlCount(answers);

  if (isCitizen(user.care_recipient_citizenship)) {
    result.met.push(t("elig.s22"));
  } else if (user.care_recipient_citizenship === Citizenship.PR) {
    result.met.push(t("elig.s23"));
    if (!prHasScFamilyCaregiver(user)) {
      result.agencyWillCheck.push(t("elig.s24"));
    }
  } else {
    result.notMet.push(t("elig.s14"));
  }

  if (user.care_recipient_residence === Residence.NURSING_HOME_LTCF) {
    result.notMet.push(t("elig.s25"));
  } else if (user.care_recipient_residence === Residence.HOME) {
    result.met.push(t("elig.s26"));
  } else {
    ask(result, ProfileQuestionId.CARE_RECIPIENT_RESIDENCE);
  }

  const income = household(user);
  if (income.kind === "unknown") {
    ask(result, ProfileQuestionId.HOUSEHOLD_INCOME);
  } else if (income.kind === "no_income") {
    if (income.lowAnnualValue) {
      result.met.push(t("elig.s27"));
    } else {
      result.notMet.push(t("elig.s28"));
    }
  } else if (income.pchi <= 1500) {
    result.met.push(t("elig.s29"));
  } else if (income.pchi <= 3600) {
    result.met.push(t("elig.s30"));
  } else if (income.pchi <= 4800) {
    result.met.push(t("elig.s31"));
  } else {
    result.notMet.push(t("elig.s32"));
  }

  if (adl === null) {
    ask(result, ProfileQuestionId.ADL_NEEDS);
  } else if (adl >= 3) {
    result.met.push(t("elig.s33"));
  } else {
    result.notMet.push(t("elig.s33"));
  }

  result.agencyWillCheck.push(t("elig.s34"), t("elig.s35"));
  return result;
};

// ---------------------------------------------------------------------------
// 4. Migrant Domestic Worker Levy Concession
// ---------------------------------------------------------------------------

export const checkMdwLevyConcession: EligibilityCheck = (
  user,
  answers = {},
) => {
  const result = newResult("MIGRANT-DOMESTIC-WORKER-LEVY");
  const adl = knownAdlCount(answers);
  const age = user.care_recipient_age;
  const citizenship = user.care_recipient_citizenship;
  const neitherRoute = t("elig.s36");

  if (user.care_recipient_residence === Residence.HOME) {
    result.met.push(t("elig.s37"));
  } else {
    result.notMet.push(t("elig.s38"));
  }

  if (!isCitizenOrPr(citizenship)) {
    result.notMet.push(neitherRoute);
  } else if (isKnownAge(age) && age >= 67) {
    // Route A, elderly
    result.met.push(isCitizen(citizenship) ? t("elig.s39") : t("elig.s40"));
    if (!isCitizen(citizenship) && !isCitizen(user.citizenship)) {
      result.agencyWillCheck.push(t("elig.s41"));
    }
  } else if (adl !== null && adl >= 1) {
    // Route B, disability
    result.met.push(t("elig.s16"));
    if (!isCitizen(citizenship) && !prHasScFamilyCaregiver(user)) {
      result.agencyWillCheck.push(t("elig.s24"));
    }
    result.agencyWillCheck.push(t("elig.s42"));
  } else if (!isKnownAge(age)) {
    ask(result, ProfileQuestionId.CARE_RECIPIENT_AGE);
  } else if (adl === 0) {
    result.notMet.push(neitherRoute);
  } else {
    ask(result, ProfileQuestionId.ADL_NEEDS);
  }

  result.agencyWillCheck.push(t("elig.s43"), t("elig.s44"));
  return result;
};

// ---------------------------------------------------------------------------
// 5. Long-term care subsidies (day care and home care), from 1 Jul 2026
// ---------------------------------------------------------------------------

type LtcColumn = "sc_1969_or_earlier" | "sc_after_1969" | "pr";

// [band label message key, upper bound of household income per person, rates by column]
const LTC_BANDS: [string, number, Record<LtcColumn, number>][] = [
  [
    "elig.ltc.band.b1",
    1500,
    { sc_1969_or_earlier: 95, sc_after_1969: 80, pr: 55 },
  ],
  [
    "elig.ltc.band.b2",
    2300,
    { sc_1969_or_earlier: 85, sc_after_1969: 70, pr: 45 },
  ],
  [
    "elig.ltc.band.b3",
    2600,
    { sc_1969_or_earlier: 75, sc_after_1969: 60, pr: 35 },
  ],
  [
    "elig.ltc.band.b4",
    3600,
    { sc_1969_or_earlier: 55, sc_after_1969: 40, pr: 20 },
  ],
  [
    "elig.ltc.band.b5",
    4800,
    { sc_1969_or_earlier: 35, sc_after_1969: 20, pr: 10 },
  ],
];
const LTC_NO_INCOME: Record<LtcColumn, number> = {
  sc_1969_or_earlier: 95,
  sc_after_1969: 80,
  pr: 55,
};
// Message keys (translated where used)
const LTC_COLUMN_LABELS: Record<LtcColumn, string> = {
  sc_1969_or_earlier: "elig.ltc.column.sc1969",
  sc_after_1969: "elig.ltc.column.scAfter1969",
  pr: "elig.ltc.column.pr",
};

export const checkMohLtcSubsidy: EligibilityCheck = (
  user,
  _answers,
  today = new Date(),
) => {
  const result = newResult("MOH-NR-LTC-SUBSIDY");
  const citizenship = user.care_recipient_citizenship;
  const age = user.care_recipient_age;

  if (!isCitizenOrPr(citizenship)) {
    result.notMet.push(t("elig.s14"));
  }
  if (user.care_recipient_residence === Residence.NURSING_HOME_LTCF) {
    result.notMet.push(t("elig.s45"));
  }

  // Birth cohort from age: in 2026, 57+ was born 1969 or earlier, 55 or
  // younger after 1969, and 56 could be either
  let column: LtcColumn | null = null;
  if (citizenship === Citizenship.PR) {
    column = "pr";
  } else if (isCitizen(citizenship)) {
    if (!isKnownAge(age)) {
      ask(result, ProfileQuestionId.CARE_RECIPIENT_AGE);
    } else {
      const ageIfBornIn1969 = today.getFullYear() - 1969;
      if (age >= ageIfBornIn1969) {
        column = "sc_1969_or_earlier";
      } else {
        column = "sc_after_1969";
        if (age === ageIfBornIn1969 - 1) {
          result.agencyWillCheck.push(t("elig.s46"));
        }
      }
    }
  }

  const income = household(user);
  let rate: number | null = null;
  let band = "";
  if (income.kind === "unknown") {
    ask(result, ProfileQuestionId.HOUSEHOLD_INCOME);
  } else if (income.kind === "no_income") {
    if (income.lowAnnualValue) {
      band = t("elig.ltc.bandNoIncome");
      if (column) rate = LTC_NO_INCOME[column];
    } else {
      result.notMet.push(t("elig.s28"));
    }
  } else {
    const match = LTC_BANDS.find(([, upTo]) => income.pchi <= upTo);
    if (!match) {
      result.notMet.push(t("elig.s32"));
    } else {
      band = t("elig.ltc.bandIncome", { band: t(match[0]) });
      if (column) rate = match[2][column];
    }
  }

  if (column && rate !== null) {
    result.met.push(
      t("elig.ltc.rate", {
        rate,
        column: t(LTC_COLUMN_LABELS[column]),
        band,
      }),
    );
  } else if (isCitizenOrPr(citizenship) && column) {
    result.met.push(t(LTC_COLUMN_LABELS[column]));
  }

  result.agencyWillCheck.push(t("elig.s47"), t("elig.s48"));
  return result;
};

// ---------------------------------------------------------------------------
// 6. Seniors' Mobility and Enabling Fund
// ---------------------------------------------------------------------------

export const checkSeniorsMobilityFund: EligibilityCheck = (user) => {
  const result = newResult("SENIORS-MOBILITY-ENABLING-FUND");
  const age = user.care_recipient_age;

  if (isCitizenOrPr(user.care_recipient_citizenship)) {
    result.met.push(t("elig.s13"));
  } else {
    result.notMet.push(t("elig.s14"));
  }

  if (!isKnownAge(age)) {
    ask(result, ProfileQuestionId.CARE_RECIPIENT_AGE);
  } else if (age >= 60) {
    result.met.push(t("elig.s49"));
  } else {
    result.notMet.push(t("elig.s50"));
  }

  if (user.care_recipient_residence === Residence.NURSING_HOME_LTCF) {
    result.notMet.push(t("elig.s25"));
  }

  const income = household(user);
  if (income.kind === "unknown") {
    ask(result, ProfileQuestionId.HOUSEHOLD_INCOME);
  } else if (income.kind === "no_income") {
    if (income.lowAnnualValue) {
      result.met.push(t("elig.s51"));
    } else {
      result.notMet.push(t("elig.s28"));
    }
  } else if (income.pchi <= 4800) {
    result.met.push(t("elig.s52"));
  } else {
    result.notMet.push(t("elig.s32"));
  }

  result.agencyWillCheck.push(t("elig.s53"), t("elig.s54"));
  return result;
};

// ---------------------------------------------------------------------------
// 7. MediSave Care
// ---------------------------------------------------------------------------

const checkSevereDisability = (
  result: EligibilityResult,
  answers: CheckAnswers,
  notMetText: string,
) => {
  const adl = knownAdlCount(answers);
  if (adl === null) {
    ask(result, ProfileQuestionId.ADL_NEEDS);
  } else if (adl < 3) {
    result.notMet.push(notMetText);
  } else if (answers.adlFullHelp === "yes") {
    result.met.push(t("elig.s55"));
  } else if (answers.adlFullHelp === "no") {
    result.notMet.push(t("elig.s56"));
  } else {
    // Not answered yet, or "not sure". "Not sure" counts as answered (the
    // sheet won't ask again) but the scheme stays at "needs answers" until
    // the severe disability assessment decides.
    ask(result, ProfileQuestionId.ADL_FULL_HELP);
    if (answers.adlFullHelp === "not_sure") {
      result.agencyWillCheck.push(t("elig.s57"));
    }
  }
  return adl;
};

export const checkMediSaveCare: EligibilityCheck = (user, answers = {}) => {
  const result = newResult("MEDISAVE-CARE");
  const age = user.care_recipient_age;

  if (isCitizenOrPr(user.care_recipient_citizenship)) {
    result.met.push(t("elig.s13"));
  } else {
    result.notMet.push(t("elig.s14"));
  }
  // Age 30 or older is effectively always met, so an unknown age isn't asked
  if (isKnownAge(age) && age < 30) {
    result.notMet.push(t("elig.s58"));
  }

  checkSevereDisability(result, answers, t("elig.s56"));

  result.agencyWillCheck.push(t("elig.s59"), t("elig.s60"));
  return result;
};

// ---------------------------------------------------------------------------
// 8. CareShield Life / ElderShield claims
// ---------------------------------------------------------------------------

const CARESHIELD_PAYOUT = t("elig.s61");
const ELDERSHIELD_PAYOUTS = [t("elig.s62"), t("elig.s63")];

export const checkCareShieldElderShield: EligibilityCheck = (
  user,
  answers = {},
) => {
  const result = newResult("CARESHIELD-ELDERSHIELD-CLAIM");
  const age = user.care_recipient_age;

  const adl = checkSevereDisability(result, answers, t("elig.s64"));

  if (isKnownAge(age) && age <= 45) {
    // Certainly born 1980 or later, so covered by CareShield Life
    result.met.push(t("elig.s65"));
    result.met.push(CARESHIELD_PAYOUT);
  } else if (answers.ltcInsurance === "careshield_life") {
    result.met.push(t("elig.s66"));
    result.met.push(CARESHIELD_PAYOUT);
  } else if (answers.ltcInsurance === "eldershield") {
    result.met.push(t("elig.s67"));
    result.met.push(...ELDERSHIELD_PAYOUTS);
  } else if (answers.ltcInsurance === "neither") {
    result.notMet.push(t("elig.s68"));
  } else if (adl !== null && adl >= 3) {
    // Only asked once 3+ activities are ticked (and age is 46 or older)
    if (isKnownAge(age)) {
      ask(result, ProfileQuestionId.LTC_INSURANCE);
    } else {
      ask(result, ProfileQuestionId.CARE_RECIPIENT_AGE);
    }
  }

  result.agencyWillCheck.push(t("elig.s69"), t("elig.s70"));
  return result;
};

// ---------------------------------------------------------------------------

export const CHECKS: Record<string, EligibilityCheck> = {
  "PARENT-RELIEF": checkParentRelief,
  "CAREGIVERS-TRAINING-GRANT": checkCaregiversTrainingGrant,
  "HOME-CAREGIVING-GRANT": checkHomeCaregivingGrant,
  "MIGRANT-DOMESTIC-WORKER-LEVY": checkMdwLevyConcession,
  "MOH-NR-LTC-SUBSIDY": checkMohLtcSubsidy,
  "SENIORS-MOBILITY-ENABLING-FUND": checkSeniorsMobilityFund,
  "MEDISAVE-CARE": checkMediSaveCare,
  "CARESHIELD-ELDERSHIELD-CLAIM": checkCareShieldElderShield,
};
