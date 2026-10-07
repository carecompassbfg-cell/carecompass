"use client";

import { BackButton } from "@/ui/button";
import { PhoneIcon } from "@chakra-ui/icons";
import { t } from "@/i18n";

type HotlineData = {
  name: string;
  description: string;
  link: string;
};

const getHotlines = (): HotlineData[] => [
  {
    name: t("help.hotline.dementia.name"),
    description: t("help.hotline.dementia.description"),
    link: "63770700",
  },
  {
    name: t("help.hotline.touch.name"),
    description: t("help.hotline.touch.description"),
    link: "68046555",
  },
];

export default function Page() {
  return (
    <div className="flex h-full w-full flex-col gap-4">
      <BackButton />
      <h3 className="text-lg font-semibold leading-tight text-gray-500">
        {t("help.hotline.intro")}
      </h3>
      <h1 className="mb-4 text-2xl font-semibold leading-tight text-brand-primary-500">
        {t("help.hotline.title")}
      </h1>
      <section className="flex flex-col gap-2 pb-8">
        {getHotlines().map((hotline, index) => (
          <HotlineCard key={index} hotline={hotline} />
        ))}
      </section>
    </div>
  );
}

function HotlineCard({ hotline }: { hotline: HotlineData }) {
  return (
    <div className="flex place-content-start place-items-start gap-2 rounded-md border border-gray-200 bg-white p-4 text-left">
      <div className="flex flex-col gap-2">
        <span className="text-lg font-semibold">{hotline.name}</span>
        <span>{hotline.description}</span>
        <div className="flex place-items-center gap-2">
          <PhoneIcon color="#1361f0" />
          <a
            href={`tel:${hotline.link}`}
            className="text-brand-primary-500 underline"
          >
            {hotline.link}
          </a>
        </div>
      </div>
    </div>
  );
}
