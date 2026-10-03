"use client";

import { useAuthStore } from "@/stores/auth";
import LoadingSpinner from "@/ui/loading";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

const HEARTBEAT_URL =
  process.env.NEXT_PUBLIC_HEARTBEAT_FRONTEND_URL ??
  "https://heartbeat.carecompass.sg";
const HEARTBEAT_LOGIN_URL = `${HEARTBEAT_URL}/login`;

export default function HeartbeatRedirect() {
  const router = useRouter();
  const userData = useAuthStore((state) => state.userData);
  const hasRun = useRef<boolean>(false);

  useEffect(() => {
    // hasRun is used to ensure single attempt despite double rendering due to React.StrictMode in dev mode
    // https://react.dev/reference/react/StrictMode#fixing-bugs-found-by-double-rendering-in-development
    if (!userData || hasRun.current) {
      return;
    }

    if (userData.contact_number) {
      console.log(`Redirecting user to ${HEARTBEAT_LOGIN_URL}...`);
      // Using router.replace instead of router.push to allow user to navigate back to CareCompass from Heartbeat using browser's Back button
      router.replace(HEARTBEAT_LOGIN_URL);
    } else {
      hasRun.current = true;
      // Using router.replace instead of router.push to allow user to navigate back to the page user was at before /heartbeat from Caregiver Profile Edit page
      router.replace("/profile/caregiver-info/edit");
      toast.error("Phone number is required for this function");
    }
  }, [router, userData]);

  return <LoadingSpinner />;
}
