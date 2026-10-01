"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SignInButton } from "@clerk/nextjs";
import QuestionSheet from "@/components/schemes/QuestionSheet";
import SchemeIcon, { FOCUS_RING } from "@/components/schemes/SchemeIcon";
import StatusPill from "@/components/schemes/StatusPill";
import { ProfileQuestionId } from "@/types/scheme";
import { BackButton } from "@/ui/button";
import CustomMarkdown from "@/ui/CustomMarkdown";
import LoadingSpinner from "@/ui/loading";
import useSchemeCatalog from "@/util/hooks/useSchemeCatalog";
import { getRecipientName } from "@/util/recipient";
import {
  isSheetQuestion,
  PAY_FOR_META,
  QUESTION_META,
  getLastUpdated,
  getSourceLine,
  SOURCE_LABELS,
} from "@/util/schemeCatalog";

// Collapsible eligibility text. Tier 2 text comes from Schemes.sg, so it
// carries a note saying so.
function FullEligibility({
  content,
  note,
}: {
  content: string;
  note?: string;
}) {
  return (
    <details className="group border-t border-gray-200 pt-3">
      <summary
        className={`flex min-h-11 cursor-pointer list-none items-center text-sm font-semibold text-interaction-links-default [&::-webkit-details-marker]:hidden ${FOCUS_RING}`}
      >
        <span className="flex-1">Full eligibility</span>
        <SchemeIcon
          name="chevron-link"
          size={16}
          className="transition-transform group-open:rotate-90"
        />
      </summary>
      {note && <p className="pb-2 text-xs text-gray-600">{note}</p>}
      <CustomMarkdown content={content} />
    </details>
  );
}

function ChecklistRow({
  icon,
  title,
  hint,
  action,
}: {
  icon: string;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-2.5">
      <SchemeIcon name={icon} size={22} />
      <div className="flex flex-1 flex-col gap-0.5">
        {/* Reasons can hold a link, e.g. to ElderFund */}
        <CustomMarkdown
          content={title}
          className="text-[15px] leading-[21px] text-gray-800 prose-p:my-0"
        />
        {hint && (
          <span className="text-[13px] leading-[18px] text-gray-600">
            {hint}
          </span>
        )}
      </div>
      {action}
    </li>
  );
}

