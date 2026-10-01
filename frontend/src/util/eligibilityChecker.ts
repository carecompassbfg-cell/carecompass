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
      result.met.push("Your parent");
      break;
    case Relationship.OTHER_FAMILY:
      result.met.push("A family member");
      result.agencyWillCheck.push("Must be your parent, grandparent or in-law");
      break;
    default:
      result.notMet.push("For parents, grandparents and in-laws");
  }

  if (isKnownAge(age) && age >= 55) {
    result.met.push("Aged 55 or older");
  } else if (adl !== null && adl >= 1) {
    // Parent Relief (Disability): the age rule does not count
    result.met.push(
      "Needs help with at least one daily activity, so Parent Relief (Disability) may apply",
    );
  } else if (!isKnownAge(age)) {
    ask(result, ProfileQuestionId.CARE_RECIPIENT_AGE);
  } else if (adl === 0) {
    result.notMet.push(
      "Aged 55 or older, or needs help with at least one daily activity",
    );
  } else {
    ask(result, ProfileQuestionId.ADL_NEEDS);
  }

  result.met.push(
    user.care_recipient_residence === Residence.HOME
      ? "$9,000 (living with you)"
      : "$5,500 if you spent $2,000 or more supporting them",
  );
  if (adl !== null && adl >= 1) {
    result.met.push(
      "May qualify for Parent Relief (Disability): $14,000 / $10,000",
    );
  }

  result.agencyWillCheck.push(
    `Dependant's income in ${lastYear} was $8,000 or less`,
    "No one else has claimed Spouse Relief or another relief on the same person",
    "For the disability version, a doctor's or disability association's document if IRAS asks",
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
    result.met.push("Singapore Citizen or PR");
  } else {
    result.notMet.push("For Singapore Citizens and PRs");
  }

  if (isKnownAge(age) && age >= 65) {
    result.met.push("Aged 65 or older");
  } else if (adl !== null && adl >= 1) {
    result.met.push("Needs help with at least one daily activity");
    result.agencyWillCheck.push(
      "The need is permanent: a Functional Assessment Report, unless already on a scheme such as CareShield Life or ElderFund",
    );
  } else if (!isKnownAge(age)) {
    ask(result, ProfileQuestionId.CARE_RECIPIENT_AGE);
  } else if (adl === 0) {
    result.notMet.push(
      "For someone 65 or older, or who needs help with at least one daily activity",
    );
  } else {
    ask(result, ProfileQuestionId.ADL_NEEDS);
  }

  result.agencyWillCheck.push(
    "You are a main caregiver",
    "The course is on the approved list",
    "The grant has not already been used up by another caregiver",
  );
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
    result.met.push("Singapore Citizen");
  } else if (user.care_recipient_citizenship === Citizenship.PR) {
    result.met.push("Permanent Resident");
    if (!prHasScFamilyCaregiver(user)) {
      result.agencyWillCheck.push(
        "PRs qualify only if a parent, child or spouse is a Singapore Citizen",
      );
    }
  } else {
    result.notMet.push("For Singapore Citizens and PRs");
  }

  if (user.care_recipient_residence === Residence.NURSING_HOME_LTCF) {
    result.notMet.push("Not for someone living in a nursing home");
  } else if (user.care_recipient_residence === Residence.HOME) {
    result.met.push("Lives at home");
  } else {
    ask(result, ProfileQuestionId.CARE_RECIPIENT_RESIDENCE);
  }

  const income = household(user);
  if (income.kind === "unknown") {
    ask(result, ProfileQuestionId.HOUSEHOLD_INCOME);
  } else if (income.kind === "no_income") {
    if (income.lowAnnualValue) {
      result.met.push(
        "$600 a month (no income and home Annual Value $21,000 or less)",
      );
    } else {
      result.notMet.push(
        "No household income and home Annual Value above $21,000",
      );
    }
  } else if (income.pchi <= 1500) {
    result.met.push(
      "$600 a month (household income per person $1,500 or less)",
    );
  } else if (income.pchi <= 3600) {
    result.met.push(
      "$400 a month (household income per person $1,501 to $3,600)",
    );
  } else if (income.pchi <= 4800) {
    result.met.push(
      "$200 a month (household income per person $3,601 to $4,800)",
    );
  } else {
    result.notMet.push("Household income per person is above $4,800");
  }

  if (adl === null) {
    ask(result, ProfileQuestionId.ADL_NEEDS);
  } else if (adl >= 3) {
    result.met.push("Needs help with at least 3 daily activities");
  } else {
    result.notMet.push("Needs help with at least 3 daily activities");
  }

  result.agencyWillCheck.push(
    "A Functional Assessment Report confirming the daily-activity needs are permanent",
    "Property ownership: households that own more than one property get $200",
  );
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
  const neitherRoute =
    "For someone 67 or older, or who needs help with at least one daily activity";

  if (user.care_recipient_residence === Residence.HOME) {
    result.met.push("Lives with you");
  } else {
    result.notMet.push("Must live with you at the same address");
  }

  if (!isCitizenOrPr(citizenship)) {
    result.notMet.push(neitherRoute);
  } else if (isKnownAge(age) && age >= 67) {
    // Route A, elderly
    result.met.push(
      isCitizen(citizenship)
        ? "Singapore Citizen aged 67 or older"
        : "Permanent Resident aged 67 or older",
    );
    if (!isCitizen(citizenship) && !isCitizen(user.citizenship)) {
      result.agencyWillCheck.push(
        "You or your spouse must be a Singapore Citizen",
      );
    }
  } else if (adl !== null && adl >= 1) {
    // Route B, disability
    result.met.push("Needs help with at least one daily activity");
    if (!isCitizen(citizenship) && !prHasScFamilyCaregiver(user)) {
      result.agencyWillCheck.push(
        "PRs qualify only if a parent, child or spouse is a Singapore Citizen",
      );
    }
    result.agencyWillCheck.push("An AIC recommendation letter");
  } else if (!isKnownAge(age)) {
    ask(result, ProfileQuestionId.CARE_RECIPIENT_AGE);
  } else if (adl === 0) {
    result.notMet.push(neitherRoute);
  } else {
    ask(result, ProfileQuestionId.ADL_NEEDS);
  }

  result.agencyWillCheck.push(
    "The helper is registered to your household",
    "Your loved one is listed as a household member on the FDW eService",
  );
  return result;
};

