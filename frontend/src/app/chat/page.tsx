"use client";

import LoadingSpinner from "@/ui/loading";
import { useChatQuery } from "@/util/hooks/useChatQuery";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { t } from "@/i18n";

type ChatPrompt = {
  label: string;
  query: string;
};

// The query is sent to the assistant as the user's message, in the
// language the app is shown in
const getChatPrompts = (): ChatPrompt[] => [
  {
    label: `🏥 ${t("chat.prompts.options")}`,
    query: t("chat.prompts.options"),
  },
  {
    label: `💵 ${t("chat.prompts.eligible")}`,
    query: t("chat.prompts.eligible"),
  },
  {
    label: `🙌 ${t("chat.prompts.help")}`,
    query: t("chat.prompts.help"),
  },
];

function ChatIntro() {
  const router = useRouter();
  const { handleSubmitPrompt } = useChatQuery();

  // get name from localstorage
  const threadId =
    typeof window !== "undefined"
      ? window.localStorage.getItem("cc-threadId")
      : null;
  if (threadId) {
    router.push(`/chat/${threadId}`);
  }

  return (
    <div className="flex h-full w-full flex-col place-content-end place-items-center gap-4">
      <span className="w-full text-left font-semibold">{t("chat.intro")}</span>
      <div className="flex w-full flex-col gap-2">
        {getChatPrompts().map((chatPrompt, index) => (
          <form
            key={index}
            className="w-full"
            onSubmit={(e) => {
              handleSubmitPrompt(e, chatPrompt.query);
            }}
          >
            <button
              key={index}
              className="min-h-12 w-full rounded-md border border-[rgb(191,194,200)] bg-white px-4 py-2 leading-tight duration-100 ease-in hover:bg-gray-50"
              type="submit"
            >
              {chatPrompt.label}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}

export default function ChatIntroWithSuspense() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ChatIntro />
    </Suspense>
  );
}
