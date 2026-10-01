import { CatalogScheme, ProfileQuestionId, SchemeStatus } from "@/types/scheme";
import { UserDataFull } from "@/types/user";
import {
  checkCaregiversTrainingGrant,
  checkHomeCaregivingGrant,
  checkMdwLevyConcession,
  checkMohLtcSubsidy,
  checkParentRelief,
  EligibilityResult,
} from "@/util/eligibilityChecker";

const CHECKERS: Record<string, (user: UserDataFull) => EligibilityResult> = {
  "PARENT-RELIEF": checkParentRelief,
  "CAREGIVERS-TRAINING-GRANT": checkCaregiversTrainingGrant,
  "HOME-CAREGIVING-GRANT": checkHomeCaregivingGrant,
  "MIGRANT-DOMESTIC-WORKER-LEVY": checkMdwLevyConcession,
  "MOH-NR-LTC-SUBSIDY": checkMohLtcSubsidy,
};

// Profile facts each checker reads, asked when the caregiver is signed out
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
};

const PROVIDER_DECIDES: SchemeStatus = {
  status: "provider_decides",
  reasonsMet: [],
  reasonsNotMet: [],
  questionsToAsk: [],
  agencyWillCheck: [],
};

export const getSchemeStatus = (
  scheme: CatalogScheme,
  user: UserDataFull | null,
): SchemeStatus => {
  const checker = scheme.checkerId ? CHECKERS[scheme.checkerId] : undefined;

  // Tier 2 schemes have no checker; a Tier 1 scheme without a known checker
  // falls back to the same behaviour rather than guessing.
  if (scheme.tier === 2 || !scheme.checkerId || !checker) {
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

  const result = checker(user);
  const pendingQuestions = result.pendingQuestions ?? [];
  const pendingDetails = new Set(pendingQuestions.flatMap((q) => q.details));

  const reasonsMet = result.eligibleReasons;
  const reasonsNotMet = result.ineligibleReasons ?? [];
  const questionsToAsk = Array.from(new Set(pendingQuestions.map((q) => q.id)));
  const agencyWillCheck = (result.additionalVerificationDetails ?? []).filter(
    (detail) => !pendingDetails.has(detail),
  );

  let status: SchemeStatus["status"];
  if (reasonsNotMet.length > 0) {
    status = "not_a_match";
  } else if (questionsToAsk.length > 0) {
    status = "needs_answers";
  } else if (reasonsMet.length === 0) {
    status = "not_a_match";
  } else {
    status = "likely";
  }

  return { status, reasonsMet, reasonsNotMet, questionsToAsk, agencyWillCheck };
};
