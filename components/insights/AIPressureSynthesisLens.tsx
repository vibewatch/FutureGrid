"use client";

import Link from "next/link";
import Reveal from "@/components/ui/Reveal";
import { useLocale, useT } from "@/lib/i18n/useT";
import type { AIPressureSynthesisData } from "@/lib/ai-pressure-synthesis";

interface AIPressureSynthesisLensProps {
  data: AIPressureSynthesisData;
}

type LaneTone = "global" | "talent" | "market";

const TONE_CLASSES: Record<LaneTone, { dot: string; bar: string; chip: string }> = {
  global: {
    dot: "bg-violet-500",
    bar: "from-violet-500 to-fuchsia-400",
    chip: "border-violet-400/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  talent: {
    dot: "bg-cyan-400",
    bar: "from-cyan-400 to-sky-500",
    chip: "border-cyan-400/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  },
  market: {
    dot: "bg-amber-400",
    bar: "from-amber-400 to-orange-500",
    chip: "border-amber-400/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
};

export default function AIPressureSynthesisLens({
  data,
}: AIPressureSynthesisLensProps) {
  const t = useT("analysis");
  const locale = useLocale();
  const numberLocale = locale === "zh" ? "zh-CN" : "en-US";
  const numberFormatter = new Intl.NumberFormat(numberLocale, {
    maximumFractionDigits: 0,
  });
  const decimalFormatter = new Intl.NumberFormat(numberLocale, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  });
  const signedDecimalFormatter = new Intl.NumberFormat(numberLocale, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
    signDisplay: "exceptZero",
  });

  const readinessDetail = data.global.topReadinessGapCountry
    ? t("aiPressureGlobalReadinessDetail", {
        country: data.global.topReadinessGapCountry.name,
        gap: signedDecimalFormatter.format(data.global.topReadinessGapCountry.gap),
      })
    : t("aiPressureUnavailable");
  const topOccupationDetail = data.talent.topOccupation
    ? t("aiPressureTalentTopDetail", {
        soc: data.talent.topOccupation.socCode,
        score: decimalFormatter.format(data.talent.topOccupation.score),
      })
    : t("aiPressureUnavailable");
  const latestLcaValue =
    data.talent.latestH1bFiscalYear == null
      ? "—"
      : `FY${data.talent.latestH1bFiscalYear}`;
  const latestLcaDetail =
    data.talent.latestJobPostingYear == null
      ? t("aiPressureTalentLcaDetail")
      : t("aiPressureTalentLcaPostingDetail", {
          year: data.talent.latestJobPostingYear,
        });
  const topSectorDetail = data.market.topSector
    ? t("aiPressureMarketTopSectorDetail", {
        ticker: data.market.topSector.ticker,
        score: decimalFormatter.format(data.market.topSector.score),
      })
    : t("aiPressureUnavailable");
  const positiveBreadth =
    data.market.positiveBreadth1Y == null
      ? "—"
      : `${numberFormatter.format(data.market.positiveBreadth1Y)} / ${numberFormatter.format(data.market.companyCount)}`;

  return (
    <Reveal>
      <section className="space-y-5" aria-labelledby="ai-pressure-synthesis-title">
        <div className="glass rounded-2xl border border-zinc-200 bg-white/70 p-5 dark:border-zinc-800 dark:bg-zinc-900/50 sm:p-6 xl:p-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-4xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-500 dark:text-violet-300">
                {t("aiPressureEyebrow")}
              </p>
              <h2 id="ai-pressure-synthesis-title" className="mt-1 text-2xl font-extrabold tracking-tight text-gradient sm:text-3xl">
                {t("aiPressureTitle")}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {t("aiPressureSubtitle")}
              </p>
            </div>
            <span className="w-fit rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-300">
              {t("aiPressureBadge")}
            </span>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
            <LaneCard
              tone="global"
              eyebrow={t("aiPressureGlobalEyebrow")}
              title={t("aiPressureGlobalTitle")}
              badge={t("aiPressureGlobalBadge")}
              body={t("aiPressureGlobalBody")}
              freshness={data.global.freshness}
              href={data.global.href}
              linkLabel={t("aiPressureOpenGlobal")}
              metrics={[
                {
                  label: t("aiPressureGlobalCatalogLabel"),
                  value: numberFormatter.format(data.global.modelCount),
                  detail: t("aiPressureGlobalCatalogDetail", {
                    providers: numberFormatter.format(data.global.endpointProviderCount),
                  }),
                  width: ratioWidth(data.global.modelCount, Math.max(350, data.global.modelCount)),
                },
                {
                  label: t("aiPressureGlobalReadinessLabel"),
                  value: numberFormatter.format(data.global.rankableCountries),
                  detail: readinessDetail,
                  width: ratioWidth(data.global.rankableCountries, 200),
                },
              ]}
            />
            <LaneCard
              tone="talent"
              eyebrow={t("aiPressureTalentEyebrow")}
              title={t("aiPressureTalentTitle")}
              badge={t("aiPressureTalentBadge")}
              body={t("aiPressureTalentBody")}
              freshness={data.talent.freshness}
              href={data.talent.href}
              linkLabel={t("aiPressureOpenTalent")}
              metrics={[
                {
                  label: t("aiPressureTalentOccupationsLabel"),
                  value: numberFormatter.format(data.talent.occupationsTracked),
                  detail: t("aiPressureTalentOccupationsDetail"),
                  width: ratioWidth(data.talent.occupationsTracked, 900),
                },
                {
                  label: t("aiPressureTalentLcaLabel"),
                  value: latestLcaValue,
                  detail: latestLcaDetail,
                  width: 72,
                },
                {
                  label: t("aiPressureTalentTopLabel"),
                  value: data.talent.topOccupation?.title ?? "—",
                  detail: topOccupationDetail,
                  width: data.talent.topOccupation
                    ? ratioWidth(data.talent.topOccupation.score, 100)
                    : 0,
                },
              ]}
            />
            <LaneCard
              tone="market"
              eyebrow={t("aiPressureMarketEyebrow")}
              title={t("aiPressureMarketTitle")}
              badge={t("aiPressureMarketBadge")}
              body={t("aiPressureMarketBody")}
              freshness={data.market.freshness}
              href={data.market.href}
              linkLabel={t("aiPressureOpenMarket")}
              secondaryHref={data.market.stockHref}
              secondaryLinkLabel={t("aiPressureOpenStocks")}
              metrics={[
                {
                  label: t("aiPressureMarketSectorLabel"),
                  value: numberFormatter.format(data.market.sectorProxyCount),
                  detail: topSectorDetail,
                  width: ratioWidth(data.market.sectorProxyCount, 11),
                },
                {
                  label: t("aiPressureMarketStockLabel"),
                  value: numberFormatter.format(data.market.companyCount),
                  detail: t("aiPressureMarketStockDetail", {
                    date: data.market.latestStockDate ?? "—",
                    benchmarks: data.market.benchmarkTickers.join(" / ") || "—",
                  }),
                  width: ratioWidth(data.market.companyCount, 50),
                },
                {
                  label: t("aiPressureMarketBreadthLabel"),
                  value: positiveBreadth,
                  detail: t("aiPressureMarketBreadthDetail"),
                  width: data.market.companyCount
                    ? ratioWidth(data.market.positiveBreadth1Y ?? 0, data.market.companyCount)
                    : 0,
                },
              ]}
            />
          </div>

          <div className="mt-5 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300" role="note">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-300">
              {t("aiPressureGuardrailsTitle")}
            </p>
            <ul className="mt-2 grid gap-2 md:grid-cols-2">
              {data.guardrailIds.map((id) => (
                <li key={id} className="flex gap-2">
                  <span aria-hidden="true">•</span>
                  <span>{t(`aiPressureGuardrail_${id}`)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </Reveal>
  );
}

function LaneCard({
  tone,
  eyebrow,
  title,
  badge,
  body,
  freshness,
  href,
  linkLabel,
  secondaryHref,
  secondaryLinkLabel,
  metrics,
}: {
  tone: LaneTone;
  eyebrow: string;
  title: string;
  badge: string;
  body: string;
  freshness: {
    asOf: string;
    source: string;
  };
  href: string;
  linkLabel: string;
  secondaryHref?: string;
  secondaryLinkLabel?: string;
  metrics: Array<{
    label: string;
    value: string;
    detail: string;
    width: number;
  }>;
}) {
  const toneClasses = TONE_CLASSES[tone];
  const t = useT("analysis");

  return (
    <article className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white/60 p-4 dark:border-zinc-800 dark:bg-zinc-950/35">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            <span className={`h-2 w-2 rounded-full ${toneClasses.dot}`} aria-hidden="true" />
            {eyebrow}
          </p>
          <h3 className="mt-2 text-lg font-bold text-zinc-950 dark:text-white">
            {title}
          </h3>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${toneClasses.chip}`}>
          {badge}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {body}
      </p>

      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
        <span className="rounded-full border border-zinc-300 bg-zinc-100/70 px-2.5 py-1 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
          {t("aiPressureFreshnessAsOf", { date: freshness.asOf })}
        </span>
        <span className="rounded-full border border-zinc-300 bg-zinc-100/70 px-2.5 py-1 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
          {t("aiPressureFreshnessSource", { source: freshness.source })}
        </span>
      </div>

      <dl className="mt-4 space-y-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-xl border border-zinc-200 bg-white/60 p-3 dark:border-zinc-800 dark:bg-zinc-900/45">
            <dt className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              {metric.label}
            </dt>
            <dd className="mt-1 truncate text-xl font-extrabold text-gradient tabular-nums">
              {metric.value}
            </dd>
            <dd className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              {metric.detail}
            </dd>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800" aria-hidden="true">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${toneClasses.bar}`}
                style={{ width: `${metric.width}%` }}
              />
            </div>
          </div>
        ))}
      </dl>

      <div className="mt-auto flex flex-wrap gap-3 pt-4 text-sm font-semibold">
        <Link
          href={href}
          className="text-violet-600 underline underline-offset-4 transition-colors hover:text-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 dark:text-violet-300 dark:hover:text-violet-200"
        >
          {linkLabel}
        </Link>
        {secondaryHref && secondaryLinkLabel && (
          <Link
            href={secondaryHref}
            className="text-violet-600 underline underline-offset-4 transition-colors hover:text-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 dark:text-violet-300 dark:hover:text-violet-200"
          >
            {secondaryLinkLabel}
          </Link>
        )}
      </div>
    </article>
  );
}

function ratioWidth(value: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
  return Math.min(100, Math.max(4, (value / max) * 100));
}
