"use client";

import { Button } from "@chakra-ui/react";
import { BackButton } from "@/ui/button";
import { COMMUNITY_TELEGRAM_URL } from "@/util/links";
import { t } from "@/i18n";

type PartnerData = {
  name: string;
  description: string;
  link: string;
  cta: string;
};

const getPartners = (): PartnerData[] => [
  {
    name: t("help.community.dementiaSg.name"),
    description: t("help.community.dementiaSg.description"),
    link: "https://dementia.org.sg/csn",
    cta: t("help.community.dementiaSg.cta"),
  },
  {
    name: t("help.community.carecompass.name"),
    description: t("help.community.carecompass.description"),
    link: COMMUNITY_TELEGRAM_URL,
    cta: t("help.community.carecompass.cta"),
  },
];

export default function Page() {
  return (
    <div className="flex h-full w-full flex-col gap-4">
      <BackButton />
      <h3 className="text-lg font-semibold leading-tight text-gray-500">
        {t("help.community.intro")}
      </h3>
      <h1 className="mb-4 text-2xl font-semibold leading-tight text-brand-primary-500">
        {t("help.community.title")}
      </h1>
      <section className="flex flex-col gap-2 pb-8">
        {getPartners().map((partner, index) => (
          <PartnerCard key={index} partner={partner} />
        ))}
      </section>
    </div>
  );
}

function PartnerCard({ partner }: { partner: PartnerData }) {
  return (
    <div className="flex place-content-start place-items-start gap-2 rounded-md border border-gray-200 bg-white p-4 text-left">
      <div className="flex flex-col gap-2">
        <span className="text-lg font-semibold">{partner.name}</span>
        <span className="whitespace-pre-line leading-tight">
          {partner.description}
        </span>
        <Button
          as="a"
          href={partner.link}
          target="_blank"
          rel="noopener noreferrer"
          backgroundColor="#005DEA"
          size="sm"
          width="fit-content"
          mt={3}
        >
          {partner.cta}
        </Button>
      </div>
    </div>
  );
}
