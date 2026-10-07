"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
} from "@chakra-ui/react";
import { Button, ModalCloseButton } from "@opengovsg/design-system-react";
import { t } from "@/i18n";

// Same width as the desktop column rule in globals.css
const DESKTOP_QUERY = "(min-width: 640px)";

// Closed once per visit: stays closed while they use the site, and shows
// again the next time they open CareCompass in a new tab or browser
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
    return sessionStorage.getItem(DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
};

// Shown on computers only: CareCompass is built for phones, but works here.
// Uses the OGP design system modal (styled by its ThemeProvider).
export default function DesktopNotice() {
  const [isOpen, setIsOpen] = useState(false);
  const continueRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isDesktopWidth() && !readDismissed()) setIsOpen(true);
  }, []);

  const close = () => {
    try {
      sessionStorage.setItem(DISMISSED_KEY, "true");
    } catch {
      // Closed for this visit only
    }
    setIsOpen(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      isCentered
      size="md"
      initialFocusRef={continueRef}
    >
      <ModalOverlay />
      <ModalContent mx={6} overflow="hidden">
        <ModalCloseButton />
        <div className="flex justify-center bg-brand-primary-100 pb-4 pt-6">
          <Image
            src="/img/best-on-phone.png"
            alt=""
            width={160}
            height={196}
            priority
          />
        </div>
        <ModalHeader>{t("desktop.title")}</ModalHeader>
        <ModalBody>
          <p className="text-base leading-6 text-gray-600">
            {t.rich("desktop.body", {
              b: (chunks) => (
                <span className="font-semibold text-gray-900">{chunks}</span>
              ),
            })}
          </p>
        </ModalBody>
        <ModalFooter>
          <Button ref={continueRef} width="100%" onClick={close}>
            {t("desktop.continue")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
