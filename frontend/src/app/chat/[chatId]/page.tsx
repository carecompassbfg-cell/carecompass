"use client";

import { api } from "@/api";
import { Message } from "@/types/chat";
import ChatMessage from "@/ui/chat/ChatMessage";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import LoadingSpinner from "@/ui/loading";
import { useCurrentThreadStore } from "@/stores/currentThread";
import { Avatar } from "@chakra-ui/react";
import { PulseLoader } from "react-spinners";

export default function Chat({ params }: { params: { chatId: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNew = searchParams.get("new") === "true";

  const [isLoading, setIsLoading] = useState(true);
  const currentThread = useCurrentThreadStore((state) => state.thread);
  const setThreadId = useCurrentThreadStore((state) => state.setThreadId);
  const setMessages = useCurrentThreadStore((state) => state.setMessages);
  const reset = useCurrentThreadStore((state) => state.reset);
  const isWaitingForResponse = useCurrentThreadStore(
    (state) => state.isWaitingForResponse,
  );

  useEffect(() => {
    setThreadId(params.chatId);
  }, [params.chatId, setThreadId]);

  useEffect(() => {
    if (isNew) {
      setIsLoading(false);
      return;
    }

    api
      .get<Message[]>(`/threads/${params.chatId}/messages`)
      .then((res) => setMessages(res.data ?? []))
      .catch((error) => {
        // TODO: Handle error
        console.error(error);
        reset();
        router.replace("/chat");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [params.chatId, isNew, router, reset, setMessages]);

  useEffect(() => {
    if (!isLoading) {
      setTimeout(() => {
        const bottomMarker = document.getElementById("msg-bottom");
        if (bottomMarker) {
          bottomMarker.scrollIntoView();
        }
      }, 0); // A slight delay ensures rendering is done
    }
  }, [isLoading, currentThread.messages]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <section className="flex h-full w-full flex-col place-content-start gap-4 overflow-y-auto">
        {currentThread.messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        <div id="msg-bottom" />
        {isWaitingForResponse && (
          <div className="flex place-items-start gap-2">
            <Avatar className="sticky mt-2" src="/img/logo.svg" size="xs" />
            <div className="flex w-[calc(100%-40px)] flex-col rounded-lg border bg-white p-4">
              <PulseLoader color="#1361F0" size={8} />
            </div>
          </div>
        )}
      </section>
    </Suspense>
  );
}
