import { Citizenship, Residence, UserDataFull } from "@/types/user";
import { isKnownAge } from "@/util/profileInput";

type MaybeUser = Pick<UserDataFull, "care_recipient_name"> | null | undefined;

export const RECIPIENT_FALLBACK = "your loved one";
const TITLE_FALLBACK = "you and your loved one";

// The name or nickname the caregiver saved, exactly as they typed it
// (never re-capitalised), or null
const savedName = (user: MaybeUser): string | null =>
  user?.care_recipient_name?.trim() || null;

// For headings, e.g. "Financial schemes for Mum" or "Financial schemes for
// you and your loved one"
export const getRecipientTitleName = (user: MaybeUser): string =>
  savedName(user) ?? TITLE_FALLBACK;

// For sentences, e.g. "Can Mum get this?" / "Can your loved one get this?"
export const getRecipientName = (user: MaybeUser): string =>
  savedName(user) ?? RECIPIENT_FALLBACK;

// At the start of a sentence: the saved name as typed, or "Your loved one"
export const getRecipientNameAtStart = (user: MaybeUser): string =>
  savedName(user) ?? capitalise(RECIPIENT_FALLBACK);

// "Mum's" / "your loved one's"
export const possessive = (name: string): string => `${name}'s`;

export const getRecipientPossessive = (user: MaybeUser): string =>
  possessive(getRecipientName(user));

// Capitalises the first letter of fixed text (not a name someone typed)
export const capitalise = (text: string): string =>
  text.charAt(0).toUpperCase() + text.slice(1);

const CITIZENSHIP_LABELS: Record<Citizenship, string> = {
  [Citizenship.CITIZEN]: "Singapore Citizen",
  [Citizenship.PR]: "Permanent Resident",
  [Citizenship.OTHER]: "Not a Singapore Citizen or PR",
};

const RESIDENCE_LABELS: Record<Residence, string> = {
  [Residence.HOME]: "Lives at home",
  [Residence.NURSING_HOME_LTCF]: "Lives in a nursing home",
  [Residence.OTHER]: "Lives elsewhere",
};

// Short facts about the care recipient for the profile line. Unknown values
// are left out rather than shown as blanks.
export const getProfileFacts = (
  user: UserDataFull | null | undefined,
): string[] => {
  if (!user) return [];
  const facts: string[] = [];
  if (isKnownAge(user.care_recipient_age)) {
    facts.push(`Aged ${user.care_recipient_age}`);
  }
  const citizenship = CITIZENSHIP_LABELS[user.care_recipient_citizenship];
  if (citizenship) facts.push(citizenship);
  const residence = RESIDENCE_LABELS[user.care_recipient_residence];
  if (residence) facts.push(residence);
  return facts;
};
