import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, X } from "lucide-react";
import {
  DASHBOARD_ANSWER_HREF,
  getResumeStripSubtitle,
} from "@/util/homeSchemes";
import SchemeIcon, { FOCUS_RING } from "./SchemeIcon";

// Hidden for the rest of this browser session only, not saved to the profile
export const RESUME_STRIP_HIDDEN_KEY = "cc-home-resume-strip-hidden";

const readHidden = (): boolean => {
  try {
    return sessionStorage.getItem(RESUME_STRIP_HIDDEN_KEY) === "true";
  } catch {
    return false;
  }
};

// "Pick up where you left off" on the home page: opens the question sheet
// on /dashboard straight away
export default function ResumeStrip({
  questionCount,
  schemeCount,
  recipientName,
}: {
  questionCount: number;
  schemeCount: number;
  recipientName: string;
}) {
  // Unknown until read on the client, so it doesn't flash in then out
  const [isHidden, setIsHidden] = useState<boolean | null>(null);
  useEffect(() => setIsHidden(readHidden()), []);

  if (isHidden !== false) return null;

  const hide = () => {
    try {
      sessionStorage.setItem(RESUME_STRIP_HIDDEN_KEY, "true");
    } catch {
      // Still hide it for this page view
    }
    setIsHidden(true);
  };

  return (
    <div className="relative mb-2 rounded-2xl bg-yellow-50 shadow-md">
      <Link
        href={DASHBOARD_ANSWER_HREF}
        className={`flex min-h-11 items-center gap-3 rounded-2xl px-3 py-3 ${FOCUS_RING}`}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white">
          <SchemeIcon name="question-summary" size={20} />
        </span>
        <span className="flex flex-1 flex-col gap-0.5">
          <span className="text-[15px] font-semibold leading-5 text-gray-800">
            Pick up where you left off
          </span>
          <span className="ph-no-capture text-[13px] leading-[18px] text-gray-600">
            {getResumeStripSubtitle(questionCount, schemeCount, recipientName)}
          </span>
        </span>
        <ChevronRight
          aria-hidden
          size={18}
          className="shrink-0 text-gray-800"
        />
      </Link>
      {/* Small badge on the corner, with a 44px tap area, so the link keeps
          the full width */}
      <button
        type="button"
        onClick={hide}
        aria-label="Hide for now"
        className={`absolute -right-3 -top-3 flex size-11 items-center justify-center rounded-full ${FOCUS_RING}`}
      >
        <span className="flex size-6 items-center justify-center rounded-full bg-white text-gray-600 shadow">
          <X aria-hidden size={14} />
        </span>
      </button>
    </div>
  );
}
