"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@chakra-ui/react";
import { SignInButton } from "@clerk/nextjs";
import { ChevronRight, CircleHelp, CircleX, Search } from "lucide-react";
import AboutPanel from "@/components/schemes/AboutPanel";
import QuestionSheet from "@/components/schemes/QuestionSheet";
import SchemeCard from "@/components/schemes/SchemeCard";
import SchemeIcon, { FOCUS_RING } from "@/components/schemes/SchemeIcon";
import { isAnswered, useSchemeAnswersStore } from "@/stores/schemeAnswers";
import { BackButton } from "@/ui/button";
import LoadingSpinner from "@/ui/loading";
import { getOpenQuestionSummary, readAnswerParam } from "@/util/homeSchemes";
import useSchemeCatalog from "@/util/hooks/useSchemeCatalog";
import {
  getProfileFacts,
  getRecipientName,
  getRecipientTitleName,
  possessive,
} from "@/util/recipient";
import {
  countByCategory,
  countByStatus,
  PAY_FOR_META,
  PAY_FOR_ORDER,
  pickBestMatches,
  QUESTION_META,
} from "@/util/schemeCatalog";
import { t } from "@/i18n";

// The three status counts in the summary box; each opens the full list
// filtered to that status
const SUMMARY_TILES = [
  {
    status: "likely",
    className: "bg-green-100 text-green-600",
  },
  {
    status: "needs_answers",
    className: "bg-yellow-50 text-yellow-600",
  },
  {
    status: "provider_decides",
    className: "bg-gray-100 text-gray-600",
  },
] as const;

const PLAN_AHEAD_URL = "https://www.life.gov.sg/pages/EbR1nJj9/legacy-planning";

const ELSEWHERE_LINKS = [
  {
    href: "/careservice",
    icon: "elsewhere-care",
    key: "care",
    external: false,
  },
  {
    href: "/help",
    icon: "elsewhere-help",
    key: "help",
    external: false,
  },
  {
    href: PLAN_AHEAD_URL,
    icon: "elsewhere-plan",
    key: "plan",
    external: true,
  },
];

