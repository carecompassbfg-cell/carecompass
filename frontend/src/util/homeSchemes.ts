// Text for the schemes parts of the home page (status line, "Pick up where
// you left off" strip, financial card question) and the dashboard's
// ?answer=1 link. Built from the same statuses as the dashboard.

import { ProfileQuestionId } from "@/types/scheme";
import { UserDataFull } from "@/types/user";
import { getSavedRecipientName } from "@/util/recipient";
import {
  countByStatus,
  getOpenSheetQuestions,
  SchemeWithStatus,
} from "@/util/schemeCatalog";
import { t } from "@/i18n";

// Open sheet questions that would change a scheme's status, and how many
// "Need answers" schemes they'd check. The dashboard's "Answer N questions"
// strip and the home page's resume strip both use this.
export const getOpenQuestionSummary = (
  items: SchemeWithStatus[],
  isAnswered: (id: ProfileQuestionId) => boolean,
): { openQuestions: ProfileQuestionId[]; schemesToCheck: number } => {
  const openQuestions = getOpenSheetQuestions(items, isAnswered);
  const schemesToCheck = items.filter(
    ({ status }) =>
      status.status === "needs_answers" &&
      status.questionsToAsk.some((id) => openQuestions.includes(id)),
  ).length;
  return { openQuestions, schemesToCheck };
};

export type StatusLinePart = {
  kind: "likely" | "needs_answers";
  label: string;
};

// "● 8 likely · ● 11 to check". A part is left out when its count is 0;
// an empty list means the line is hidden.
export const getStatusLineParts = (
  items: SchemeWithStatus[],
): StatusLinePart[] => {
  const counts = countByStatus(items);
  const parts: StatusLinePart[] = [];
  if (counts.likely > 0) {
    parts.push({
      kind: "likely",
      label: t("home.statusLine.likely", { count: counts.likely }),
    });
  }
  if (counts.needs_answers > 0) {
    parts.push({
      kind: "needs_answers",
      label: t("home.statusLine.toCheck", { count: counts.needs_answers }),
    });
  }
  return parts;
};

// "2 quick questions to check 11 more schemes for Mum"
export const getResumeStripSubtitle = (
  questionCount: number,
  schemeCount: number,
  recipientName: string,
): string =>
  t("home.resume.subtitle", {
    questions: questionCount,
    schemes: schemeCount,
    name: recipientName,
  });

// The financial card's question. The highlighted part is the saved name
// exactly as typed, or "my loved one".
export const getFinancialQuestion = (
  user: Pick<UserDataFull, "care_recipient_name"> | null | undefined,
): { recipient: string; text: string } => {
  const recipient = getSavedRecipientName(user) ?? t("home.cards.myLovedOne");
  return {
    recipient,
    text: t("home.cards.financialPlain", { recipient }),
  };
};

// Links that open the question sheet on /dashboard straight away
export const ANSWER_PARAM = "answer";
export const DASHBOARD_ANSWER_HREF = `/dashboard?${ANSWER_PARAM}=1`;

// Reads ?answer=1 from a query string. Returns whether to open the sheet
// and the query string to replace it with (so Back doesn't reopen it), or
// null when the param isn't there.
export const readAnswerParam = (
  search: string,
): { openSheet: boolean; remainingSearch: string } | null => {
  const params = new URLSearchParams(search);
  if (!params.has(ANSWER_PARAM)) return null;
  const openSheet = params.get(ANSWER_PARAM) === "1";
  params.delete(ANSWER_PARAM);
  const rest = params.toString();
  return { openSheet, remainingSearch: rest ? `?${rest}` : "" };
};
