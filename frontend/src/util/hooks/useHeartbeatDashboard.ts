"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { HEARTBEAT_API_URL, HeartbeatPerson } from "@/util/heartbeat";

// Read-only: this hook only signs in to HeartBeat and reads the caregiver's
// dashboard. It never creates, edits or deletes anything in HeartBeat.

export type HeartbeatDashboardState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; people: HeartbeatPerson[] };

// HeartBeat's own token, kept for this browser session only
const tokenKey = (clerkUserId: string) => `cc-heartbeat-token:${clerkUserId}`;

const readToken = (clerkUserId: string): string | null => {
  try {
    return sessionStorage.getItem(tokenKey(clerkUserId));
  } catch {
    return null;
  }
};

const saveToken = (clerkUserId: string, token: string | null) => {
  try {
    if (token) sessionStorage.setItem(tokenKey(clerkUserId), token);
    else sessionStorage.removeItem(tokenKey(clerkUserId));
  } catch {
    // Not saved: we sign in to HeartBeat again next time
  }
};

class UnauthorisedError extends Error {}

// Swaps the CareCompass sign-in (Clerk) for a HeartBeat token, the same way
// the HeartBeat app does on its login page
const signInToHeartbeat = async (clerkToken: string): Promise<string> => {
  const res = await fetch(`${HEARTBEAT_API_URL}/admin/login`, {
    method: "POST",
    headers: { token: clerkToken },
  });
  if (!res.ok) throw new Error(`HeartBeat sign-in failed (${res.status})`);
  const body = (await res.json()) as { access_token?: string };
  if (!body.access_token) throw new Error("HeartBeat sign-in: no token");
  return body.access_token;
};

const fetchDashboard = async (token: string): Promise<HeartbeatPerson[]> => {
  const res = await fetch(`${HEARTBEAT_API_URL}/admin/dashboard`, {
    headers: { token },
  });
  if (res.status === 401) throw new UnauthorisedError();
  if (!res.ok) throw new Error(`HeartBeat dashboard failed (${res.status})`);
  return (await res.json()) as HeartbeatPerson[];
};

export default function useHeartbeatDashboard({
  enabled,
}: {
  enabled: boolean;
}): HeartbeatDashboardState & { retry: () => void } {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const [state, setState] = useState<HeartbeatDashboardState>({
    status: "loading",
  });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  // Kept in a ref: Clerk may hand back a new getToken function on each
  // render, which would otherwise restart the load in a loop
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  useEffect(() => {
    if (!enabled || !isLoaded) return;
    if (!isSignedIn || !userId) {
      setState({ status: "error" });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });

    const load = async () => {
      const freshToken = async () => {
        const clerkToken = await getTokenRef.current();
        if (!clerkToken) throw new Error("No CareCompass session");
        const token = await signInToHeartbeat(clerkToken);
        saveToken(userId, token);
        return token;
      };

      try {
        let token = readToken(userId) ?? (await freshToken());
        let people: HeartbeatPerson[];
        try {
          people = await fetchDashboard(token);
        } catch (error) {
          // A saved token that no longer works: sign in once more
          if (!(error instanceof UnauthorisedError)) throw error;
          saveToken(userId, null);
          token = await freshToken();
          people = await fetchDashboard(token);
        }
        if (!cancelled) setState({ status: "ready", people });
      } catch (error) {
        console.warn("Could not load HeartBeat dashboard:", error);
        if (!cancelled) setState({ status: "error" });
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [enabled, isLoaded, isSignedIn, userId, attempt]);

  return { ...state, retry };
}
