"use client";

import { useEffect, useState } from "react";
import { Smartphone, X } from "lucide-react";

// Same width as the desktop column rule in globals.css
const DESKTOP_QUERY = "(min-width: 640px)";

// Closed once, stays closed in this browser
const DISMISSED_KEY = "cc_desktop_notice_dismissed";

export const isDesktopWidth = (): boolean => {
  try {
    return window.matchMedia(DESKTOP_QUERY).matches;
  } catch {
    return false;
  }
};

const readDismissed = (): boolean => {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
};

// Shown on computers only: CareCompass is built for phones, but works here
export default function DesktopNotice() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isDesktopWidth() && !readDismissed()) setIsOpen(true);
  }, []);

  if (!isOpen) return null;

  const close = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, "true");
    } catch {
      // Closed for this visit only
    }
    setIsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/40 p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="desktop-notice-title"
        className="relative flex w-full flex-col items-center gap-3 rounded-2xl bg-white p-6 text-center shadow-xl"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-2 top-2 flex size-11 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary-500"
        >
          <X aria-hidden size={22} />
        </button>
        <span className="flex size-14 items-center justify-center rounded-full bg-brand-primary-50 text-brand-primary-500">
          <Smartphone aria-hidden size={28} />
        </span>
        <h2
          id="desktop-notice-title"
          className="text-xl font-bold text-gray-900"
        >
          CareCompass is best viewed on your phone
        </h2>
        <p className="text-base leading-6 text-gray-600">
          You can keep using it here on your computer. For the best experience,
          open my.carecompass.sg on your phone.
        </p>
        <button
          type="button"
          onClick={close}
          autoFocus
          className="mt-1 h-12 w-full rounded-lg bg-brand-primary-500 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary-500"
        >
          Continue on this computer
        </button>
      </div>
    </div>
  );
}
