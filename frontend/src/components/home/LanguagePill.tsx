"use client";

import { useRef, useState } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";
import { toast } from "sonner";
import useClickOutside from "@/util/hooks/useClickOutside";
import { FOCUS_RING } from "@/components/schemes/SchemeIcon";

// Languages offered for now: English and Chinese (Malay and Tamil later,
// once someone can review them). Each is shown in its own script so people
// who don't read English can still find theirs.
const LANGUAGES = [
  { code: "en", short: "EN", label: "English", english: null },
  { code: "zh", short: "中文", label: "中文", english: "Chinese" },
] as const;

type LanguageCode = (typeof LANGUAGES)[number]["code"];

// Translations aren't built yet, so only English is selectable today.
// Picking another language explains that instead of switching.
const AVAILABLE: LanguageCode[] = ["en"];

export default function LanguagePill() {
  const [isOpen, setIsOpen] = useState(false);
  const [current] = useState<LanguageCode>("en");
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setIsOpen(false));

  const selected = LANGUAGES.find((l) => l.code === current) ?? LANGUAGES[0];

  const choose = (code: LanguageCode) => {
    setIsOpen(false);
    if (code === current) return;
    if (!AVAILABLE.includes(code)) {
      toast("中文版即将推出 · Chinese is coming soon");
    }
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Language: ${selected.label}. Change language`}
        onClick={() => setIsOpen((open) => !open)}
        className={`flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[13px] font-semibold ${
          isOpen
            ? "border-brand-primary-500 bg-brand-primary-50 text-brand-primary-500"
            : "border-gray-300 bg-white text-gray-800"
        } ${FOCUS_RING}`}
      >
        <Globe aria-hidden size={15} />
        {selected.short}
        <ChevronDown
          aria-hidden
          size={14}
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <ul
          role="listbox"
          aria-label="Language"
          className="absolute right-0 top-10 z-30 w-56 rounded-2xl bg-white p-1.5 shadow-lg ring-1 ring-black/5"
        >
          {LANGUAGES.map((lang) => {
            const isSelected = lang.code === current;
            return (
              <li key={lang.code} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  lang={lang.code}
                  onClick={() => choose(lang.code)}
                  className={`flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2 text-left ${
                    isSelected ? "bg-brand-primary-50" : "hover:bg-gray-50"
                  } ${FOCUS_RING}`}
                >
                  <span className="flex flex-1 flex-col">
                    <span
                      className={`text-base font-medium ${isSelected ? "text-brand-primary-500" : "text-gray-800"}`}
                    >
                      {lang.label}
                    </span>
                    {lang.english && (
                      <span className="text-xs text-gray-500" lang="en">
                        {lang.english}
                      </span>
                    )}
                  </span>
                  {isSelected && (
                    <Check
                      aria-hidden
                      size={18}
                      className="text-brand-primary-500"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
