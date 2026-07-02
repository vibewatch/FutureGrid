"use client";

import { useLanguage } from "./LanguageProvider";
import { formatNumber, formatCurrency, formatPercent } from "../utils";

/** Maps app locale codes to BCP-47 locale strings for Intl APIs. */
const LOCALE_MAP: Record<string, string> = {
  en: "en-US",
  zh: "zh-CN",
};

/**
 * Returns locale-aware formatting helpers bound to the active language.
 *
 * All helpers default to the active locale; pass an explicit `localeOverride`
 * to format a single value with a different locale.
 */
export function useFormatters() {
  const { locale } = useLanguage();
  const bcp47 = LOCALE_MAP[locale] ?? "en-US";

  return {
    formatNumber: (n: number, decimals?: number) =>
      formatNumber(n, decimals, bcp47),

    formatCurrency: (n: number) => formatCurrency(n, bcp47),

    formatPercent: (n: number, decimals?: number) =>
      formatPercent(n, decimals),

    formatDate: (
      date: Date | string | number,
      options?: Intl.DateTimeFormatOptions,
    ) =>
      new Intl.DateTimeFormat(bcp47, options).format(
        typeof date === "string" || typeof date === "number"
          ? new Date(date)
          : date,
      ),
  };
}
