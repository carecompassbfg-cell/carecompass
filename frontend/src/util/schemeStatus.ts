import { CatalogScheme, ProfileQuestionId, SchemeStatus } from "@/types/scheme";
import { UserDataFull } from "@/types/user";
import { CHECKS, CheckAnswers } from "@/util/eligibilityChecker";

// What each check needs, shown when the caregiver is signed out
const SIGNED_OUT_QUESTIONS: Record<string, ProfileQuestionId[]> = {
  "PARENT-RELIEF": [
    ProfileQuestionId.CARE_RECIPIENT_AGE,
    ProfileQuestionId.CARE_RECIPIENT_RESIDENCE,
  ],
  "CAREGIVERS-TRAINING-GRANT": [
    ProfileQuestionId.CARE_RECIPIENT_CITIZENSHIP,
    ProfileQuestionId.CARE_RECIPIENT_AGE,
  ],
  "HOME-CAREGIVING-GRANT": [
    ProfileQuestionId.CARE_RECIPIENT_CITIZENSHIP,
    ProfileQuestionId.CARE_RECIPIENT_RESIDENCE,
    ProfileQuestionId.HOUSEHOLD_INCOME,
    ProfileQuestionId.ADL_NEEDS,
  ],
  "MIGRANT-DOMESTIC-WORKER-LEVY": [
    ProfileQuestionId.CARE_RECIPIENT_CITIZENSHIP,
    ProfileQuestionId.CAREGIVER_CITIZENSHIP,
    ProfileQuestionId.CARE_RECIPIENT_RESIDENCE,
    ProfileQuestionId.CARE_RECIPIENT_AGE,
  ],
  "MOH-NR-LTC-SUBSIDY": [
    ProfileQuestionId.CARE_RECIPIENT_CITIZENSHIP,
    ProfileQuestionId.HOUSEHOLD_INCOME,
  ],
  "SENIORS-MOBILITY-ENABLING-FUND": [
    ProfileQuestionId.CARE_RECIPIENT_CITIZENSHIP,
    ProfileQuestionId.CARE_RECIPIENT_AGE,
    ProfileQuestionId.HOUSEHOLD_INCOME,
  ],
  "MEDISAVE-CARE": [
    ProfileQuestionId.CARE_RECIPIENT_CITIZENSHIP,
    ProfileQuestionId.ADL_NEEDS,
    ProfileQuestionId.ADL_FULL_HELP,
  ],
  "CARESHIELD-ELDERSHIELD-CLAIM": [
    ProfileQuestionId.ADL_NEEDS,
    ProfileQuestionId.ADL_FULL_HELP,
    ProfileQuestionId.LTC_INSURANCE,
  ],
};

const PROVIDER_DECIDES: SchemeStatus = {
  status: "provider_decides",
  reasonsMet: [],
  reasonsNotMet: [],
  questionsToAsk: [],
  agencyWillCheck: [],
};

export interface StatusOptions {
  // Answers from the question sheet this session
  answers?: CheckAnswers;
  // Injected so tests don't depend on the real date
  today?: Date;
}

// Any hard "no" → not a match; a missing answer → needs answers; everything
// checkable met → likely. Agency-only conditions never block "likely".
export const getSchemeStatus = (
  scheme: CatalogScheme,
  user: UserDataFull | null,
  { answers = {}, today = new Date() }: StatusOptions = {},
): SchemeStatus => {
  const check = scheme.checkerId ? CHECKS[scheme.checkerId] : undefined;

  // Tier 2 schemes have no check; a Tier 1 scheme without a known check
  // falls back to the same behaviour rather than guessing.
  if (scheme.tier === 2 || !scheme.checkerId || !check) {
    return { ...PROVIDER_DECIDES };
  }

  if (!user) {
    return {
      status: "needs_answers",
      reasonsMet: [],
      reasonsNotMet: [],
      questionsToAsk: [...(SIGNED_OUT_QUESTIONS[scheme.checkerId] ?? [])],
      agencyWillCheck: [],
      requiresSignIn: true,
    };
  }

  const result = check(user, answers, today);
  let status: SchemeStatus["status"];
  if (result.notMet.length > 0) {
    status = "not_a_match";
  } else if (result.questions.length > 0) {
    status = "needs_answers";
  } else if (result.met.length === 0) {
    status = "not_a_match";
  } else {
    status = "likely";
  }

  return {
    status,
    reasonsMet: result.met,
    reasonsNotMet: result.notMet,
    questionsToAsk: result.questions,
    agencyWillCheck: result.agencyWillCheck,
  };
};
