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
}

interface SchemeAnswersActions {
  setAnswer: <K extends keyof SchemeAnswers>(
    id: K,
    value: SchemeAnswers[K],
  ) => void;
  clearAnswers: () => void;
}

// Answers from the question sheet, kept for this browser session only.
// TODO(schemes step 5): save these to the caregiver's profile via the backend
// instead of sessionStorage. Household income already saves through PCHIForm.
export const useSchemeAnswersStore = create<
  SchemeAnswersState & SchemeAnswersActions
>()(
  persist(
    immer((set) => ({
      answers: {},
      setAnswer: (id, value) =>
        set((state) => {
          state.answers[id] = value;
        }),
      clearAnswers: () =>
        set((state) => {
          state.answers = {};
        }),
    })),
    {
      // v2: daily activities are stored as a count, not a list
      name: "cc-scheme-answers-v2",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);

// A question counts as answered unless the caregiver said "not sure"
export const isAnswered = (
  answers: SchemeAnswers,
  id: ProfileQuestionId,
): boolean => {
  const value = answers[id as keyof SchemeAnswers];
  return value !== undefined && value !== NOT_SURE;
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
