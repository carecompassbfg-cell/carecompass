import { Citizenship, Residence, UserDataFull } from "@/types/user";
import { isKnownAge } from "@/util/profileInput";
import { t } from "@/i18n";

type MaybeUser = Pick<UserDataFull, "care_recipient_name"> | null | undefined;

// The name or nickname the caregiver saved, exactly as they typed it
// (never re-capitalised), or null
const savedName = (user: MaybeUser): string | null =>
  user?.care_recipient_name?.trim() || null;

export const getSavedRecipientName = savedName;

// For headings, e.g. "Financial schemes for Mum" or "Financial schemes for
// you and your loved one"
export const getRecipientTitleName = (user: MaybeUser): string =>
  savedName(user) ?? t("recipient.titleFallback");

// For sentences, e.g. "Can Mum get this?" / "Can your loved one get this?"
export const getRecipientName = (user: MaybeUser): string =>
  savedName(user) ?? t("recipient.fallback");

// At the start of a sentence: the saved name as typed, or "Your loved one"
export const getRecipientNameAtStart = (user: MaybeUser): string =>
  savedName(user) ?? capitalise(t("recipient.fallback"));

// "Mum's" / "your loved one's"
export const possessive = (name: string): string =>
  t("recipient.possessive", { name });

export const getRecipientPossessive = (user: MaybeUser): string =>
  possessive(getRecipientName(user));

// Capitalises the first letter of fixed text (not a name someone typed)
export const capitalise = (text: string): string =>
  text.charAt(0).toUpperCase() + text.slice(1);

const CITIZENSHIP_KEYS: Record<Citizenship, string> = {
  [Citizenship.CITIZEN]: "recipient.citizenship.CITIZEN",
  [Citizenship.PR]: "recipient.citizenship.PR",
  [Citizenship.OTHER]: "recipient.citizenship.OTHER",
};

const RESIDENCE_KEYS: Record<Residence, string> = {
  [Residence.HOME]: "recipient.residence.HOME",
  [Residence.NURSING_HOME_LTCF]: "recipient.residence.NURSING_HOME_LTCF",
  [Residence.OTHER]: "recipient.residence.OTHER",
};

// Short facts about the care recipient for the profile line. Unknown values
// are left out rather than shown as blanks.
export const getProfileFacts = (
  user: UserDataFull | null | undefined,
): string[] => {
  if (!user) return [];
  const facts: string[] = [];
  if (isKnownAge(user.care_recipient_age)) {
    facts.push(t("recipient.aged", { age: user.care_recipient_age }));
  }
  const citizenshipKey = CITIZENSHIP_KEYS[user.care_recipient_citizenship];
  if (citizenshipKey) facts.push(t(citizenshipKey));
  const residenceKey = RESIDENCE_KEYS[user.care_recipient_residence];
  if (residenceKey) facts.push(t(residenceKey));
  return facts;
};
