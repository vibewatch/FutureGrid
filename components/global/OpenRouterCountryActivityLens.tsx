"use client";

import Link from "next/link";
import { useId } from "react";
import type {
  OpenRouterCountryActivityCountry,
  OpenRouterCountryActivityData,
} from "@/lib/openrouter-country-activity";
import { SECTION_IDS } from "@/lib/section-anchors";
import type { Locale } from "@/lib/i18n/types";
import { useLocale, useT } from "@/lib/i18n/useT";
import GuardrailBadge from "@/components/ui/GuardrailBadge";

const CHART_LIMIT = 8;
const NUMBER_LOCALES: Record<Locale, string> = {
  en: "en-US",
  zh: "zh-CN",
};

function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
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

function familyList(country: OpenRouterCountryActivityCountry): string {
  return country.topFamilies.length > 0
    ? country.topFamilies
        .slice(0, 3)
        .map((family) => `${family.name} (${family.modelCount})`)
        .join(", ")
    : "—";
}

function OpenRouterBarChart({
  countries,
  numberLocale,
}: {
  countries: OpenRouterCountryActivityCountry[];
  numberLocale: string;
}) {
  const t = useT("global");
  const descId = useId();
  const rows = [...countries]
    .sort(
      (a, b) =>
        b.modelCount - a.modelCount ||
        b.endpointCount - a.endpointCount ||
        a.countryName.localeCompare(b.countryName),
    )
    .slice(0, CHART_LIMIT);
  const maxModels = Math.max(...rows.map((country) => country.modelCount), 1);
  const maxEndpoints = Math.max(...rows.map((country) => country.endpointCount), 1);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/55 p-4 dark:border-zinc-800 dark:bg-zinc-950/35">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
          {t("openRouterCountryActivityChartTitle")}
        </h3>
        <div className="flex flex-wrap gap-3 text-[11px] text-zinc-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-violet-500" aria-hidden="true" />
            {t("openRouterCountryActivityModelsLegend")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan-400" aria-hidden="true" />
            {t("openRouterCountryActivityEndpointsLegend")}
          </span>
        </div>
      </div>

      <p id={descId} className="mb-4 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
        {t("openRouterCountryActivityChartDesc")}
      </p>

      <div
        role="img"
        aria-label={t("openRouterCountryActivityChartAria")}
        aria-describedby={descId}
        className="space-y-4"
      >
        <div aria-hidden="true" className="space-y-4">
          {rows.map((country) => {
            const modelWidth = `${Math.max(4, (country.modelCount / maxModels) * 100)}%`;
            const endpointWidth = `${Math.max(4, (country.endpointCount / maxEndpoints) * 100)}%`;
            return (
              <div key={country.iso3} className="grid gap-2 sm:grid-cols-[9rem_1fr] sm:items-center">
                <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {country.countryName}
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                      <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400" style={{ width: modelWidth }} />
                    </div>
                    <span className="w-16 shrink-0 text-right text-xs font-bold tabular-nums text-violet-600 dark:text-violet-300">
                      {formatNumber(country.modelCount, numberLocale)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-800/80">
                      <div className="h-full rounded-full bg-cyan-400" style={{ width: endpointWidth }} />
                    </div>
                    <span className="w-16 shrink-0 text-right text-[11px] font-semibold tabular-nums text-cyan-700 dark:text-cyan-300">
                      {formatNumber(country.endpointCount, numberLocale)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ol className="sr-only">
        {rows.map((country) => (
          <li key={country.iso3}>
            {country.countryName}: {formatNumber(country.modelCount, numberLocale)}{" "}
            {t("openRouterCountryActivityModelsLegend")},{" "}
            {formatNumber(country.endpointCount, numberLocale)}{" "}
            {t("openRouterCountryActivityEndpointsLegend")}.
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function OpenRouterCountryActivityLens({
  data,
}: {
  data: OpenRouterCountryActivityData;
}) {
  const t = useT("global");
  const locale = useLocale();
  const numberLocale = NUMBER_LOCALES[locale] ?? NUMBER_LOCALES.en;
  const headingId = `${SECTION_IDS.openRouterCountryModelFootprint}-heading`;
  const summary = data.summary;
  const countries = data.countries;

  return (
    <section
      id={SECTION_IDS.openRouterCountryModelFootprint}
      aria-labelledby={headingId}
      className="scroll-mt-24 space-y-5"
    >
      <div className="glass p-5 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-500 dark:text-violet-300">
              {t("openRouterCountryActivityEyebrow")}
            </p>
            <h2 id={headingId} className="mt-1 text-2xl font-extrabold tracking-tight text-gradient sm:text-3xl">
              {t("openRouterCountryActivityTitle")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {t("openRouterCountryActivitySubtitle", { asOf: summary.asOf })}
            </p>
            <p className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              <span className="font-semibold text-amber-700 dark:text-amber-300">
                {t("openRouterCountryActivityCaveatLabel")}
              </span>{" "}
              {t("openRouterCountryActivityCaveat")}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <GuardrailBadge kind="proxy" />
            <Link
              href="/sources"
              className="inline-flex rounded-full text-sm font-semibold text-violet-600 underline underline-offset-4 transition-colors hover:text-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 dark:text-violet-300 dark:hover:text-violet-200"
            >
              {t("openRouterCountryActivitySourcesLink")}
            </Link>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label={t("openRouterCountryActivityModelsSnapshotLabel")}
            value={formatNumber(summary.sourceModelCount, numberLocale)}
            detail={t("openRouterCountryActivityModelsSnapshotDetail", {
              mapped: formatNumber(summary.mappedModelCount, numberLocale),
            })}
          />
          <KpiCard
            label={t("openRouterCountryActivityCountriesMappedLabel")}
            value={formatNumber(summary.countryCount, numberLocale)}
            detail={t("openRouterCountryActivityCountriesMappedDetail", {
              providers: formatNumber(summary.mappedModelProviderCount, numberLocale),
            })}
          />
          <KpiCard
            label={t("openRouterCountryActivityEndpointEntriesLabel")}
            value={formatNumber(summary.sourceEndpointCount, numberLocale)}
            detail={t("openRouterCountryActivityEndpointEntriesDetail", {
              mapped: formatNumber(summary.mappedEndpointCount, numberLocale),
            })}
          />
          <KpiCard
            label={t("openRouterCountryActivityUnknownProvidersLabel")}
            value={formatNumber(summary.unknownProviderCount, numberLocale)}
            detail={t("openRouterCountryActivityUnknownProvidersDetail", {
              models: formatNumber(summary.unknownModelCount, numberLocale),
              endpoints: formatNumber(summary.unknownEndpointCount, numberLocale),
            })}
          />
        </dl>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <OpenRouterBarChart countries={countries} numberLocale={numberLocale} />

        <div className="rounded-2xl border border-zinc-200 bg-white/55 p-4 dark:border-zinc-800 dark:bg-zinc-950/35">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
            {t("openRouterCountryActivityTableTitle")}
          </h3>
          <div className="mt-3 overflow-x-auto" tabIndex={0}>
            <table className="min-w-[52rem] text-left text-xs">
              <thead className="text-[10px] uppercase tracking-widest text-zinc-500">
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th scope="col" className="pb-2 pr-4 font-semibold">{t("openRouterCountryActivityCountryHeader")}</th>
                  <th scope="col" className="pb-2 pr-4 font-semibold">{t("openRouterCountryActivityRegionHeader")}</th>
                  <th scope="col" className="pb-2 pr-4 text-right font-semibold">{t("openRouterCountryActivityModelProvidersHeader")}</th>
                  <th scope="col" className="pb-2 pr-4 text-right font-semibold">{t("openRouterCountryActivityModelsHeader")}</th>
                  <th scope="col" className="pb-2 pr-4 text-right font-semibold">{t("openRouterCountryActivityEndpointProvidersHeader")}</th>
                  <th scope="col" className="pb-2 pr-4 text-right font-semibold">{t("openRouterCountryActivityEndpointsHeader")}</th>
                  <th scope="col" className="pb-2 font-semibold">{t("openRouterCountryActivityTopFamiliesHeader")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {countries.map((country) => (
                  <tr key={country.iso3} className="text-zinc-700 dark:text-zinc-300">
                    <th scope="row" className="py-3 pr-4 font-semibold text-zinc-900 dark:text-white">
                      {country.countryName}
                    </th>
                    <td className="py-3 pr-4">{country.region}</td>
                    <td className="py-3 pr-4 text-right font-semibold tabular-nums">
                      {formatNumber(country.modelProviderCount, numberLocale)}
                    </td>
                    <td className="py-3 pr-4 text-right font-bold tabular-nums text-violet-600 dark:text-violet-300">
                      {formatNumber(country.modelCount, numberLocale)}
                    </td>
                    <td className="py-3 pr-4 text-right font-semibold tabular-nums">
                      {formatNumber(country.endpointProviderCount, numberLocale)}
                    </td>
                    <td className="py-3 pr-4 text-right font-bold tabular-nums text-cyan-700 dark:text-cyan-300">
                      {formatNumber(country.endpointCount, numberLocale)}
                    </td>
                    <td className="py-3 text-zinc-600 dark:text-zinc-400">
                      {familyList(country)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
