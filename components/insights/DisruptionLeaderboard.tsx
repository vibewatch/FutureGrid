"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as d3 from "d3";
import { type DisruptionIndex } from "@/lib/analysis";
import { useT } from "@/lib/i18n/useT";

type Mode = "occupations" | "sectors";

type Row = {
  key: string;
  rank: number;
  name: string;
  score: number;
  code?: string;
  exposure: number;
  empGrowth: number;
  wageGrowth?: number;
  count?: number;
};

function formatPct(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export default function DisruptionLeaderboard({ index }: { index: DisruptionIndex }) {
  const t = useT("analysis");
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("occupations");
  const [limit, setLimit] = useState(10);
  const color = d3.scaleLinear<string>().domain([0, 50, 100]).range(["#22c55e", "#eab308", "#ef4444"]);

  const rows = useMemo<Row[]>(() => {
    if (mode === "occupations") {
      return index.occupations.map((o) => ({ key: o.code, rank: o.rank, name: o.name, score: o.score, code: o.code, exposure: o.exposure, empGrowth: o.empGrowth, wageGrowth: o.wageGrowth }));
    }
    return index.sectors.map((s) => ({ key: s.sector, rank: s.rank, name: s.sector, score: s.score, exposure: s.avgExposure, empGrowth: s.avgEmpGrowth, count: s.occupationCount }));
  }, [index, mode]);

  const visibleRows = rows.slice(0, limit);
  const weightsText = Object.entries(index.weights).map(([key, value]) => `${t(`weight_${key}`)} ${(value * 100).toFixed(0)}%`).join(" · ");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-zinc-200 bg-white/70 p-1 text-xs font-semibold dark:border-zinc-800 dark:bg-zinc-950/40">
          {(["occupations", "sectors"] as const).map((option) => (
            <button key={option} type="button" onClick={() => { setMode(option); setLimit(10); }} aria-pressed={mode === option} className={`rounded-full px-3 py-1.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 ${mode === option ? "brand-grad text-white shadow" : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"}`}>
              {option === "occupations" ? t("toggleOccupations") : t("toggleSectors")}
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-500">{t("leaderboardShowing", { count: visibleRows.length, total: rows.length })}</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <div className="grid grid-cols-[56px_1fr_120px] gap-3 bg-zinc-100/70 px-4 py-3 text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:bg-zinc-900/70">
          <span>{t("rankHeader")}</span><span>{mode === "occupations" ? t("occupationHeader") : t("sectorHeader")}</span><span>{t("scoreHeader")}</span>
        </div>
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {visibleRows.map((row) => (
            <button key={row.key} type="button" onClick={() => row.code && router.push(`/careers/${encodeURIComponent(row.code)}`)} disabled={!row.code} className="grid w-full grid-cols-[56px_1fr_120px] items-center gap-3 px-4 py-3 text-left transition-colors enabled:hover:bg-violet-500/5 disabled:cursor-default">
              <span className="text-sm font-bold text-zinc-500">#{row.rank}</span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-white">{row.name}</span>
                <span className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                  <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">{t("chipExposure", { value: row.exposure.toFixed(1) })}</span>
                  <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">{t("chipEmpGrowth", { value: formatPct(row.empGrowth) })}</span>
                  {row.wageGrowth != null ? <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">{t("chipWageGrowth", { value: formatPct(row.wageGrowth) })}</span> : <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">{t("chipOccupations", { count: row.count ?? 0 })}</span>}
                </span>
              </span>
              <span>
                <span className="mb-1 block text-right text-sm font-bold tabular-nums" style={{ color: color(row.score) }}>{row.score.toFixed(1)}</span>
                <span className="block h-2 rounded-full bg-zinc-200 dark:bg-zinc-800"><span className="block h-2 rounded-full" style={{ width: `${row.score}%`, background: color(row.score) }} /></span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {limit < rows.length && (
        <button type="button" onClick={() => setLimit((n) => Math.min(rows.length, n + 10))} className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-violet-400 hover:text-violet-600 dark:border-zinc-800 dark:text-zinc-300 dark:hover:text-violet-300">
          {t("showMore")}
        </button>
      )}
      <p className="text-xs leading-relaxed text-zinc-500">{t("weightsFootnote", { weights: weightsText })}</p>
    </div>
  );
}
