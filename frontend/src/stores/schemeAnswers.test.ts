import { describe, expect, it } from "vitest";
import { isAnswered, NOT_SURE, SchemeAnswers } from "@/stores/schemeAnswers";
import { ProfileQuestionId } from "@/types/scheme";
import { SchemeWithStatus, getOpenSheetQuestions } from "@/util/schemeCatalog";

describe("isAnswered", () => {
  it('counts "not sure" as unanswered for most questions', () => {
    const answers: SchemeAnswers = {
      [ProfileQuestionId.ADL_NEEDS]: NOT_SURE,
      [ProfileQuestionId.LTC_INSURANCE]: NOT_SURE,
    };
    expect(isAnswered(answers, ProfileQuestionId.ADL_NEEDS)).toBe(false);
    expect(isAnswered(answers, ProfileQuestionId.LTC_INSURANCE)).toBe(false);
    expect(isAnswered({}, ProfileQuestionId.ADL_FULL_HELP)).toBe(false);
  });

  it('counts "not sure" as answered for full help', () => {
    const answers: SchemeAnswers = {
      [ProfileQuestionId.ADL_FULL_HELP]: NOT_SURE,
    };
    expect(isAnswered(answers, ProfileQuestionId.ADL_FULL_HELP)).toBe(true);
  });

  it('keeps "not sure" on full help out of the "Answer N questions" strip', () => {
    const needsFullHelp: SchemeWithStatus = {
      scheme: {
        id: "MEDISAVE-CARE",
        source: "carecompass",
        sourceId: null,
        tier: 1,
        name: "MediSave Care",
        agency: "AIC / CPF",
        summary: "",
        description: "",
        whatYouGet: [],
        payFor: "monthly_payouts" as never,
        area: { kind: "islandwide" },
        link: "https://example.com",
        sources: [],
      },
      status: {
        status: "needs_answers",
        reasonsMet: [],
        reasonsNotMet: [],
        questionsToAsk: [ProfileQuestionId.ADL_FULL_HELP],
        agencyWillCheck: ["The severe disability assessment decides"],
      },
    };
    const notSure: SchemeAnswers = {
      [ProfileQuestionId.ADL_FULL_HELP]: NOT_SURE,
    };
    expect(
      getOpenSheetQuestions([needsFullHelp], (id) => isAnswered(notSure, id)),
    ).toEqual([]);
    expect(
      getOpenSheetQuestions([needsFullHelp], (id) => isAnswered({}, id)),
    ).toEqual([ProfileQuestionId.ADL_FULL_HELP]);
  });
});
