"use client";

import LoadingSpinner from "@/ui/loading";
import { useChatQuery } from "@/util/hooks/useChatQuery";
import { useRouter } from "next/navigation";
import { Suspense } from "react";

type ChatPrompt = {
  label: string;
  query: string;
};

const chatPrompts: ChatPrompt[] = [
  {
    label: "🏥 What caregiving options do I have?",
    query: "What caregiving options do I have?",
  },
  {
    label: "💵 What support might I be eligible for?",
    query: "What support might I be eligible for?",
  },
  {
    label: "🙌 Where can I go for help and support?",
    query: "Where can I go for help and support?",
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
      <span className="w-full text-left font-semibold">
        How can I help you today?
      </span>
      <div className="flex w-full flex-col gap-2">
        {chatPrompts.map((chatPrompt, index) => (
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
