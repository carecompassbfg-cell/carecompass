import {
  CatalogScheme,
  PayForCategory,
  ProfileQuestionId,
  SchemeStatus,
  SchemeStatusKind,
} from "@/types/scheme";

export interface SchemeWithStatus {
  scheme: CatalogScheme;
  status: SchemeStatus;
}

interface PayForMeta {
  label: string;
  description: string;
  title: string;
  pageDescription: string;
  icon: string;
}

// Icons live in public/icons/schemes (exported from the Figma design)
export const PAY_FOR_META: Record<PayForCategory, PayForMeta> = {
  [PayForCategory.CARE_SERVICES]: {
    label: "Care services",
    description: "Day care, home care, nursing home fees",
    title: "Paying for care services",
    pageDescription: "Subsidies for day care, home care and nursing homes",
    icon: "cat-care-services",
  },
  [PayForCategory.MONTHLY_PAYOUTS]: {
    label: "Cash support",
    description: "Monthly or one-off cash for caregiving costs",
    title: "Cash support",
    pageDescription: "Monthly or one-off cash for caregiving costs",
    icon: "cat-monthly-payouts",
  },
  [PayForCategory.HELPER_COSTS]: {
    label: "Helper costs",
    description: "Levy and hiring support",
    title: "Paying for a helper",
    pageDescription: "Levy concessions and support for hiring a helper",
    icon: "cat-helper-costs",
  },
  [PayForCategory.CAREGIVER_COURSES]: {
    label: "Caregiver courses",
    description: "Training fees",
    title: "Caregiver courses",
    pageDescription: "Help with fees for caregiving training",
    icon: "cat-caregiver-courses",
  },
  [PayForCategory.EQUIPMENT_HOME]: {
    label: "Equipment and home",
    description: "Mobility aids, home changes",
    title: "Equipment and home changes",
    pageDescription: "Mobility aids, assistive devices and home modifications",
    icon: "cat-equipment-home",
  },
  [PayForCategory.TRANSPORT]: {
    label: "Transport",
    description: "Taxi and transport help",
    title: "Transport",
    pageDescription: "Help getting to appointments and care",
    icon: "cat-transport",
  },
  [PayForCategory.MEDICAL_BILLS]: {
    label: "Medical bills",
    description: "Hospital, clinic, MediSave",
    title: "Paying medical bills",
    pageDescription: "Help with hospital and clinic bills",
    icon: "cat-medical-bills",
  },
  [PayForCategory.TAX_CPF]: {
    label: "Tax and CPF",
    description: "Reliefs and top-ups",
    title: "Tax and CPF",
    pageDescription: "Tax reliefs and CPF top-ups for caregivers",
    icon: "cat-tax-cpf",
  },
};

export const PAY_FOR_ORDER: PayForCategory[] = Object.values(PayForCategory);

export const isPayForCategory = (value: string): value is PayForCategory =>
  (PAY_FOR_ORDER as string[]).includes(value);

// Questions the question sheet can ask, in the order it asks them
// (docs/schemes/tier1-schemes.md, "Questions the sheet needs"). The other
// ProfileQuestionIds are profile fields: signed-out users are asked to sign
// in, signed-in users to update the profile. has_far and housing_type are
// not asked.
export const SHEET_QUESTIONS: ProfileQuestionId[] = [
  // Asked when the profile has no age (onboarding used to save 0)
  ProfileQuestionId.CARE_RECIPIENT_AGE,
  ProfileQuestionId.ADL_NEEDS,
  ProfileQuestionId.ADL_FULL_HELP,
  ProfileQuestionId.HOUSEHOLD_INCOME,
  ProfileQuestionId.LTC_INSURANCE,
];

export const isSheetQuestion = (id: ProfileQuestionId): boolean =>
  SHEET_QUESTIONS.includes(id);

interface QuestionMeta {
  // Label for the amber status pill when this is the first open question
  pillLabel: string;
  // Title and hint for the row in "Can {name} get this?"
  rowTitle: string;
  rowHint: string;
  // Short form used in the summary card
  summary: string;
}

