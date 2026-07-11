"use client";

/**
 * WageTierPolarizationLens — client island for the /sectors Workforce Insight.
 *
 * Receives a compact WageTierPolarization prop computed server-side; never
 * imports lib/wage-tier-polarization or any raw data file at runtime.
 */

import { useState } from "react";
import AccessibleChart from "@/components/charts/AccessibleChart";
import DataAsOfBadge from "@/components/ui/DataAsOfBadge";
import GuardrailBadge from "@/components/ui/GuardrailBadge";
import { useT } from "@/lib/i18n/useT";
import { useFormatters } from "@/lib/i18n/useFormatters";
import type { WageTierPolarization, WageTier, ExposureBandId } from "@/lib/wage-tier-polarization";

// ─── Tier color palette ───────────────────────────────────────────────────────

const TIER_COLORS: Record<WageTier["id"], string> = {
  low:    "#6366f1", // indigo-500
  middle: "#8b5cf6", // violet-500
  high:   "#22d3ee", // cyan-400
};

const TIER_BG: Record<WageTier["id"], string> = {
  low:    "bg-indigo-500/10 border-indigo-400/30 text-indigo-700 dark:text-indigo-300",
  middle: "bg-violet-500/10 border-violet-400/30 text-violet-700 dark:text-violet-300",
  high:   "bg-cyan-500/10 border-cyan-400/30 text-cyan-700 dark:text-cyan-300",
};

const BAND_ORDER: ExposureBandId[] = ["minimal", "low", "moderate", "elevated"];

// ─── Component ────────────────────────────────────────────────────────────────

interface WageTierPolarizationLensProps {
  data: WageTierPolarization;
}

type ViewMode = "headcount" | "occupations";