// ---------------------------------------------------------------------------
// 5. Long-term care subsidies (day care and home care), from 1 Jul 2026
// ---------------------------------------------------------------------------

type LtcColumn = "sc_1969_or_earlier" | "sc_after_1969" | "pr";

// [band label, upper bound of household income per person, rates by column]
const LTC_BANDS: [string, number, Record<LtcColumn, number>][] = [
  [
    "$1,500 or less",
    1500,
    { sc_1969_or_earlier: 95, sc_after_1969: 80, pr: 55 },
  ],
  [
    "$1,501–$2,300",
    2300,
    { sc_1969_or_earlier: 85, sc_after_1969: 70, pr: 45 },
  ],
  [
    "$2,301–$2,600",
    2600,
    { sc_1969_or_earlier: 75, sc_after_1969: 60, pr: 35 },
  ],
  [
    "$2,601–$3,600",
    3600,
    { sc_1969_or_earlier: 55, sc_after_1969: 40, pr: 20 },
  ],
  [
    "$3,601–$4,800",
    4800,
    { sc_1969_or_earlier: 35, sc_after_1969: 20, pr: 10 },
  ],
];
const LTC_NO_INCOME: Record<LtcColumn, number> = {
  sc_1969_or_earlier: 95,
  sc_after_1969: 80,
  pr: 55,
};
const LTC_COLUMN_LABELS: Record<LtcColumn, string> = {
  sc_1969_or_earlier: "Singapore Citizen born 1969 or earlier",
  sc_after_1969: "Singapore Citizen born after 1969",
  pr: "Permanent Resident",
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
    result.notMet.push("For Singapore Citizens and PRs");
  }
  if (user.care_recipient_residence === Residence.NURSING_HOME_LTCF) {
    result.notMet.push("For care at home or at a centre");
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
          result.agencyWillCheck.push("Could be higher if born in 1969");
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
      band = "no income, Annual Value $21,000 or less";
      if (column) rate = LTC_NO_INCOME[column];
    } else {
      result.notMet.push(
        "No household income and home Annual Value above $21,000",
      );
    }
  } else {
    const match = LTC_BANDS.find(([, upTo]) => income.pchi <= upTo);
    if (!match) {
      result.notMet.push("Household income per person is above $4,800");
    } else {
      band = `household income per person ${match[0]}`;
      if (column) rate = match[2][column];
    }
  }

  if (column && rate !== null) {
    result.met.push(
      `${rate}% off fees (${LTC_COLUMN_LABELS[column]}, ${band})`,
    );
  } else if (isCitizenOrPr(citizenship) && column) {
    result.met.push(LTC_COLUMN_LABELS[column]);
  }

  result.agencyWillCheck.push(
    "The provider is government-funded",
    "The doctor or AIC referral",
  );
  return result;
};

// ---------------------------------------------------------------------------
// 6. Seniors' Mobility and Enabling Fund
// ---------------------------------------------------------------------------

