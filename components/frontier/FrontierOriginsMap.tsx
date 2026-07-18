"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import * as d3 from "d3";
import type { GeoPermissibleObjects, ExtendedFeatureCollection } from "d3-geo";
import {
  getCountryLeaderboardGeo,
  getCountryGeoCoverage,
  type CountryGeoEntry,
} from "@/lib/ai-frontier";
import { useT } from "@/lib/i18n/useT";

// ── Constants ──────────────────────────────────────────────────────────────────

const W = 960;
const H = 480;

// Inlined at build time from next.config env block; empty string on localhost.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// No-data fill (countries with no tracked records).
const NO_DATA_FILL_DARK = "#27272a"; // zinc-800
const NO_DATA_FILL_LIGHT = "#e4e4e7"; // zinc-200
const OUTLINE_DARK = "rgba(255,255,255,0.10)";
const OUTLINE_LIGHT = "rgba(0,0,0,0.12)";

// Sequential single-hue VIOLET ramp (perceptually ordered, colorblind-safe).
// Dark low→high and light low→high stops per token spec.
const VIOLET_RAMP_DARK = ["#1e1b3a", "#6d4bd8", "#a78bfa", "#c4b5fd"];
const VIOLET_RAMP_LIGHT = ["#ede9fe", "#c4b5fd", "#8b5cf6", "#6d28d9"];

// Map metric set: recentCount default, modelCount, openWeightsCount ONLY.
// NEVER compute/frontier metrics here.
type MapMetric = "recentCount" | "modelCount" | "openWeightsCount";

const MAP_METRICS: MapMetric[] = ["recentCount", "modelCount", "openWeightsCount"];

const MAP_METRIC_I18N: Record<MapMetric, string> = {
  recentCount: "metricRecentCount",
  modelCount: "metricModelCount",
  openWeightsCount: "metricOpenWeightsCount",
};

function metricValue(entry: CountryGeoEntry, metric: MapMetric): number {
  if (metric === "modelCount") return entry.modelCount;
  if (metric === "openWeightsCount") return entry.openWeightsCount;
  return entry.recentCount;
}

// ── Geometry types ──────────────────────────────────────────────────────────────

interface GeoFeature {
  id: string;
  type: string;
  properties: { name: string };
  geometry: unknown;
}

interface GeoData {
  type: "FeatureCollection";
  features: GeoFeature[];
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  name: string;
  value: number;
}

const EMPTY_TOOLTIP: TooltipState = {
  visible: false,
  x: 0,
  y: 0,
  name: "",
  value: 0,
};

