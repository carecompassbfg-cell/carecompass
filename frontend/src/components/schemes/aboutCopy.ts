// Text for the "About these results" panel on the schemes page, in one place
// so it's easy to change. {name} is replaced with getRecipientName().

import { SchemeStatusKind } from "@/types/scheme";

export const ABOUT_COPY = {
  title: "About these results",
  intro:
    "These are schemes we recommend for {name}, based on the profile you gave us. They're a guide, not a decision. The agency always makes the final call.",
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
      body: "A community-run directory of government and charity schemes. Updated weekly.",
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
      body: "We can't check this one. Check eligibility on the agency's official website.",
    },
  ] as { status: SchemeStatusKind; body: string }[],
  button: "See all caregiving schemes",
} as const;
