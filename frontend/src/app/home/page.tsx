"use client";

import { useAuthStore } from "@/stores/auth";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ReactElement, ReactNode, useEffect, useMemo } from "react";
import HomeSchemesStatusLine from "@/components/schemes/HomeSchemesStatusLine";
import ResumeStrip from "@/components/schemes/ResumeStrip";
import { useSchemeAnswersStore, isAnswered } from "@/stores/schemeAnswers";
import useSchemeCatalog from "@/util/hooks/useSchemeCatalog";
import {
  getFinancialQuestion,
  getOpenQuestionSummary,
  getStatusLineParts,
} from "@/util/homeSchemes";
import { getRecipientName } from "@/util/recipient";

interface MenuCardData {
  span: ReactElement;
  text: string;
  // Small grey line under the question
  subtitle?: string;
  img: string;
  link: string;
  isSignInRequired: boolean;
  isFinancial?: boolean;
}

// The financial card's question uses the saved name, so the list is built
// per render. Order, links and illustrations are unchanged.
const getCardDataList = (financial: {
  recipient: string;
  text: string;
}): MenuCardData[] => [
  {
    span: (
      <span>
        What <span className="text-brand-primary-500">caregiving services</span>{" "}
        are available?
      </span>
    ),
    text: "What caregiving services are available?",
    subtitle: "Day care, home care, nursing homes, respite",
    img: "/img/illustration_5.svg",
    link: "/careservice",
    isSignInRequired: false,
  },
  {
    // A saved name is shown exactly as typed
    span: (
      <span>
        What <span className="text-brand-primary-500">financial support</span>{" "}
        might {/* May be the saved name: kept out of PostHog autocapture */}
        <span className="ph-no-capture text-brand-primary-500">
          {financial.recipient}
        </span>{" "}
        and I be eligible for?
      </span>
    ),
    text: financial.text,
    img: "/img/illustration_3.svg",
    link: "/dashboard",
    isSignInRequired: true,
    isFinancial: true,
  },
  {
    span: (
      <span>
        Where can I go for{" "}
        <span className="text-brand-primary-500">help and support</span>?
      </span>
    ),
    text: "Where can I go for help and support?",
    subtitle: "Courses, support groups, hotlines",
    img: "/img/illustration_1.svg",
    link: "/help",
    isSignInRequired: true,
  },
  {
    span: (
      <span>
        How can I <span className="text-brand-primary-500">monitor</span> my{" "}
        <span className="text-brand-primary-500">
          loved one&apos;s mental state
        </span>
        ?
      </span>
    ),
    text: "How can I monitor my loved one's mental state?",
    // Fixed phrase: not personalised with the name
    subtitle: "Daily updates on your loved one's mood",
    img: "/img/illustration_2.svg",
    link: "/heartbeat",
    isSignInRequired: true,
  },
  {
    span: (
      <span>
        How can I <span className="text-brand-primary-500">plan ahead</span>{" "}
        with my loved one for{" "}
        <span className="text-brand-primary-500">end-of-life</span>?
      </span>
    ),
    text: "How can I plan ahead with my loved one for end-of-life?",
    subtitle: "LPA and advance care planning",
    img: "/img/illustration_4.svg",
    link: "https://mylegacy.life.gov.sg/end-of-life-planning/",
    isSignInRequired: false,
  },
];

