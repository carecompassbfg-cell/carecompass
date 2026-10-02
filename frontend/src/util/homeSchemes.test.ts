import { describe, expect, it } from "vitest";
import {
  CatalogScheme,
  ProfileQuestionId,
  SchemeStatusKind,
} from "@/types/scheme";
import {
  DASHBOARD_ANSWER_HREF,
  getFinancialQuestion,
  getOpenQuestionSummary,
  getResumeStripSubtitle,
  getStatusLineParts,
  readAnswerParam,
} from "@/util/homeSchemes";
import { SchemeWithStatus } from "@/util/schemeCatalog";

const item = (
  status: SchemeStatusKind,
  questionsToAsk: ProfileQuestionId[] = [],
): SchemeWithStatus => ({
  scheme: { id: `${status}-${questionsToAsk.join()}` } as CatalogScheme,
  status: {
    status,
    reasonsMet: [],
    reasonsNotMet: [],
    questionsToAsk,
    agencyWillCheck: [],
  },
});

const repeat = (count: number, make: () => SchemeWithStatus) =>
  Array.from({ length: count }, make);

describe("getStatusLineParts", () => {
  it("shows both counts", () => {
    const items = [
      ...repeat(8, () => item("likely")),
      ...repeat(11, () => item("needs_answers")),
      item("provider_decides"),
      item("not_a_match"),
    ];
    expect(getStatusLineParts(items)).toEqual([
      { kind: "likely", label: "8 likely" },
      { kind: "needs_answers", label: "11 to check" },
    ]);
  });

  it("leaves out a part whose count is 0", () => {
    expect(getStatusLineParts([item("likely")])).toEqual([
      { kind: "likely", label: "1 likely" },
    ]);
    expect(
      getStatusLineParts([item("needs_answers"), item("provider_decides")]),
    ).toEqual([{ kind: "needs_answers", label: "1 to check" }]);
  });

  it("is empty (line hidden) when both are 0", () => {
    expect(getStatusLineParts([])).toEqual([]);
    expect(
      getStatusLineParts([item("provider_decides"), item("not_a_match")]),
    ).toEqual([]);
  });
});

describe("getOpenQuestionSummary", () => {
  const items = [
    item("needs_answers", [ProfileQuestionId.ADL_NEEDS]),
    item("needs_answers", [
      ProfileQuestionId.ADL_NEEDS,
      ProfileQuestionId.LTC_INSURANCE,
    ]),
    item("needs_answers", [ProfileQuestionId.LTC_INSURANCE]),
    item("likely"),
  ];

  it("counts open questions and the schemes they would check", () => {
    expect(getOpenQuestionSummary(items, () => false)).toEqual({
      openQuestions: [
        ProfileQuestionId.ADL_NEEDS,
        ProfileQuestionId.LTC_INSURANCE,
      ],
      schemesToCheck: 3,
    });
  });

  it("leaves out answered questions", () => {
    expect(
      getOpenQuestionSummary(
        items,
        (id) => id === ProfileQuestionId.LTC_INSURANCE,
      ),
    ).toEqual({
      openQuestions: [ProfileQuestionId.ADL_NEEDS],
      schemesToCheck: 2,
    });
    expect(getOpenQuestionSummary(items, () => true)).toEqual({
      openQuestions: [],
      schemesToCheck: 0,
    });
  });
});

describe("getResumeStripSubtitle", () => {
  it("uses plurals", () => {
    expect(getResumeStripSubtitle(2, 11, "your loved one")).toBe(
      "2 quick questions to check 11 more schemes for your loved one",
    );
  });

  it("uses singulars", () => {
    expect(getResumeStripSubtitle(1, 1, "Mum")).toBe(
      "1 quick question to check 1 more scheme for Mum",
    );
    expect(getResumeStripSubtitle(1, 3, "ah ma")).toBe(
      "1 quick question to check 3 more schemes for ah ma",
    );
  });
});

describe("getFinancialQuestion", () => {
  it("says 'my loved one' with no saved name", () => {
    for (const user of [
      null,
      undefined,
      { care_recipient_name: null },
      { care_recipient_name: "  " },
    ]) {
      expect(getFinancialQuestion(user)).toEqual({
        recipient: "my loved one",
        text: "What financial support might my loved one and I be eligible for?",
      });
    }
  });

  it("uses the saved name exactly as typed", () => {
    expect(getFinancialQuestion({ care_recipient_name: "ah ma" })).toEqual({
      recipient: "ah ma",
      text: "What financial support might ah ma and I be eligible for?",
    });
    expect(
      getFinancialQuestion({ care_recipient_name: " Mr Tan " }).recipient,
    ).toBe("Mr Tan");
  });
});

describe("readAnswerParam", () => {
  it("is the param the home page links to", () => {
    expect(DASHBOARD_ANSWER_HREF).toBe("/dashboard?answer=1");
  });

  it("opens the sheet for ?answer=1 and removes the param", () => {
    expect(readAnswerParam("?answer=1")).toEqual({
      openSheet: true,
      remainingSearch: "",
    });
  });

  it("keeps other params", () => {
    expect(readAnswerParam("?status=likely&answer=1")).toEqual({
      openSheet: true,
      remainingSearch: "?status=likely",
    });
  });

  it("removes but ignores other values", () => {
    expect(readAnswerParam("?answer=yes")).toEqual({
      openSheet: false,
      remainingSearch: "",
    });
  });

  it("returns null without the param", () => {
    expect(readAnswerParam("")).toBeNull();
    expect(readAnswerParam("?status=likely")).toBeNull();
  });
});
