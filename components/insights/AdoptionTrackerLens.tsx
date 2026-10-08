"use client";

import Link from "next/link";
import TrendLine from "@/components/charts/TrendLine";
import { useT } from "@/lib/i18n/useT";
import type { AdoptionPulseData, IndustryAdoptionRow } from "@/lib/ai-adoption-tracker";

export interface AdoptionExposureRow {
  sector: string;
  adoptionWorkPct: number;
  yoyPp: number | null;
  /** Employment-weighted observed AI exposure, 0–1. */
  observedExposure: number | null;
  timeSavingsPctOfHours: number | null;
}

export interface AdoptionTrackerLensProps {
  pulse: AdoptionPulseData;
  industries: IndustryAdoptionRow[];
  occupations: AdoptionExposureRow[];
  states: { state: string; aiUsePct: number }[];
  caveats: string[];
}

function Delta({ pp }: { pp: number | null }) {
  if (pp == null) return <span className="text-zinc-400">—</span>;
  return (
    <span className={pp >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}>
      <span aria-hidden="true">{pp >= 0 ? "▲" : "▼"}</span> {pp >= 0 ? "+" : "−"}
      {Math.abs(pp).toFixed(1)}pp
    </span>
  );
}

function Bar({ pct, max, className }: { pct: number; max: number; className: string }) {
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-white/5" aria-hidden="true">
      <span className={`block h-full rounded-full ${className}`} style={{ width: `${Math.min(100, (pct / max) * 100)}%` }} />
    </span>
  );
}

const TH = "px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400";

export default function AdoptionTrackerLens({ pulse, industries, occupations, states, caveats }: AdoptionTrackerLensProps) {
  const t = useT("adoption");
  const toPoints = (labels: string[], values: number[]) => labels.map((label, i) => ({ label, value: values[i] }));
  const top = states.slice(0, 5);
  const bottom = states.slice(-5).reverse();

  return (
    <div className="space-y-8">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-[var(--border)] p-4">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{t("workersTitle")}</h3>
          <div className="mt-3">
            <TrendLine
              title={t("workersTitle")}
              series={[
                { name: t("workersSeriesWork"), points: toPoints(pulse.workers.labels, pulse.workers.work) },
                { name: t("workersSeriesAll"), points: toPoints(pulse.workers.labels, pulse.workers.overall) },
              ]}
              yMax={80}
              height={240}
            />
          </div>
          <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">{t("workersSource")}</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] p-4">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{t("firmsTitle")}</h3>
          <div className="mt-3">
            <TrendLine
              title={t("firmsTitle")}
              series={[
                { name: t("firmsSeriesNow"), points: toPoints(pulse.firms.labels, pulse.firms.now) },
                { name: t("firmsSeriesNext"), points: toPoints(pulse.firms.labels, pulse.firms.next6m) },
              ]}
              yMax={40}
              height={240}
            />
          </div>
          <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">{t("firmsSource")}</p>
        </div>
      </div>

      {/* Industry: workers vs firms, separate columns */}
      <div>
        <h3 className="text-base font-semibold text-zinc-900 dark:text-white">{t("industryTitle")}</h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t("industryDesc")}</p>
        <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--bg-subtle)]">
              <tr>
                <th scope="col" className={TH}>{t("colIndustry")}</th>
                <th scope="col" className={`${TH} w-[26%]`}>{t("colWorkers")}</th>
                <th scope="col" className={`${TH} text-right`}>{t("colChange")}</th>
                <th scope="col" className={`${TH} w-[22%]`}>{t("colFirms")}</th>
              </tr>
            </thead>
            <tbody>
              {industries.map((r) => (
                <tr key={r.naics} className="border-t border-[var(--border)]">
                  <th scope="row" className="px-3 py-2 text-left font-medium text-zinc-800 dark:text-zinc-200">
                    {r.industry}
                    <span className="ml-1.5 text-xs font-normal text-zinc-400">{r.naics}</span>
                  </th>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="w-12 shrink-0 text-right tabular-nums font-semibold text-zinc-900 dark:text-white">{r.workerAdoptionPct.toFixed(0)}%</span>
                      <Bar pct={r.workerAdoptionPct} max={100} className="bg-[#2a78d6] dark:bg-[#3987e5]" />
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-xs tabular-nums"><Delta pp={r.workerYoyPp} /></td>
                  <td className="px-3 py-2">
                    {r.firmAiUsePct != null ? (
                      <div className="flex items-center gap-2">
                        <span className="w-12 shrink-0 text-right tabular-nums font-semibold text-zinc-900 dark:text-white">{r.firmAiUsePct.toFixed(0)}%</span>
                        <Bar pct={r.firmAiUsePct} max={100} className="bg-[#eb6834] dark:bg-[#d95926]" />
                      </div>
                    ) : (
                      <span className="text-zinc-400">{t("na")}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        {/* Occupation group: adoption vs observed exposure */}
        <div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-white">{t("occExposureTitle")}</h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t("occExposureDesc")}</p>
          <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--border)]">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--bg-subtle)]">
                <tr>
                  <th scope="col" className={TH}>{t("colGroup")}</th>
                  <th scope="col" className={`${TH} text-right`}>{t("colAdoption")}</th>
                  <th scope="col" className={`${TH} text-right`}>{t("colChange")}</th>
                  <th scope="col" className={`${TH} text-right`}>{t("colExposure")}</th>
                  <th scope="col" className={`${TH} text-right`}>{t("colTimeSavings")}</th>
                </tr>
              </thead>
              <tbody>
                {occupations.map((o) => (
                  <tr key={o.sector} className="border-t border-[var(--border)]">
                    <th scope="row" className="px-3 py-2 text-left font-medium">
                      <Link href={`/sectors/${encodeURIComponent(o.sector)}`} className="text-zinc-800 hover:text-[var(--accent)] dark:text-zinc-200">
                        {o.sector}
                      </Link>
                    </th>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-zinc-900 dark:text-white">{o.adoptionWorkPct.toFixed(0)}%</td>
                    <td className="px-3 py-2 text-right text-xs tabular-nums"><Delta pp={o.yoyPp} /></td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                      {o.observedExposure != null ? `${(o.observedExposure * 100).toFixed(1)}%` : t("na")}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                      {o.timeSavingsPctOfHours != null ? `${o.timeSavingsPctOfHours.toFixed(1)}%` : t("na")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* States */}
        <div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-white">{t("statesTitle")}</h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t("statesDesc")}</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {[
              { label: t("topStates"), rows: top },
              { label: t("bottomStates"), rows: bottom },
            ].map((col) => (
              <div key={col.label} className="rounded-lg border border-[var(--border)] p-3">
                <p className="eyebrow mb-2">{col.label}</p>
                <ol className="space-y-1.5 text-sm">
                  {col.rows.map((r) => (
                    <li key={r.state} className="flex items-center justify-between">
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">{r.state}</span>
                      <span className="tabular-nums text-zinc-700 dark:text-zinc-300">{r.aiUsePct.toFixed(1)}%</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-amber-300/50 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/5 dark:text-amber-200">
            <p className="mb-1 font-semibold">{t("caveatsTitle")}</p>
            <ul className="list-disc space-y-1 pl-4">
              {caveats.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <Link href="/sources" className="mt-2 inline-block font-medium underline underline-offset-2">
              {t("sourcesLink")} →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
