import { Nullable } from "@/types/util";
import { t } from "@/i18n";

const CURRENCY_SYMBOL = "$";

export function formatPrice(price: Nullable<number>) {
  if (price === null) {
    return "-";
  }
  return `${CURRENCY_SYMBOL}${Number.isInteger(price) ? price : price.toFixed(2)}`;
}

export function formatPriceRange(
  minPrice: Nullable<number>,
  maxPrice: Nullable<number>,
) {
  if (minPrice === null && maxPrice === null) {
    return t("price.notAvailable");
  }

  if (minPrice === null) {
    return `${CURRENCY_SYMBOL}${maxPrice!.toFixed(2)}`;
  }

  if (maxPrice === null) {
    return `${CURRENCY_SYMBOL}${minPrice.toFixed(2)}`;
  }

  if (minPrice === maxPrice) {
    return `${CURRENCY_SYMBOL}${minPrice.toFixed(2)}`;
  }

  return `${CURRENCY_SYMBOL}${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}`;
}
