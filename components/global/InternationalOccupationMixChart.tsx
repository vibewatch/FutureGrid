"use client";

import { useId, useMemo } from "react";
import type { OccupationMixCountrySlim } from "@/lib/international-occupation-mix";
import type { Locale } from "@/lib/i18n/types";
import { useLocale, useT } from "@/lib/i18n/useT";

/**
 * Pure, presentational visualization of harmonized ISCO-08 employment shares.
 *
 * Renders every included country as a 100% stacked horizontal bar across
 * ISCO-08 major groups 1–9 in canonical numeric order — deliberately NOT a
 * ranked leaderboard. All data arrives via serializable props; this component
 * never reads the server helper, holds no country selector of its own, and
 * exposes no absolute employment counts, wages, or AI-related metrics.
 *
 * Country selection is owned by the parent: pass `selectedIso3` to highlight a
 * reference country and `onSelectCountry` to receive drilldown clicks. When a
 * reference country is selected the parent may pass `dissimilarityToSelected`
 * (a descriptive, relative Bray–Curtis distance keyed by ISO3) to surface how
 * different each country's occupation mix is from the reference.
 */

const ISCO_GROUP_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

const NUMBER_LOCALES: Record<Locale, string> = {
  en: "en-US",
  zh: "zh-CN",
};

/**
 * ISCO-08 major-group palette. Colors are ALWAYS paired with the group number
 * (rendered on the segment) and the full label (legend + table), so group
 * identity never relies on color alone.
 */
const GROUP_STYLES: Record<string, { fill: string; text: string; swatch: string }> = {
  "1": { fill: "rgb(124,58,237)", text: "rgb(255,255,255)", swatch: "bg-[rgb(124,58,237)]" },
  "2": { fill: "rgb(37,99,235)", text: "rgb(255,255,255)", swatch: "bg-[rgb(37,99,235)]" },
  "3": { fill: "rgb(8,145,178)", text: "rgb(255,255,255)", swatch: "bg-[rgb(8,145,178)]" },
  "4": { fill: "rgb(13,148,136)", text: "rgb(255,255,255)", swatch: "bg-[rgb(13,148,136)]" },
  "5": { fill: "rgb(22,163,74)", text: "rgb(255,255,255)", swatch: "bg-[rgb(22,163,74)]" },
  "6": { fill: "rgb(202,138,4)", text: "rgb(0,0,0)", swatch: "bg-[rgb(202,138,4)]" },
  "7": { fill: "rgb(234,88,12)", text: "rgb(255,255,255)", swatch: "bg-[rgb(234,88,12)]" },
  "8": { fill: "rgb(219,39,119)", text: "rgb(255,255,255)", swatch: "bg-[rgb(219,39,119)]" },
  "9": { fill: "rgb(120,113,108)", text: "rgb(255,255,255)", swatch: "bg-[rgb(120,113,108)]" },
};

/**
 * Compact, serializable country record consumed by the chart.
 *
 * Extends the server helper's client-safe `OccupationMixCountrySlim` with the
 * caveat fields required by the visual contract (survey status/break flag and
 * coverage ratio). See the integration note at the foot of this file: the slim
 * helper does not yet expose `observationStatuses`, `noteIndicators`, or
 * `groupCoverageRatio`, so the parent must map them from the full
 * `OccupationMixCountry` record when constructing these props.
 */
export interface OccupationMixChartCountry extends OccupationMixCountrySlim {
  /** ILOSTAT observation status codes for the survey year (e.g. "B" = break in series). */
  observationStatuses?: string[];
  /** ILOSTAT note indicators for the survey year (opaque source codes). */
  noteIndicators?: string[];
  /** Fraction (0–1) of national employment covered by ISCO-08 groups 1–9. */
  groupCoverageRatio?: number;
}

export interface InternationalOccupationMixChartProps {
  /** Countries to render. Order is treated as neutral; the chart sorts by name. */
  countries: OccupationMixChartCountry[];
  /** Latest year present in the source dataset (for the coverage caveat). */
  datasetLatestYear: number;
  /** Classification label, e.g. "ISCO-08". */
  classification: string;
  /** Countries excluded from the comparable set, with a plain-language reason. */
  excluded?: { iso3: string; name: string; reason: string }[];
  /** ISO3 of the reference country the parent has selected, if any. */
  selectedIso3?: string | null;
  /** Drilldown callback; when provided, country rows become activatable. */
  onSelectCountry?: (iso3: string) => void;
  /**
   * Descriptive occupation-mix distance (0–1) of each country relative to the
   * selected reference country, keyed by ISO3. Only meaningful — and only
   * shown — when `selectedIso3` is set. Never a ranking.
   */
  dissimilarityToSelected?: Record<string, number>;
  /** Optional wrapper class. */
  className?: string;
}

