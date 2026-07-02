"use client";

import { useMemo } from "react";
import { useT } from "@/lib/i18n/useT";
import {
  getJoltsData,
  getJoltsSource,
  getJoltsLatestNational,
} from "@/lib/jolts";
import JoltsTrendChart    from "./JoltsTrendChart";
import JoltsIndustryChart from "./JoltsIndustryChart";

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Format thousands → e.g. 1670 → "1.67M", 250 → "250K" */
function fmtThousands(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(2)}M`;
  return `${Math.round(v)}K`;
}

/** "YYYY-MM" → "Jan 2025" */
function fmtMonth(yyyymm: string): string {
  const [yr, mo] = yyyymm.split("-");
  if (!yr || !mo) return yyyymm;
  const d = new Date(Number(yr), Number(mo) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// ── Stat card definitions ──────────────────────────────────────────────────────

const STAT_CARDS = [
  { labelKey: "statLayoffs",  metricKey: "LDL", color: "text-red-500    dark:text-red-400"     },
  { labelKey: "statOpenings", metricKey: "JOL", color: "text-violet-600 dark:text-violet-400"  },
  { labelKey: "statHires",    metricKey: "HIL", color: "text-emerald-600 dark:text-emerald-400" },
  { labelKey: "statQuits",    metricKey: "QUL", color: "text-amber-600  dark:text-amber-400"   },
] as const;

// ── Component ──────────────────────────────────────────────────────────────────

export default function PulseView() {
  const t      = useT("pulse");
  const source = useMemo(() => getJoltsSource(), []);
  const data   = useMemo(() => getJoltsData(), []);
  const latest = useMemo(() => getJoltsLatestNational(), []);

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-10">

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <div className="animate-fade-up">
        <h1 className="text-3xl font-bold tracking-tight text-gradient">
          {t("pageHeading")}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1.5 max-w-2xl">
          {t("pageSubhead")}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-zinc-500">
          <span>
            {t("dataSource", { publisher: source.publisher, survey: source.survey })}
          </span>
          <span>{t("generatedAt", { date: data.generatedAt })}</span>
        </div>
      </div>

      {/* ── Snapshot stat cards ─────────────────────────────────────────────── */}
      <section aria-labelledby="snapshot-heading">
        <div className="mb-4">
          <h2
            id="snapshot-heading"
            className="text-xl font-semibold text-zinc-900 dark:text-white"
          >
            {t("sectionSnapshot")}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {t("statLatestMonth", { month: fmtMonth(latest.date) })}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STAT_CARDS.map(({ labelKey, metricKey, color }) => (
            <div
              key={metricKey}
              className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5"
            >
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                {t(labelKey)}
              </p>
              <p className={`text-2xl font-bold ${color}`}>
                {fmtThousands(latest.values[metricKey] ?? 0)}
              </p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-500 mt-0.5">
                {t("statThousands")}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Trend chart ─────────────────────────────────────────────────────── */}
      <section aria-labelledby="trend-heading">
        <div className="mb-4">
          <h2
            id="trend-heading"
            className="text-xl font-semibold text-zinc-900 dark:text-white"
          >
            {t("sectionTrend")}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {t("sectionTrendDesc")}
          </p>
        </div>
        <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
          <JoltsTrendChart />
        </div>
      </section>

      {/* ── Industry chart ───────────────────────────────────────────────────── */}
      <section aria-labelledby="industry-heading">
        <div className="mb-4">
          <h2
            id="industry-heading"
            className="text-xl font-semibold text-zinc-900 dark:text-white"
          >
            {t("sectionIndustry")}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {t("sectionIndustryDesc")}
          </p>
        </div>
        <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
          <JoltsIndustryChart />
        </div>
      </section>

      {/* ── Methodology footnote ────────────────────────────────────────────── */}
      <section
        aria-labelledby="methodology-heading"
        className="border-t border-zinc-200 dark:border-zinc-800 pt-6"
      >
        <h2
          id="methodology-heading"
          className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
        >
          {t("methodologyTitle")}
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-500 max-w-prose">
          {t("methodologyText")}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
          {t("licenseLine", { license: source.license })}
          {source.note ? ` · ${t("sourceNote", { note: source.note })}` : ""}
        </p>
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-xs text-violet-600 dark:text-violet-400 hover:underline"
        >
          {t("learnMore")}
        </a>
      </section>

    </div>
  );
}
