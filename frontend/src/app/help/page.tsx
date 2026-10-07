"use client";

import { BackButton } from "@/ui/button";
import Link from "next/link";
import { t } from "@/i18n";

const OPTIONS = [
  {
    titleKey: "help.options.education.title",
    subtitleKey: "help.options.education.subtitle",
    link: "/help/education",
  },
  {
    titleKey: "help.options.hotline.title",
    subtitleKey: "help.options.hotline.subtitle",
    link: "/help/hotline",
  },
  {
    titleKey: "help.options.community.title",
    subtitleKey: "help.options.community.subtitle",
    link: "/help/community",
  },
];

export default function HelpPage() {
  return (
    <div className="flex h-full w-full flex-col gap-4">
      <BackButton />
      <h1 className="mb-4 text-2xl font-semibold leading-tight text-brand-primary-500">
        {t("help.title")}
      </h1>
      {OPTIONS.map((option) => (
        <Link href={option.link} key={option.link}>
          <div className="flex flex-col gap-1 rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">{t(option.subtitleKey)}</p>
            <h2 className="font-semibold leading-tight">
              {t(option.titleKey)}
            </h2>
          </div>
        </Link>
      ))}
    </div>
  );
}
