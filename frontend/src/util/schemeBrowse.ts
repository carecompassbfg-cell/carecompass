// Search, filters and grouping for /dashboard/all-schemes. Pure functions so
// they can be tested without rendering; the page keeps the state in the URL.

import {
  CatalogScheme,
  PayForCategory,
  SchemeStatusKind,
} from "@/types/scheme";
import {
  PAY_FOR_META,
  PAY_FOR_ORDER,
  SchemeWithStatus,
} from "@/util/schemeCatalog";

export const STATUS_ORDER: SchemeStatusKind[] = [
  "likely",
  "needs_answers",
  "provider_decides",
  "not_a_match",
];

export const STATUS_FILTER_LABELS: Record<SchemeStatusKind, string> = {
  likely: "Likely eligible",
  needs_answers: "Need answers",
  provider_decides: "Check with agency",
  not_a_match: "Not a fit",
};

export const ISLANDWIDE = "islandwide";

export interface BrowseFilters {
  q: string;
  status: SchemeStatusKind[];
  payFor: PayForCategory[];
  // "islandwide" or a district's slug
  area: string[];
}

export const EMPTY_FILTERS: BrowseFilters = {
  q: "",
  status: [],
  payFor: [],
  area: [],
};

export type FilterKey = "status" | "payFor" | "area";

// ---------------------------------------------------------------------------
// Areas
// ---------------------------------------------------------------------------

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const areaKey = (scheme: CatalogScheme): string =>
  scheme.area.kind === "islandwide" ? ISLANDWIDE : slugify(scheme.area.name);

export interface AreaOption {
  value: string;
  label: string;
}

// Islandwide, then each district in the catalogue (A–Z)
export const getAreaOptions = (items: SchemeWithStatus[]): AreaOption[] => {
  const districts = new Map<string, string>();
  for (const { scheme } of items) {
    if (scheme.area.kind === "district") {
      districts.set(areaKey(scheme), scheme.area.name);
    }
  }
  return [
    { value: ISLANDWIDE, label: "Islandwide" },
    ...Array.from(districts, ([value, label]) => ({ value, label })).sort(
      (a, b) => a.label.localeCompare(b.label),
    ),
  ];
};

// ---------------------------------------------------------------------------
// URL query
// ---------------------------------------------------------------------------

const splitList = (value: string | null | undefined): string[] =>
  (value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

// Keeps only known values, in their canonical order, without duplicates
const known = <T extends string>(values: string[], order: readonly T[]): T[] =>
  order.filter((option) => values.includes(option));

export const parseBrowseQuery = (
  params: { get(name: string): string | null },
  areaValues: string[],
): BrowseFilters => ({
  q: (params.get("q") ?? "").trim(),
  status: known(splitList(params.get("status")), STATUS_ORDER),
  payFor: known(splitList(params.get("payFor")), PAY_FOR_ORDER),
  area: known(splitList(params.get("area")), areaValues),
});

// "?q=…&status=…" with empty values left out; "" when nothing is set
export const buildBrowseQuery = (filters: BrowseFilters): string => {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.status.length) params.set("status", filters.status.join(","));
  if (filters.payFor.length) params.set("payFor", filters.payFor.join(","));
  if (filters.area.length) params.set("area", filters.area.join(","));
  const query = params.toString().replace(/%2C/g, ",");
  return query ? `?${query}` : "";
};

export const hasActiveFilters = (filters: BrowseFilters): boolean =>
  Boolean(
    filters.q.trim() ||
      filters.status.length ||
      filters.payFor.length ||
      filters.area.length,
  );

// ---------------------------------------------------------------------------
// Search and filters
// ---------------------------------------------------------------------------

// Every word typed must appear (case-insensitive) in the name, agency,
// summary or "what you get"
export const matchesSearch = (scheme: CatalogScheme, q: string): boolean => {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = [
    scheme.name,
    scheme.agency,
    scheme.summary,
    ...scheme.whatYouGet,
  ]
    .join(" ")
    .toLowerCase();
  return words.every((word) => haystack.includes(word));
};

// Search plus every filter, except the one named in `ignore`
export const matchesFilters = (
  item: SchemeWithStatus,
  filters: BrowseFilters,
  ignore?: FilterKey,
): boolean => {
  const { scheme, status } = item;
  if (!matchesSearch(scheme, filters.q)) return false;
  if (
    ignore !== "status" &&
    filters.status.length &&
    !filters.status.includes(status.status)
  ) {
    return false;
  }
  if (
    ignore !== "payFor" &&
    filters.payFor.length &&
    !filters.payFor.includes(scheme.payFor)
  ) {
    return false;
  }
  if (
    ignore !== "area" &&
    filters.area.length &&
    !filters.area.includes(areaKey(scheme))
  ) {
    return false;
  }
  return true;
};

