"use client";

import { useAuthStore } from "@/stores/auth";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ReactElement, ReactNode, useEffect, useMemo, useState } from "react";
import CareMonitoringTab from "@/components/home/CareMonitoringTab";
import HomeTabs, {
  HomeTab,
  readSavedTab,
  saveTab,
} from "@/components/home/HomeTabs";
import LanguagePill from "@/components/home/LanguagePill";
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
import { t } from "@/i18n";

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

const HL = (chunks: ReactNode) => (
  <span className="text-brand-primary-500">{chunks}</span>
);

// The financial card's question uses the saved name, so the list is built
// per render. Order, links and illustrations are unchanged.
const getCardDataList = (financial: {
  recipient: string;
  text: string;
}): MenuCardData[] => [
  {
    span: <span>{t.rich("home.cards.services", { hl: HL })}</span>,
    text: t("home.cards.servicesPlain"),
    subtitle: t("home.cards.servicesSub"),
    img: "/img/illustration_5.svg",
    link: "/careservice",
    isSignInRequired: false,
  },
  {
    // A saved name is shown exactly as typed
    span: (
      <span>
        {t.rich("home.cards.financial", {
          hl: HL,
          recipient: financial.recipient,
          // May be the saved name: kept out of PostHog autocapture
          name: (chunks) => (
            <span className="ph-no-capture text-brand-primary-500">
              {chunks}
            </span>
          ),
        })}
      </span>
    ),
    text: financial.text,
    img: "/img/illustration_3.svg",
    link: "/dashboard",
    isSignInRequired: true,
    isFinancial: true,
  },
  {
    span: <span>{t.rich("home.cards.help", { hl: HL })}</span>,
    text: t("home.cards.helpPlain"),
    subtitle: t("home.cards.helpSub"),
    img: "/img/illustration_1.svg",
    link: "/help",
    isSignInRequired: true,
  },
  {
    span: <span>{t.rich("home.cards.monitor", { hl: HL })}</span>,
    text: t("home.cards.monitorPlain"),
    // Fixed phrase: not personalised with the name
    subtitle: t("home.cards.monitorSub"),
    img: "/img/illustration_2.svg",
    link: "/heartbeat",
    isSignInRequired: true,
  },
  {
    span: <span>{t.rich("home.cards.plan", { hl: HL })}</span>,
    text: t("home.cards.planPlain"),
    subtitle: t("home.cards.planSub"),
    img: "/img/illustration_4.svg",
    link: "https://www.life.gov.sg/pages/EbR1nJj9/legacy-planning",
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

  // Care assistance by default; remembers the last tab for this session
  const [tab, setTab] = useState<HomeTab>("assistance");
  useEffect(() => setTab(readSavedTab() ?? "assistance"), []);
  const changeTab = (next: HomeTab) => {
    setTab(next);
    saveTab(next);
  };

  return (
    <div className="flex h-full w-full flex-col place-content-start place-items-start pt-2">
      <div className="flex w-full flex-col">
        <div className="mb-3 flex w-full items-center justify-between gap-3">
          <h1 className="min-w-0 text-xl font-bold text-gray-900">
            {t("home.welcome")}
          </h1>
          <LanguagePill />
        </div>
        <HomeTabs value={tab} onChange={changeTab} />
      </div>

      <div
        role="tabpanel"
        id="home-panel-monitoring"
        aria-labelledby="home-tab-monitoring"
        hidden={tab !== "monitoring"}
        className="w-full pb-8 pt-5"
      >
        {tab === "monitoring" && <CareMonitoringTab isSignedIn={isSignedIn} />}
      </div>

      <div
        role="tabpanel"
        id="home-panel-assistance"
        aria-labelledby="home-tab-assistance"
        hidden={tab !== "assistance"}
        className="flex w-full flex-col pt-5"
      >
        <div className="mb-6 flex flex-col gap-1">
          <h2 className="text-3xl font-bold text-brand-primary-500">
            {t("home.assistance.title")}
          </h2>
          <span className="text-xl font-bold text-[rgb(128,128,128,0.55)]">
            {t("home.assistance.subtitle")}
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
              <i>{t("home.signInRequired")}</i>
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
