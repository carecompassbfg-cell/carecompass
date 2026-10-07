import { create } from "zustand";

export type Locale = "en" | "zh";

export const LOCALES: Locale[] = ["en", "zh"];

// The chosen language is saved on this device only
const LOCALE_KEY = "cc_locale";

const readSaved = (): Locale => {
  try {
    const saved = localStorage.getItem(LOCALE_KEY);
    return saved === "zh" ? "zh" : "en";
  } catch {
    return "en";
  }
};

interface LocaleState {
  locale: Locale;
  isLoaded: boolean;
  load: () => void;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>()((set) => ({
  locale: "en",
  isLoaded: false,
  load: () => set({ locale: readSaved(), isLoaded: true }),
  setLocale: (locale) => {
    try {
      localStorage.setItem(LOCALE_KEY, locale);
    } catch {
      // Applies to this visit only
    }
    set({ locale });
  },
}));
