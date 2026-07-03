"use client";

import Link from "next/link";
import { useId } from "react";
import type { ReadinessGapCountry, ReadinessGapData } from "@/lib/readiness-gap";
import type { Locale } from "@/lib/i18n/types";
import { useLocale, useT } from "@/lib/i18n/useT";

type Translator = ReturnType<typeof useT>;

const LIST_LIMIT = 5;
const PLOT_WIDTH = 680;
const PLOT_HEIGHT = 360;
const PLOT_MARGIN = { top: 24, right: 28, bottom: 54, left: 58 };
const NUMBER_LOCALES: Record<Locale, string> = {
  en: "en-US",
  zh: "zh-CN",
};
const QUADRANT_STYLES: Record<ReadinessGapCountry["quadrant"], { fill: string; stroke: string }> = {
  "adoption-outpacing-readiness": { fill: "rgb(34,211,238)", stroke: "rgb(8,145,178)" },
  "latent-capacity": { fill: "rgb(167,139,250)", stroke: "rgb(124,58,237)" },
  "balanced-leader": { fill: "rgb(52,211,153)", stroke: "rgb(5,150,105)" },
  "balanced-watchlist": { fill: "rgb(161,161,170)", stroke: "rgb(113,113,122)" },
};

function formatNumber(value: number, locale: string, digits = 0): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

