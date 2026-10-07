import { ReactNode, useMemo } from "react";
import { createTranslator } from "next-intl";
import { Locale, useLocaleStore } from "@/stores/locale";
import en from "./messages/en.json";
import zh from "./messages/zh.json";

// All app text lives in messages/en.json and messages/zh.json. Anything not
// translated yet in zh.json falls back to the English text.

type Messages = { [key: string]: string | Messages };

const isObject = (value: unknown): value is Messages =>
  typeof value === "object" && value !== null;

const withFallback = (base: Messages, override: Messages): Messages => {
  const out: Messages = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const baseValue = base[key];
    out[key] =
      isObject(value) && isObject(baseValue)
        ? withFallback(baseValue, value)
        : value;
  }
  return out;
};

const MESSAGES: Record<Locale, Messages> = {
  en: en as Messages,
  zh: withFallback(en as Messages, zh as Messages),
};

type Values = Record<string, string | number | Date>;
type RichValues = Record<
  string,
  string | number | Date | ((chunks: ReactNode) => ReactNode)
>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTranslator = any;
const translators: Partial<Record<Locale, AnyTranslator>> = {};

const getTranslator = (locale: Locale): AnyTranslator => {
  translators[locale] ??= createTranslator({
    locale,
    messages: MESSAGES[locale],
    timeZone: "Asia/Singapore",
    onError: (error) => console.warn("[i18n]", error.message),
    // Shows the key rather than crashing if a message is missing
    getMessageFallback: ({ key, namespace }) =>
      namespace ? `${namespace}.${key}` : key,
  });
  return translators[locale];
};

export interface Translate {
  (key: string, values?: Values): string;
  // For text with highlighted parts, e.g. "What <hl>caregiving services</hl>
  // are available?"
  rich: (key: string, values: RichValues) => ReactNode;
  // Whether a key exists (e.g. optional subtitles)
  has: (key: string) => boolean;
}

const makeTranslate = (locale: Locale): Translate => {
  const translator = getTranslator(locale);
  const translate = ((key: string, values?: Values) =>
    translator(key, values)) as Translate;
  translate.rich = (key, values) => translator.rich(key, values);
  translate.has = (key) => translator.has(key);
  return translate;
};

const cache: Partial<Record<Locale, Translate>> = {};
const translateFor = (locale: Locale): Translate =>
  (cache[locale] ??= makeTranslate(locale));

// Use outside React (data maps, helpers). The app re-renders when the
// language changes, so these pick up the new language too.
export const t: Translate = Object.assign(
  (key: string, values?: Values) =>
    translateFor(useLocaleStore.getState().locale)(key, values),
  {
    rich: (key: string, values: RichValues) =>
      translateFor(useLocaleStore.getState().locale).rich(key, values),
    has: (key: string) =>
      translateFor(useLocaleStore.getState().locale).has(key),
  },
);

// Use in components: re-renders when the language changes
export const useT = (): Translate => {
  const locale = useLocaleStore((state) => state.locale);
  return useMemo(() => translateFor(locale), [locale]);
};

export const useLocale = (): Locale => useLocaleStore((state) => state.locale);
