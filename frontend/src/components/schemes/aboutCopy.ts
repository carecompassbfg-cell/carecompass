// Text for the "About these results" panel on the schemes page. The words
// live in the message files (schemes.about.*); any {name} is replaced with
// getRecipientName().

import { SchemeStatusKind } from "@/types/scheme";
import { t } from "@/i18n";

// Built when shown, so the text follows the chosen language
export const getAboutCopy = () => ({
  title: t("schemes.about.title"),
  intro: t("schemes.about.intro"),
  sourcesHeading: t("schemes.about.sourcesHeading"),
  // SupportGoWhere will be added here as a third source once we have
  // approval to use its data.
  sources: [
    {
      icon: "shield",
      title: t("schemes.about.sources.carecompass.title"),
      body: t("schemes.about.sources.carecompass.body"),
    },
    {
      icon: "globe",
      title: t("schemes.about.sources.schemessg.title"),
      body: t("schemes.about.sources.schemessg.body"),
    },
  ] as const,
  labelsHeading: t("schemes.about.labelsHeading"),
  labels: [
    { status: "likely", body: t("schemes.about.labels.likely") },
    { status: "needs_answers", body: t("schemes.about.labels.needs_answers") },
    {
      status: "provider_decides",
      body: t("schemes.about.labels.provider_decides"),
    },
  ] as { status: SchemeStatusKind; body: string }[],
  button: t("schemes.about.button"),
});
