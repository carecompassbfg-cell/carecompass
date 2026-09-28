import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/api";
import { useAuthStore } from "@/stores/auth";
import { CatalogScheme } from "@/types/scheme";
import { UserData } from "@/types/user";
import { SchemeWithStatus } from "@/util/schemeCatalog";
import { getSchemeStatus } from "@/util/schemeStatus";

// TODO(schemes): switch to the real catalog endpoint once it exists
const CATALOG_URL = "/data/catalog.sample.json";

// Loads the scheme catalog and the signed-in user's profile, and works out
// each scheme's status. Signed-out users get getSchemeStatus(scheme, null).
export default function useSchemeCatalog() {
  const isInitialised = useAuthStore((state) => state.isInitialised);
  const isSignedIn = useAuthStore((state) => state.isSignedIn);
  const userData = useAuthStore((state) => state.userData);
  const setUserData = useAuthStore((state) => state.setUserData);

  const [catalog, setCatalog] = useState<CatalogScheme[]>();
  const [catalogError, setCatalogError] = useState(false);
  const [userLoadError, setUserLoadError] = useState(false);

  useEffect(() => {
    fetch(CATALOG_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<CatalogScheme[]>;
      })
      .then(setCatalog)
      .catch((error) => {
        console.error(error);
        setCatalogError(true);
      });
  }, []);

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

  const user = isSignedIn ? (userData ?? null) : null;

  const items: SchemeWithStatus[] = useMemo(
    () =>
      (catalog ?? []).map((scheme) => ({
        scheme,
        status: getSchemeStatus(scheme, user),
      })),
    [catalog, user],
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
  };
}
