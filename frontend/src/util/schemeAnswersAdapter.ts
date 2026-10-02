// Maps the question sheet's session answers (keyed by ProfileQuestionId) to
// the backend's scheme_answers fields (snake_case) and back.

import { NOT_SURE, SchemeAnswers } from "@/stores/schemeAnswers";
import { ProfileQuestionId } from "@/types/scheme";
import { SavedSchemeAnswers } from "@/types/user";
import { AdlFullHelp, LtcPlan } from "@/util/eligibilityChecker";

const YES_NO_NOT_SURE = ["yes", "no", NOT_SURE] as const;
const LTC_PLANS: LtcPlan[] = [
  "careshield_life",
  "eldershield",
  "neither",
  NOT_SURE,
];

const isOneOf = <T extends string>(
  value: unknown,
  options: readonly T[],
): value is T => typeof value === "string" && options.includes(value as T);

const isAdlCount = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= 0 &&
  value <= 6;

// Session answers → scheme_answers for PATCH /users/me. Only answered
// questions are sent. Age and household income are profile fields, not part
// of scheme_answers ("not sure" about age is).
export const toSavedAnswers = (answers: SchemeAnswers): SavedSchemeAnswers => {
  const saved: SavedSchemeAnswers = {};
  const adl = answers[ProfileQuestionId.ADL_NEEDS];
  if (isAdlCount(adl) || adl === NOT_SURE) saved.adl_needs = adl;
  const fullHelp = answers[ProfileQuestionId.ADL_FULL_HELP];
  if (isOneOf(fullHelp, YES_NO_NOT_SURE)) saved.adl_full_help = fullHelp;
  const ltc = answers[ProfileQuestionId.LTC_INSURANCE];
  if (isOneOf(ltc, LTC_PLANS)) saved.ltc_insurance = ltc;
  const far = answers[ProfileQuestionId.HAS_FAR];
  if (isOneOf(far, YES_NO_NOT_SURE)) saved.has_far = far;
  if (answers[ProfileQuestionId.CARE_RECIPIENT_AGE] === NOT_SURE) {
    saved.care_recipient_age_not_sure = true;
  }
  return saved;
};

// scheme_answers from GET /users/me → session answers. Unknown or invalid
// values are ignored.
export const fromSavedAnswers = (
  saved: SavedSchemeAnswers | null | undefined,
): SchemeAnswers => {
  const answers: SchemeAnswers = {};
  if (!saved) return answers;
  if (isAdlCount(saved.adl_needs) || saved.adl_needs === NOT_SURE) {
    answers[ProfileQuestionId.ADL_NEEDS] = saved.adl_needs;
  }
  if (isOneOf(saved.adl_full_help, YES_NO_NOT_SURE)) {
    answers[ProfileQuestionId.ADL_FULL_HELP] =
      saved.adl_full_help as AdlFullHelp;
  }
  if (isOneOf(saved.ltc_insurance, LTC_PLANS)) {
    answers[ProfileQuestionId.LTC_INSURANCE] = saved.ltc_insurance;
  }
  if (isOneOf(saved.has_far, YES_NO_NOT_SURE)) {
    answers[ProfileQuestionId.HAS_FAR] = saved.has_far;
  }
  if (saved.care_recipient_age_not_sure === true) {
    answers[ProfileQuestionId.CARE_RECIPIENT_AGE] = NOT_SURE;
  }
  return answers;
};

export const hasSavedAnswers = (saved: SavedSchemeAnswers): boolean =>
  Object.keys(saved).length > 0;

// A stable string to tell whether the answers changed since the last save
export const answersFingerprint = (answers: SchemeAnswers): string => {
  const saved = toSavedAnswers(answers);
  const age = answers[ProfileQuestionId.CARE_RECIPIENT_AGE];
  return JSON.stringify({
    ...saved,
    age: typeof age === "number" ? age : null,
  });
};

const YES_NO_LABELS: Record<string, string> = {
  yes: "yes",
  no: "no",
  [NOT_SURE]: "not sure",
};
const LTC_LABELS: Record<LtcPlan, string> = {
  careshield_life: "CareShield Life",
  eldershield: "ElderShield",
  neither: "neither",
  [NOT_SURE]: "not sure",
};

// Short read-only lines for the profile, e.g. "Daily activities: needs help
// with 3", "Full help: yes", "Insurance: ElderShield"
export const summariseAnswers = (answers: SchemeAnswers): string[] => {
  const lines: string[] = [];
  const adl = answers[ProfileQuestionId.ADL_NEEDS];
  if (adl === NOT_SURE) lines.push("Daily activities: not sure");
  else if (adl === 0) lines.push("Daily activities: no help needed");
  else if (isAdlCount(adl))
    lines.push(`Daily activities: needs help with ${adl}`);
  const fullHelp = answers[ProfileQuestionId.ADL_FULL_HELP];
  if (fullHelp) lines.push(`Full help: ${YES_NO_LABELS[fullHelp]}`);
  const ltc = answers[ProfileQuestionId.LTC_INSURANCE];
  if (ltc) lines.push(`Insurance: ${LTC_LABELS[ltc]}`);
  const far = answers[ProfileQuestionId.HAS_FAR];
  if (far) lines.push(`Functional Assessment Report: ${YES_NO_LABELS[far]}`);
  if (answers[ProfileQuestionId.CARE_RECIPIENT_AGE] === NOT_SURE) {
    lines.push("Age: not sure");
  }
  return lines;
};