export const QUESTION_META: Record<ProfileQuestionId, QuestionMeta> = {
  [ProfileQuestionId.HOUSEHOLD_INCOME]: {
    pillLabel: "Share income to see your subsidy",
    rowTitle: "Household income",
    rowHint: "Subsidy levels depend on household income per person.",
    summary: "What is your household income?",
  },
  [ProfileQuestionId.ADL_NEEDS]: {
    pillLabel: "Confirm daily-activity needs",
    rowTitle: "Help needed with daily activities",
    rowHint: "Such as bathing, dressing or moving around.",
    summary: "Which daily activities need help?",
  },
  [ProfileQuestionId.ADL_FULL_HELP]: {
    pillLabel: "Confirm how much help is needed",
    rowTitle: "Full help with daily activities",
    rowHint: "Whether someone needs to do at least 3 of them fully.",
    summary: "Is full help needed?",
  },
  [ProfileQuestionId.HAS_FAR]: {
    pillLabel: "Confirm assessment report",
    rowTitle: "Functional Assessment Report",
    rowHint: "A report from a doctor or therapist on daily-activity needs.",
    summary: "Is there a Functional Assessment Report?",
  },
  [ProfileQuestionId.HOUSING_TYPE]: {
    pillLabel: "Share your housing type",
    rowTitle: "Housing type",
    rowHint: "Some schemes depend on the type of home.",
    summary: "What type of home is it?",
  },
  [ProfileQuestionId.LTC_INSURANCE]: {
    pillLabel: "Share insurance cover",
    rowTitle: "Long-term care insurance",
    rowHint: "CareShield Life or ElderShield cover.",
    summary: "Is there CareShield Life or ElderShield cover?",
  },
  [ProfileQuestionId.CARE_RECIPIENT_AGE]: {
    pillLabel: "Share their age to check",
    rowTitle: "Age",
    rowHint: "Some schemes depend on age.",
    summary: "How old are they?",
  },
  [ProfileQuestionId.CARE_RECIPIENT_CITIZENSHIP]: {
    pillLabel: "Sign in to check",
    rowTitle: "Citizenship",
    rowHint: "Sign in and complete the profile to check this.",
    summary: "What is their citizenship?",
  },
  [ProfileQuestionId.CARE_RECIPIENT_RESIDENCE]: {
    pillLabel: "Confirm where they live",
    rowTitle: "Where they live",
    rowHint: "Update your loved one's profile to check this.",
    summary: "Where do they live?",
  },
  [ProfileQuestionId.CAREGIVER_CITIZENSHIP]: {
    pillLabel: "Sign in to check",
    rowTitle: "Your citizenship",
    rowHint: "Sign in and complete the profile to check this.",
    summary: "What is your citizenship?",
  },
};

const STATUS_RANK: Record<SchemeStatusKind, number> = {
  likely: 0,
  needs_answers: 1,
  provider_decides: 2,
  not_a_match: 3,
};

export const BEST_MATCHES_LIMIT = 4;

// Likely and needs-answers schemes: likely first, then Tier 1 before Tier 2,
// otherwise keeping catalog order.
export const sortBestMatches = (
  items: SchemeWithStatus[],
): SchemeWithStatus[] =>
  items
    .map((item, index) => ({ item, index }))
    .filter(
      ({ item }) =>
        item.status.status === "likely" ||
        item.status.status === "needs_answers",
    )
    .sort(
      (a, b) =>
        STATUS_RANK[a.item.status.status] - STATUS_RANK[b.item.status.status] ||
        a.item.scheme.tier - b.item.scheme.tier ||
        a.index - b.index,
    )
    .map(({ item }) => item);

export const pickBestMatches = (
  items: SchemeWithStatus[],
  limit: number = BEST_MATCHES_LIMIT,
): SchemeWithStatus[] => sortBestMatches(items).slice(0, limit);

// Number of schemes per category, leaving out ones that don't match the
// profile so a tile's count equals its category page's "All N". Categories
// with nothing to show are left out.
export const countByCategory = (
  items: SchemeWithStatus[],
): Partial<Record<PayForCategory, number>> => {
  const counts: Partial<Record<PayForCategory, number>> = {};
  for (const { scheme, status } of items) {
    if (status.status === "not_a_match") continue;
    counts[scheme.payFor] = (counts[scheme.payFor] ?? 0) + 1;
  }
  return counts;
};

export const countByStatus = (
  items: SchemeWithStatus[],
): Record<SchemeStatusKind, number> => {
  const counts: Record<SchemeStatusKind, number> = {
    likely: 0,
    needs_answers: 0,
    provider_decides: 0,
    not_a_match: 0,
  };
  for (const { status } of items) {
    counts[status.status] += 1;
  }
  return counts;
};

// Distinct open questions across schemes, in the order they first appear
export const collectQuestions = (
  items: SchemeWithStatus[],
): ProfileQuestionId[] =>
  Array.from(new Set(items.flatMap(({ status }) => status.questionsToAsk)));

// Questions the sheet should ask now: ones that could change a status (asked
// by a scheme that needs answers, not one already ruled out), askable in the
// sheet, and not already answered this session
export const getOpenSheetQuestions = (
  items: SchemeWithStatus[],
  isAnswered: (id: ProfileQuestionId) => boolean,
): ProfileQuestionId[] =>
  collectQuestions(
    items.filter(({ status }) => status.status === "needs_answers"),
  ).filter((id) => isSheetQuestion(id) && !isAnswered(id));

export const SOURCE_LABELS: Record<CatalogScheme["source"], string> = {
  carecompass: "CareCompass",
  schemes_sg: "Schemes.sg",
};

// Meta line on cards and the detail page: agency first, then where the
// information comes from
export const getSourceLine = (scheme: CatalogScheme): string =>
  scheme.source === "carecompass"
    ? `${scheme.agency} · Reviewed by CareCompass`
    : `${scheme.agency} · From ${SOURCE_LABELS[scheme.source]}`;

// When we last checked a Tier 1 scheme against official sources, or when the
// weekly sync last refreshed a Tier 2 scheme
export const getLastUpdated = (scheme: CatalogScheme): string | undefined =>
  scheme.tier === 1 ? scheme.lastChecked : scheme.lastRefreshed;
