"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useT } from "@/lib/i18n/useT";
import { useFormatters } from "@/lib/i18n/useFormatters";
import type { H1bEmployer } from "@/lib/h1b";

// ── Sparkline (inline SVG bars, one per fiscal year) ─────────────────────────

function Sparkline({
  countByYear,
  years,
}: {
  countByYear: Record<string, number>;
  years: string[];
}) {
  const values = years.map((y) => countByYear[y] ?? 0);
  const max = Math.max(...values, 1);
  const BAR_W = 4;
  const GAP = 1;
  const H = 20;
  const W = years.length * (BAR_W + GAP) - GAP;

  return (
    <svg
      width={W}
      height={H}
      aria-hidden="true"
      focusable="false"
      className="text-violet-500 dark:text-violet-400"
    >
      {values.map((v, i) => {
        const barH = Math.max(1, Math.round((v / max) * H));
        return (
          <rect
            key={years[i]}
            x={i * (BAR_W + GAP)}
            y={H - barH}
            width={BAR_W}
            height={barH}
            fill="currentColor"
            opacity={0.75}
          />
        );
      })}
    </svg>
  );
}

// ── Dynamic bar chart for top employers ──────────────────────────────────────

function LoadingBar() {
  return (
    <div className="h-16 flex items-center justify-center text-zinc-400 text-xs">…</div>
  );
}

const EmployersChart = dynamic(() => import("./EmployersChart"), {
  ssr: false,
  loading: () => <LoadingBar />,
});

// ── Main component ────────────────────────────────────────────────────────────

const PAGE_SIZE = 15;

export interface EmployerDeepDiveSectionProps {
  employers: H1bEmployer[];
  years: number[];
}

export default function EmployerDeepDiveSection({
  employers,
  years,
}: EmployerDeepDiveSectionProps) {
  const t = useT("visa");
  const { formatNumber, formatCurrency } = useFormatters();
  const [expanded, setExpanded] = useState(false);

  const yearStrings = useMemo(() => years.map(String), [years]);
  const visible = expanded ? employers : employers.slice(0, PAGE_SIZE);
  const hasMore = employers.length > PAGE_SIZE;

  // For the bar chart: top 15 by volume (EmployersChart already accepts this shape)
  const top15 = useMemo(() => employers.slice(0, PAGE_SIZE), [employers]);

  return (
    <div className="space-y-5">
      {/* Bar chart (top 15) */}
      <EmployersChart employers={top15} />

      {/* Accessible table with sparklines and mean wage — relative makes this div the
          containing block for any position:absolute descendants (e.g. sr-only spans),
          so they are clipped by overflow-x-auto and cannot escape into document scroll area */}
      <div className="relative overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800" tabIndex={0}>
        <table
          className="w-full text-sm"
          aria-label={t("employerDeepTableName")}
        >
          <caption className="sr-only">{t("employerDeepTableCaption")}</caption>
          <thead>
            <tr className="text-left text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60">
              <th scope="col" className="py-2 px-3 font-medium w-8">
                #
              </th>
              <th scope="col" className="py-2 px-3 font-medium">
                {t("colEmployer")}
              </th>
              <th scope="col" className="py-2 px-3 font-medium text-right">
                {t("colTotal")}
              </th>
              <th scope="col" className="py-2 px-3 font-medium text-right">
                {t("colMeanWage")}
              </th>
              <th scope="col" className="py-2 px-3 font-medium text-center">
                {t("colYearTrend")}
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((emp, i) => (
              <tr
                key={emp.employer}
                className="border-b border-zinc-100 dark:border-zinc-800/60 last:border-0 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors"
              >
                <td className="py-2 px-3 tabular-nums text-zinc-400 text-xs">
                  {i + 1}
                </td>
                <th
                  scope="row"
                  className="py-2 px-3 font-medium text-zinc-800 dark:text-zinc-100 max-w-xs"
                >
                  {emp.employer}
                </th>
                <td className="py-2 px-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {formatNumber(emp.totalCount)}
                </td>
                <td className="py-2 px-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {emp.meanWageAnnual != null ? formatCurrency(emp.meanWageAnnual) : "—"}
                </td>
                <td className="py-2 px-3 flex justify-center items-center">
                  <Sparkline countByYear={emp.countByYear} years={yearStrings} />
                  {/* sr-only trend summary */}
                  <span className="sr-only [white-space:normal]">
                    {yearStrings
                      .map((y) => `FY${y}: ${formatNumber(emp.countByYear[y] ?? 0)}`)
                      .join(", ")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Show more / less toggle */}
      {hasMore && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-sm text-violet-600 dark:text-violet-400 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 rounded px-2 py-1"
            aria-expanded={expanded}
            aria-controls="employer-table-body"
          >
            {expanded
              ? t("employerShowLess")
              : t("employerShowMore", { n: String(employers.length) })}
          </button>
        </div>
      )}
    </div>
  );
}
