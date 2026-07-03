"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useT } from "@/lib/i18n/useT";
import { useFormatters } from "@/lib/i18n/useFormatters";
import type { H1bState } from "@/lib/h1b";

// ── Dynamic chart imports (ssr:false — charts use canvas) ─────────────────────

function LoadingMini() {
  return (
    <div className="h-48 flex items-center justify-center text-zinc-400 text-xs animate-pulse">
      …
    </div>
  );
}

const StateCountChart = dynamic(() => import("./StateCountChart"), {
  ssr: false,
  loading: () => <LoadingMini />,
});

const StateWageChart = dynamic(() => import("./StateWageChart"), {
  ssr: false,
  loading: () => <LoadingMini />,
});

// ── Sort types ────────────────────────────────────────────────────────────────

type SortKey = "total" | "wage";

// ── Main component ────────────────────────────────────────────────────────────

export interface StateDeepDiveSectionProps {
  states: H1bState[];
  years: number[];
  defaultState?: string;
}

export default function StateDeepDiveSection({
  states,
  years,
  defaultState = "CA",
}: StateDeepDiveSectionProps) {
  const t = useT("visa");
  const { formatNumber, formatCurrency } = useFormatters();

  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [selectedCode, setSelectedCode] = useState<string>(defaultState);

  const sorted = useMemo(() => {
    return [...states].sort((a, b) =>
      sortKey === "wage"
        ? (b.medianWageAnnualLatest ?? 0) - (a.medianWageAnnualLatest ?? 0)
        : b.totalCount - a.totalCount,
    );
  }, [states, sortKey]);

  const selected = useMemo(
    () => states.find((s) => s.state === selectedCode) ?? states[0],
    [states, selectedCode],
  );

  return (
    <div className="space-y-5">
      {/* ── Sort controls + state selector ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
          {t("stateSortLabel")}:
        </span>
        <div
          role="group"
          aria-label={t("stateSortLabel")}
          className="flex rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 text-sm"
        >
          {(["total", "wage"] as SortKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setSortKey(key)}
              aria-pressed={sortKey === key}
              className={`px-3 py-1.5 font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 ${
                sortKey === key
                  ? "bg-violet-600 text-white"
                  : "bg-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {key === "total" ? t("stateSortByTotal") : t("stateSortByWage")}
            </button>
          ))}
        </div>

        <label htmlFor="state-selector" className="sr-only">
          {t("stateSelectorLabel")}
        </label>
        <select
          id="state-selector"
          value={selectedCode}
          onChange={(e) => setSelectedCode(e.target.value)}
          className="ml-auto text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 px-3 py-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          aria-label={t("stateSelectorLabel")}
        >
          {states.map((s) => (
            <option key={s.state} value={s.state}>
              {s.state}
            </option>
          ))}
        </select>
      </div>

      {/* ── Sortable summary table ──────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table
          className="w-full text-sm"
          aria-label={t("statesDeepTableName")}
        >
          <caption className="sr-only">{t("statesDeepTableCaption")}</caption>
          <thead>
            <tr className="text-left text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60">
              <th scope="col" className="py-2 px-3 font-medium w-8">
                #
              </th>
              <th scope="col" className="py-2 px-3 font-medium">
                {t("colState")}
              </th>
              <th scope="col" className="py-2 px-3 font-medium text-right"
                aria-sort={sortKey === "total" ? "descending" : "none"}
              >
                <button
                  type="button"
                  onClick={() => setSortKey("total")}
                  className={`hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 rounded ${sortKey === "total" ? "text-violet-600 dark:text-violet-400 font-semibold" : ""}`}
                >
                  {t("colTotal")}
                </button>
              </th>
              <th scope="col" className="py-2 px-3 font-medium text-right"
                aria-sort={sortKey === "wage" ? "descending" : "none"}
              >
                <button
                  type="button"
                  onClick={() => setSortKey("wage")}
                  className={`hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 rounded ${sortKey === "wage" ? "text-violet-600 dark:text-violet-400 font-semibold" : ""}`}
                >
                  {t("colMedianWage")}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, i) => {
              const isSelected = s.state === selectedCode;
              return (
                <tr
                  key={s.state}
                  onClick={() => setSelectedCode(s.state)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedCode(s.state);
                    }
                  }}
                  tabIndex={0}
                  role="row"
                  aria-selected={isSelected}
                  className={`border-b border-zinc-100 dark:border-zinc-800/60 last:border-0 cursor-pointer transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500 ${
                    isSelected
                      ? "bg-violet-50 dark:bg-violet-500/10"
                      : "hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30"
                  }`}
                >
                  <td className="py-2 px-3 tabular-nums text-zinc-400 text-xs">
                    {i + 1}
                  </td>
                  <th
                    scope="row"
                    className={`py-2 px-3 font-semibold ${isSelected ? "text-violet-700 dark:text-violet-300" : "text-zinc-800 dark:text-zinc-100"}`}
                  >
                    {s.state}
                  </th>
                  <td className="py-2 px-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                    {formatNumber(s.totalCount)}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                    {formatCurrency(s.medianWageAnnualLatest)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Selected state detail ───────────────────────────────────────────── */}
      {selected && (
        <div
          className="rounded-xl border border-violet-200 dark:border-violet-500/25 bg-violet-50/50 dark:bg-violet-500/5 p-5 space-y-5"
          aria-live="polite"
          aria-label={t("stateDetailTitle", { state: selected.state })}
        >
          <h3 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
            {t("stateDetailTitle", { state: selected.state })}
          </h3>

          <div className="grid md:grid-cols-2 gap-5">
            {/* LCA count by year */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                {t("stateDetailCountByYear")}
              </p>
              <StateCountChart
                state={selected.state}
                years={years}
                countByYear={selected.countByYear}
              />
            </div>

            {/* Wage by year (when available) */}
            {selected.wageByYear && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                  {t("stateDetailWageByYear")}
                </p>
                <StateWageChart
                  state={selected.state}
                  years={years}
                  wageByYear={selected.wageByYear}
                />
              </div>
            )}
          </div>

          {/* Top occupations */}
          {selected.topOccupations && selected.topOccupations.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                {t("stateDetailTopOccs")}
              </p>
              <ol className="space-y-1.5">
                {selected.topOccupations.map((occ, idx) => (
                  <li
                    key={occ.socCode}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span className="tabular-nums text-zinc-400 w-4 shrink-0">
                      {idx + 1}.
                    </span>
                    <span className="text-zinc-800 dark:text-zinc-200 flex-1">
                      {occ.socTitle}
                    </span>
                    <span className="tabular-nums text-zinc-600 dark:text-zinc-400 text-xs shrink-0">
                      {formatNumber(occ.count)}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