function formatGap(value: number, locale: string, unit: string): string {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatNumber(value, locale, 1)} ${unit}`;
}

function formatPercent(value: number, locale: string): string {
  return `${formatNumber(value, locale, 1)}%`;
}

function KpiCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/60 p-4 dark:border-zinc-800 dark:bg-zinc-950/35">
      <dt className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1 text-2xl font-extrabold text-gradient tabular-nums">
        {value}
      </dd>
      <dd className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
        {detail}
      </dd>
    </div>
  );
}

function RankedList({
  title,
  countries,
  t,
  numberLocale,
  gapUnit,
}: {
  title: string;
  countries: ReadinessGapCountry[];
  t: Translator;
  numberLocale: string;
  gapUnit: string;
}) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white/55 p-4 dark:border-zinc-800 dark:bg-zinc-950/35">
      <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{title}</h3>
      {countries.length > 0 ? (
        <ol className="mt-3 space-y-3">
          {countries.slice(0, LIST_LIMIT).map((country) => (
            <li key={country.iso3} className="space-y-1.5">
              <div className="flex items-start justify-between gap-3 text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {country.name}
                </span>
                <span className="shrink-0 font-bold tabular-nums text-violet-600 dark:text-violet-300">
                  {formatGap(country.gap, numberLocale, gapUnit)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-500">
                <span>
                  {t("readinessGapDiffusionLabel")}{" "}
                  <strong className="font-semibold text-zinc-700 dark:text-zinc-300">
                    {formatPercent(country.diffusionPct, numberLocale)}
                  </strong>
                </span>
                <span>
                  {t("readinessGapReadinessLabel")}{" "}
                  <strong className="font-semibold text-zinc-700 dark:text-zinc-300">
                    {formatNumber(country.readinessScore, numberLocale, 1)}
                  </strong>
                </span>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-sm text-zinc-500">{t("readinessGapEmptyList")}</p>
      )}
    </article>
  );
}

function ReadinessScatter({
  countries,
  t,
  numberLocale,
  gapUnit,
}: {
  countries: ReadinessGapCountry[];
  t: Translator;
  numberLocale: string;
  gapUnit: string;
}) {
  const titleId = useId();
  const descId = useId();
  const innerWidth = PLOT_WIDTH - PLOT_MARGIN.left - PLOT_MARGIN.right;
  const innerHeight = PLOT_HEIGHT - PLOT_MARGIN.top - PLOT_MARGIN.bottom;
  const maxDiffusion = Math.max(
    20,
    Math.ceil(Math.max(...countries.map((country) => country.diffusionPct), 0) / 10) * 10,
  );
  const x = (score: number) => PLOT_MARGIN.left + (Math.max(0, Math.min(100, score)) / 100) * innerWidth;
  const y = (diffusionPct: number) =>
    PLOT_MARGIN.top + (1 - Math.max(0, Math.min(maxDiffusion, diffusionPct)) / maxDiffusion) * innerHeight;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/55 p-4 dark:border-zinc-800 dark:bg-zinc-950/35">
      <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
        {t("readinessGapScatterTitle")}
      </h3>
      <div className="mt-3 overflow-x-auto">
        <svg
          role="img"
          aria-label={t("readinessGapScatterAria")}
          aria-describedby={descId}
          viewBox={`0 0 ${PLOT_WIDTH} ${PLOT_HEIGHT}`}
          className="min-w-[36rem] max-w-full"
        >
          <title id={titleId}>{t("readinessGapScatterAria")}</title>
          <desc id={descId}>{t("readinessGapScatterDesc")}</desc>
          <rect width={PLOT_WIDTH} height={PLOT_HEIGHT} rx="18" fill="rgba(24,24,27,0.03)" />
          {[0, 25, 50, 75, 100].map((tick) => (
            <g key={`x-${tick}`}>
              <line
                x1={x(tick)}
                x2={x(tick)}
                y1={PLOT_MARGIN.top}
                y2={PLOT_HEIGHT - PLOT_MARGIN.bottom}
                stroke="currentColor"
                className="text-zinc-200 dark:text-zinc-800"
              />
              <text
                x={x(tick)}
                y={PLOT_HEIGHT - 24}
                textAnchor="middle"
                className="fill-zinc-500 text-[10px]"
              >
                {tick}
              </text>
            </g>
          ))}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const value = maxDiffusion * ratio;
            return (
              <g key={`y-${ratio}`}>
                <line
                  x1={PLOT_MARGIN.left}
                  x2={PLOT_WIDTH - PLOT_MARGIN.right}
                  y1={y(value)}
                  y2={y(value)}
                  stroke="currentColor"
                  className="text-zinc-200 dark:text-zinc-800"
                />
                <text
                  x={PLOT_MARGIN.left - 10}
                  y={y(value) + 4}
                  textAnchor="end"
                  className="fill-zinc-500 text-[10px]"
                >
                  {formatNumber(value, numberLocale, 0)}%
                </text>
              </g>
            );
          })}
          <line
            x1={PLOT_MARGIN.left}
            x2={PLOT_WIDTH - PLOT_MARGIN.right}
            y1={PLOT_HEIGHT - PLOT_MARGIN.bottom}
            y2={PLOT_HEIGHT - PLOT_MARGIN.bottom}
            stroke="currentColor"
            className="text-zinc-400 dark:text-zinc-600"
          />
          <line
            x1={PLOT_MARGIN.left}
            x2={PLOT_MARGIN.left}
            y1={PLOT_MARGIN.top}
            y2={PLOT_HEIGHT - PLOT_MARGIN.bottom}
            stroke="currentColor"
            className="text-zinc-400 dark:text-zinc-600"
          />
          <text
            x={PLOT_MARGIN.left + innerWidth / 2}
            y={PLOT_HEIGHT - 6}
            textAnchor="middle"
            className="fill-zinc-600 text-[11px] font-semibold dark:fill-zinc-400"
          >
            {t("readinessGapXAxis")}
          </text>
          <text
            transform={`translate(16 ${PLOT_MARGIN.top + innerHeight / 2}) rotate(-90)`}
            textAnchor="middle"
            className="fill-zinc-600 text-[11px] font-semibold dark:fill-zinc-400"
          >
            {t("readinessGapYAxis")}
          </text>
          {countries.map((country) => {
            const style = QUADRANT_STYLES[country.quadrant];
            return (
              <circle
                key={country.iso3}
                cx={x(country.readinessScore)}
                cy={y(country.diffusionPct)}
                r={country.quadrant === "balanced-watchlist" ? 4 : 5.5}
                fill={style.fill}
                stroke={style.stroke}
                strokeWidth="1.2"
                opacity={country.quadrant === "balanced-watchlist" ? 0.55 : 0.86}
              >
                <title>
                  {country.name}: {t("readinessGapReadinessLabel")}{" "}
                  {formatNumber(country.readinessScore, numberLocale, 1)}, {t("readinessGapDiffusionLabel")}{" "}
                  {formatPercent(country.diffusionPct, numberLocale)}, {t("readinessGapGapLabel")}{" "}
                  {formatGap(country.gap, numberLocale, gapUnit)}
                </title>
              </circle>
            );
          })}
        </svg>
      </div>
      <ul className="sr-only">
        {countries.map((country) => (
          <li key={country.iso3}>
            {country.name}: {t("readinessGapReadinessLabel")} {formatNumber(country.readinessScore, numberLocale, 1)},{" "}
            {t("readinessGapDiffusionLabel")} {formatPercent(country.diffusionPct, numberLocale)},{" "}
            {t("readinessGapGapLabel")} {formatGap(country.gap, numberLocale, gapUnit)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ReadinessGapLens({ data }: { data: ReadinessGapData }) {
  const t = useT("global");
  const locale = useLocale();
  const numberLocale = NUMBER_LOCALES[locale] ?? NUMBER_LOCALES.en;
  const gapUnit = t("readinessGapGapUnit");
  const headingId = useId();
  const topPositive = data.summary.topAdoptionOutpacingReadiness;
  const topLatent = data.summary.topLatentCapacity;
  const topPositiveDetail = topPositive
    ? `${topPositive.name} · ${formatGap(topPositive.gap, numberLocale, gapUnit)}`
    : t("readinessGapEmptyList");
  const topLatentDetail = topLatent
    ? `${topLatent.name} · ${formatGap(topLatent.gap, numberLocale, gapUnit)}`
    : t("readinessGapEmptyList");

  return (
    <section aria-labelledby={headingId} className="space-y-5">
      <div className="glass p-5 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-500 dark:text-violet-300">
              {t("readinessGapEyebrow")}
            </p>
            <h2 id={headingId} className="mt-1 text-2xl font-extrabold tracking-tight text-gradient sm:text-3xl">
              {t("readinessGapTitle")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {t("readinessGapSubtitle")}
            </p>
            <p className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              <span className="font-semibold text-amber-700 dark:text-amber-300">
                {t("readinessGapCaveatLabel")}
              </span>{" "}
              {t("readinessGapCaveat")}
            </p>
          </div>
          <Link
            href="/sources"
            className="inline-flex shrink-0 rounded-full text-sm font-semibold text-violet-600 underline underline-offset-4 transition-colors hover:text-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 dark:text-violet-300 dark:hover:text-violet-200"
          >
            {t("readinessGapSourcesLink")}
          </Link>
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
          <KpiCard
            label={t("readinessGapRankableLabel")}
            value={formatNumber(data.summary.rankableCountries, numberLocale)}
            detail={t("readinessGapRankableDetail", {
              total: data.summary.totalCountries,
              coverage: formatNumber(data.summary.coveragePct, numberLocale, 1),
            })}
          />
          <KpiCard
            label={t("readinessGapPositiveLabel")}
            value={topPositive?.name ?? "—"}
            detail={topPositiveDetail}
          />
          <KpiCard
            label={t("readinessGapLatentLabel")}
            value={topLatent?.name ?? "—"}
            detail={topLatentDetail}
          />
        </dl>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(22rem,0.8fr)]">
        <ReadinessScatter countries={data.countries} t={t} numberLocale={numberLocale} gapUnit={gapUnit} />
        <div className="grid grid-cols-1 gap-4">
          <RankedList
            title={t("readinessGapAdoptionListTitle")}
            countries={data.adoptionOutpacingReadiness}
            t={t}
            numberLocale={numberLocale}
            gapUnit={gapUnit}
          />
          <RankedList
            title={t("readinessGapLatentListTitle")}
            countries={data.latentCapacity}
            t={t}
            numberLocale={numberLocale}
            gapUnit={gapUnit}
          />
          <RankedList
            title={t("readinessGapBalancedListTitle")}
            countries={data.balancedLeaders}
            t={t}
            numberLocale={numberLocale}
            gapUnit={gapUnit}
          />
        </div>
      </div>
    </section>
  );
}