export default function WageTierPolarizationLens({ data }: WageTierPolarizationLensProps) {
  const t = useT("sectors");
  const { formatCurrency, formatNumber } = useFormatters();
  const [viewMode, setViewMode] = useState<ViewMode>("headcount");

  if (!data || data.tiers.length === 0) {
    return (
      <section className="glass rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/50 p-6">
        <p className="text-sm text-zinc-500">{t("wageTierEmptyState")}</p>
      </section>
    );
  }

  const { tiers, summary } = data;
  const gapPp = Math.abs(summary.highMinusLowExposureGap * 100).toFixed(1);

  // Value accessor: employment-weighted mean (headcount) or simple mean (occupations)
  function exposureValue(tier: WageTier): number {
    return viewMode === "headcount" ? tier.weightedMeanExposure : tier.meanExposure;
  }

  const maxExposure = Math.max(...tiers.map(exposureValue), 0.01);

  const tierLabel = (id: WageTier["id"]) => {
    if (id === "low") return t("wageTierTierLow");
    if (id === "middle") return t("wageTierTierMiddle");
    return t("wageTierTierHigh");
  };

  const bandLabel = (id: ExposureBandId): string => {
    if (id === "minimal") return t("wageTierBandMinimal");
    if (id === "low")     return t("wageTierBandLow");
    if (id === "moderate") return t("wageTierBandModerate");
    return t("wageTierBandElevated");
  };

  // ── Accessible table (sr-only) ──────────────────────────────────────────────
  const accessibleTable = (
    <table>
      <caption>{t("wageTierTableCaption")}</caption>
      <thead>
        <tr>
          <th scope="col">{t("wageTierA11yThTier")}</th>
          <th scope="col">{t("wageTierA11yThWageRange")}</th>
          <th scope="col">{t("wageTierA11yThMeanExposure")}</th>
          <th scope="col">{t("wageTierA11yThEmployment")}</th>
          <th scope="col">{t("wageTierA11yThOccupations")}</th>
        </tr>
      </thead>
      <tbody>
        {tiers.map((tier) => (
          <tr key={tier.id}>
            <th scope="row">{tierLabel(tier.id)}</th>
            <td>
              {t("wageTierWageRange", {
                floor: formatCurrency(tier.wageFloor),
                ceiling: formatCurrency(tier.wageCeiling),
              })}
            </td>
            <td>{formatNumber(exposureValue(tier) * 100, 1)}%</td>
            <td>{formatNumber(tier.employment)}</td>
            <td>({tier.occupationCount})</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <section
      aria-labelledby="wage-tier-lens-heading"
      className="glass rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/50 p-6 space-y-5"
    >
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-violet-400/25 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-700 dark:text-violet-300">
              {t("wageTierWorkforceInsight")}
            </span>
            <GuardrailBadge kind="proxy" />
            <DataAsOfBadge datasetId="occupation-snapshot" />
          </div>
          <h2
            id="wage-tier-lens-heading"
            className="text-xl font-semibold text-zinc-900 dark:text-white"
          >
            {t("wageTierLensTitle")}
          </h2>
          <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            {t("wageTierLensSubhead")}
          </p>
        </div>

        {/* Toggle */}
        <div
          role="group"
          aria-label={t("wageTierA11yToggleGroup")}
          className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden shrink-0"
        >
          {(["headcount", "occupations"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              aria-pressed={viewMode === mode}
              className={`px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-inset ${
                viewMode === mode
                  ? "brand-grad text-white"
                  : "bg-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {mode === "headcount" ? t("wageTierToggleHeadcount") : t("wageTierToggleOccupations")}
            </button>
          ))}
        </div>
      </div>

      {/* Gap summary badge */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-300">
          {t("wageTierSummaryGap", { gap: gapPp })}
        </span>
      </div>

      {/* Bar chart */}
      <AccessibleChart
        label={t("wageTierA11yFigureLabel")}
        summary={accessibleTable}
        className="block"
      >
        <div aria-hidden="true" className="space-y-4">
          {tiers.map((tier) => {
            const pct = exposureValue(tier) * 100;
            const barWidth = `${(exposureValue(tier) / maxExposure) * 100}%`;
            const color = TIER_COLORS[tier.id];
            const bg = TIER_BG[tier.id];

            return (
              <div key={tier.id} className="space-y-1.5">
                {/* Tier label + wage range */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${bg}`}
                    >
                      {tierLabel(tier.id)}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {t("wageTierWageRange", {
                        floor: formatCurrency(tier.wageFloor),
                        ceiling: formatCurrency(tier.wageCeiling),
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="font-semibold" style={{ color }}>
                      {t("wageTierLabelExposurePct", { pct: pct.toFixed(1) })}
                    </span>
                    <span>
                      {viewMode === "headcount"
                        ? t("wageTierLabelEmployment", { n: formatNumber(tier.employment) })
                        : t("wageTierLabelOccupations", { n: String(tier.occupationCount) })}
                    </span>
                  </div>
                </div>

                {/* Bar */}
                <div className="h-3 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: barWidth, backgroundColor: color }}
                  />
                </div>

                {/* Band breakdown (exposure band shares within tier) */}
                <div className="flex gap-1 h-1.5 rounded-full overflow-hidden">
                  {tier.bands.map((band) => {
                    const share = viewMode === "headcount"
                      ? band.employmentShare
                      : band.occupationShare;
                    if (share <= 0) return null;
                    return (
                      <div
                        key={band.band}
                        className="h-full"
                        style={{
                          width: `${share * 100}%`,
                          backgroundColor:
                            band.band === "minimal" ? "#6b7280"
                            : band.band === "low"    ? "#f59e0b"
                            : band.band === "moderate" ? "#f97316"
                            : "#ef4444",
                          opacity: 0.65,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Axis label */}
          <p className="text-xs text-zinc-500 dark:text-zinc-400 pt-1">
            {t("wageTierAxisLabel")}
          </p>
        </div>
      </AccessibleChart>

      {/* Band legend */}
      <div className="flex flex-wrap gap-3" aria-hidden="true">
        {[
          { label: t("wageTierBandMinimal"), color: "#6b7280" },
          { label: t("wageTierBandLow"),     color: "#f59e0b" },
          { label: t("wageTierBandModerate"),color: "#f97316" },
          { label: t("wageTierBandElevated"),color: "#ef4444" },
        ].map(({ label, color }) => (
          <span key={label} className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <span
              className="inline-block w-3 h-1.5 rounded-full"
              style={{ backgroundColor: color, opacity: 0.7 }}
            />
            {label}
          </span>
        ))}
      </div>

      {/* Visible tier × band table */}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/55 dark:bg-zinc-950/35">
        <table className="w-full border-collapse text-left text-xs">
          <caption className="sr-only">{t("wageTierTableCaption")}</caption>
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
              <th scope="col" className="px-3 py-2 font-medium">
                {t("wageTierA11yThTier")}
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                {t("wageTierA11yThWageRange")}
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                {viewMode === "headcount"
                  ? t("wageTierA11yThEmployment")
                  : t("wageTierA11yThOccupations")}
              </th>
              {BAND_ORDER.map((b) => (
                <th key={b} scope="col" className="px-3 py-2 font-medium">
                  {bandLabel(b)}
                </th>
              ))}
              <th scope="col" className="px-3 py-2 font-medium">
                {t("wageTierA11yThMeanExposure")}
              </th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((tier) => (
              <tr
                key={tier.id}
                className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60"
              >
                <th
                  scope="row"
                  className="px-3 py-2 font-semibold text-zinc-900 dark:text-white"
                >
                  {tierLabel(tier.id)}
                </th>
                <td className="px-3 py-2 tabular-nums text-zinc-600 dark:text-zinc-300">
                  {t("wageTierWageRange", {
                    floor: formatCurrency(tier.wageFloor),
                    ceiling: formatCurrency(tier.wageCeiling),
                  })}
                </td>
                <td className="px-3 py-2 tabular-nums text-zinc-600 dark:text-zinc-300">
                  {viewMode === "headcount"
                    ? formatNumber(tier.employment)
                    : formatNumber(tier.occupationCount)}
                </td>
                {BAND_ORDER.map((bId) => {
                  const cell = tier.bands.find((c) => c.band === bId);
                  const share = cell
                    ? (viewMode === "headcount" ? cell.employmentShare : cell.occupationShare)
                    : 0;
                  const count = cell
                    ? (viewMode === "headcount" ? cell.employment : cell.occupationCount)
                    : 0;
                  return (
                    <td
                      key={bId}
                      className="px-3 py-2 tabular-nums text-zinc-600 dark:text-zinc-300"
                    >
                      {cell ? (
                        <>
                          <span className="font-medium text-zinc-900 dark:text-white">
                            {formatNumber(share * 100, 1)}%
                          </span>
                          <span className="text-zinc-400">
                            {" "}({formatNumber(count)})
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                  );
                })}
                <td className="px-3 py-2 tabular-nums font-medium text-zinc-900 dark:text-white">
                  {formatNumber(exposureValue(tier) * 100, 1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary prose */}
      <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
        {t("wageTierSummaryText", {
          occupations: String(summary.includedOccupations),
          workers: formatNumber(summary.totalEmployment),
          gap: gapPp,
        })}
      </p>

      {/* Visible caveat + provenance */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/40 px-4 py-3 space-y-1">
        <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          {t("wageTierCaveat")}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          {t("wageTierProvenanceText")}
        </p>
      </div>
    </section>
  );
}
