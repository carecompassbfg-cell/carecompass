"use client";

import { Fragment, PropsWithChildren, useEffect } from "react";
import { useLocaleStore } from "@/stores/locale";

// Loads the saved language, keeps <html lang> in step, and redraws the app
// when the language changes so every screen switches at once
export default function LocaleRoot({ children }: PropsWithChildren) {
  const locale = useLocaleStore((state) => state.locale);
  const load = useLocaleStore((state) => state.load);

  useEffect(() => load(), [load]);

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-Hans-SG" : "en";
  }, [locale]);

  return <Fragment key={locale}>{children}</Fragment>;
}