export const checkSeniorsMobilityFund: EligibilityCheck = (user) => {
  const result = newResult("SENIORS-MOBILITY-ENABLING-FUND");
  const age = user.care_recipient_age;

  if (isCitizenOrPr(user.care_recipient_citizenship)) {
    result.met.push("Singapore Citizen or PR");
  } else {
    result.notMet.push("For Singapore Citizens and PRs");
  }

  if (!isKnownAge(age)) {
    ask(result, ProfileQuestionId.CARE_RECIPIENT_AGE);
  } else if (age >= 60) {
    result.met.push("Aged 60 or older");
  } else {
    result.notMet.push("For seniors aged 60 or older");
  }

  if (user.care_recipient_residence === Residence.NURSING_HOME_LTCF) {
    result.notMet.push("Not for someone living in a nursing home");
  }

  const income = household(user);
  if (income.kind === "unknown") {
    ask(result, ProfileQuestionId.HOUSEHOLD_INCOME);
  } else if (income.kind === "no_income") {
    if (income.lowAnnualValue) {
      result.met.push(
        "No household income and home Annual Value $21,000 or less",
      );
    } else {
      result.notMet.push(
        "No household income and home Annual Value above $21,000",
      );
    }
  } else if (income.pchi <= 4800) {
    result.met.push("Household income per person of $4,800 or less");
  } else {
    result.notMet.push("Household income per person is above $4,800");
  }

  result.agencyWillCheck.push(
    "An assessment by an approved health professional says the item is needed",
    "Extra conditions for motorised devices",
  );
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
    result.met.push("Needs full help with at least 3 daily activities");
  } else if (answers.adlFullHelp === "no") {
    result.notMet.push(
      "For severe disability: needs full help with at least 3 daily activities",
    );
  } else {
    // Not answered yet, or "not sure". "Not sure" counts as answered (the
    // sheet won't ask again) but the scheme stays at "needs answers" until
    // the severe disability assessment decides.
    ask(result, ProfileQuestionId.ADL_FULL_HELP);
    if (answers.adlFullHelp === "not_sure") {
      result.agencyWillCheck.push("The severe disability assessment decides");
    }
  }
  return adl;
};

export const checkMediSaveCare: EligibilityCheck = (user, answers = {}) => {
  const result = newResult("MEDISAVE-CARE");
  const age = user.care_recipient_age;

  if (isCitizenOrPr(user.care_recipient_citizenship)) {
    result.met.push("Singapore Citizen or PR");
  } else {
    result.notMet.push("For Singapore Citizens and PRs");
  }
  // Age 30 or older is effectively always met, so an unknown age isn't asked
  if (isKnownAge(age) && age < 30) {
    result.notMet.push("For people aged 30 or older");
  }

  checkSevereDisability(
    result,
    answers,
    "For severe disability: needs full help with at least 3 daily activities",
  );

  result.agencyWillCheck.push(
    "Severe disability assessment by an MOH-accredited assessor",
    "MediSave balance of at least $5,000",
  );
  return result;
};

// ---------------------------------------------------------------------------
// 8. CareShield Life / ElderShield claims
// ---------------------------------------------------------------------------

const CARESHIELD_PAYOUT =
  "CareShield Life: monthly payouts for life while severely disabled. The starting payout is $689 a month in 2026 and rises each year until age 67 or a claim. People born in 1954 or earlier who joined at 67 or above get a fixed $612 a month";
const ELDERSHIELD_PAYOUTS = [
  "ElderShield 400 (joined Sep 2007 to Dec 2019): $400 a month for up to 72 months",
  "ElderShield 300 (joined Sep 2002 to Sep 2007): $300 a month for up to 60 months",
];

export const checkCareShieldElderShield: EligibilityCheck = (
  user,
  answers = {},
) => {
  const result = newResult("CARESHIELD-ELDERSHIELD-CLAIM");
  const age = user.care_recipient_age;

  const adl = checkSevereDisability(
    result,
    answers,
    "For severe disability: unable to do at least 3 daily activities",
  );

  if (isKnownAge(age) && age <= 45) {
    // Certainly born 1980 or later, so covered by CareShield Life
    result.met.push(
      "Covered by CareShield Life (everyone born in 1980 or later)",
    );
    result.met.push(CARESHIELD_PAYOUT);
  } else if (answers.ltcInsurance === "careshield_life") {
    result.met.push("Covered by CareShield Life");
    result.met.push(CARESHIELD_PAYOUT);
  } else if (answers.ltcInsurance === "eldershield") {
    result.met.push("Covered by ElderShield");
    result.met.push(...ELDERSHIELD_PAYOUTS);
  } else if (answers.ltcInsurance === "neither") {
    result.notMet.push(
      "Only if covered by CareShield Life or ElderShield. See [ElderFund](/dashboard/schemes?id=ssg-aic-elderfund) instead",
    );
  } else if (adl !== null && adl >= 3) {
    // Only asked once 3+ activities are ticked (and age is 46 or older)
    if (isKnownAge(age)) {
      ask(result, ProfileQuestionId.LTC_INSURANCE);
    } else {
      ask(result, ProfileQuestionId.CARE_RECIPIENT_AGE);
    }
  }

  result.agencyWillCheck.push(
    "A severe disability assessment by an MOH-accredited assessor",
    "The policy is active",
  );
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
