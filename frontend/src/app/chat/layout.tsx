"use client";

import Search from "@/ui/Search";
import { redirect, useParams, useRouter } from "next/navigation";
import { useLayoutEffect, useRef } from "react";
import ChatHistory from "@/ui/ChatHistory";
import {
  useDisclosure,
  Drawer,
  DrawerOverlay,
  DrawerContent,
} from "@chakra-ui/react";

import { Button, IconButton } from "@opengovsg/design-system-react";
import { MenuIcon, SquarePenIcon } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import LoadingSpinner from "@/ui/loading";
import BottomNav from "@/ui/layouts/BottomNav";
import { t } from "@/i18n";

export default function ChatLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const params = useParams<{ chatId: string }>();

  const userId = useAuthStore((s) => s.userId);

  useLayoutEffect(() => {
    if (!userId) {
      redirect("/");
    }
  }, [userId]);

  function handleNewThread() {
    router.replace(`/chat`);
  }

  if (!userId) {
    return (
      <main className="flex h-full w-full place-content-center place-items-center">
        <LoadingSpinner />
      </main>
    );
  }

  return (
    <div className="flex h-dvh max-h-dvh flex-col">
      <header className="flex h-16 w-full place-content-between place-items-center bg-brand-primary-500 px-4 text-white">
        <LeftDrawer />
        <Button
          colorScheme="white"
          variant="clear"
          aria-label={t("chat.newChatAria")}
          rightIcon={<SquarePenIcon />}
          size="sm"
          onClick={handleNewThread}
        >
          {t("chat.newChat")}
        </Button>
      </header>
      <main className="flex h-full w-full flex-col place-content-between overflow-hidden bg-gray-100 px-6 pt-6">
        <section className="flex h-full w-full place-content-center place-items-center">
          {children}
        </section>
        <section className="w-full">
          <Search currentChatId={params.chatId} />
        </section>
      </main>
      <BottomNav />
    </div>
  );
}

function LeftDrawer() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const btnRef = useRef(null);
  const router = useRouter();

  return (
    <>
      <IconButton
        ref={btnRef}
        colorScheme="white"
        variant="clear"
        onClick={onOpen}
        aria-label={t("chat.menu")}
        icon={<MenuIcon />}
      >
        {t("chat.open")}
      </IconButton>
      <Drawer
        isOpen={isOpen}
        placement="left"
        onClose={onClose}
        finalFocusRef={btnRef}
      >
        <DrawerOverlay />
        <DrawerContent className="flex flex-col gap-4 p-6">
          <ChatHistory router={router} onClose={onClose} />
        </DrawerContent>
      </Drawer>
    </>
  );
}
