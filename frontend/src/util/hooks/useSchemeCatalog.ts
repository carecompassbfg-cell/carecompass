import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/api";
import { useAuthStore } from "@/stores/auth";
import { toCheckAnswers, useSchemeAnswersStore } from "@/stores/schemeAnswers";
import { CatalogScheme, ProfileQuestionId } from "@/types/scheme";
import { UserData } from "@/types/user";
import { isKnownAge } from "@/util/profileInput";
import { SchemeWithStatus } from "@/util/schemeCatalog";
import useSchemeAnswersSync from "@/util/hooks/useSchemeAnswersSync";
import { getSchemeStatus } from "@/util/schemeStatus";

// Tier 1 schemes we maintain, and Tier 2 schemes from the weekly Schemes.sg
// sync (scrapers/schemessg)
const TIER1_URL = "/data/catalog.tier1.json";
const SCHEMESSG_URL = "/data/catalog.schemessg.json";

const fetchCatalog = async (url: string): Promise<CatalogScheme[]> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
};

// Loads the scheme catalog and the signed-in user's profile, and works out
// each scheme's status. Signed-out users get getSchemeStatus(scheme, null).
// With enabled: false the catalog isn't fetched (e.g. home page, signed out).
export default function useSchemeCatalog({
  enabled = true,
}: { enabled?: boolean } = {}) {
  const isInitialised = useAuthStore((state) => state.isInitialised);
  const isSignedIn = useAuthStore((state) => state.isSignedIn);
  const userData = useAuthStore((state) => state.userData);
  const setUserData = useAuthStore((state) => state.setUserData);

  const [catalog, setCatalog] = useState<CatalogScheme[]>();
  const [catalogError, setCatalogError] = useState(false);
  const [userLoadError, setUserLoadError] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    Promise.allSettled([
      fetchCatalog(TIER1_URL),
      fetchCatalog(SCHEMESSG_URL),
    ]).then(([tier1, schemesSg]) => {
      if (tier1.status === "rejected") {
        console.error(tier1.reason);
        setCatalogError(true);
        return;
      }
      // Tier 1 still shows if the Schemes.sg file fails to load
      if (schemesSg.status === "rejected") {
        console.error(schemesSg.reason);
      }
      setCatalog([
        ...tier1.value,
        ...(schemesSg.status === "fulfilled" ? schemesSg.value : []),
      ]);
    });
  }, [enabled]);

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get<UserData>("/users/me");
      setUserData(true, response.data);
      setUserLoadError(false);
    } catch (error) {
      console.error(error);
      setUserLoadError(true);
    }
  }, [setUserData]);

  useEffect(() => {
    if (isSignedIn && !userData && !userLoadError) {
      refreshUser();
    }
  }, [isSignedIn, userData, userLoadError, refreshUser]);

  // Loads saved answers from the profile; saveAnswers() runs on sheet close
  const { saveAnswers } = useSchemeAnswersSync();
  const sessionAnswers = useSchemeAnswersStore((state) => state.answers);
  const sessionAge = sessionAnswers[ProfileQuestionId.CARE_RECIPIENT_AGE];
  const checkAnswers = useMemo(
    () => toCheckAnswers(sessionAnswers),
    [sessionAnswers],
  );

  // An age answered in the sheet fills the gap until it's saved to the profile
  const user = useMemo(() => {
    if (!isSignedIn || !userData) return null;
    if (!isKnownAge(userData.care_recipient_age) && isKnownAge(sessionAge)) {
      return { ...userData, care_recipient_age: sessionAge };
    }
    return userData;
  }, [isSignedIn, userData, sessionAge]);

  const items: SchemeWithStatus[] = useMemo(
    () =>
      (catalog ?? []).map((scheme) => ({
        scheme,
        status: getSchemeStatus(scheme, user, { answers: checkAnswers }),
      })),
    [catalog, user, checkAnswers],
  );

  const isLoading =
    !isInitialised ||
    (!catalog && !catalogError) ||
    (isSignedIn && !userData && !userLoadError);

  return {
    items,
    user,
    isSignedIn,
    isLoading,
    catalogError,
    userLoadError,
    refreshUser,
    saveAnswers,
  };
}
