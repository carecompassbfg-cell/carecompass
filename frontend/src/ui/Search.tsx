import { useChatQuery } from "@/util/hooks/useChatQuery";
import { IconButton, Input } from "@opengovsg/design-system-react";
import { SendHorizontalIcon } from "lucide-react";
import { t } from "@/i18n";

export default function Search({ currentChatId }: { currentChatId?: string }) {
  const { prompt, isSending, handleInput, handleSubmitPrompt } =
    useChatQuery(currentChatId);

  return (
    <form className="my-6 flex w-full gap-2" onSubmit={handleSubmitPrompt}>
      <Input
        placeholder={t("search.placeholder")}
        value={prompt}
        onChange={handleInput}
        disabled={isSending}
      />
      <IconButton
        icon={<SendHorizontalIcon />}
        aria-label={t("search.send")}
        type="submit"
        isLoading={isSending}
        isDisabled={prompt.trim().length === 0}
      />
    </form>
  );
}