export default function FrontierOriginsMap() {
  const t = useT("frontier");
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const isDark = (resolvedTheme ?? "dark") !== "light";

  const [metric, setMetric] = useState<MapMetric>("recentCount");
  const [geoData, setGeoData] = useState<GeoData | null>(null);
  const [entered, setEntered] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState>(EMPTY_TOOLTIP);

  // ── Data (geo-safe projection: full-catalog metrics only) ─────────────────
  const geoEntries = useMemo(() => getCountryLeaderboardGeo(), []);
  const coverage = useMemo(() => getCountryGeoCoverage(), []);

  const dataByIso3 = useMemo(() => {
    const map = new Map<string, CountryGeoEntry>();
    for (const e of geoEntries) map.set(e.iso3, e);
    return map;
  }, [geoEntries]);

  // ── Fetch world geometry once on mount (runtime, BASE_PATH aware) ─────────
  useEffect(() => {
    let cancelled = false;
    fetch(`${BASE_PATH}/world-countries.geo.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<GeoData>;
      })
      .then((d) => {
        if (!cancelled) setGeoData(d);
      })
      .catch(() => {
        /* leave geoData null → the accessible table still renders */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── prefers-reduced-motion ─────────────────────────────────────────────────
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduceMotion(mq.matches);
    const id = requestAnimationFrame(onChange);
    mq.addEventListener("change", onChange);
    return () => {
      cancelAnimationFrame(id);
      mq.removeEventListener("change", onChange);
    };
  }, []);

  // ── Soft entrance (CSS transition disabled under reduced motion) ──────────
  useEffect(() => {
    if (!geoData) return;
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [geoData]);

  // ── Domain + sequential violet color scale keyed to selected metric ───────
  const maxValue = useMemo(() => {
    let max = 0;
    for (const e of geoEntries) {
      const v = metricValue(e, metric);
      if (v > max) max = v;
    }
    return max;
  }, [geoEntries, metric]);

  const colorScale = useMemo(() => {
    const ramp = d3.interpolateRgbBasis(
      isDark ? VIOLET_RAMP_DARK : VIOLET_RAMP_LIGHT,
    );
    return d3.scaleSequential([0, maxValue > 0 ? maxValue : 1], ramp);
  }, [isDark, maxValue]);

  const noDataFill = isDark ? NO_DATA_FILL_DARK : NO_DATA_FILL_LIGHT;
  const outline = isDark ? OUTLINE_DARK : OUTLINE_LIGHT;

  // ── Path generation ────────────────────────────────────────────────────────
  const pathGen = useMemo(() => {
    if (!geoData) return null;
    const proj = d3
      .geoNaturalEarth1()
      .fitSize([W, H], geoData as unknown as ExtendedFeatureCollection);
    return d3.geoPath().projection(proj);
  }, [geoData]);

  const countryPaths = useMemo(() => {
    if (!geoData || !pathGen) return [];
    return geoData.features.map((feature) => {
      const iso3 = feature.id;
      const entry = dataByIso3.get(iso3) ?? null;
      const value = entry ? metricValue(entry, metric) : null;
      const dStr = pathGen(feature as unknown as GeoPermissibleObjects) ?? "";
      const fill = value != null ? colorScale(value) : noDataFill;
      return {
        iso3,
        name: entry?.countryShort ?? feature.properties?.name ?? iso3,
        value,
        d: dStr,
        fill,
      };
    });
  }, [geoData, pathGen, dataByIso3, metric, colorScale, noDataFill]);

  // ── Accessible table rows (sorted by selected metric desc) ────────────────
  const tableRows = useMemo(
    () =>
      geoEntries
        .map((e) => ({ name: e.countryShort, value: metricValue(e, metric) }))
        .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name)),
    [geoEntries, metric],
  );

  const isEmpty = geoEntries.length === 0 || maxValue === 0;

  // ── Legend gradient stops ──────────────────────────────────────────────────
  const legendStops = useMemo(() => {
    const ramp = d3.interpolateRgbBasis(
      isDark ? VIOLET_RAMP_DARK : VIOLET_RAMP_LIGHT,
    );
    return [0, 0.25, 0.5, 0.75, 1].map((s) => ramp(s));
  }, [isDark]);

  // ── Tooltip (hover-only, non-focusable — mouse/pointer position) ──────────
  function handleMove(e: React.MouseEvent, name: string, value: number | null) {
    if (value == null) {
      setTooltip((p) => ({ ...p, visible: false }));
      return;
    }
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      visible: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      name,
      value,
    });
  }
  function handleLeave() {
    setTooltip((p) => ({ ...p, visible: false }));
  }

  const metricLabel = t(MAP_METRIC_I18N[metric]);

  return (
    <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-4">
      {/* ── Disclaimer (point of use) ──────────────────────────────────────── */}
      <div className="rounded-lg bg-amber-50/80 dark:bg-amber-500/8 border border-amber-200 dark:border-amber-500/20 px-4 py-3">
        <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
          {t("dataDisclaimer")}
        </p>
      </div>

      {/* ── Metric selector (real buttons — keyboard operable) ─────────────── */}
      <div
        role="group"
        aria-labelledby="map-metric-group-label"
        className="flex flex-wrap items-center gap-1.5"
      >
        <span
          id="map-metric-group-label"
          className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mr-1"
        >
          {t("mapMetricSelectorLabel")}
        </span>
        {MAP_METRICS.map((mk) => (
          <button
            key={mk}
            type="button"
            aria-pressed={metric === mk}
            onClick={() => setMetric(mk)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
              metric === mk
                ? "bg-violet-600 text-white shadow"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700"
            }`}
          >
            {t(MAP_METRIC_I18N[mk])}
          </button>
        ))}
      </div>

      {/* ── Map figure (SVG is decorative; the table below is authoritative) ─ */}
      {isEmpty ? (
        <div className="flex items-center justify-center rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-10 text-sm text-zinc-500 dark:text-zinc-400">
          {t("mapEmpty")}
        </div>
      ) : (
        <div ref={containerRef} className="relative w-full">
          {!geoData ? (
            <div className="flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 p-10 text-sm text-zinc-500 dark:text-zinc-400">
              {t("mapLoading")}
            </div>
          ) : (
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="w-full h-auto"
              style={{
                minHeight: 260,
                opacity: entered ? 1 : 0,
                transition: reduceMotion ? "none" : "opacity 500ms ease-out",
              }}
              aria-hidden="true"
            >
              <g>
                {countryPaths.map((c) => (
                  <path
                    key={c.iso3}
                    d={c.d}
                    fill={c.fill}
                    stroke={outline}
                    strokeWidth={0.4}
                    onMouseMove={(e) => handleMove(e, c.name, c.value)}
                    onMouseLeave={handleLeave}
                  />
                ))}
              </g>
            </svg>
          )}

          {/* Tooltip — hover-only, non-focusable */}
          {tooltip.visible && (
            <div
              className="pointer-events-none absolute z-50 rounded-lg border px-3 py-2 text-xs"
              style={{
                left: tooltip.x > W * 0.62 ? tooltip.x - 180 : tooltip.x + 14,
                top: tooltip.y,
                transform: "translateY(-50%)",
                background: isDark ? "rgba(9,9,11,0.94)" : "rgba(255,255,255,0.96)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                borderColor: "rgba(139,92,246,0.35)",
                minWidth: 160,
                boxShadow: isDark
                  ? "0 4px 28px rgba(0,0,0,0.55)"
                  : "0 4px 16px rgba(0,0,0,0.10)",
              }}
            >
              <p className="font-semibold text-zinc-900 dark:text-white leading-tight mb-1">
                {tooltip.name}
              </p>
              <p className="flex justify-between gap-4">
                <span className="text-zinc-500">{t("mapTooltipLabel")}</span>
                <span className="font-semibold text-violet-600 dark:text-violet-400 tabular-nums">
                  {tooltip.value.toLocaleString()}
                </span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Legend ─────────────────────────────────────────────────────────── */}
      {!isEmpty && (
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {t("mapLegendLow")}
          </span>
          <div
            className="h-3 flex-1 max-w-[220px] rounded-full border border-zinc-200 dark:border-zinc-700"
            style={{
              background: `linear-gradient(to right, ${legendStops.join(", ")})`,
            }}
            aria-hidden="true"
          />
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {t("mapLegendHigh")}
          </span>
          <span className="text-xs text-zinc-400 dark:text-zinc-500 ml-1">
            {t("mapLegendLabel")}
          </span>
        </div>
      )}

      {/* ── Accessible data table (the numeric truth; non-color-only) ──────── */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <caption className="sr-only">{t("mapTableCaption")}</caption>
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th
                scope="col"
                className="py-1.5 pr-3 font-semibold text-zinc-500 dark:text-zinc-400"
              >
                {t("mapTableColRegion")}
              </th>
              <th
                scope="col"
                className="py-1.5 font-semibold text-zinc-500 dark:text-zinc-400 text-right"
              >
                {t("mapTableColCount")} — {metricLabel}
              </th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row) => (
              <tr
                key={row.name}
                className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
              >
                <th
                  scope="row"
                  className="py-1.5 pr-3 font-medium text-left text-zinc-900 dark:text-zinc-100"
                >
                  {row.name}
                </th>
                <td className="py-1.5 text-right tabular-nums text-zinc-600 dark:text-zinc-400">
                  {row.value.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Coverage note ──────────────────────────────────────────────────── */}
      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
        {t("mapCoverageNote", {
          mapped: coverage.mapped,
          total: coverage.total,
          unmapped: coverage.unmapped,
        })}
      </p>

      {/* ── Country attribution note (co-attributed sums exceed unique totals) */}
      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
        {t("countryAttributionNote")}
      </p>
    </div>
  );
}