function makePercentFormatter(locale: string, digits = 1) {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

type Translator = ReturnType<typeof useT>;

/** Human-readable status labels; unknown codes fall back to the raw code. */
function statusLabel(code: string, t: Translator): string {
  const key = `intlOccMixStatus_${code}`;
  const translated = t(key);
  return translated === key ? code : translated;
}

function StatusFlags({
  statuses,
  t,
}: {
  statuses: string[] | undefined;
  t: Translator;
}) {
  if (!statuses || statuses.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {statuses.map((code) => (
        <span
          key={code}
          title={statusLabel(code, t)}
          className="inline-flex items-center rounded-full border border-amber-400/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300"
        >
          {statusLabel(code, t)}
        </span>
      ))}
    </span>
  );
}

export default function InternationalOccupationMixChart({
  countries,
  datasetLatestYear,
  classification,
  excluded = [],
  selectedIso3 = null,
  onSelectCountry,
  dissimilarityToSelected,
  className = "",
}: InternationalOccupationMixChartProps) {
  const t = useT("global");
  const locale = useLocale();
  const numberLocale = NUMBER_LOCALES[locale] ?? NUMBER_LOCALES.en;

  const percentFmt = useMemo(() => makePercentFormatter(numberLocale, 1), [numberLocale]);
  const dissimFmt = useMemo(() => makePercentFormatter(numberLocale, 0), [numberLocale]);

  const descId = useId();
  const legendId = useId();

  // Neutral, deterministic ordering — alphabetical by name, never by any share.
  const rows = useMemo(
    () => [...countries].sort((a, b) => a.name.localeCompare(b.name, numberLocale)),
    [countries, numberLocale],
  );

  const selected = selectedIso3
    ? rows.find((c) => c.iso3 === selectedIso3) ?? null
    : null;
  const showDissimilarity = Boolean(selected && dissimilarityToSelected);

  // Canonical group labels sourced from data (fall back to any row that has them).
  const groupLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const key of ISCO_GROUP_KEYS) {
      const withLabel = rows.find((c) => c.labels?.[key]);
      labels[key] = withLabel?.labels?.[key] ?? `${t("intlOccMixGroupPrefix")} ${key}`;
    }
    return labels;
  }, [rows, t]);

  const interactive = typeof onSelectCountry === "function";

  return (
    <figure className={`space-y-4 ${className}`.trim()}>
      <figcaption className="sr-only">{t("intlOccMixFigureCaption")}</figcaption>

      {/* Legend — color + number + full label, so identity never relies on color */}
      <ul
        id={legendId}
        className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-zinc-600 dark:text-zinc-400"
      >
        {ISCO_GROUP_KEYS.map((key) => (
          <li key={key} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm text-[9px] font-bold text-white ${GROUP_STYLES[key].swatch}`}
            >
              {key}
            </span>
            <span>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">{key}</span>{" "}
              {groupLabels[key]}
            </span>
          </li>
        ))}
      </ul>

      {/* Stacked bars (visual) with accessible country selector rows. */}
      <div className="space-y-3">
        <p id={descId} className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
          {t("intlOccMixChartDesc", { classification })}
        </p>

        <div className="space-y-3">
          {rows.map((country) => {
            const isSelected = country.iso3 === selectedIso3;
            const rowInner = (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                    {country.name}
                  </span>
                  <span className="inline-flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                    <span className="tabular-nums">{country.year}</span>
                    {typeof country.groupCoverageRatio === "number" && (
                      <span className="tabular-nums">
                        {t("intlOccMixCoverageInline", {
                          coverage: percentFmt.format(country.groupCoverageRatio),
                        })}
                      </span>
                    )}
                    <StatusFlags statuses={country.observationStatuses} t={t} />
                    {showDissimilarity && !isSelected && selected && (
                      <span className="tabular-nums text-sky-700 dark:text-sky-300">
                        {t("intlOccMixDissimilarityInline", {
                          value: dissimFmt.format(dissimilarityToSelected?.[country.iso3] ?? 0),
                          reference: selected.name,
                        })}
                      </span>
                    )}
                  </span>
                </div>
                {/* Visual stacked bar is purely decorative; data is in the table below */}
                <div
                  aria-hidden="true"
                  className="mt-1.5 flex h-6 w-full overflow-hidden rounded-md ring-1 ring-inset ring-zinc-200 dark:ring-zinc-800"
                >
                  {ISCO_GROUP_KEYS.map((key) => {
                    const share = country.shares?.[key] ?? 0;
                    if (share <= 0) return null;
                    const style = GROUP_STYLES[key];
                    const widthPct = `${share * 100}%`;
                    return (
                      <div
                        key={key}
                        title={`${key} · ${groupLabels[key]}: ${percentFmt.format(share)}`}
                        style={{ width: widthPct, backgroundColor: style.fill, color: style.text }}
                        className="flex h-full items-center justify-center overflow-hidden text-[10px] font-bold motion-safe:transition-[width] motion-safe:duration-500"
                      >
                        {share >= 0.06 ? key : ""}
                      </div>
                    );
                  })}
                </div>
              </>
            );

            const baseClass =
              "block w-full rounded-lg border p-3 text-left" +
              (isSelected
                ? " border-violet-400/60 bg-violet-500/5 dark:border-violet-500/50"
                : " border-zinc-200 bg-white/55 dark:border-zinc-800 dark:bg-zinc-950/35");

            if (interactive) {
              return (
                <button
                  key={country.iso3}
                  type="button"
                  aria-pressed={isSelected}
                  aria-describedby={descId}
                  onClick={() => onSelectCountry?.(country.iso3)}
                  className={
                    baseClass +
                    " transition-colors hover:border-violet-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
                  }
                >
                  {rowInner}
                </button>
              );
            }

            return (
              <div key={country.iso3} className={baseClass}>
                {rowInner}
              </div>
            );
          })}
        </div>
      </div>

      {/* sr-only textual equivalent of the bars */}
      <ul className="sr-only">
        {rows.map((country) => (
          <li key={country.iso3}>
            {country.name} ({country.year}):{" "}
            {ISCO_GROUP_KEYS.map(
              (key) => `${groupLabels[key]} ${percentFmt.format(country.shares?.[key] ?? 0)}`,
            ).join(", ")}
            .
          </li>
        ))}
      </ul>

      {/* Visible, complete table fallback — country × group shares + caveats */}
      <div className="rounded-2xl border border-zinc-200 bg-white/55 p-4 dark:border-zinc-800 dark:bg-zinc-950/35">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
          {t("intlOccMixTableTitle")}
        </h3>
        <div className="mt-3 overflow-x-auto" tabIndex={0}>
          <table className="min-w-[52rem] text-left text-xs">
            <caption className="sr-only">
              {t("intlOccMixTableCaption", { classification })}
            </caption>
            <thead className="text-[10px] uppercase tracking-widest text-zinc-500">
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th scope="col" className="pb-2 pr-4 font-semibold">
                  {t("intlOccMixColCountry")}
                </th>
                <th scope="col" className="pb-2 pr-3 text-right font-semibold">
                  {t("intlOccMixColYear")}
                </th>
                {ISCO_GROUP_KEYS.map((key) => (
                  <th
                    key={key}
                    scope="col"
                    title={groupLabels[key]}
                    className="pb-2 pr-3 text-right font-semibold"
                  >
                    {key}
                  </th>
                ))}
                <th scope="col" className="pb-2 pr-3 text-right font-semibold">
                  {t("intlOccMixColCoverage")}
                </th>
                <th scope="col" className="pb-2 font-semibold">
                  {t("intlOccMixColStatus")}
                </th>
                {showDissimilarity && (
                  <th scope="col" className="pb-2 pl-3 text-right font-semibold">
                    {t("intlOccMixColDissimilarity")}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {rows.map((country) => {
                const isSelected = country.iso3 === selectedIso3;
                return (
                  <tr
                    key={country.iso3}
                    className={
                      "text-zinc-700 dark:text-zinc-300" +
                      (isSelected ? " bg-violet-500/5" : "")
                    }
                  >
                    <th
                      scope="row"
                      className="py-2.5 pr-4 font-semibold text-zinc-900 dark:text-white"
                    >
                      {country.name}
                    </th>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{country.year}</td>
                    {ISCO_GROUP_KEYS.map((key) => (
                      <td key={key} className="py-2.5 pr-3 text-right tabular-nums">
                        {percentFmt.format(country.shares?.[key] ?? 0)}
                      </td>
                    ))}
                    <td className="py-2.5 pr-3 text-right tabular-nums">
                      {typeof country.groupCoverageRatio === "number"
                        ? percentFmt.format(country.groupCoverageRatio)
                        : "—"}
                    </td>
                    <td className="py-2.5">
                      {country.observationStatuses && country.observationStatuses.length > 0 ? (
                        <StatusFlags statuses={country.observationStatuses} t={t} />
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    {showDissimilarity && (
                      <td className="py-2.5 pl-3 text-right tabular-nums text-sky-700 dark:text-sky-300">
                        {isSelected
                          ? "—"
                          : dissimFmt.format(dissimilarityToSelected?.[country.iso3] ?? 0)}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Caveats — coverage, comparability, break flags, dissimilarity framing */}
        <div className="mt-4 space-y-2 text-[11px] leading-relaxed text-zinc-500">
          <p>
            {t("intlOccMixCaptionShares", {
              classification,
              count: rows.length,
              year: datasetLatestYear,
            })}
          </p>
          {showDissimilarity && selected && (
            <p>{t("intlOccMixCaptionDissimilarity", { reference: selected.name })}</p>
          )}
          {excluded.length > 0 && (
            <p>
              {t("intlOccMixCaptionExcluded")}{" "}
              {excluded.map((e) => e.name).join(", ")}
              {". "}
              {excluded.map((e) => `${e.name}: ${e.reason}`).join("; ")}
              {"."}
            </p>
          )}
        </div>
      </div>
    </figure>
  );
}
