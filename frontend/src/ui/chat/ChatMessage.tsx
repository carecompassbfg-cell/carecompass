import { useCurrentThreadStore } from "@/stores/currentThread";
import {
  BotResponse,
  BotResponseCardAction,
  BotResponseComponentID,
  BotResponseType,
  Message,
  MessageRole,
} from "@/types/chat";
import { useChatQuery } from "@/util/hooks/useChatQuery";
import { Avatar } from "@chakra-ui/react";
import { Button, BxRightArrowAlt } from "@opengovsg/design-system-react";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { usePathname, useRouter } from "next/navigation";
import { parse } from "partial-json";
import CustomMarkdown from "../CustomMarkdown";
import { Fragment } from "react";
import { t } from "@/i18n";

export default function ChatMessage({ message }: { message: Message }) {
  return (
    <div className="flex place-items-start gap-2">
      {message.role === MessageRole.User ? (
        <Avatar className="sticky mt-2" colorScheme="sub" size="xs" />
      ) : (
        <Avatar className="sticky mt-2" src="/img/logo.svg" size="xs" />
      )}
      <div className="flex w-[calc(100%-40px)] flex-col rounded-lg border bg-white p-4">
        {message.role === MessageRole.User ? (
          <UserMessage content={message.content} />
        ) : (
          <AssistantMessage content={message.content} />
        )}
      </div>
    </div>
  );
}

function UserMessage({ content }: { content: string }) {
  return (
    <div className="m-0 flex flex-col gap-0 p-0">
      <CustomMarkdown content={content} />
    </div>
  );
}

function AssistantMessage({ content }: { content: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const currentChatId = useCurrentThreadStore((state) => state.thread.id);
  const { handleSubmitPrompt } = useChatQuery(currentChatId);

  // Parse the JSON string into a BotResponse object
  content = content.replaceAll(/\\\\/g, "\\");
  content = content.replaceAll(/\\"/g, '"');
  const parsedContent: BotResponse = parse(content);

  if (!parsedContent.output) {
    return <></>;
  }

  return (
    <div className="m-0 flex flex-col gap-4 p-0">
      {parsedContent.output.map((response, index) => {
        if (!response.content) {
          return <Fragment key={index} />;
        }

        response.content = response.content.replaceAll(/\\n/g, "\n");

        if (response.type === BotResponseType.Markdown) {
          return <CustomMarkdown key={index} content={response.content} />;
        } else if (response.type === BotResponseType.Prompt) {
          return (
            <form
              key={index}
              className="w-full"
              onSubmit={(e) => {
                handleSubmitPrompt(e, response.content);
              }}
            >
              <button className="w-full rounded border border-gray-400 px-4 py-2 text-left text-base leading-tight shadow-sm hover:bg-gray-50">
                {response.content}
              </button>
            </form>
          );
        } else if (response.type === BotResponseType.Card) {
          return (
            <div
              key={index}
              className="flex place-content-start place-items-start gap-2 rounded-md border border-gray-200 bg-white p-4 text-left shadow-sm"
            >
              <div className="flex flex-col gap-2">
                <span className="font-semibold">{response.header}</span>
                <span className="text-base">{response.content}</span>
                {parseActionMarkup(response.action, router)}
              </div>
            </div>
          );
        } else if (response.type === BotResponseType.Button) {
          if (response.id === BotResponseComponentID.CareserviceRecommender) {
            return (
              <Button
                key={index}
                rightIcon={<BxRightArrowAlt />}
                variant="outline"
                paddingY={6}
                onClick={() => router.push("/careservice")}
              >
                {response.content}
              </Button>
            );
          } else if (
            response.id === BotResponseComponentID.DaycareRecommender
          ) {
            router.push(`${pathname}?step=1`);
            return (
              <Button
                key={index}
                rightIcon={<BxRightArrowAlt />}
                variant="outline"
                paddingY={6}
                onClick={() => router.push("/careservice?step=1")}
              >
                {response.content}
              </Button>
            );
          } else if (
            response.id === BotResponseComponentID.SchemesRecommender
          ) {
            return (
              <Button
                key={index}
                rightIcon={<BxRightArrowAlt />}
                variant="outline"
                paddingY={6}
                onClick={() => router.push("/dashboard")}
              >
                {response.content}
              </Button>
            );
          } else if (
            response.id === BotResponseComponentID.TrainingRecommender
          ) {
            return (
              <Button
                key={index}
                rightIcon={<BxRightArrowAlt />}
                variant="outline"
                paddingY={6}
                onClick={() => router.push("/help/education")}
              >
                {response.content}
              </Button>
            );
          } else {
            return <Fragment key={index} />;
          }
        }
      })}
    </div>
  );
}

function parseActionMarkup(action: string, router: AppRouterInstance) {
  if (!action) {
    return null;
  }
  // [link](/page) -> navigate to /page in the current app
  // [phone](12345678) -> <a href="tel:12345678">phone</a>
  // [web](https://example.com) -> <a href="https://example.com">web</a>

  // Validate the action string
  const actionTypes = Object.values(BotResponseCardAction);
  const regexPattern = new RegExp(
    `\\[(${actionTypes.join("|")})\\]\\(([^)]+)\\)`,
  );

  const match = action.match(regexPattern);

  if (match) {
    const actionType = match[1];
    const actionVal = match[2];
    if (actionType === BotResponseCardAction.Link) {
      return (
        <a
          href={actionVal}
          target="_blank"
          className="text-sm text-blue-500 underline"
        >
          {actionVal}
        </a>
      );
    } else if (actionType === BotResponseCardAction.Web) {
      return (
        <button
          className="text-blue-500 underline"
          onClick={() => router.push(actionVal)}
        >
          {t("chat.message.learnMore")}
        </button>
      );
    } else if (actionType === BotResponseCardAction.Phone) {
      return (
        <a
          href={`tel:${actionVal}`}
          className="text-sm text-blue-500 underline"
        >
          {t("chat.message.call", { number: actionVal })}
        </a>
      );
    }
  }

  return null;
}
