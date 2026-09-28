import { Citizenship, Residence, UserDataFull } from "@/types/user";

// Nothing stores the care recipient's name yet. When it does, change this one
// function and every schemes screen picks it up.
export const getRecipientName = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  user: UserDataFull | null | undefined,
): string => "your loved one";

// For names used at the start of a sentence, e.g. "Your loved one is 78"
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
  if (typeof user.care_recipient_age === "number") {
    facts.push(`Aged ${user.care_recipient_age}`);
  }
  const citizenship = CITIZENSHIP_LABELS[user.care_recipient_citizenship];
  if (citizenship) facts.push(citizenship);
  const residence = RESIDENCE_LABELS[user.care_recipient_residence];
  if (residence) facts.push(residence);
  return facts;
};
