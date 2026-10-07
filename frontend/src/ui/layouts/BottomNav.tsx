import { usePathname, useRouter } from "next/navigation";
import { useChatQuery } from "@/util/hooks/useChatQuery";

import {
  UserCircleIcon,
  HomeIcon,
  MessageCircleIcon,
  SendHorizontalIcon,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import useClickOutside from "@/util/hooks/useClickOutside";
import { IconButton } from "@opengovsg/design-system-react";
import { t } from "@/i18n";

export default function BottomNav() {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const currentDialog = dialog.current;
    if (currentDialog) {
      currentDialog.addEventListener("click", (e) => {
        const dialogDimensions = currentDialog.getBoundingClientRect();
        if (
          e.clientX < dialogDimensions.left ||
          e.clientX > dialogDimensions.right ||
          e.clientY < dialogDimensions.top ||
          e.clientY > dialogDimensions.bottom
        ) {
          currentDialog.close();
        }
      });
    }
  }, [dialog]);

  useEffect(() => {
    router.prefetch("/home");
    router.prefetch("/profile");
    router.prefetch("/chat");
  }, [router]);

  return (
    <section className="relative grid h-16 max-h-16 min-h-16 w-full grid-cols-3 place-content-center place-items-center border-t border-gray-200 shadow-[0px_0px_4px_-1px_rgba(0,0,0,0.1)]">
      <button
        aria-label={t("nav.home")}
        className="mx-2 flex flex-col place-content-center place-items-center"
        onClick={() => router.push("/home")}
      >
        <HomeIcon
          className={`${pathname.includes("/home") ? "text-brand-primary-500" : ""}`}
        />
        <span
          className={`text-xs font-semibold ${pathname.includes("/home") ? "text-brand-primary-500" : ""}`}
        >
          {t("nav.home")}
        </span>
      </button>
      {pathname.includes("/chat") ? (
        <div className="mx-2 flex flex-col place-content-center place-items-center">
          <MessageCircleIcon className="text-brand-primary-500" />
          <div className="text-xs font-semibold text-brand-primary-500">
            {t("nav.chat")}
          </div>
        </div>
      ) : (
        <>
          <ChatPopover />
          <div className="self-end text-xs font-semibold">
            {t("nav.askAnything")}
          </div>
        </>
      )}
      <button
        aria-label={t("nav.profile")}
        className="mx-2 flex flex-col place-content-center place-items-center"
        onClick={() => router.push("/profile")}
      >
        <UserCircleIcon
          className={`${pathname.includes("/profile") ? "text-brand-primary-500" : ""}`}
        />
        <span
          className={`text-xs font-semibold ${pathname.includes("/profile") ? "text-brand-primary-500" : ""}`}
        >
          {t("nav.profile")}
        </span>
      </button>
      <AnimatePresence>
        <dialog
          ref={dialog}
          className="h-36 w-[90vw] rounded-lg bg-white p-4 shadow-md backdrop:bg-black/25 backdrop:backdrop-blur-sm"
        >
          <textarea
            rows={3}
            wrap="hard"
            placeholder={t("nav.askCareCompass")}
            className="h-full w-full resize-none border-none align-top text-lg outline-none"
          />
        </dialog>
      </AnimatePresence>
    </section>
  );
}

function ChatPopover() {
  const TRANSITION = {
    type: "spring",
    bounce: 0.05,
    duration: 0.3,
  };

  const router = useRouter();
  const { prompt, isSending, handleInput, handleSubmitPrompt } = useChatQuery();
  const uniqueId = useId();
  const formContainerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openMenu = () => {
    setIsOpen(true);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  useClickOutside(formContainerRef, () => {
    closeMenu();
  });

  useEffect(() => {
    router.prefetch("/chat");
  }, [router]);

  return (
    <MotionConfig transition={TRANSITION}>
      <div className="absolute bottom-7 flex items-center justify-center">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/25 backdrop-blur-sm"
            />
          )}
        </AnimatePresence>

        <div className="flex h-20 w-20 place-content-center place-items-center rounded-full border border-gray-200 bg-white shadow-[0px_-4px_12px_0px_rgba(0,0,0,0.1)]">
          <motion.button
            key="button"
            layoutId={`popover-${uniqueId}`}
            className="flex h-16 w-16 place-content-center place-items-center rounded-full bg-brand-primary-500"
            onClick={openMenu}
          >
            <MessageCircleIcon color="white" size={32} />
          </motion.button>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={formContainerRef}
              layoutId={`popover-${uniqueId}`}
              className="absolute bottom-0 h-36 w-[90vw] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md outline-none"
            >
              <form
                className="flex h-full flex-col"
                onSubmit={handleSubmitPrompt}
              >
                <motion.span
                  layoutId={`popover-label-${uniqueId}`}
                  aria-hidden="true"
                  style={{
                    opacity: prompt ? 0 : 1,
                  }}
                  className="absolute left-4 top-3 select-none text-lg text-zinc-500 dark:text-zinc-400"
                >
                  {t("nav.askCareCompass")}
                </motion.span>
                <textarea
                  className="h-full w-full resize-none rounded-md bg-transparent px-4 py-3 text-lg outline-none"
                  value={prompt}
                  onChange={handleInput}
                />
                <div key="close" className="flex justify-between px-4 py-3">
                  <div></div>
                  <IconButton
                    aria-label={t("nav.ask")}
                    type="submit"
                    isLoading={isSending}
                    isDisabled={prompt.trim().length === 0}
                    icon={<SendHorizontalIcon />}
                  >
                    {t("nav.ask")}
                  </IconButton>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
