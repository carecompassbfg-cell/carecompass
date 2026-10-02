import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  NOT_SURE,
  SchemeAnswers,
  useSchemeAnswersStore,
} from "@/stores/schemeAnswers";
import { ProfileQuestionId } from "@/types/scheme";
import {
  Citizenship,
  Relationship,
  Residence,
  SavedSchemeAnswers,
  UserData,
} from "@/types/user";
import { answersFingerprint } from "@/util/schemeAnswersAdapter";

// The store persists to sessionStorage; give it an in-memory one in Node
vi.hoisted(() => {
  const items = new Map<string, string>();
  Object.assign(globalThis, {
    sessionStorage: {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => items.set(key, value),
      removeItem: (key: string) => items.delete(key),
    },
  });
});
import {
  buildProfilePatch,
  decideSync,
  EMPTY_FINGERPRINT,
  ProfilePatch,
  saveAnswersIfChanged,
} from "@/util/schemeAnswersSync";

const makeUser = (overrides: Partial<UserData> = {}): UserData =>
  ({
    id: 7,
    citizenship: Citizenship.CITIZEN,
    care_recipient_age: 80,
    care_recipient_citizenship: Citizenship.CITIZEN,
    care_recipient_residence: Residence.HOME,
    care_recipient_relationship: Relationship.PARENT,
    household_size: 2,
    total_monthly_household_income: 2000,
    annual_property_value: 10000,
    monthly_pchi: 1000,
    scheme_answers: null,
    ...overrides,
  }) as UserData;

const sessionAnswers: SchemeAnswers = {
  [ProfileQuestionId.ADL_NEEDS]: 2,
};

describe("decideSync", () => {
  it("does nothing while signed out with session-only answers", () => {
    expect(
      decideSync({ answers: sessionAnswers, ownerId: null }, null, false),
    ).toEqual({ kind: "none" });
  });

  it("drops a signed-in person's answers after signing out", () => {
    expect(
      decideSync({ answers: sessionAnswers, ownerId: 7 }, null, false),
    ).toEqual({ kind: "reset" });
  });

  it("loads the profile's saved answers", () => {
    const user = makeUser({ scheme_answers: { adl_needs: 4 } });
    expect(decideSync({ answers: {}, ownerId: null }, user, true)).toEqual({
      kind: "load",
      answers: { [ProfileQuestionId.ADL_NEEDS]: 4 },
      ownerId: 7,
      fingerprint: answersFingerprint({ [ProfileQuestionId.ADL_NEEDS]: 4 }),
    });
  });

  it("keeps answers given before signing in when the profile has none", () => {
    expect(
      decideSync({ answers: sessionAnswers, ownerId: null }, makeUser(), true),
    ).toEqual({ kind: "adopt", ownerId: 7 });
  });

  it("doesn't hand one person's answers to another", () => {
    expect(
      decideSync({ answers: sessionAnswers, ownerId: 3 }, makeUser(), true),
    ).toEqual({
      kind: "load",
      answers: {},
      ownerId: 7,
      fingerprint: EMPTY_FINGERPRINT,
    });
  });

  it("does nothing once loaded for this user", () => {
    expect(
      decideSync({ answers: sessionAnswers, ownerId: 7 }, makeUser(), true),
    ).toEqual({ kind: "none" });
  });
});

describe("buildProfilePatch", () => {
  it("sends the whole scheme_answers object", () => {
    expect(
      buildProfilePatch(
        {
          [ProfileQuestionId.ADL_NEEDS]: 3,
          [ProfileQuestionId.LTC_INSURANCE]: "careshield_life",
        },
        makeUser(),
      ),
    ).toEqual({
      scheme_answers: { adl_needs: 3, ltc_insurance: "careshield_life" },
    });
  });

  it("sends null when nothing is left", () => {
    expect(buildProfilePatch({}, makeUser())).toEqual({ scheme_answers: null });
  });

  it("adds an age answered in the sheet only if the profile has none", () => {
    const answers = { [ProfileQuestionId.CARE_RECIPIENT_AGE]: 72 };
    expect(
      buildProfilePatch(answers, makeUser({ care_recipient_age: 0 })),
    ).toEqual({ scheme_answers: null, care_recipient_age: 72 });
    expect(buildProfilePatch(answers, makeUser())).toEqual({
      scheme_answers: null,
    });
    expect(
      buildProfilePatch(
        { [ProfileQuestionId.CARE_RECIPIENT_AGE]: NOT_SURE },
        makeUser({ care_recipient_age: 0 }),
      ),
    ).toEqual({ scheme_answers: { care_recipient_age_not_sure: true } });
  });
});