export default function Home() {
  const router = useRouter();
  const isSignedIn = useAuthStore((state) => state.isSignedIn);

  // Schemes statuses for the status line and resume strip, signed in only.
  // Nothing shows while loading or if loading fails.
  const { items, user, isLoading, catalogError } = useSchemeCatalog({
    enabled: isSignedIn,
  });
  const answers = useSchemeAnswersStore((state) => state.answers);
  const isSchemesReady = isSignedIn && !isLoading && !catalogError && !!user;
  const statusLineParts = useMemo(
    () => (isSchemesReady ? getStatusLineParts(items) : []),
    [isSchemesReady, items],
  );
  const { openQuestions, schemesToCheck } = useMemo(
    () =>
      isSchemesReady
        ? getOpenQuestionSummary(items, (id) => isAnswered(answers, id))
        : { openQuestions: [], schemesToCheck: 0 },
    [isSchemesReady, items, answers],
  );

  const userData = useAuthStore((state) => state.userData);
  const financial = getFinancialQuestion(isSignedIn ? userData : null);
  const cardDataList = useMemo(
    () =>
      getCardDataList({
        recipient: financial.recipient,
        text: financial.text,
      }),
    [financial.recipient, financial.text],
  );

  const { enabledCards, disabledCards } = useMemo(() => {
    let enabledCards: MenuCardData[] = [];
    const disabledCards: MenuCardData[] = [];
    if (isSignedIn) {
      enabledCards = cardDataList;
    } else {
      cardDataList.forEach((i) => {
        if (i.isSignInRequired) {
          disabledCards.push(i);
        } else {
          enabledCards.push(i);
        }
      });
    }
    return {
      enabledCards,
      disabledCards,
    };
  }, [isSignedIn, cardDataList]);

  const statusLine =
    statusLineParts.length > 0 ? (
      <HomeSchemesStatusLine parts={statusLineParts} />
    ) : null;

  useEffect(() => {
    const addToHomeScreenPrompted = localStorage.getItem(
      "cc_add_to_homescreen_prompted",
    );
    if (addToHomeScreenPrompted !== "true") {
      router.push("/add-to-homescreen");
      return;
    }

    router.prefetch("/careservice");
    router.prefetch("/dashboard");
    router.prefetch("/help");
  }, [router]);

  return (
    <div className="flex h-full w-full flex-col place-content-start place-items-start pt-8">
      <div className="flex h-full max-h-[512px] w-full flex-col place-content-between">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-brand-primary-500">
            What do you need help with today?
          </h1>
          <span className="text-xl font-bold text-[rgb(128,128,128,0.55)]">
            See what other caregivers are asking
          </span>
        </div>
        {openQuestions.length > 0 && schemesToCheck > 0 && (
          <ResumeStrip
            questionCount={openQuestions.length}
            schemeCount={schemesToCheck}
            recipientName={getRecipientName(user)}
          />
        )}
        <div className="flex flex-col gap-2 pb-8">
          {enabledCards.map((data, index) => (
            <MenuCard
              key={index}
              data={data}
              footer={data.isFinancial ? statusLine : undefined}
            />
          ))}
        </div>
        {disabledCards.length > 0 && (
          <div className="flex flex-col gap-2 pb-8">
            <p>
              <i>Sign-In Required</i>
            </p>
            {disabledCards.map((data, index) => (
              <MenuCard key={index} data={data} isDisabled />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MenuCard({
  data,
  isDisabled,
  footer,
}: {
  data: MenuCardData;
  isDisabled?: boolean;
  // Replaces the grey subtitle, e.g. the financial card's status line
  footer?: ReactNode;
}) {
  const router = useRouter();

  const handleClick = () => {
    !isDisabled && router.push(data.link);
  };

  return (
    <div
      className={`flex cursor-pointer place-items-center gap-3 rounded-2xl bg-white p-3 shadow-md hover:bg-gray-50 ${isDisabled ? "opacity-50 grayscale" : ""}`}
      onClick={handleClick}
    >
      <div className="mb-auto flex min-h-20 min-w-20 place-content-center place-items-center rounded-xl bg-[#F2F2F2]">
        <Image
          src={data.img}
          height={64}
          width={64}
          className="max-h-16 max-w-16"
          alt={data.text}
        />
      </div>
      <div className="flex flex-col gap-1">
        <div className="text-base text-[#2C2E34]">{data.span}</div>
        {footer ??
          (data.subtitle && (
            <p className="text-[13px] leading-[18px] text-gray-600">
              {data.subtitle}
            </p>
          ))}
      </div>
    </div>
  );
}
