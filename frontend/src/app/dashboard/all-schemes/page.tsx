"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, CircleX, Info, Search, X } from "lucide-react";
import FiltersSheet from "@/components/schemes/FiltersSheet";
import SchemeCard from "@/components/schemes/SchemeCard";
import { FOCUS_RING } from "@/components/schemes/SchemeIcon";
import { isAnswered, useSchemeAnswersStore } from "@/stores/schemeAnswers";
import { BackButton } from "@/ui/button";
import LoadingSpinner from "@/ui/loading";
import useSchemeCatalog from "@/util/hooks/useSchemeCatalog";
import { COMMUNITY_TELEGRAM_URL } from "@/util/links";
import { getRecipientName, possessive } from "@/util/recipient";
import {
  applyFilters,
  BrowseFilters,
  buildBrowseQuery,
  chipLabel,
  EMPTY_FILTERS,
  FilterKey,
  firstNotMetReason,
  getAlsoMatching,
  getAreaOptions,
  groupByStatus,
  hasActiveFilters,
  parseBrowseQuery,
  sortFlat,
  STATUS_FILTER_LABELS,
} from "@/util/schemeBrowse";
import { getOpenSheetQuestions, SchemeWithStatus } from "@/util/schemeCatalog";
import { t } from "@/i18n";

const GROUP_PREVIEW = 3;

function GroupHeading({
  title,
  count,
  subtitle,
}: {
  title: string;
  count: number;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <h2 className="text-lg font-bold leading-6 text-gray-800">
        {title} <span className="font-semibold text-gray-600">{count}</span>
      </h2>
      {subtitle && (
        <p className="text-sm leading-5 text-gray-600">{subtitle}</p>
      )}
    </div>
  );
}

function StatusGroup({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle?: string;
  items: SchemeWithStatus[];
}) {
  const [expanded, setExpanded] = useState(false);
  if (!items.length) return null;
  const shown = expanded ? items : items.slice(0, GROUP_PREVIEW);
  const hidden = items.length - shown.length;
  return (
    <section className="flex flex-col gap-2.5">
      <GroupHeading title={title} count={items.length} subtitle={subtitle} />
      {shown.map((item) => (
        <SchemeCard key={item.scheme.id} item={item} />
      ))}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className={`flex min-h-11 items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white p-3 text-[15px] font-semibold text-interaction-links-default ${FOCUS_RING}`}
        >
          Show {hidden} more
          <ChevronDown aria-hidden size={16} />
        </button>
      )}
    </section>
  );
}

function FilterChip({
  label,
  active,
  onOpen,
  onClear,
}: {
  label: string;
  active: boolean;
  onOpen: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onClear: () => void;
}) {
  if (!active) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className={`flex min-h-11 items-center gap-1 rounded-full border border-gray-200 bg-white px-3.5 text-sm font-medium text-gray-800 hover:bg-gray-50 ${FOCUS_RING}`}
      >
        {label}
        <ChevronDown aria-hidden size={16} />
      </button>
    );
  }
  return (
    <span className="flex min-h-11 items-center rounded-full border border-interaction-main-default bg-interaction-main-default text-sm font-medium text-white">
      <button
        type="button"
        onClick={onOpen}
        className={`min-h-11 rounded-l-full pl-3.5 pr-1 ${FOCUS_RING}`}
      >
        {label}
      </button>
      <button
        type="button"
        onClick={onClear}
        aria-label={t("allSchemes.clearFilter", { label })}
        className={`flex min-h-11 min-w-11 items-center justify-center rounded-r-full ${FOCUS_RING}`}
      >
        <X aria-hidden size={16} />
      </button>
    </span>
  );
}