export const applyFilters = (
  items: SchemeWithStatus[],
  filters: BrowseFilters,
): SchemeWithStatus[] => items.filter((item) => matchesFilters(item, filters));

export interface OptionCounts {
  status: Record<SchemeStatusKind, number>;
  payFor: Record<PayForCategory, number>;
  area: Record<string, number>;
}

// How many schemes each option would show, given the search and the other
// active filters (an option's own group is ignored, so ticking more options
// in one group only ever adds)
export const getOptionCounts = (
  items: SchemeWithStatus[],
  filters: BrowseFilters,
): OptionCounts => {
  const counts: OptionCounts = {
    status: {
      likely: 0,
      needs_answers: 0,
      provider_decides: 0,
      not_a_match: 0,
    },
    payFor: Object.fromEntries(PAY_FOR_ORDER.map((c) => [c, 0])) as Record<
      PayForCategory,
      number
    >,
    area: {},
  };
  for (const item of items) {
    if (matchesFilters(item, filters, "status")) {
      counts.status[item.status.status] += 1;
    }
    if (matchesFilters(item, filters, "payFor")) {
      counts.payFor[item.scheme.payFor] += 1;
    }
    if (matchesFilters(item, filters, "area")) {
      const key = areaKey(item.scheme);
      counts.area[key] = (counts.area[key] ?? 0) + 1;
    }
  }
  return counts;
};

// Categories that appear in the catalogue, most schemes first (ties keep the
// usual category order). The sheet shows the first 4, then "Show all".
export const getPayForOptions = (
  items: SchemeWithStatus[],
): PayForCategory[] => {
  const totals = new Map<PayForCategory, number>();
  for (const { scheme } of items) {
    totals.set(scheme.payFor, (totals.get(scheme.payFor) ?? 0) + 1);
  }
  return PAY_FOR_ORDER.filter((category) => totals.has(category)).sort(
    (a, b) => (totals.get(b) ?? 0) - (totals.get(a) ?? 0),
  );
};

export const PAY_FOR_PREVIEW = 4;

// Chip text: the group name, the one selected option, or "first +n"
export const chipLabel = (
  key: FilterKey,
  filters: BrowseFilters,
  areaOptions: AreaOption[],
): string => {
  const labelFor = (value: string): string => {
    if (key === "status")
      return STATUS_FILTER_LABELS[value as SchemeStatusKind];
    if (key === "payFor") return PAY_FOR_META[value as PayForCategory].label;
    return areaOptions.find((option) => option.value === value)?.label ?? value;
  };
  const selected = filters[key];
  if (!selected.length) {
    return { status: "Status", payFor: "Helps pay for", area: "Area" }[key];
  }
  const first = labelFor(selected[0]);
  return selected.length === 1 ? first : `${first} +${selected.length - 1}`;
};

// ---------------------------------------------------------------------------
// Sorting and grouping
// ---------------------------------------------------------------------------

// Tier 1 first, then by name
export const sortSchemes = (items: SchemeWithStatus[]): SchemeWithStatus[] =>
  [...items].sort(
    (a, b) =>
      a.scheme.tier - b.scheme.tier ||
      a.scheme.name.localeCompare(b.scheme.name),
  );

export type BrowseGroups = Record<SchemeStatusKind, SchemeWithStatus[]>;

// Results grouped by status when no status filter is set
export const groupByStatus = (items: SchemeWithStatus[]): BrowseGroups => {
  const groups: BrowseGroups = {
    likely: [],
    needs_answers: [],
    provider_decides: [],
    not_a_match: [],
  };
  for (const item of items) groups[item.status.status].push(item);
  for (const kind of STATUS_ORDER) groups[kind] = sortSchemes(groups[kind]);
  return groups;
};

// Flat list when a status filter is set: by status, then Tier 1, then name
export const sortFlat = (items: SchemeWithStatus[]): SchemeWithStatus[] =>
  [...items].sort(
    (a, b) =>
      STATUS_ORDER.indexOf(a.status.status) -
        STATUS_ORDER.indexOf(b.status.status) ||
      a.scheme.tier - b.scheme.tier ||
      a.scheme.name.localeCompare(b.scheme.name),
  );

// With a status filter and search text: search matches (with the other
// filters) whose status isn't selected
export const getAlsoMatching = (
  items: SchemeWithStatus[],
  filters: BrowseFilters,
): SchemeWithStatus[] => {
  if (!filters.q.trim() || !filters.status.length) return [];
  return sortFlat(
    items.filter(
      (item) =>
        !filters.status.includes(item.status.status) &&
        matchesFilters(item, filters, "status"),
    ),
  );
};

// First "not met" reason as plain text (reasons can hold a markdown link)
export const firstNotMetReason = (item: SchemeWithStatus): string | undefined =>
  item.status.reasonsNotMet[0]?.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