// Mirrors useSchemeAnswersSync with a mocked API: load from the profile,
// change answers in the sheet, then save once when it closes
describe("load, answer, then save", () => {
  beforeEach(() => {
    useSchemeAnswersStore.getState().loadAnswers({}, null, null);
  });

  const loadFor = (user: UserData) => {
    const store = useSchemeAnswersStore.getState();
    const action = decideSync(store, user, true);
    if (action.kind === "load") {
      store.loadAnswers(action.answers, action.ownerId, action.fingerprint);
    }
  };

  const closeSheet = async (
    user: UserData,
    patch: (body: ProfilePatch) => Promise<UserData>,
  ) => {
    const { answers, savedFingerprint, markSaved } =
      useSchemeAnswersStore.getState();
    const result = await saveAnswersIfChanged({
      answers,
      savedFingerprint,
      user,
      patch,
    });
    if (result.saved) markSaved(result.fingerprint);
    return result;
  };

  it("PATCHes once per close with the full answers, and not when unchanged", async () => {
    const saved: SavedSchemeAnswers = { adl_needs: 3, adl_full_help: "yes" };
    const user = makeUser({ scheme_answers: saved });
    const patch = vi.fn(async (body: ProfilePatch) =>
      makeUser({ scheme_answers: body.scheme_answers }),
    );

    loadFor(user);
    expect(useSchemeAnswersStore.getState().answers).toEqual({
      [ProfileQuestionId.ADL_NEEDS]: 3,
      [ProfileQuestionId.ADL_FULL_HELP]: "yes",
    });

    // Closing without changes doesn't save
    expect((await closeSheet(user, patch)).saved).toBe(false);
    expect(patch).not.toHaveBeenCalled();

    // Several taps, one close, one PATCH with everything
    const { setAnswer } = useSchemeAnswersStore.getState();
    setAnswer(ProfileQuestionId.LTC_INSURANCE, "neither");
    setAnswer(ProfileQuestionId.LTC_INSURANCE, "eldershield");
    expect((await closeSheet(user, patch)).saved).toBe(true);
    expect(patch).toHaveBeenCalledTimes(1);
    expect(patch).toHaveBeenCalledWith({
      scheme_answers: {
        adl_needs: 3,
        adl_full_help: "yes",
        ltc_insurance: "eldershield",
      },
    });

    // Closing again without changes doesn't save again
    await closeSheet(user, patch);
    expect(patch).toHaveBeenCalledTimes(1);
  });

  it("keeps the answers and retries on the next close after a failure", async () => {
    const user = makeUser();
    loadFor(user);
    useSchemeAnswersStore.getState().setAnswer(ProfileQuestionId.ADL_NEEDS, 5);

    const failing = vi.fn(async (): Promise<UserData> => {
      throw new Error("Network Error");
    });
    await expect(closeSheet(user, failing)).rejects.toThrow();
    expect(useSchemeAnswersStore.getState().answers).toEqual({
      [ProfileQuestionId.ADL_NEEDS]: 5,
    });

    const working = vi.fn(async (body: ProfilePatch) =>
      makeUser({ scheme_answers: body.scheme_answers }),
    );
    expect((await closeSheet(user, working)).saved).toBe(true);
    expect(working).toHaveBeenCalledWith({ scheme_answers: { adl_needs: 5 } });
  });
});