function AllSchemes() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { items, user, isSignedIn, isLoading, catalogError } =
    useSchemeCatalog();
  const answers = useSchemeAnswersStore((state) => state.answers);
  // Typed text lives here so fast typing isn't slowed by URL updates; the URL
  // still gets every change so Back returns to the same list
  const urlQ = params.get("q") ?? "";
  const [q, setQ] = useState(urlQ);
  // Follow the URL when it changes from outside (a link to a different
  // filtered view), but not when it's just catching up with typing
  const lastPushedQ = useRef(urlQ.trim());
  useEffect(() => {
    if (urlQ.trim() !== lastPushedQ.current) {
      lastPushedQ.current = urlQ.trim();
      setQ(urlQ);
    }
  }, [urlQ]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showNotFit, setShowNotFit] = useState(false);
  const chipRef = useRef<HTMLElement | null>(null);

  const areaOptions = useMemo(() => getAreaOptions(items), [items]);
  const fromUrl = useMemo(
    () =>
      parseBrowseQuery(
        params,
        areaOptions.map((option) => option.value),
      ),
    [params, areaOptions],
  );
  const filters: BrowseFilters = { ...fromUrl, q };

  // router.replace so typing and filtering don't fill the history
  const update = (next: BrowseFilters) => {
    setQ(next.q);
    lastPushedQ.current = next.q.trim();
    router.replace(`${pathname}${buildBrowseQuery(next)}`, { scroll: false });
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const name = getRecipientName(user);
  const total = items.length;
  const matching = applyFilters(items, filters);
  const statusFilterSet = filters.status.length > 0;
  const groups = groupByStatus(matching);
  const flat = sortFlat(matching);
  const alsoMatching = getAlsoMatching(items, filters);
  const openQuestions = isSignedIn
    ? getOpenSheetQuestions(items, (id) => isAnswered(answers, id)).length
    : 0;
  const returnTo = `/dashboard/all-schemes${buildBrowseQuery(filters)}`;
  const editProfileHref = `/profile/care-recipient-info/edit?returnTo=${encodeURIComponent(returnTo)}`;

  const openSheet = (event: React.MouseEvent<HTMLButtonElement>) => {
    chipRef.current = event.currentTarget;
    setSheetOpen(true);
  };
  const clearKey = (key: FilterKey) => update({ ...filters, [key]: [] });

  const statusLabel = filters.status
    .map((kind) => STATUS_FILTER_LABELS[kind])
    .join(", ");

  const notFitCards = (list: SchemeWithStatus[]) =>
    list.map((item) => (
      <SchemeCard
        key={item.scheme.id}
        item={item}
        reason={
          item.status.status === "not_a_match"
            ? firstNotMetReason(item)
            : undefined
        }
      />
    ));

  return (
    <div className="flex w-full flex-col gap-4 py-6">
      <BackButton />

      <header className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold leading-[34px] text-gray-800">
          {t("allSchemes.title")}
        </h1>
        <p className="text-sm leading-5 text-gray-600" aria-live="polite">
          {hasActiveFilters(filters)
            ? t("allSchemes.showing", { count: matching.length, total })
            : t("allSchemes.subtitle", { total, name })}
        </p>
      </header>

      {catalogError && (
        <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
          {t("dashboard.catalogError")}
        </p>
      )}

      <div className="relative">
        <label htmlFor="scheme-search" className="sr-only">
          {t("allSchemes.searchLabel")}
        </label>
        <Search
          aria-hidden
          size={18}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600"
        />
        <input
          id="scheme-search"
          type="search"
          value={q}
          onChange={(event) => update({ ...filters, q: event.target.value })}
          placeholder={t("allSchemes.searchPlaceholder")}
          className={`min-h-12 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-12 text-[15px] text-gray-800 placeholder:text-sm placeholder:text-gray-600 [&::-webkit-search-cancel-button]:hidden ${FOCUS_RING}`}
        />
        {q && (
          <button
            type="button"
            onClick={() => update({ ...filters, q: "" })}
            aria-label={t("allSchemes.clearSearch")}
            className={`absolute right-1 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-gray-600 ${FOCUS_RING}`}
          >
            <X aria-hidden size={18} />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label={t("allSchemes.filters")}
        >
          {(["status", "payFor", "area"] as FilterKey[]).map((key) => (
            <FilterChip
              key={key}
              label={chipLabel(key, filters, areaOptions)}
              active={filters[key].length > 0}
              onOpen={openSheet}
              onClear={() => clearKey(key)}
            />
          ))}
        </div>
        {hasActiveFilters(filters) && (
          <button
            type="button"
            onClick={() => update(EMPTY_FILTERS)}
            className={`min-h-11 self-end px-2 text-sm font-semibold text-interaction-links-default ${FOCUS_RING}`}
          >
            {t("allSchemes.clearAll")}
          </button>
        )}
      </div>

      {matching.length === 0 && (
        <div className="flex flex-col items-start gap-2 rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-[15px] text-gray-800">{t("allSchemes.noMatch")}</p>
          <button
            type="button"
            onClick={() => update(EMPTY_FILTERS)}
            className={`min-h-11 text-sm font-semibold text-interaction-links-default ${FOCUS_RING}`}
          >
            {t("allSchemes.clearAll")}
          </button>
        </div>
      )}

      {statusFilterSet ? (
        <>
          {flat.length > 0 && (
            <section className="flex flex-col gap-2.5">
              <h2 className="sr-only">{t("allSchemes.results")}</h2>
              {notFitCards(flat)}
            </section>
          )}
          {alsoMatching.length > 0 && (
            <section className="flex flex-col gap-2.5">
              <GroupHeading
                title={t("allSchemes.alsoMatching", { q: filters.q.trim() })}
                count={alsoMatching.length}
                subtitle={t("allSchemes.notInFilter", { status: statusLabel })}
              />
              {notFitCards(alsoMatching)}
            </section>
          )}
        </>
      ) : (
        <>
          <StatusGroup
            title={t("schemes.status.likely")}
            items={groups.likely}
          />
          <StatusGroup
            title={t("schemes.status.needs_answers")}
            subtitle={
              openQuestions > 0
                ? t("allSchemes.answerToCheckThese", { count: openQuestions })
                : undefined
            }
            items={groups.needs_answers}
          />
          <StatusGroup
            title={t("schemes.status.provider_decides")}
            subtitle={t("allSchemes.checkOfficial")}
            items={groups.provider_decides}
          />
          {groups.not_a_match.length > 0 && (
            <section className="flex flex-col gap-2.5 rounded-xl border border-gray-200 bg-white p-3">
              <button
                type="button"
                aria-expanded={showNotFit}
                onClick={() => setShowNotFit((value) => !value)}
                className={`flex min-h-11 w-full items-start gap-2.5 rounded-lg p-1 text-left ${FOCUS_RING}`}
              >
                <CircleX
                  aria-hidden
                  size={20}
                  className="mt-0.5 shrink-0 text-red-600"
                />
                <span className="flex flex-1 flex-col gap-0.5">
                  <span className="text-[15px] font-semibold text-gray-800">
                    {t("allSchemes.probablyNot", { name })}
                  </span>
                  <span className="text-[13px] leading-[18px] text-gray-600">
                    {t("allSchemes.tapToSeeWhy", {
                      count: groups.not_a_match.length,
                    })}
                  </span>
                </span>
                {showNotFit ? (
                  <ChevronUp aria-hidden size={18} className="text-gray-600" />
                ) : (
                  <ChevronDown
                    aria-hidden
                    size={18}
                    className="text-gray-600"
                  />
                )}
              </button>
              {showNotFit && (
                <>
                  {notFitCards(groups.not_a_match)}
                  <p className="flex items-start gap-2 px-1 text-[13px] leading-[18px] text-gray-600">
                    <Info aria-hidden size={16} className="mt-px shrink-0" />
                    <span>
                      {t("allSchemes.profileOutOfDate")}{" "}
                      <Link
                        href={editProfileHref}
                        className={`font-semibold text-interaction-links-default ${FOCUS_RING}`}
                      >
                        {t("allSchemes.editDetails", {
                          name: possessive(name),
                        })}
                      </Link>
                    </span>
                  </p>
                </>
              )}
            </section>
          )}
        </>
      )}

      <p className="flex items-start gap-2 pb-4 text-xs leading-[18px] text-gray-600">
        <Info aria-hidden size={16} className="shrink-0" />
        <span>
          {t.rich("allSchemes.cantFind", {
            link: (chunks) => (
              <a
                href={COMMUNITY_TELEGRAM_URL}
                target="_blank"
                rel="noreferrer"
                className={`font-semibold text-interaction-links-default underline ${FOCUS_RING}`}
              >
                {chunks}
                <span className="sr-only">{t("allSchemes.telegramSr")}</span>
              </a>
            ),
          })}
        </span>
      </p>

      <FiltersSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        items={items}
        filters={filters}
        areaOptions={areaOptions}
        onApply={update}
        returnFocusRef={chipRef}
      />
    </div>
  );
}

export default function AllSchemesPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AllSchemes />
    </Suspense>
  );
}
