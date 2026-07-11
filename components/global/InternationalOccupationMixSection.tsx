"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { OccupationMixSlim } from "@/lib/international-occupation-mix";
import InternationalOccupationMixChart, {
  type OccupationMixChartCountry,
} from "@/components/global/InternationalOccupationMixChart";
import { SECTION_IDS } from "@/lib/section-anchors";
import { useT } from "@/lib/i18n/useT";

const ISCO_GROUP_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

/** Half-L1 (Bray-Curtis) dissimilarity computed from client-side ISCO shares. */
function computeDissimilarity(
  a: Record<string, number>,
  b: Record<string, number>,
): number {
  let sum = 0;
  for (const k of ISCO_GROUP_KEYS) sum += Math.abs((a[k] ?? 0) - (b[k] ?? 0));
  return sum * 0.5;
}

export interface InternationalOccupationMixSectionProps {
  data: OccupationMixSlim;
}

export default function InternationalOccupationMixSection({
  data,
}: InternationalOccupationMixSectionProps) {
  const t = useT("global");
  const [selectedIso3, setSelectedIso3] = useState<string | null>(null);

  // OccupationMixCountrySlim already carries observationStatuses, noteIndicators,
  // and groupCoverageRatio — all optional on OccupationMixChartCountry as well.
  const countries = data.countries as OccupationMixChartCountry[];

  const dissimilarityToSelected = useMemo<Record<string, number> | undefined>(() => {
    if (!selectedIso3) return undefined;
    const sel = data.countries.find((c) => c.iso3 === selectedIso3);
    if (!sel) return undefined;
    const result: Record<string, number> = {};
    for (const c of data.countries) {
      if (c.iso3 !== selectedIso3) {
        result[c.iso3] = computeDissimilarity(sel.shares, c.shares);
      }
    }
    return result;
  }, [selectedIso3, data.countries]);

  const selectedCountry = selectedIso3
    ? data.countries.find((c) => c.iso3 === selectedIso3) ?? null
    : null;

  const percentFmt = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "percent",
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
    [],
  );

  return (
    <section
      id={SECTION_IDS.workforceStructure}
      className="scroll-mt-24"
      aria-labelledby="workforce-structure-heading"
    >
      {/* ─── Section header ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-600 dark:text-violet-300">
            {t("workforceEyebrow")}
          </p>
          <h2
            id="workforce-structure-heading"
            className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-gradient"
          >
            {t("workforceTitle")}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {t("workforceSubtitle", {
              count: data.countries.length,
              year: data.datasetLatestYear,
            })}
          </p>
        </div>
        <Link
          href="/sources"
          className="shrink-0 text-xs text-zinc-500 hover:text-violet-400 underline underline-offset-2 transition-colors"
        >
          {t("workforceSourcesLink")}
        </Link>
      </div>

      {/* ─── Caveat banner ───────────────────────────────────────────────── */}
      <p className="mt-4 rounded-xl border border-amber-300/40 bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
        {t("workforceCaveat")}
      </p>

      {/* ─── Canonical chart (selection owned here) ─────────────────────── */}
      <div className="mt-6 glass rounded-2xl p-4 sm:p-6">
        <InternationalOccupationMixChart
          countries={countries}
          datasetLatestYear={data.datasetLatestYear}
          classification={data.classification}
          excluded={data.excluded}
          selectedIso3={selectedIso3}
          onSelectCountry={(iso3) =>
            setSelectedIso3((prev) => (prev === iso3 ? null : iso3))
          }
          dissimilarityToSelected={dissimilarityToSelected}
        />
      </div>

      {/* ─── Selected-country drilldown ──────────────────────────────────── */}
      <div
        className="mt-6 rounded-2xl border border-zinc-200 bg-white/55 dark:border-zinc-800 dark:bg-zinc-950/35"
        aria-live="polite"
        aria-atomic="true"
      >
        {selectedCountry ? (
          <div className="p-5 space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                {t("workforceDrilldownHeading", { name: selectedCountry.name })}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedIso3(null)}
                className="text-xs text-zinc-500 hover:text-violet-400 underline underline-offset-2 transition-colors"
                aria-label={t("workforceDrilldownClear", { name: selectedCountry.name })}
              >
                {t("workforceDrilldownClearLabel")}
              </button>
            </div>

            {/* Meta row */}
            <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <div>
                <dt className="inline text-zinc-500">{t("workforceDrilldownYear")}</dt>{" "}
                <dd className="inline font-semibold text-zinc-900 dark:text-white tabular-nums">
                  {selectedCountry.year}
                </dd>
              </div>
              {typeof selectedCountry.groupCoverageRatio === "number" && (
                <div>
                  <dt className="inline text-zinc-500">{t("workforceDrilldownCoverage")}</dt>{" "}
                  <dd className="inline font-semibold text-zinc-900 dark:text-white tabular-nums">
                    {percentFmt.format(selectedCountry.groupCoverageRatio)}
                  </dd>
                </div>
              )}
              {selectedCountry.observationStatuses &&
                selectedCountry.observationStatuses.length > 0 && (
                  <div>
                    <dt className="inline text-zinc-500">
                      {t("workforceDrilldownStatuses")}
                    </dt>{" "}
                    <dd className="inline">
                      {selectedCountry.observationStatuses.map((code) => {
                        const key = `intlOccMixStatus_${code}`;
                        const label = t(key);
                        const resolved = label === key ? code : label;
                        return (
                          <span
                            key={code}
                            className="ml-1 inline-flex items-center rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300"
                          >
                            {code}: {resolved}
                          </span>
                        );
                      })}
                    </dd>
                  </div>
                )}
            </dl>

            {/* ISCO-08 group shares detail table */}
            <div className="overflow-x-auto" tabIndex={0}>
              <table className="min-w-[28rem] text-sm w-full">
                <caption className="sr-only">
                  {t("workforceDrilldownTableCaption", {
                    name: selectedCountry.name,
                    year: selectedCountry.year,
                  })}
                </caption>
                <thead className="text-[10px] uppercase tracking-widest text-zinc-500">
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th scope="col" className="pb-2 pr-4 text-left font-semibold">
                      {t("workforceDrilldownGroup")}
                    </th>
                    <th scope="col" className="pb-2 pr-4 text-left font-semibold">
                      {t("workforceDrilldownLabel")}
                    </th>
                    <th scope="col" className="pb-2 text-right font-semibold">
                      {t("workforceDrilldownShare")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {ISCO_GROUP_KEYS.map((key) => {
                    const share = selectedCountry.shares?.[key] ?? 0;
                    const label =
                      selectedCountry.labels?.[key] ??
                      `${t("intlOccMixGroupPrefix")} ${key}`;
                    return (
                      <tr
                        key={key}
                        className="text-zinc-700 dark:text-zinc-300"
                      >
                        <th
                          scope="row"
                          className="py-2 pr-4 font-bold text-zinc-900 dark:text-white tabular-nums"
                        >
                          {key}
                        </th>
                        <td className="py-2 pr-4">{label}</td>
                        <td className="py-2 text-right tabular-nums">
                          {share > 0 ? percentFmt.format(share) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="px-5 py-4 text-sm text-zinc-500 italic">
            {t("workforceDrilldownNone")}
          </p>
        )}
      </div>

      {/* ─── Provenance / attribution ─────────────────────────────────────── */}
      <div className="mt-5 space-y-2 rounded-xl border border-zinc-200 bg-white/55 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/35 text-xs text-zinc-500 leading-relaxed">
        <p>
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
            {t("workforceAttribution")}
          </span>{" "}
          <a
            href="https://ilostat.ilo.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-500 hover:text-violet-400 underline underline-offset-2 transition-colors"
          >
            ilostat.ilo.org
          </a>
          {" · "}{t("workforceAttributionLicense")}
        </p>
        <p>
          {t("workforcePartialCoverage", {
            count: data.countries.length,
          })}
        </p>
        {data.excluded.length > 0 && (
          <p>
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
              {t("workforceExclusionCaveat")}
            </span>{" "}
            {data.excluded.map((e) => `${e.name}: ${e.reason}`).join("; ")}.
          </p>
        )}
      </div>

      {/* ─── Link to separate US-only occupation exposure ─────────────────── */}
      <p className="mt-4 text-xs leading-relaxed text-zinc-500">
        {t("workforceExposureNote")}{" "}
        <Link
          href="/analysis"
          className="text-violet-500 hover:text-violet-400 underline underline-offset-2 transition-colors"
        >
          {t("workforceExposureLinkText")}
        </Link>
        {" "}{t("workforceExposureNoteAfter")}
      </p>
    </section>
  );
}
