import { useRef, useState } from "react";
import { Button } from "@opengovsg/design-system-react";
import { toast } from "sonner";
import { api } from "@/api";
import { useAuthStore } from "@/stores/auth";
import { useSchemeAnswersStore } from "@/stores/schemeAnswers";
import { UserData } from "@/types/user";
import useSchemeAnswersSync from "@/util/hooks/useSchemeAnswersSync";
import { getRecipientName } from "@/util/recipient";
import { summariseAnswers } from "@/util/schemeAnswersAdapter";
import { EMPTY_FINGERPRINT } from "@/util/schemeAnswersSync";
import QuestionSheet from "./QuestionSheet";
import { FOCUS_RING } from "./SchemeIcon";
import { t } from "@/i18n";

// Read-only summary of the saved schemes answers on the profile page, with
// Edit (opens the question sheet) and Clear (with a confirm step in the page)
export default function YourAnswers({ user }: { user: UserData }) {
  const { saveAnswers } = useSchemeAnswersSync();
  const answers = useSchemeAnswersStore((state) => state.answers);
  const setUserData = useAuthStore((state) => state.setUserData);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const clearButtonRef = useRef<HTMLButtonElement>(null);

  const lines = summariseAnswers(answers);

  const clearAnswers = async () => {
    setIsClearing(true);
    try {
      const response = await api.patch<UserData>("/users/me", {
        scheme_answers: null,
      });
      useSchemeAnswersStore
        .getState()
        .loadAnswers({}, user.id, EMPTY_FINGERPRINT);
      if (response.data) setUserData(true, response.data);
      setIsConfirming(false);
      toast.success(t("answers.cleared"));
    } catch {
      toast.error(t("answers.clearError"));
    } finally {
      setIsClearing(false);
    }
  };

  return (
    // Health-related answers: keep them out of PostHog autocapture/recordings
    <section
      aria-labelledby="your-answers"
      className="ph-no-capture mt-3 flex flex-col gap-2 border-t border-gray-200 pt-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h4 id="your-answers" className="font-semibold">
          {t("answers.title")}
        </h4>
        <button
          type="button"
          onClick={() => setIsSheetOpen(true)}
          className={`min-h-11 px-2 text-sm font-semibold text-interaction-links-default ${FOCUS_RING}`}
        >
          {t("dashboard.edit")}
          <span className="sr-only">{t("answers.editSr")}</span>
        </button>
      </div>
      <p className="text-sm text-gray-600">
        {lines.length > 0 ? lines.join(" · ") : t("answers.none")}
      </p>

      {lines.length > 0 && !isConfirming && (
        <button
          ref={clearButtonRef}
          type="button"
          onClick={() => setIsConfirming(true)}
          className={`min-h-11 self-start text-sm font-semibold text-red-600 ${FOCUS_RING}`}
        >
          {t("answers.clear")}
        </button>
      )}
      {isConfirming && (
        <div
          role="group"
          aria-labelledby="clear-answers-question"
          className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-3"
        >
          <p id="clear-answers-question" className="text-sm text-gray-800">
            {t("answers.confirm")}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              colorScheme="critical"
              isLoading={isClearing}
              onClick={clearAnswers}
            >
              {t("answers.yesClear")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsConfirming(false);
                clearButtonRef.current?.focus();
              }}
            >
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      )}

      {isSheetOpen && (
        <QuestionSheet
          isOpen
          mode="edit"
          items={[]}
          recipientName={getRecipientName(user)}
          recipientAge={user.care_recipient_age}
          isSignedIn
          onIncomeSaved={async () => undefined}
          onClose={() => {
            setIsSheetOpen(false);
            saveAnswers();
          }}
        />
      )}
    </section>
  );
}
