import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import { api } from "@/api";
import { useAuthStore } from "@/stores/auth";
import { useSchemeAnswersStore } from "@/stores/schemeAnswers";
import { UserData } from "@/types/user";
import { t } from "@/i18n";
import {
  applySync,
  ProfilePatch,
  saveAnswersIfChanged,
} from "@/util/schemeAnswersSync";

export const getSaveFailedMessage = (): string => t("toast.saveAnswersFailed");

// Signed in: loads the question-sheet answers from the profile, and returns
// saveAnswers() to call when the sheet closes. Signed out: answers stay in
// this browser session only.
export default function useSchemeAnswersSync() {
  const isInitialised = useAuthStore((state) => state.isInitialised);
  const isSignedIn = useAuthStore((state) => state.isSignedIn);
  const userData = useAuthStore((state) => state.userData);
  const setUserData = useAuthStore((state) => state.setUserData);

  // Once per sheet close, not per tap. Statuses have already updated from
  // the session answers; this only keeps the profile in step.
  const saveAnswers = useCallback(async () => {
    if (!isSignedIn || !userData) return;
    const { answers, savedFingerprint, markSaved } =
      useSchemeAnswersStore.getState();
    try {
      const result = await saveAnswersIfChanged({
        answers,
        savedFingerprint,
        user: userData,
        patch: async (body: ProfilePatch) => {
          const response = await api.patch<UserData>("/users/me", body);
          if (!response.data) throw new Error("Empty response");
          return response.data;
        },
      });
      if (result.saved && result.user) {
        markSaved(result.fingerprint);
        setUserData(true, result.user);
      }
    } catch {
      // Keep the answers; the next close tries again
      toast(getSaveFailedMessage());
    }
  }, [isSignedIn, userData, setUserData]);

  // Answers given while signed out are saved as soon as they're adopted
  useEffect(() => {
    if (!isInitialised) return;
    applySync(useSchemeAnswersStore.getState(), userData, isSignedIn, () => {
      saveAnswers();
    });
  }, [isInitialised, isSignedIn, userData, saveAnswers]);

  return { saveAnswers };
}
