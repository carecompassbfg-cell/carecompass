"use client";

import { t } from "@/i18n";
import Carousel from "@/ui/carousel/Carousel";
import { Button } from "@opengovsg/design-system-react";
import { CircleAlert } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { isDesktopWidth } from "@/components/DesktopNotice";

const richTags = {
  hl: (chunks: ReactNode) => (
    <span className="font-bold text-brand-primary-500">{chunks}</span>
  ),
  b: (chunks: ReactNode) => <span className="font-bold">{chunks}</span>,
};

// A function, not a constant, so the text follows the chosen language
const getSlidesInfoList = () => [
  {
    instruction: t.rich("a2hs.ios", richTags),
    imageUrl: "/img/add-to-home-ios.png",
  },
  {
    instruction: t.rich("a2hs.android", richTags),
    imageUrl: "/img/add-to-home-android.png",
  },
];

function AddToHomeScreenCarousel() {
  return (
    <Carousel
      slides={getSlidesInfoList().map((info, i) => (
        <div
          key={i}
          className="border-gray-[rgb(204,204,204)] w-full flex-[0_0_98%] rounded-xl border p-4 text-sm shadow"
        >
          <section className="flex gap-2">
            <CircleAlert className="w-12" />
            <section>{info.instruction}</section>
          </section>
          <Image
            src={info.imageUrl}
            alt={t("a2hs.imageAlt")}
            width={100}
            height={100}
            className="w-full"
          />
        </div>
      ))}
    />
  );
}

export default function AddToHomeScreen() {
  const router = useRouter();

  const handleClick = () => {
    localStorage.setItem("cc_add_to_homescreen_prompted", "true");
    router.push("/home");
  };

  // On a computer there's no home screen to add to, so go straight on
  useEffect(() => {
    if (isDesktopWidth()) {
      localStorage.setItem("cc_add_to_homescreen_prompted", "true");
      router.replace("/home");
    }
  }, [router]);

  return (
    <div className="flex h-full flex-col place-items-center gap-4 overflow-y-auto p-8">
      <Image
        src="img/shield-with-tick.svg"
        alt={t("a2hs.imageAlt")}
        width={256}
        height={256}
        className="h-64 w-64"
      />
      <h1 className="text-center text-2xl font-bold text-gray-500">
        {t.rich("a2hs.title", { br: () => <br /> })}
      </h1>
      <h3 className="text-center font-semibold text-brand-primary-500">
        {t("a2hs.intro")}
      </h3>
      <AddToHomeScreenCarousel />
      <Button className="mt-auto w-full" onClick={handleClick}>
        {t("a2hs.done")}
      </Button>
    </div>
  );
}
