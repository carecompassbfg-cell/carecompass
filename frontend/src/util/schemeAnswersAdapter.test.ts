import { describe, expect, it } from "vitest";
import { NOT_SURE, SchemeAnswers } from "@/stores/schemeAnswers";
import { ProfileQuestionId } from "@/types/scheme";
import { SavedSchemeAnswers } from "@/types/user";
import {
  answersFingerprint,
  fromSavedAnswers,
  summariseAnswers,
  toSavedAnswers,
} from "@/util/schemeAnswersAdapter";

const answers: SchemeAnswers = {
  [ProfileQuestionId.ADL_NEEDS]: 3,
  [ProfileQuestionId.ADL_FULL_HELP]: "yes",
  [ProfileQuestionId.LTC_INSURANCE]: "eldershield",
  [ProfileQuestionId.HAS_FAR]: NOT_SURE,
  [ProfileQuestionId.CARE_RECIPIENT_AGE]: NOT_SURE,
};

const saved: SavedSchemeAnswers = {
  adl_needs: 3,
  adl_full_help: "yes",
  ltc_insurance: "eldershield",
  has_far: NOT_SURE,
  care_recipient_age_not_sure: true,
};

describe("toSavedAnswers", () => {
  it("maps store keys to the backend's snake_case fields", () => {
    expect(toSavedAnswers(answers)).toEqual(saved);
  });

  it("leaves out unanswered questions, a numeric age and income", () => {
    expect(
      toSavedAnswers({
        [ProfileQuestionId.CARE_RECIPIENT_AGE]: 70,
        [ProfileQuestionId.HOUSEHOLD_INCOME]: "saved",
      }),
    ).toEqual({});
    expect(toSavedAnswers({})).toEqual({});
  });
});

describe("fromSavedAnswers", () => {
  it("maps the backend fields back to store keys", () => {
    expect(fromSavedAnswers(saved)).toEqual(answers);
  });

  it("round-trips", () => {
    expect(fromSavedAnswers(toSavedAnswers(answers))).toEqual(answers);
  });

  it("handles null and ignores invalid values", () => {
    expect(fromSavedAnswers(null)).toEqual({});
    expect(fromSavedAnswers(undefined)).toEqual({});
    expect(
      fromSavedAnswers({
        adl_needs: 9,
        adl_full_help: "maybe",
        ltc_insurance: "other",
        care_recipient_age_not_sure: false,
      } as unknown as SavedSchemeAnswers),
    ).toEqual({});
  });
});

describe("answersFingerprint", () => {
  it("changes when an answer changes and ignores key order", () => {
    const changed = { ...answers, [ProfileQuestionId.ADL_NEEDS]: 4 };
    expect(answersFingerprint(changed)).not.toBe(answersFingerprint(answers));
    const reordered: SchemeAnswers = {
      [ProfileQuestionId.CARE_RECIPIENT_AGE]: NOT_SURE,
      [ProfileQuestionId.HAS_FAR]: NOT_SURE,
      [ProfileQuestionId.LTC_INSURANCE]: "eldershield",
      [ProfileQuestionId.ADL_FULL_HELP]: "yes",
      [ProfileQuestionId.ADL_NEEDS]: 3,
    };
    expect(answersFingerprint(reordered)).toBe(answersFingerprint(answers));
  });

  it("includes an age answered in the sheet", () => {
    expect(
      answersFingerprint({ [ProfileQuestionId.CARE_RECIPIENT_AGE]: 70 }),
    ).not.toBe(answersFingerprint({}));
  });
});

describe("summariseAnswers", () => {
  it("gives short read-only lines", () => {
    expect(summariseAnswers(answers)).toEqual([
      "Daily activities: needs help with 3",
      "Full help: yes",
      "Insurance: ElderShield",
      "Functional Assessment Report: not sure",
      "Age: not sure",
    ]);
  });

  it("is empty with no answers", () => {
    expect(summariseAnswers({})).toEqual([]);
    expect(summariseAnswers({ [ProfileQuestionId.ADL_NEEDS]: 0 })).toEqual([
      "Daily activities: no help needed",
    ]);
  });
});
