import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import { api } from "@/api";
import { useAuthStore } from "@/stores/auth";
import { useSchemeAnswersStore } from "@/stores/schemeAnswers";
import { UserData } from "@/types/user";
import {
  decideSync,
  ProfilePatch,
  saveAnswersIfChanged,
} from "@/util/schemeAnswersSync";

export const SAVE_FAILED_MESSAGE =
  "Couldn't save your answers. They'll stay for this visit.";

// Signed in: loads the question-sheet answers from the profile, and returns
// saveAnswers() to call when the sheet closes. Signed out: answers stay in
// this browser session only.
export default function useSchemeAnswersSync() {
  const isInitialised = useAuthStore((state) => state.isInitialised);
  const isSignedIn = useAuthStore((state) => state.isSignedIn);
  const userData = useAuthStore((state) => state.userData);
  const setUserData = useAuthStore((state) => state.setUserData);

  useEffect(() => {
    if (!isInitialised) return;
    const store = useSchemeAnswersStore.getState();
    const action = decideSync(store, userData, isSignedIn);
    if (action.kind === "load") {
      store.loadAnswers(action.answers, action.ownerId, action.fingerprint);
    } else if (action.kind === "adopt") {
      store.setOwner(action.ownerId);
    } else if (action.kind === "reset") {
      store.loadAnswers({}, null, null);
    }
  }, [isInitialised, isSignedIn, userData]);

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
      toast(SAVE_FAILED_MESSAGE);
    }
  }, [isSignedIn, userData, setUserData]);

  return { saveAnswers };
}