export default function SchemesPage() {
  const router = useRouter();
  const {
    items,
    user,
    isSignedIn,
    isLoading,
    catalogError,
    userLoadError,
    refreshUser,
    saveAnswers,
  } = useSchemeCatalog();
  const answers = useSchemeAnswersStore((state) => state.answers);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const aboutButtonRef = useRef<HTMLButtonElement>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const name = getRecipientName(user);
  const profileFacts = getProfileFacts(user);

  const statusCounts = useMemo(() => countByStatus(items), [items]);
  const bestMatches = useMemo(() => pickBestMatches(items), [items]);
  const allMatchesCount = statusCounts.likely + statusCounts.needs_answers;
  const categoryCounts = useMemo(() => countByCategory(items), [items]);

  const { openQuestions, schemesToCheck: schemesUnlocked } = useMemo(
    () =>
      isSignedIn
        ? getOpenQuestionSummary(items, (id) => isAnswered(answers, id))
        : { openQuestions: [], schemesToCheck: 0 },
    [items, answers, isSignedIn],
  );

  // ?answer=1 (from the home page's "Pick up where you left off") opens the
  // question sheet once loaded, then drops the param so Back doesn't reopen it
  const hasOpenQuestions = openQuestions.length > 0;
  useEffect(() => {
    if (isLoading) return;
    const param = readAnswerParam(window.location.search);
    if (!param) return;
    if (param.openSheet && hasOpenQuestions) setIsSheetOpen(true);
    router.replace(`${window.location.pathname}${param.remainingSearch}`, {
      scroll: false,
    });
  }, [isLoading, hasOpenQuestions, router]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex w-full flex-col gap-4 py-6">
      <BackButton />

      {!isSignedIn && (
        <section className="flex flex-col gap-4 rounded border border-brand-primary-300 bg-brand-primary-100 p-4">
          <p className="text-brand-primary-900">
            {t("dashboard.signInPrompt")}
          </p>
          <SignInButton>
            <Button variant="solid" size="xs" colorScheme="blue">
              {t("common.signIn")}
            </Button>
          </SignInButton>
        </section>
      )}

      <header className="flex flex-col gap-1.5">
        <h1 className="text-[28px] font-bold leading-[34px] text-gray-800">
          {t("dashboard.title", { name: getRecipientTitleName(user) })}
        </h1>
        {profileFacts.length > 0 && (
          <p className="flex flex-wrap items-center gap-x-1.5 text-sm leading-5 text-gray-600">
            {profileFacts.map((fact, index) => (
              <span key={fact}>
                {index > 0 && <span aria-hidden>· </span>}
                {fact}
              </span>
            ))}
            <Link
              href="/profile/care-recipient-info/edit?returnTo=/dashboard"
              className={`inline-flex min-h-11 items-center px-1 font-semibold text-interaction-links-default ${FOCUS_RING}`}
            >
              {t("dashboard.edit")}
              <span className="sr-only">{t("dashboard.editProfileSr")}</span>
            </Link>
          </p>
        )}
      </header>

      {catalogError && (
        <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
          {t("dashboard.catalogError")}
        </p>
      )}
      {isSignedIn && userLoadError && (
        <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
          {t("dashboard.profileError")}
        </p>
      )}

      {/* Summary */}
      <section
        aria-label={t("dashboard.summary")}
        className="flex flex-col gap-3.5 rounded-2xl border border-gray-200 bg-white p-4"
      >
        <div className="flex items-start gap-2">
          <p className="flex-1 text-[15px] leading-[22px] text-gray-800">
            {user
              ? t.rich("dashboard.checkedAgainst", {
                  count: items.length,
                  name: possessive(name),
                  b: (chunks) => <b>{chunks}</b>,
                })
              : t.rich("dashboard.checked", {
                  count: items.length,
                  b: (chunks) => <b>{chunks}</b>,
                })}
          </p>
          <button
            ref={aboutButtonRef}
            type="button"
            onClick={() => setIsAboutOpen(true)}
            aria-label={t("dashboard.aboutResults")}
            className={`-mr-2 -mt-2 flex size-11 shrink-0 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 ${FOCUS_RING}`}
          >
            <CircleHelp aria-hidden size={20} />
          </button>
        </div>
        <ul className="flex gap-2">
          {SUMMARY_TILES.map((tile) => {
            const count = statusCounts[tile.status];
            return (
              <li key={tile.status} className="flex flex-1">
                <Link
                  href={`/dashboard/all-schemes?status=${tile.status}`}
                  aria-label={t("dashboard.tileAria", {
                    count,
                    status: t(`schemes.status.${tile.status}`),
                  })}
                  className={`flex min-h-11 w-full flex-col gap-0.5 rounded-[10px] p-2.5 ${tile.className} ${FOCUS_RING}`}
                >
                  <span className="flex items-center justify-between">
                    <span className="text-[22px] font-bold">{count}</span>
                    <ChevronRight aria-hidden size={18} />
                  </span>
                  <span className="text-xs font-semibold leading-4">
                    {t(`schemes.status.${tile.status}`)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        {statusCounts.not_a_match > 0 && (
          <Link
            href="/dashboard/all-schemes?status=not_a_match"
            className={`-my-1 flex min-h-11 items-center gap-1.5 text-[13px] text-gray-600 ${FOCUS_RING}`}
          >
            <CircleX aria-hidden size={16} className="shrink-0" />
            <span>
              {t("dashboard.notAFit", {
                count: statusCounts.not_a_match,
                name,
              })}
            </span>
            <ChevronRight aria-hidden size={16} className="shrink-0" />
          </Link>
        )}
        {openQuestions.length > 0 && (
          <div className="flex flex-col gap-2.5 border-t border-gray-200 pt-3.5">
            <div className="flex items-start gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-2xl bg-yellow-50">
                <SchemeIcon name="question-summary" size={18} />
              </span>
              <div className="flex flex-col gap-0.5">
                <p className="text-[15px] font-semibold leading-5 text-gray-800">
                  {t("dashboard.answerToCheck", {
                    questions: openQuestions.length,
                    schemes: schemesUnlocked,
                  })}
                </p>
                <p className="text-[13px] leading-[18px] text-gray-600">
                  {openQuestions
                    .map((id) => QUESTION_META[id].summary)
                    .join(" ")}{" "}
                  {t("dashboard.aboutOneMinute")}
                </p>
              </div>
            </div>
            <Button
              colorScheme="blue"
              width="full"
              minHeight="44px"
              onClick={() => setIsSheetOpen(true)}
            >
              {t("dashboard.answerNow")}
            </Button>
          </div>
        )}
        {!isSignedIn && statusCounts.needs_answers > 0 && (
          <p className="border-t border-gray-200 pt-3.5 text-[13px] leading-[18px] text-gray-600">
            {t("dashboard.signInToCheck", {
              name,
              count: statusCounts.needs_answers,
            })}
          </p>
        )}
      </section>

      {/* Best matches */}
      {bestMatches.length > 0 && (
        <section
          aria-labelledby="best-matches"
          className="flex flex-col gap-2.5"
        >
          <div className="flex flex-col gap-0.5">
            <h2
              id="best-matches"
              className="text-lg font-bold leading-6 text-gray-800"
            >
              {t("dashboard.bestMatches")}
            </h2>
            <p className="text-sm leading-5 text-gray-600">
              {t("dashboard.bestMatchesHint")}
            </p>
          </div>
          {bestMatches.map((item) => (
            <SchemeCard key={item.scheme.id} item={item} />
          ))}
          {allMatchesCount > bestMatches.length && (
            <Link
              href="/dashboard/all-schemes?status=likely,needs_answers"
              className={`flex min-h-11 items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white p-3 text-[15px] font-semibold text-interaction-links-default ${FOCUS_RING}`}
            >
              {t("dashboard.seeAllMatches", { count: allMatchesCount })}
              <SchemeIcon name="chevron-link" size={16} />
            </Link>
          )}
        </section>
      )}

      <Link
        href="/dashboard/all-schemes"
        className={`flex min-h-11 items-center gap-3 rounded-xl border border-interaction-main-default bg-white p-3.5 ${FOCUS_RING}`}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-blue-100 text-interaction-main-default">
          <Search aria-hidden size={20} />
        </span>
        <span className="flex flex-1 flex-col gap-0.5">
          <span className="text-[15px] font-semibold leading-5 text-interaction-links-default">
            {t("dashboard.searchAll")}
          </span>
          <span className="text-[13px] leading-[18px] text-gray-600">
            {t("dashboard.searchAllHint")}
          </span>
        </span>
        <ChevronRight
          aria-hidden
          size={18}
          className="shrink-0 text-interaction-main-default"
        />
      </Link>

      {/* Browse by category */}
      <section aria-labelledby="browse" className="flex flex-col gap-2.5">
        <h2 id="browse" className="text-lg font-bold leading-6 text-gray-800">
          {t("dashboard.browse")}
        </h2>
        <ul className="grid grid-cols-2 gap-2.5">
          {PAY_FOR_ORDER.filter((category) => categoryCounts[category]).map(
            (category) => {
              const meta = PAY_FOR_META[category];
              const count = categoryCounts[category] ?? 0;
              return (
                <li key={category} className="flex">
                  <Link
                    href={`/dashboard/category/${category}`}
                    className={`flex w-full flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3.5 hover:border-gray-300 ${FOCUS_RING}`}
                  >
                    <span className="flex size-9 items-center justify-center rounded-[10px] bg-blue-100">
                      <SchemeIcon name={meta.icon} size={20} />
                    </span>
                    <span className="text-[15px] font-semibold leading-5 text-gray-800">
                      {meta.label}
                    </span>
                    <span className="text-xs leading-4 text-gray-600">
                      {meta.description}
                    </span>
                    <span className="mt-auto text-xs font-semibold leading-4 text-gray-800">
                      {t("dashboard.schemeCount", { count })}
                    </span>
                  </Link>
                </li>
              );
            },
          )}
        </ul>
      </section>

      {/* Not a scheme */}
      <section
        aria-labelledby="elsewhere"
        className="flex flex-col gap-1 rounded-xl border border-gray-200 bg-white p-4"
      >
        <h2
          id="elsewhere"
          className="pb-1 text-base font-bold leading-[22px] text-gray-800"
        >
          {t("dashboard.elsewhere")}
        </h2>
        {ELSEWHERE_LINKS.map((link) => {
          const content = (
            <>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                <SchemeIcon name={link.icon} size={20} />
              </span>
              <span className="flex flex-1 flex-col">
                <span className="text-[15px] font-semibold text-gray-800">
                  {t(`dashboard.elsewhereLinks.${link.key}.title`)}
                </span>
                <span className="text-[13px] leading-[18px] text-gray-600">
                  {t(`dashboard.elsewhereLinks.${link.key}.description`)}
                </span>
              </span>
              <SchemeIcon name="chevron-card" size={18} />
            </>
          );
          const className = `flex min-h-11 items-center gap-3 border-t border-gray-200 py-3 first-of-type:border-t-0 ${FOCUS_RING}`;
          return link.external ? (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className={className}
            >
              {content}
              <span className="sr-only">{t("common.opensInNewTab")}</span>
            </a>
          ) : (
            <Link key={link.href} href={link.href} className={className}>
              {content}
            </Link>
          );
        })}
      </section>

      <p className="flex items-start gap-2 pb-4 text-xs leading-[18px] text-gray-600">
        <SchemeIcon name="info-footer" size={16} />
        <span>{t("dashboard.footer")}</span>
      </p>

      <AboutPanel
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        recipientName={name}
        returnFocusRef={aboutButtonRef}
      />

      {isSheetOpen && (
        <QuestionSheet
          isOpen
          onClose={() => {
            setIsSheetOpen(false);
            // Once per close; statuses already updated from the answers
            saveAnswers();
          }}
          items={items}
          recipientName={name}
          isSignedIn={isSignedIn}
          onIncomeSaved={refreshUser}
        />
      )}
    </div>
  );
}
