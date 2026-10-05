import { SchemeStatus, SchemeStatusKind } from "@/types/scheme";
import { QUESTION_META } from "@/util/schemeCatalog";
import SchemeIcon from "./SchemeIcon";

// Text colour per status, shared with the home page status line dots
export const STATUS_TEXT_CLASS: Record<SchemeStatusKind, string> = {
  likely: "text-green-600",
  needs_answers: "text-yellow-600",
  provider_decides: "text-gray-600",
  not_a_match: "text-red-600",
};

const PILL_STYLES: Record<
  SchemeStatusKind,
  { className: string; icon: string; label: string }
> = {
  likely: {
    className: `bg-green-100 ${STATUS_TEXT_CLASS.likely}`,
    icon: "check-pill",
    label: "Likely eligible",
  },
  needs_answers: {
    className: `bg-yellow-50 ${STATUS_TEXT_CLASS.needs_answers}`,
    icon: "question-pill",
    label: "Need answers",
  },
  provider_decides: {
    className: `bg-gray-100 ${STATUS_TEXT_CLASS.provider_decides}`,
    icon: "info-pill",
    label: "Check with agency",
  },
  not_a_match: {
    className: `bg-red-100 ${STATUS_TEXT_CLASS.not_a_match}`,
    icon: "cross-pill",
    label: "Not a match",
  },
};

export const getStatusLabel = (status: SchemeStatus): string => {
  if (status.status === "needs_answers" && status.requiresSignIn) {
    return "Sign in to check";
  }
  if (status.status === "needs_answers" && status.questionsToAsk.length > 0) {
    return QUESTION_META[status.questionsToAsk[0]].pillLabel;
  }
  return PILL_STYLES[status.status].label;
};

// Icon + text so the status never relies on colour alone
export default function StatusPill({ status }: { status: SchemeStatus }) {
  const style = PILL_STYLES[status.status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full py-[3px] pl-1.5 pr-2 text-xs font-semibold leading-4 ${style.className}`}
    >
      <SchemeIcon name={style.icon} size={14} />
      {getStatusLabel(status)}
    </span>
  );
}
