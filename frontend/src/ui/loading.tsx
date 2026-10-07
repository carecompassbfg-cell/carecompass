"use client";

import { BarLoader } from "react-spinners";
import Image from "next/image";
import { t } from "@/i18n";

export default function LoadingSpinner() {
  return (
    <div className="flex h-full w-full flex-col place-content-center place-items-center gap-8">
      <Image src="/img/logo.svg" alt={t("misc.logo")} width={64} height={64} />
      <BarLoader color="#1361F0" speedMultiplier={2} />
    </div>
  );
}
