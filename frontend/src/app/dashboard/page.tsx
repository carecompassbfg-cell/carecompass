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

// The three status counts in the summary box; each opens the full list
// filtered to that status
const SUMMARY_TILES = [
  {
    status: "likely",
    label: "Likely eligible",
    ariaLabel: "likely eligible",
    className: "bg-green-100 text-green-600",
  },
  {
    status: "needs_answers",
    label: "Need answers",
    ariaLabel: "need answers",
    className: "bg-yellow-50 text-yellow-600",
  },
  {
    status: "provider_decides",
    label: "Check with agency",
    ariaLabel: "check with agency",
    className: "bg-gray-100 text-gray-600",
  },
] as const;

const PLAN_AHEAD_URL = "https://mylegacy.life.gov.sg/end-of-life-planning/";

const ELSEWHERE_LINKS = [
  {
    href: "/careservice",
    icon: "elsewhere-care",
    title: "Care services",
    description: "Day care, home care, nursing homes, respite",
    external: false,
  },
  {
    href: "/help",
    icon: "elsewhere-help",
    title: "Help and support",
    description: "Courses, support groups, hotlines, counselling",
    external: false,
  },
  {
    href: PLAN_AHEAD_URL,
    icon: "elsewhere-plan",
    title: "Plan ahead",
    description: "LPA, advance care planning, deputyship",
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
            Sign in to get personalized recommendations
          </p>
          <SignInButton>
            <Button variant="solid" size="xs" colorScheme="blue">
              Sign in
            </Button>
          </SignInButton>
        </section>
      )}

      <header className="flex flex-col gap-1.5">
        <h1 className="text-[28px] font-bold leading-[34px] text-gray-800">
          Financial schemes for {getRecipientTitleName(user)}
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
              Edit<span className="sr-only"> profile</span>
            </Link>
          </p>
        )}
      </header>

      {catalogError && (
        <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
          We couldn&apos;t load the list of schemes. Please try again later.
        </p>
      )}
      {isSignedIn && userLoadError && (
        <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
          We couldn&apos;t load your profile, so these results are not
          personalised yet. Please try again later.
        </p>
      )}

      {/* Summary */}
      <section
        aria-label="Summary"
        className="flex flex-col gap-3.5 rounded-2xl border border-gray-200 bg-white p-4"
      >
        <div className="flex items-start gap-2">
          <p className="flex-1 text-[15px] leading-[22px] text-gray-800">
            We checked <b>{items.length}</b> grants, subsidies and reliefs
            {user ? ` against ${possessive(name)} profile.` : "."}
          </p>
          <button
            ref={aboutButtonRef}
            type="button"
            onClick={() => setIsAboutOpen(true)}
            aria-label="About these results"
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
                  aria-label={`${count} ${tile.ariaLabel}, see the list`}
                  className={`flex min-h-11 w-full flex-col gap-0.5 rounded-[10px] p-2.5 ${tile.className} ${FOCUS_RING}`}
                >
                  <span className="flex items-center justify-between">
                    <span className="text-[22px] font-bold">{count}</span>
                    <ChevronRight aria-hidden size={18} />
                  </span>
                  <span className="text-xs font-semibold leading-4">
                    {tile.label}
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
              {statusCounts.not_a_match}{" "}
              {statusCounts.not_a_match === 1
                ? "doesn't look like a fit"
                : "don't look like a fit"}{" "}
              for {name}
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
                  Answer {openQuestions.length}{" "}
                  {openQuestions.length === 1 ? "question" : "questions"} to
                  check {schemesUnlocked} more
                </p>
                <p className="text-[13px] leading-[18px] text-gray-600">
                  {openQuestions
                    .map((id) => QUESTION_META[id].summary)
                    .join(" ")}{" "}
                  About 1 minute.
                </p>
              </div>
            </div>
            <Button
              colorScheme="blue"
              width="full"
              minHeight="44px"
              onClick={() => setIsSheetOpen(true)}
            >
              Answer now
            </Button>
          </div>
        )}
        {!isSignedIn && statusCounts.needs_answers > 0 && (
          <p className="border-t border-gray-200 pt-3.5 text-[13px] leading-[18px] text-gray-600">
            Sign in and tell us about {name} to check{" "}
            {statusCounts.needs_answers} of these against their profile.
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
              Best matches
            </h2>
            <p className="text-sm leading-5 text-gray-600">
              Likely eligible first, then schemes that need a few answers
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
              See all {allMatchesCount} matches
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
            Search all caregiving schemes
          </span>
          <span className="text-[13px] leading-[18px] text-gray-600">
            All {items.length}, including ones that may not fit. Filter by what
            it pays for.
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
          Browse by what it helps pay for
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
                      {count} {count === 1 ? "scheme" : "schemes"}
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
          Not a scheme? These live elsewhere in CareCompass
        </h2>
        {ELSEWHERE_LINKS.map((link) => {
          const content = (
            <>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                <SchemeIcon name={link.icon} size={20} />
              </span>
              <span className="flex flex-1 flex-col">
                <span className="text-[15px] font-semibold text-gray-800">
                  {link.title}
                </span>
                <span className="text-[13px] leading-[18px] text-gray-600">
                  {link.description}
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
              <span className="sr-only">(opens in a new tab)</span>
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
        <span>
          Information from Schemes.sg and CareCompass, refreshed weekly.
          &lsquo;Likely eligible&rsquo; is a guide based on your profile. The
          agency makes the final decision.
        </span>
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
