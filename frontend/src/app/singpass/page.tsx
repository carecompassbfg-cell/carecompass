"use client";

import { t } from "@/i18n";
import LoadingSpinner from "@/ui/loading";
import { Button, BxRightArrowAlt } from "@opengovsg/design-system-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Suspense } from "react";

function SingpassAuth() {
  const router = useRouter();

  function handleMyInfo() {
    alert(t("singpass.myInfoAlert"));
    router.push(`/chat`);
  }

  function handleScanNRIC() {
    alert(t("singpass.scanNricAlert"));
    router.push(`/chat`);
  }

  function handleNext() {
    router.push(`/chat`);
  }

  return (
    <div className="flex h-dvh max-h-dvh flex-col">
      <main className="flex h-full w-full flex-col place-content-center gap-8 overflow-auto p-8">
        <Image
          src="/img/scene-communication.svg"
          alt="logo"
          width={500}
          height={200}
        />
        <div className="flex flex-col gap-2">
          <span className="text-lg font-semibold">
            {t("singpass.question")}
          </span>
          <span className="text-sm">{t("singpass.explainer")}</span>
        </div>
        <div className="flex flex-col gap-4">
          <Button
            variant="solid"
            onClick={handleMyInfo}
            rightIcon={<BxRightArrowAlt />}
            bgColor="#F4333D"
            borderColor="#F4333D"
            _hover={{ bg: "#df0c17", borderColor: "#df0c17" }}
          >
            {t("singpass.authorizeMyInfo")}
          </Button>
          <Button
            variant="solid"
            onClick={handleScanNRIC}
            rightIcon={<BxRightArrowAlt />}
          >
            {t("singpass.scanNric")}
          </Button>
          <Button
            variant="outline"
            onClick={handleNext}
            rightIcon={<BxRightArrowAlt />}
          >
            {t("singpass.skip")}
          </Button>
        </div>
      </main>
    </div>
  );
}

export default function SingpassAuthWithSuspense() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SingpassAuth />
    </Suspense>
  );
}
