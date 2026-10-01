import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { ProfileQuestionId } from "@/types/scheme";

export const NOT_SURE = "not_sure";

export type AdlActivity =
  | "bathing"
  | "dressing"
  | "eating"
  | "toileting"
  | "moving_around"
  | "transferring";

export type YesNoNotSure = "yes" | "no" | typeof NOT_SURE;
export type HousingType = "hdb" | "private" | "other" | typeof NOT_SURE;
export type LtcInsurance =
  | "eldershield"
  | "careshield_life"
  | "neither"
  | typeof NOT_SURE;

export interface SchemeAnswers {
  [ProfileQuestionId.CARE_RECIPIENT_AGE]?: number | typeof NOT_SURE;
  [ProfileQuestionId.HOUSEHOLD_INCOME]?: "saved" | typeof NOT_SURE;
  [ProfileQuestionId.ADL_NEEDS]?: AdlActivity[] | typeof NOT_SURE;
  [ProfileQuestionId.HAS_FAR]?: YesNoNotSure;
  [ProfileQuestionId.HOUSING_TYPE]?: HousingType;
  [ProfileQuestionId.LTC_INSURANCE]?: LtcInsurance;
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
      name: "cc-scheme-answers",
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
