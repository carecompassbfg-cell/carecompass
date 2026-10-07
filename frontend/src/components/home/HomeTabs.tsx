"use client";

import { KeyboardEvent, useRef } from "react";
import { FOCUS_RING } from "@/components/schemes/SchemeIcon";
import { t } from "@/i18n";

export type HomeTab = "monitoring" | "assistance";

const TABS: { id: HomeTab; labelKey: string }[] = [
  { id: "monitoring", labelKey: "home.tabs.monitoring" },
  { id: "assistance", labelKey: "home.tabs.assistance" },
];

// Last tab picked, for this browser session only
const TAB_KEY = "cc-home-tab";

export const readSavedTab = (): HomeTab | null => {
  try {
    const saved = sessionStorage.getItem(TAB_KEY);
    return saved === "monitoring" || saved === "assistance" ? saved : null;
  } catch {
    return null;
  }
};

export const saveTab = (tab: HomeTab) => {
  try {
    sessionStorage.setItem(TAB_KEY, tab);
  } catch {
    // Only remembered for this page view
  }
};

// Segmented control at the top of the home page
export default function HomeTabs({
  value,
  onChange,
}: {
  value: HomeTab;
  onChange: (tab: HomeTab) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  // Left/right arrows move between tabs, as screen reader users expect
  const onKeyDown = (event: KeyboardEvent, i: number) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next =
      (i + (event.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length;
    onChange(TABS[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={t("home.tabs.label")}
      className="grid w-full grid-cols-2 gap-1 rounded-xl bg-gray-200 p-1"
    >
      {TABS.map((tab, i) => {
        const isActive = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={`home-tab-${tab.id}`}
            role="tab"
            type="button"
            aria-selected={isActive}
            aria-controls={`home-panel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`min-h-10 rounded-lg px-2 text-sm transition-colors ${
              isActive
                ? "bg-white font-bold text-brand-primary-500 shadow-sm"
                : "font-medium text-gray-600"
            } ${FOCUS_RING}`}
          >
            {t(tab.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
