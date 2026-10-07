"use client";

import Carousel from "@/ui/carousel/Carousel";
import { Button } from "@opengovsg/design-system-react";
import { CircleAlert } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isDesktopWidth } from "@/components/DesktopNotice";

const slidesInfoList = [
  {
    instruction: (
      <>
        <span className="font-bold text-brand-primary-500">
          If you&apos;re on iOS, on Safari or Chrome:
        </span>{" "}
        select &apos;<span className="font-bold">Share</span>&apos; and choose
        &apos;<span className="font-bold">Add to Home Screen</span>&apos; to
        access CareCompass quickly from your phone.
      </>
    ),
    imageUrl: "/img/add-to-home-ios.png",
  },
  {
    instruction: (
      <>
        <span className="font-bold text-brand-primary-500">
          If you&apos;re on Android, on Chrome:
        </span>{" "}
        select the <span className="font-bold">three-dots</span> and choose
        &apos;<span className="font-bold">Add to Home Screen</span>&apos; to
        access CareCompass quickly from your phone.
      </>
    ),
    imageUrl: "/img/add-to-home-android.png",
  },
];

function AddToHomeScreenCarousel() {
  return (
    <Carousel
      slides={slidesInfoList.map((info, i) => (
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
            alt="add to homescreen"
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
        alt="add to homescreen"
        width={256}
        height={256}
        className="h-64 w-64"
      />
      <h1 className="text-center text-2xl font-bold text-gray-500">
        Welcome to the <br /> CareCompass Community
      </h1>
      <h3 className="text-center font-semibold text-brand-primary-500">
        Before you proceed, follow the steps below. This helps add CareCompass
        to your phone’s homescreen for quicker access.
      </h3>
      <AddToHomeScreenCarousel />
      <Button className="mt-auto w-full" onClick={handleClick}>
        Okay, I have done so
      </Button>
    </div>
  );
}
