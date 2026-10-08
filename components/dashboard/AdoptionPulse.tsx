"use client";

import Link from "next/link";
import TrendLine from "@/components/charts/TrendLine";
import { SectionHeader } from "@/components/ui/PageHeader";
import { useT } from "@/lib/i18n/useT";
import type { AdoptionPulseData } from "@/lib/ai-adoption-tracker";

const OCC_ROWS = 8;

export default function AdoptionPulse({ data }: { data: AdoptionPulseData }) {
  const t = useT("adoption");
  const toPoints = (labels: string[], values: number[]) => labels.map((label, i) => ({ label, value: values[i] }));
  const occ = data.occupations.slice(0, OCC_ROWS);
  const occMax = Math.max(...data.occupations.map((o) => o.adoptionWorkPct), 1);

  return (
    <section aria-labelledby="adoption-pulse-heading">
      <SectionHeader
        id="adoption-pulse-heading"
        eyebrow={t("kicker")}
        title={t("title")}
        description={t("description")}
        actions={
          <Link href="/analysis#measured-adoption" className="text-sm font-medium text-[var(--accent)] hover:underline underline-offset-2">
            {t("lensTitle")} →
          </Link>
        }
      />
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{t("workersTitle")}</h3>
          <div className="mt-3">
            <TrendLine
              title={t("workersTitle")}
              series={[
                { name: t("workersSeriesWork"), points: toPoints(data.workers.labels, data.workers.work) },
                { name: t("workersSeriesAll"), points: toPoints(data.workers.labels, data.workers.overall) },
              ]}
              yMax={80}
              height={260}
            />
          </div>
          <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">{t("workersSource")}</p>
        </div>

        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{t("firmsTitle")}</h3>
          <div className="mt-3">
            <TrendLine
              title={t("firmsTitle")}
              series={[
                { name: t("firmsSeriesNow"), points: toPoints(data.firms.labels, data.firms.now) },
                { name: t("firmsSeriesNext"), points: toPoints(data.firms.labels, data.firms.next6m) },
              ]}
              yMax={40}
              height={260}
            />
          </div>
          <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">{t("firmsSource")}</p>
        </div>

        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{t("occTitle")}</h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{t("occDesc")}</p>
          <ul className="mt-3 space-y-2">
            {occ.map((o) => (
              <li key={o.socMajor} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-xs">
                <span className="truncate text-zinc-700 dark:text-zinc-300" title={o.sector}>{o.sector}</span>
                <span className="text-right tabular-nums">
                  <span className="font-semibold text-zinc-900 dark:text-white">{o.adoptionWorkPct.toFixed(0)}%</span>
                  {o.yoyPp != null && (
                    <span className={`ml-1.5 ${o.yoyPp >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
                      {o.yoyPp >= 0 ? "+" : "−"}{Math.abs(o.yoyPp).toFixed(0)}pp
                    </span>
                  )}
                </span>
                <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/5" aria-hidden="true">
                  <span className="block h-full rounded-full bg-[#2a78d6] dark:bg-[#3987e5]" style={{ width: `${(o.adoptionWorkPct / occMax) * 100}%` }} />
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-zinc-500 dark:text-zinc-400">
            {t("workersSource")} · pp {t("occYoy")}
          </p>
        </div>
      </div>
    </section>
  );
}