const formatDate = (iso: string): string => {
  const date = new Date(iso);
  return isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString("en-SG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
};

function SchemeDetail() {
  const params = useSearchParams();
  const id = params.get("id");
  const { items, user, isSignedIn, isLoading, userLoadError, refreshUser } =
    useSchemeCatalog();
  const [sheetStart, setSheetStart] = useState<ProfileQuestionId>();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const item = items.find(({ scheme }) => scheme.id === id);
  if (!item) {
    return (
      <div className="flex w-full flex-col gap-4 py-6">
        <BackButton />
        <p className="text-gray-800">We couldn&apos;t find that scheme.</p>
        <Link
          href="/dashboard"
          className={`font-semibold text-interaction-links-default ${FOCUS_RING}`}
        >
          See all financial schemes
        </Link>
      </div>
    );
  }

  const { scheme, status } = item;
  const name = getRecipientName(user);
  const category = PAY_FOR_META[scheme.payFor];

  return (
    <div className="flex w-full flex-col gap-4 py-6">
      <BackButton />

      <header className="flex flex-col gap-2">
        <h1 className="text-[26px] font-bold leading-8 text-gray-800">
          {scheme.name}
        </h1>
        <div className="flex flex-wrap gap-3 text-xs leading-4 text-gray-600">
          <span className="flex items-center gap-1">
            <SchemeIcon name={category.icon} size={13} />
            {category.label}
          </span>
          {scheme.area.kind === "district" && (
            <span className="flex items-center gap-1">
              <SchemeIcon name="pin-meta" size={13} />
              {scheme.area.name}
            </span>
          )}
          <span className="flex items-center gap-1">
            <SchemeIcon name="info-meta" size={13} />
            {getSourceLine(scheme)}
          </span>
        </div>
      </header>

      <section
        aria-labelledby="what-you-get"
        className="flex flex-col gap-2.5 rounded-xl border border-gray-200 bg-white p-4"
      >
        <h2 id="what-you-get" className="text-base font-bold text-gray-800">
          What you get
        </h2>
        <CustomMarkdown content={scheme.description} />
        {scheme.whatYouGet.length > 0 && (
          <ul className="flex list-disc flex-col gap-1 pl-5 text-[15px] text-gray-800">
            {scheme.whatYouGet.map((entry) => (
              <li key={entry}>
                <CustomMarkdown content={entry} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="can-get"
        className="flex flex-col gap-3.5 rounded-xl border border-gray-200 bg-white p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="can-get" className="text-base font-bold text-gray-800">
            Can {name} get this?
          </h2>
          <StatusPill status={status} />
        </div>

        {isSignedIn && userLoadError && (
          <p className="text-sm text-gray-600">
            We couldn&apos;t load your profile, so we can&apos;t check this for{" "}
            {name} yet. Please try again later.
          </p>
        )}

        {scheme.tier === 2 ? (
          <>
            <p className="text-sm leading-5 text-gray-600">
              Check eligibility on the official website.
            </p>
            <a
              href={scheme.link}
              target="_blank"
              rel="noreferrer"
              className={`flex min-h-11 items-center gap-2.5 text-[15px] font-semibold text-interaction-links-default ${FOCUS_RING}`}
            >
              <SchemeIcon name="external" size={18} />
              Check the official page
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            {scheme.eligibility && (
              <FullEligibility
                content={scheme.eligibility}
                note="Eligibility as described by Schemes.sg"
              />
            )}
          </>
        ) : (
          <>
            <ul className="flex flex-col gap-3.5">
              {status.reasonsMet.map((reason) => (
                <ChecklistRow key={reason} icon="row-check" title={reason} />
              ))}
              {status.reasonsNotMet.map((reason) => (
                <ChecklistRow key={reason} icon="row-cross" title={reason} />
              ))}
              {status.questionsToAsk.map((question) => (
                <ChecklistRow
                  key={question}
                  icon="row-question"
                  title={QUESTION_META[question].rowTitle}
                  hint={QUESTION_META[question].rowHint}
                  action={
                    isSignedIn && isSheetQuestion(question) ? (
                      <button
                        type="button"
                        onClick={() => setSheetStart(question)}
                        className={`min-h-11 rounded-lg border border-interaction-main-default px-3 text-sm font-semibold text-interaction-links-default ${FOCUS_RING}`}
                      >
                        Answer
                        <span className="sr-only">
                          : {QUESTION_META[question].rowTitle}
                        </span>
                      </button>
                    ) : isSignedIn ? (
                      // Profile fields (e.g. where they live) are changed on
                      // the profile page, not in the question sheet
                      <Link
                        href={`/profile/care-recipient-info/edit?returnTo=${encodeURIComponent(
                          `/dashboard/schemes?id=${scheme.id}`,
                        )}`}
                        className={`flex min-h-11 items-center rounded-lg border border-interaction-main-default px-3 text-sm font-semibold text-interaction-links-default ${FOCUS_RING}`}
                      >
                        Update profile
                      </Link>
                    ) : !isSignedIn ? (
                      <SignInButton>
                        <button
                          type="button"
                          className={`min-h-11 rounded-lg border border-interaction-main-default px-3 text-sm font-semibold text-interaction-links-default ${FOCUS_RING}`}
                        >
                          Sign in
                        </button>
                      </SignInButton>
                    ) : undefined
                  }
                />
              ))}
            </ul>

            {status.agencyWillCheck.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-gray-200 pt-3.5">
                <h3 className="text-sm font-semibold text-gray-800">
                  The agency will also check
                </h3>
                <ul className="flex flex-col gap-3.5">
                  {status.agencyWillCheck.map((check) => (
                    <ChecklistRow key={check} icon="row-info" title={check} />
                  ))}
                </ul>
              </div>
            )}

            {scheme.eligibility && (
              <FullEligibility content={scheme.eligibility} />
            )}
          </>
        )}
      </section>

      <section
        aria-labelledby="next-steps"
        className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4"
      >
        <h2 id="next-steps" className="text-base font-bold text-gray-800">
          Next steps
        </h2>
        {scheme.nextSteps && <CustomMarkdown content={scheme.nextSteps} />}
        <a
          href={scheme.link}
          target="_blank"
          rel="noreferrer"
          className={`flex min-h-11 items-center gap-2.5 text-[15px] font-semibold text-interaction-links-default ${FOCUS_RING}`}
        >
          <SchemeIcon name="external" size={18} />
          Read more on the official website
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </section>

      <p className="pb-4 text-xs text-gray-600">
        Last updated {formatDate(getLastUpdated(scheme) ?? "")} ·{" "}
        {scheme.tier === 1 ? (
          <>
            Sources:{" "}
            {scheme.sources.map((source, index) => (
              <span key={source.url}>
                {index > 0 && ", "}
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`underline ${FOCUS_RING}`}
                >
                  {source.name}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </span>
            ))}
          </>
        ) : (
          `From ${SOURCE_LABELS[scheme.source]}`
        )}
      </p>

      {sheetStart && (
        <QuestionSheet
          isOpen
          onClose={() => setSheetStart(undefined)}
          scopeSchemeId={scheme.id}
          startAt={sheetStart}
          items={items}
          recipientName={name}
          isSignedIn={isSignedIn}
          onIncomeSaved={refreshUser}
        />
      )}
    </div>
  );
}

export default function SchemeDetailWithSuspense() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SchemeDetail />
    </Suspense>
  );
}
