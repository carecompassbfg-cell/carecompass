import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentThreadStore } from "@/stores/currentThread";
import { CreateThreadResponse, MessageRole } from "@/types/chat";
import { useAuthStore } from "@/stores/auth";
import useSignInOnlyFeaturePrompt from "./useSignInOnlyFeaturePrompt";
import { api, fetchApi } from "@/api";
import { useLocaleStore } from "@/stores/locale";

export function useChatQuery(currentChatId?: string) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [isSending, setIsSending] = useState(false);
  const userId = useAuthStore((s) => s.userId);
  const { promptIfNotSignedIn } = useSignInOnlyFeaturePrompt();

  const setThreadId = useCurrentThreadStore((s) => s.setThreadId);
  const setMessages = useCurrentThreadStore((s) => s.setMessages);
  const appendUserMessage = useCurrentThreadStore((s) => s.appendUserMessage);
  const upsertAssistantMessage = useCurrentThreadStore(
    (s) => s.upsertAssistantMessage,
  );
  const setIsWaitingForResponse = useCurrentThreadStore(
    (s) => s.setIsWaitingForResponse,
  );
  const currentMessagesLength = useCurrentThreadStore(
    (s) => s.thread.messages.length,
  );

  const handleInput = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setPrompt(e.target.value);
  };

  const handleSubmitPrompt = async (
    e: React.FormEvent<HTMLFormElement>,
    input?: string,
  ) => {
    e.preventDefault();

    // Override prompt if input is provided
    const query = (input || prompt).trim();

    // Clear the input field
    setPrompt("");

    if (!query) {
      return;
    }

    setIsSending(true);

    let threadId = currentChatId;
    if (!threadId) {
      if (promptIfNotSignedIn() || !userId) {
        setIsSending(false);
        return;
      }
      // Create a new chat
      const newThreadId = await createThread(userId);
      threadId = newThreadId;
      // Initialize thread id and first user message declaratively
      setThreadId(newThreadId);
      setMessages([
        { id: "NEW_USER_MESSAGE", role: MessageRole.User, content: query },
      ]);
      router.push(`/chat/${newThreadId}?new=true`);
    } else {
      // Add the message to the current chat declaratively
      appendUserMessage(query);
    }

    const messageId = "NEW_ASST_MESSAGE" + currentMessagesLength;
    await getResponse({
      threadId,
      query,
      messageId,
      setIsWaitingForResponse,
      upsertAssistantMessage,
    });
    setIsSending(false);
  };

  return { prompt, setPrompt, isSending, handleInput, handleSubmitPrompt };
}

async function createThread(userId: string | null) {
  try {
    if (!userId) {
      throw new Error("User ID is missing");
    }
    const response = await api.post<CreateThreadResponse>("/threads", {});
    if (!response.data?.thread_id) throw new Error("No thread_id in response");
    return response.data.thread_id;
  } catch (error) {
    throw error; // Re-throw the error so that the calling function can handle it
  }
}

async function getResponse({
  threadId,
  query,
  messageId,
  setIsWaitingForResponse,
  upsertAssistantMessage,
}: {
  threadId: string;
  query: string;
  messageId: string;
  setIsWaitingForResponse: (b: boolean) => void;
  upsertAssistantMessage: (id: string, content: string) => void;
}) {
  setIsWaitingForResponse(true);

  const response = await fetchApi(`/threads/${threadId}/messages`, {
    method: "POST",
    body: JSON.stringify({ query, locale: useLocaleStore.getState().locale }),
    _noTimeout: true,
  });
  let combined = "";

  if (response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    while (true) {
      const { value, done } = await reader.read();

      setIsWaitingForResponse(false);

      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const parsedChunk = parseEventStream(chunk);
      if (parsedChunk) {
        combined += parsedChunk;
        upsertAssistantMessage(messageId, combined);
      }
    }
  }
}

function parseEventStream(input: string): string {
  const tokenRegex = /"token":\s*"(.*)"/g;
  let match;
  let result = "";

  while ((match = tokenRegex.exec(input)) !== null) {
    result += match[1];
  }

  result = result.replace(/\\u([0-9a-fA-F]{4})/g, (_, unicode) =>
    String.fromCharCode(parseInt(unicode, 16)),
  );

  return result;
}
