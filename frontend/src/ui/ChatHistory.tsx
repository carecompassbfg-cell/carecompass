"use client";

import { GetUserThreadResponse } from "@/types/chat";
import { useAuthStore } from "@/stores/auth";
import { Skeleton, Stack } from "@chakra-ui/react";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useEffect, useState } from "react";
import { api } from "@/api";
import { t } from "@/i18n";

export default function ChatHistory({
  router,
  onClose,
}: {
  router: AppRouterInstance;
  onClose?: () => void;
}) {
  const userId = useAuthStore((s) => s.userId);
  const [chats, setChats] = useState<GetUserThreadResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      setIsLoading(true);
      api
        .get<GetUserThreadResponse[]>("/threads")
        .then((res) => setChats(res.data ?? []))
        .finally(() => setIsLoading(false));
    }
  }, [userId]);

  if (!userId) {
    return (
      <span className="font-semibold">{t("chat.history.unavailable")}</span>
    );
  }

  return (
    <div className="flex h-full grow flex-col gap-4">
      <h3 className="text-xl font-semibold">{t("chat.history.title")}</h3>
      {isLoading || chats == undefined ? (
        <Stack spacing={4}>
          {Array.from({ length: 10 }).map((_, index) => (
            <Skeleton key={index} height="32px" width="100%" />
          ))}
        </Stack>
      ) : (
        <div className="flex max-h-[calc(100dvh-230px)] w-full grow flex-col place-content-start gap-1 overflow-y-auto">
          {chats.reverse().map((chat) => (
            <button
              key={chat.thread_id}
              onClick={() => {
                if (onClose) {
                  onClose();
                }
                router.replace(`/chat/${chat.thread_id}`);
              }}
              className="min-h-8 w-full max-w-56 overflow-hidden text-ellipsis whitespace-nowrap rounded-md py-1 pr-2 text-left duration-100 ease-in-out hover:bg-gray-600 hover:bg-opacity-35"
            >
              {chat.title || t("chat.history.untitled", { id: chat.thread_id })}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
