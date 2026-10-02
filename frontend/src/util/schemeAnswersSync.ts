// Loading the question-sheet answers from the profile and saving them back.
// Pure functions (the API call is passed in) so the flow can be tested.

import { NOT_SURE, SchemeAnswers } from "@/stores/schemeAnswers";
import { ProfileQuestionId } from "@/types/scheme";
import { SavedSchemeAnswers, UserData } from "@/types/user";
import { isKnownAge } from "@/util/profileInput";
import {
  answersFingerprint,
  fromSavedAnswers,
  hasSavedAnswers,
  toSavedAnswers,
} from "@/util/schemeAnswersAdapter";

export const EMPTY_FINGERPRINT = answersFingerprint({});

export type SyncAction =
  | { kind: "none" }
  // Replace the session answers with the profile's
  | {
      kind: "load";
      answers: SchemeAnswers;
      ownerId: number;
      fingerprint: string;
    }
  // Keep answers given while signed out; they now belong to this user and
  // are saved the next time the question sheet closes
  | { kind: "adopt"; ownerId: number }
  // Signed out after being signed in: drop that person's answers
  | { kind: "reset" };

export const decideSync = (
  state: { answers: SchemeAnswers; ownerId: number | null },
  user: UserData | null | undefined,
  isSignedIn: boolean,
): SyncAction => {
  if (!isSignedIn) {
    return state.ownerId !== null ? { kind: "reset" } : { kind: "none" };
  }
  if (!user || state.ownerId === user.id) return { kind: "none" };

  const saved = fromSavedAnswers(user.scheme_answers);
  if (Object.keys(saved).length > 0) {
    return {
      kind: "load",
      answers: saved,
      ownerId: user.id,
      fingerprint: answersFingerprint(saved),
    };
  }
  const hasSessionAnswers =
    answersFingerprint(state.answers) !== EMPTY_FINGERPRINT;
  if (state.ownerId === null && hasSessionAnswers) {
    return { kind: "adopt", ownerId: user.id };
  }
  return {
    kind: "load",
    answers: {},
    ownerId: user.id,
    fingerprint: EMPTY_FINGERPRINT,
  };
};

export interface ProfilePatch {
  scheme_answers: SavedSchemeAnswers | null;
  care_recipient_age?: number;
}

// The PATCH /users/me body for the current answers: the whole scheme_answers
// object (null when there's nothing to keep), plus the age if it was only
// answered in the sheet
export const buildProfilePatch = (
  answers: SchemeAnswers,
  user: Pick<UserData, "care_recipient_age">,
): ProfilePatch => {
  const saved = toSavedAnswers(answers);
  const patch: ProfilePatch = {
    scheme_answers: hasSavedAnswers(saved) ? saved : null,
  };
  const age = answers[ProfileQuestionId.CARE_RECIPIENT_AGE];
  if (
    age !== NOT_SURE &&
    isKnownAge(age) &&
    !isKnownAge(user.care_recipient_age)
  ) {
    patch.care_recipient_age = age;
  }
  return patch;
};

export type PatchUser = (body: ProfilePatch) => Promise<UserData>;

export interface SaveResult {
  saved: boolean;
  user?: UserData;
  fingerprint: string;
}

// Saves only when the answers changed since the last save. Throws if the
// request fails, so the caller can keep the answers and try again later.
export const saveAnswersIfChanged = async ({
  answers,
  savedFingerprint,
  user,
  patch,
}: {
  answers: SchemeAnswers;
  savedFingerprint: string | null;
  user: UserData;
  patch: PatchUser;
}): Promise<SaveResult> => {
  const fingerprint = answersFingerprint(answers);
  if (fingerprint === savedFingerprint) return { saved: false, fingerprint };
  const updated = await patch(buildProfilePatch(answers, user));
  return { saved: true, user: updated, fingerprint };
};
