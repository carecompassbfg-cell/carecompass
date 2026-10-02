import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { ProfileQuestionId } from "@/types/scheme";
import { AdlFullHelp, CheckAnswers, LtcPlan } from "@/util/eligibilityChecker";

export const NOT_SURE = "not_sure";

export type YesNoNotSure = "yes" | "no" | typeof NOT_SURE;

export interface SchemeAnswers {
  [ProfileQuestionId.CARE_RECIPIENT_AGE]?: number | typeof NOT_SURE;
  [ProfileQuestionId.HOUSEHOLD_INCOME]?: "saved" | typeof NOT_SURE;
  // adl_count: how many of the 6 daily activities need help (0 = none)
  [ProfileQuestionId.ADL_NEEDS]?: number | typeof NOT_SURE;
  [ProfileQuestionId.ADL_FULL_HELP]?: AdlFullHelp;
  [ProfileQuestionId.LTC_INSURANCE]?: LtcPlan;
  // Defined for next steps later; not asked yet
  [ProfileQuestionId.HAS_FAR]?: YesNoNotSure;
}

interface SchemeAnswersState {
  answers: SchemeAnswers;
  // The signed-in user (UserData.id) these answers belong to; null while
  // signed out
  ownerId: number | null;
  // answersFingerprint() of what was last saved to the profile, or null if
  // nothing has been saved yet
  savedFingerprint: string | null;
}

interface SchemeAnswersActions {
  setAnswer: <K extends keyof SchemeAnswers>(
    id: K,
    value: SchemeAnswers[K],
  ) => void;
  // Replace everything, e.g. with the answers loaded from the profile
  loadAnswers: (
    answers: SchemeAnswers,
    ownerId: number | null,
    savedFingerprint: string | null,
  ) => void;
  setOwner: (ownerId: number | null) => void;
  markSaved: (fingerprint: string | null) => void;
  clearAnswers: () => void;
}

// Answers from the question sheet. Signed in, they're loaded from and saved
// to the profile (useSchemeAnswersSync); signed out, they last for this
// browser session only.
export const useSchemeAnswersStore = create<
  SchemeAnswersState & SchemeAnswersActions
>()(
  persist(
    immer((set) => ({
      answers: {},
      ownerId: null,
      savedFingerprint: null,
      setAnswer: (id, value) =>
        set((state) => {
          state.answers[id] = value;
        }),
      loadAnswers: (answers, ownerId, savedFingerprint) =>
        set((state) => {
          state.answers = answers;
          state.ownerId = ownerId;
          state.savedFingerprint = savedFingerprint;
        }),
      setOwner: (ownerId) =>
        set((state) => {
          state.ownerId = ownerId;
        }),
      markSaved: (fingerprint) =>
        set((state) => {
          state.savedFingerprint = fingerprint;
        }),
      clearAnswers: () =>
        set((state) => {
          state.answers = {};
          state.savedFingerprint = null;
        }),
    })),
    {
      // v3: answers are tied to a user and saved to the profile
      name: "cc-scheme-answers-v3",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);

// Questions where "not sure" is a final answer: the sheet doesn't ask again
// and the strip doesn't count them (the assessment decides instead)
const NOT_SURE_IS_FINAL = [ProfileQuestionId.ADL_FULL_HELP];

// A question counts as answered unless the caregiver said "not sure" (except
// where "not sure" is final)
export const isAnswered = (
  answers: SchemeAnswers,
  id: ProfileQuestionId,
): boolean => {
  const value = answers[id as keyof SchemeAnswers];
  if (value === undefined) return false;
  return value !== NOT_SURE || NOT_SURE_IS_FINAL.includes(id);
};

// The sheet's answers in the shape the eligibility checks read
export const toCheckAnswers = (answers: SchemeAnswers): CheckAnswers => {
  const adl = answers[ProfileQuestionId.ADL_NEEDS];
  return {
    adlCount: typeof adl === "number" ? adl : null,
    adlFullHelp: answers[ProfileQuestionId.ADL_FULL_HELP],
    ltcInsurance: answers[ProfileQuestionId.LTC_INSURANCE],
  };
};
