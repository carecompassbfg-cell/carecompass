"use client";

import { Button } from "@chakra-ui/react";
import { BackButton } from "@/ui/button";
import { COMMUNITY_TELEGRAM_URL } from "@/util/links";

type PartnerData = {
  name: string;
  description: string;
  link: string;
  cta: string;
};

const PARTNERS: PartnerData[] = [
  {
    name: "Dementia Singapore Caregiver Support & Network",
    description:
      "Promotes self-care by providing a platform for caregivers to nurture interests, learn skills, and connect with other caregivers.",
    link: "https://dementia.org.sg/csn",
    cta: "Learn More",
  },
  {
    name: "CareCompass User Community",
    description:
      "Join our community of caregivers on Telegram to exchange advice and provide feedback on what you’d like to see on the app!",
    link: COMMUNITY_TELEGRAM_URL,
    cta: "Join Now",
  },
];

export default function Page() {
  return (
    <div className="flex h-full w-full flex-col gap-4">
      <BackButton />
      <h3 className="text-lg font-semibold leading-tight text-gray-500">
        I see that you would like to connect with likeminded caregivers.
      </h3>
      <h1 className="mb-4 text-2xl font-semibold leading-tight text-brand-primary-500">
        Here are some resources and communities where you may find support and
        shared experiences
      </h1>
      <section className="flex flex-col gap-2 pb-8">
        {PARTNERS.map((partner, index) => (
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
