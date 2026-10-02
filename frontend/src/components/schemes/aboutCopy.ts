// Text for the "About these results" panel on the schemes page, in one place
// so it's easy to change. Any {name} is replaced with getRecipientName().

import { SchemeStatusKind } from "@/types/scheme";

export const ABOUT_COPY = {
  title: "About these results",
  intro:
    "These schemes are recommended based on the information in your profile. They are offered by government agencies, charities and community organisations. Please use this list as a guide. The organisation offering each scheme will determine final eligibility.",
  sourcesHeading: "Where the information comes from",
  // SupportGoWhere will be added here as a third source once we have
  // approval to use its data.
  sources: [
    {
      icon: "shield",
      title: "Reviewed by CareCompass",
      body: "Key schemes we write and check ourselves against official sources such as AIC, MOH and MOM.",
    },
    {
      icon: "globe",
      title: "Schemes.sg",
      body: "A community-run directory of government and charity schemes.",
    },
  ],
  labelsHeading: "What the labels mean",
  labels: [
    {
      status: "likely",
      body: "Matches everything we can check from the profile.",
    },
    {
      status: "needs_answers",
      body: "One or two answers from you would let us check.",
    },
    {
      status: "provider_decides",
      body: "Please check eligibility on the agency's official website.",
    },
  ] as { status: SchemeStatusKind; body: string }[],
  button: "See all caregiving schemes",
} as const;
