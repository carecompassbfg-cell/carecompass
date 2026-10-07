"use client";

import { ProgrammeData } from "@/types/programme";
import { BackButton } from "@/ui/button";
import CustomMarkdown from "@/ui/CustomMarkdown";
import LoadingSpinner from "@/ui/loading";
import { useState, useEffect } from "react";
import { t } from "@/i18n";

export default function ProgrammeDetails({
  params,
}: {
  params: { programmeId: string };
}) {
  const [programmeData, setProgrammeData] = useState<ProgrammeData>();

  useEffect(() => {
    fetch("/data/programmes.json")
      .then((response) => response.json() as Promise<ProgrammeData[]>)
      .then((json) => {
        setProgrammeData(
          json.find((programme) => programme.id === params.programmeId),
        );
      });
  }, [params.programmeId]);

  if (!programmeData) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <BackButton />
      <section className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold">{programmeData.name}</h3>
        <div className="flex place-content-start place-items-start gap-2 rounded-md border border-gray-200 bg-white p-4 text-left">
          <div className="flex flex-col gap-2">
            <span className="text-lg font-semibold">
              {t("help.education.overview")}
            </span>
            <span className="mb-4">{programmeData.description}</span>
            {programmeData.content && (
              <CustomMarkdown content={programmeData.content} />
            )}
          </div>
        </div>
      </section>
      <section className="flex flex-col gap-2 pb-6">
        <h3 className="text-lg font-semibold">
          {t("help.education.nextSteps")}
        </h3>
        <div className="flex flex-col place-content-start place-items-start gap-2 rounded-md border border-gray-200 bg-white p-4 text-left">
          <div className="flex flex-col gap-3">
            {programmeData.actionable && (
              <CustomMarkdown content={programmeData.actionable} />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
