"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { zhCN } from "@clerk/localizations";
import { useLocaleStore } from "@/stores/locale";
import { PropsWithChildren } from "react";

import { useClerkAuthSync } from "@/hooks/useClerkAuthSync";

function ClerkProviderAdapter({ children }: PropsWithChildren<unknown>) {
  useClerkAuthSync();
  return <>{children}</>;
}

export default function AuthProvider({ children }: PropsWithChildren<unknown>) {
  const locale = useLocaleStore((state) => state.locale);
  return (
    // Clerk's own sign-in screens follow the chosen language
    <ClerkProvider localization={locale === "zh" ? zhCN : undefined}>
      <ClerkProviderAdapter>{children}</ClerkProviderAdapter>
    </ClerkProvider>
  );
}
