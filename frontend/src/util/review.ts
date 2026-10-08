import { ReviewSource, ReviewTargetType } from "@/types/review";
import { TagProps } from "@chakra-ui/react";
import moment from "moment";
import { t } from "@/i18n";
import { useLocaleStore } from "@/stores/locale";

export function mapReviewSource(source: ReviewSource): string {
  switch (source) {
    case ReviewSource.GOOGLE:
      return t("review.source.google");
    case ReviewSource.IN_APP:
      return t("review.source.inApp");
  }
}

export function ReviewTargetTypeToName(type: ReviewTargetType): string {
  switch (type) {
    case ReviewTargetType.DEMENTIA_DAY_CARE:
      return t("review.targetType.dayCare");
    case ReviewTargetType.DEMENTIA_HOME_CARE:
      return t("review.targetType.homeCare");
    case ReviewTargetType.SCHEME:
      return t("review.targetType.scheme");
  }
}

export function ReviewTargetTypeToColorScheme(
  type: ReviewTargetType,
): TagProps["colorScheme"] {
  switch (type) {
    case ReviewTargetType.DEMENTIA_DAY_CARE:
      return "blue";
    case ReviewTargetType.DEMENTIA_HOME_CARE:
      return "green";
    case ReviewTargetType.SCHEME:
      return "purple";
  }
}

// "3 days ago". English keeps moment's wording; Chinese uses the browser's
// built-in wording (e.g. "3天前") so moment's global locale is left alone.
export function formatReviewTime(date: string): string {
  const time = moment.utc(date).local();
  if (useLocaleStore.getState().locale !== "zh") {
    return time.fromNow();
  }
  const format = new Intl.RelativeTimeFormat(t("common.dateLocale"), {
    numeric: "auto",
  });
  const seconds = time.diff(moment(), "seconds");
  const abs = Math.abs(seconds);
  if (abs < 45) return format.format(0, "second");
  if (abs < 45 * 60) return format.format(Math.round(seconds / 60), "minute");
  if (abs < 22 * 3600) return format.format(Math.round(seconds / 3600), "hour");
  const days = Math.round(seconds / 86400);
  const sign = days < 0 ? -1 : 1;
  if (Math.abs(days) < 26) return format.format(days, "day");
  if (Math.abs(days) < 320) {
    return format.format(
      sign * Math.max(1, Math.round(Math.abs(days) / 30)),
      "month",
    );
  }
  return format.format(
    sign * Math.max(1, Math.round(Math.abs(days) / 365)),
    "year",
  );
}
