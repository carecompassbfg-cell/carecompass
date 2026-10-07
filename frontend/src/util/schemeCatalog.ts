import {
  CatalogScheme,
  PayForCategory,
  ProfileQuestionId,
  SchemeStatus,
  SchemeStatusKind,
} from "@/types/scheme";
import { t } from "@/i18n";

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
    get label() {
      return t("schemes.payFor.CARE_SERVICES.label");
    },
    get description() {
      return t("schemes.payFor.CARE_SERVICES.description");
    },
    get title() {
      return t("schemes.payFor.CARE_SERVICES.title");
    },
    get pageDescription() {
      return t("schemes.payFor.CARE_SERVICES.pageDescription");
    },
    icon: "cat-care-services",
  },
  [PayForCategory.MONTHLY_PAYOUTS]: {
    get label() {
      return t("schemes.payFor.MONTHLY_PAYOUTS.label");
    },
    get description() {
      return t("schemes.payFor.MONTHLY_PAYOUTS.description");
    },
    get title() {
      return t("schemes.payFor.MONTHLY_PAYOUTS.title");
    },
    get pageDescription() {
      return t("schemes.payFor.MONTHLY_PAYOUTS.pageDescription");
    },
    icon: "cat-monthly-payouts",
  },
  [PayForCategory.HELPER_COSTS]: {
    get label() {
      return t("schemes.payFor.HELPER_COSTS.label");
    },
    get description() {
      return t("schemes.payFor.HELPER_COSTS.description");
    },
    get title() {
      return t("schemes.payFor.HELPER_COSTS.title");
    },
    get pageDescription() {
      return t("schemes.payFor.HELPER_COSTS.pageDescription");
    },
    icon: "cat-helper-costs",
  },
  [PayForCategory.CAREGIVER_COURSES]: {
    get label() {
      return t("schemes.payFor.CAREGIVER_COURSES.label");
    },
    get description() {
      return t("schemes.payFor.CAREGIVER_COURSES.description");
    },
    get title() {
      return t("schemes.payFor.CAREGIVER_COURSES.title");
    },
    get pageDescription() {
      return t("schemes.payFor.CAREGIVER_COURSES.pageDescription");
    },
    icon: "cat-caregiver-courses",
  },
  [PayForCategory.EQUIPMENT_HOME]: {
    get label() {
      return t("schemes.payFor.EQUIPMENT_HOME.label");
    },
    get description() {
      return t("schemes.payFor.EQUIPMENT_HOME.description");
    },
    get title() {
      return t("schemes.payFor.EQUIPMENT_HOME.title");
    },
    get pageDescription() {
      return t("schemes.payFor.EQUIPMENT_HOME.pageDescription");
    },
    icon: "cat-equipment-home",
  },
  [PayForCategory.TRANSPORT]: {
    get label() {
      return t("schemes.payFor.TRANSPORT.label");
    },
    get description() {
      return t("schemes.payFor.TRANSPORT.description");
    },
    get title() {
      return t("schemes.payFor.TRANSPORT.title");
    },
    get pageDescription() {
      return t("schemes.payFor.TRANSPORT.pageDescription");
    },
    icon: "cat-transport",
  },
  [PayForCategory.MEDICAL_BILLS]: {
    get label() {
      return t("schemes.payFor.MEDICAL_BILLS.label");
    },
    get description() {
      return t("schemes.payFor.MEDICAL_BILLS.description");
    },
    get title() {
      return t("schemes.payFor.MEDICAL_BILLS.title");
    },
    get pageDescription() {
      return t("schemes.payFor.MEDICAL_BILLS.pageDescription");
    },
    icon: "cat-medical-bills",
  },
  [PayForCategory.TAX_CPF]: {
    get label() {
      return t("schemes.payFor.TAX_CPF.label");
    },
    get description() {
      return t("schemes.payFor.TAX_CPF.description");
    },
    get title() {
      return t("schemes.payFor.TAX_CPF.title");
    },
    get pageDescription() {
      return t("schemes.payFor.TAX_CPF.pageDescription");
    },
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
    get pillLabel() {
      return t("schemes.question.HOUSEHOLD_INCOME.pillLabel");
    },
    get rowTitle() {
      return t("schemes.question.HOUSEHOLD_INCOME.rowTitle");
    },
    get rowHint() {
      return t("schemes.question.HOUSEHOLD_INCOME.rowHint");
    },
    get summary() {
      return t("schemes.question.HOUSEHOLD_INCOME.summary");
    },
  },
  [ProfileQuestionId.ADL_NEEDS]: {
    get pillLabel() {
      return t("schemes.question.ADL_NEEDS.pillLabel");
    },
    get rowTitle() {
      return t("schemes.question.ADL_NEEDS.rowTitle");
    },
    get rowHint() {
      return t("schemes.question.ADL_NEEDS.rowHint");
    },
    get summary() {
      return t("schemes.question.ADL_NEEDS.summary");
    },
  },
  [ProfileQuestionId.ADL_FULL_HELP]: {
    get pillLabel() {
      return t("schemes.question.ADL_FULL_HELP.pillLabel");
    },
    get rowTitle() {
      return t("schemes.question.ADL_FULL_HELP.rowTitle");
    },
    get rowHint() {
      return t("schemes.question.ADL_FULL_HELP.rowHint");
    },
    get summary() {
      return t("schemes.question.ADL_FULL_HELP.summary");
    },
  },
  [ProfileQuestionId.HAS_FAR]: {
    get pillLabel() {
      return t("schemes.question.HAS_FAR.pillLabel");
    },
    get rowTitle() {
      return t("schemes.question.HAS_FAR.rowTitle");
    },
    get rowHint() {
      return t("schemes.question.HAS_FAR.rowHint");
    },
    get summary() {
      return t("schemes.question.HAS_FAR.summary");
    },
  },
  [ProfileQuestionId.HOUSING_TYPE]: {
    get pillLabel() {
      return t("schemes.question.HOUSING_TYPE.pillLabel");
    },
    get rowTitle() {
      return t("schemes.question.HOUSING_TYPE.rowTitle");
    },
    get rowHint() {
      return t("schemes.question.HOUSING_TYPE.rowHint");
    },
    get summary() {
      return t("schemes.question.HOUSING_TYPE.summary");
    },
  },
  [ProfileQuestionId.LTC_INSURANCE]: {
    get pillLabel() {
      return t("schemes.question.LTC_INSURANCE.pillLabel");
    },
    get rowTitle() {
      return t("schemes.question.LTC_INSURANCE.rowTitle");
    },
    get rowHint() {
      return t("schemes.question.LTC_INSURANCE.rowHint");
    },
    get summary() {
      return t("schemes.question.LTC_INSURANCE.summary");
    },
  },
  [ProfileQuestionId.CARE_RECIPIENT_AGE]: {
    get pillLabel() {
      return t("schemes.question.CARE_RECIPIENT_AGE.pillLabel");
    },
    get rowTitle() {
      return t("schemes.question.CARE_RECIPIENT_AGE.rowTitle");
    },
    get rowHint() {
      return t("schemes.question.CARE_RECIPIENT_AGE.rowHint");
    },
    get summary() {
      return t("schemes.question.CARE_RECIPIENT_AGE.summary");
    },
  },
  [ProfileQuestionId.CARE_RECIPIENT_CITIZENSHIP]: {
    get pillLabel() {
      return t("schemes.question.CARE_RECIPIENT_CITIZENSHIP.pillLabel");
    },
    get rowTitle() {
      return t("schemes.question.CARE_RECIPIENT_CITIZENSHIP.rowTitle");
    },
    get rowHint() {
      return t("schemes.question.CARE_RECIPIENT_CITIZENSHIP.rowHint");
    },
    get summary() {
      return t("schemes.question.CARE_RECIPIENT_CITIZENSHIP.summary");
    },
  },
  [ProfileQuestionId.CARE_RECIPIENT_RESIDENCE]: {
    get pillLabel() {
      return t("schemes.question.CARE_RECIPIENT_RESIDENCE.pillLabel");
    },
    get rowTitle() {
      return t("schemes.question.CARE_RECIPIENT_RESIDENCE.rowTitle");
    },
    get rowHint() {
      return t("schemes.question.CARE_RECIPIENT_RESIDENCE.rowHint");
    },
    get summary() {
      return t("schemes.question.CARE_RECIPIENT_RESIDENCE.summary");
    },
  },
  [ProfileQuestionId.CAREGIVER_CITIZENSHIP]: {
    get pillLabel() {
      return t("schemes.question.CAREGIVER_CITIZENSHIP.pillLabel");
    },
    get rowTitle() {
      return t("schemes.question.CAREGIVER_CITIZENSHIP.rowTitle");
    },
    get rowHint() {
      return t("schemes.question.CAREGIVER_CITIZENSHIP.rowHint");
    },
    get summary() {
      return t("schemes.question.CAREGIVER_CITIZENSHIP.summary");
    },
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
    ? t("schemes.sourceLine.reviewed", { agency: scheme.agency })
    : t("schemes.sourceLine.from", {
        agency: scheme.agency,
        source: SOURCE_LABELS[scheme.source],
      });

// When we last checked a scheme: for Tier 1, the last time every official
// source was read and unchanged (moved by the weekly job); for Tier 2, the
// last weekly Schemes.sg sync
export const getLastChecked = (scheme: CatalogScheme): string | undefined =>
  scheme.tier === 1 ? scheme.lastChecked : scheme.lastRefreshed;

// "30 Sep 2026"; anything that isn't a date is shown as it is
export const formatSchemeDate = (iso: string): string => {
  const date = new Date(iso);
  return isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString(t("common.dateLocale"), {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
};

// Start of the grey line at the foot of the detail page, followed by
// "· Sources: …" (Tier 1) or "· From Schemes.sg" (Tier 2)
export const getLastCheckedText = (scheme: CatalogScheme): string =>
  t("schemes.lastChecked", {
    date: formatSchemeDate(getLastChecked(scheme) ?? ""),
  });
