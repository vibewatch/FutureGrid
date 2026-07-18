"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { hierarchy, treemap } from "d3";
import {
  getCountryOriginShares,
  type CountryOriginEntry,
} from "@/lib/ai-frontier";
import { useT } from "@/lib/i18n/useT";

// ── Layout constants ────────────────────────────────────────────────────────
// Fixed viewBox + preserveAspectRatio keeps the mosaic responsive and lets the
// section prerender statically (no browser-only measurement required).
const W = 960;
const H = 540;

// Only render an in-tile label when the tile is large enough to hold it without
// clipping; otherwise rely on the hover tooltip and the authoritative table.
const LABEL_MIN_W = 56;
const LABEL_MIN_H = 28;

// Share metric set: recentCount default, modelCount, openWeightsCount ONLY.
// The projection type structurally excludes compute/frontier metrics.
type ShareMetric = "recentCount" | "modelCount" | "openWeightsCount";

const SHARE_METRICS: ShareMetric[] = [
  "recentCount",
  "modelCount",
  "openWeightsCount",
];

const SHARE_METRIC_I18N: Record<ShareMetric, string> = {
  recentCount: "metricRecentCount",
  modelCount: "metricModelCount",
  openWeightsCount: "metricOpenWeightsCount",
};

function metricValue(entry: CountryOriginEntry, metric: ShareMetric): number {
  if (metric === "modelCount") return entry.modelCount;
  if (metric === "openWeightsCount") return entry.openWeightsCount;
  return entry.recentCount;
}

// ── Uniform brand-violet tile family (area is the ONLY quantitative encoding) ─
const TILE_FILL_DARK = "rgba(139, 92, 246, 0.55)"; // violet-500 base
const TILE_FILL_LIGHT = "rgba(124, 58, 237, 0.85)"; // violet-600 base
const TILE_BORDER_DARK = "rgba(255, 255, 255, 0.10)";
const TILE_BORDER_LIGHT = "rgba(255, 255, 255, 0.65)";
const HOVER_ALPHA_BOOST = 0.12;

function boostAlpha(rgba: string, delta: number): string {
  const m = rgba.match(/rgba?\(([^)]+)\)/);
  if (!m) return rgba;
  const parts = m[1].split(",").map((p) => p.trim());
  const a = parts.length >= 4 ? parseFloat(parts[3]) : 1;
  const next = Math.min(1, a + delta);
  return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${next})`;
}

interface TileDatum {
  key: string;
  country: string;
  countryShort: string;
  value: number;
  share: number;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  name: string;
  value: number;
  share: number;
}

const EMPTY_TOOLTIP: TooltipState = {
  visible: false,
  x: 0,
  y: 0,
  name: "",
  value: 0,
  share: 0,
};

function formatShare(share: number): string {
  return `${(share * 100).toFixed(1)}%`;
}

export default function FrontierOriginsTreemap() {
  const t = useT("frontier");
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const isDark = (resolvedTheme ?? "dark") !== "light";

  const [metric, setMetric] = useState<ShareMetric>("recentCount");
  const [entered, setEntered] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>(EMPTY_TOOLTIP);

  // ── Data (fair projection: full-catalog share metrics only) ───────────────
  const origins = useMemo(() => getCountryOriginShares(), []);

  // Total records for the selected metric across ALL origins.
  const total = useMemo(
    () => origins.reduce((sum, e) => sum + metricValue(e, metric), 0),
    [origins, metric],
  );

  // Table rows: every origin (numeric truth), sorted by share desc.
  const tableRows = useMemo<TileDatum[]>(
    () =>
      origins
        .map((e) => {
          const value = metricValue(e, metric);
          return {
            key: e.country,
            country: e.country,
            countryShort: e.countryShort,
            value,
            share: total > 0 ? value / total : 0,
          };
        })
        .sort(
          (a, b) =>
            b.value - a.value || a.countryShort.localeCompare(b.countryShort),
        ),
    [origins, metric, total],
  );

  // Treemap leaves: exclude 0-value entries (0-area tiles are invalid).
  const leaves = useMemo(() => {
    const positive = tableRows.filter((r) => r.value > 0);
    if (positive.length === 0) return [];
    type Node = { children: TileDatum[] } | TileDatum;
    const root = hierarchy<Node>({ children: positive })
      .sum((d) => ("value" in d ? d.value : 0))
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    const layout = treemap<Node>()
      .size([W, H])
      .paddingInner(2)
      .round(true)(root);
    return layout.leaves().map((leaf) => {
      const datum = leaf.data as TileDatum;
      return {
        ...datum,
        x0: leaf.x0 ?? 0,
        y0: leaf.y0 ?? 0,
        x1: leaf.x1 ?? 0,
        y1: leaf.y1 ?? 0,
      };
    });
  }, [tableRows]);

  const isEmpty = leaves.length === 0;

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
    if (isEmpty) return;
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [isEmpty]);

  const tileFill = isDark ? TILE_FILL_DARK : TILE_FILL_LIGHT;
  const tileBorder = isDark ? TILE_BORDER_DARK : TILE_BORDER_LIGHT;
  const labelColor = isDark ? "#f4f4f5" : "#ffffff";
  const labelShadow = isDark ? "0 1px 2px rgba(0,0,0,0.45)" : "none";

  // ── Tooltip (hover-only, non-focusable — mouse/pointer position) ──────────
  function handleMove(
    e: React.MouseEvent,
    name: string,
    value: number,
    share: number,
  ) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      visible: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      name,
      value,
      share,
    });
  }
  function handleLeave() {
    setHoveredKey(null);
    setTooltip((p) => ({ ...p, visible: false }));
  }

  const metricLabel = t(SHARE_METRIC_I18N[metric]);

  return (
    <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-4">
      {/* ── Disclaimer (point of use) ──────────────────────────────────────── */}
      <div className="rounded-lg bg-amber-50/80 dark:bg-amber-500/8 border border-amber-200 dark:border-amber-500/20 px-4 py-3">
        <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
          {t("dataDisclaimer")}
        </p>
      </div>

      {/* ── Share metric selector (real buttons — keyboard operable) ───────── */}
      <div
        role="group"
        aria-labelledby="origins-metric-group-label"
        className="flex flex-wrap items-center gap-1.5"
      >
        <span
          id="origins-metric-group-label"
          className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mr-1"
        >
          {t("originsMetricSelectorLabel")}
        </span>
        {SHARE_METRICS.map((mk) => (
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
            {t(SHARE_METRIC_I18N[mk])}
          </button>
        ))}
      </div>

      {/* ── Treemap figure (SVG is decorative; the table below is authoritative) */}
      {isEmpty ? (
        <div className="flex items-center justify-center rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-10 text-sm text-zinc-500 dark:text-zinc-400">
          {t("originsEmpty")}
        </div>
      ) : (
        <div ref={containerRef} className="relative w-full">
          {/* Screen-reader description of the decorative treemap. */}
          <p className="sr-only">{t("originsSrSummary")}</p>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-auto"
            style={{
              minHeight: 280,
              opacity: entered ? 1 : 0,
              transition: reduceMotion ? "none" : "opacity 500ms ease-out",
            }}
            aria-hidden="true"
          >
            {leaves.map((tile) => {
              const tw = tile.x1 - tile.x0;
              const th = tile.y1 - tile.y0;
              const showLabel = tw >= LABEL_MIN_W && th >= LABEL_MIN_H;
              const isHovered = hoveredKey === tile.key;
              const fill = isHovered
                ? boostAlpha(tileFill, HOVER_ALPHA_BOOST)
                : tileFill;
              const cx = tile.x0 + tw / 2;
              const cy = tile.y0 + th / 2;
              return (
                <g
                  key={tile.key}
                  onMouseMove={(e) =>
                    handleMove(e, tile.countryShort, tile.value, tile.share)
                  }
                  onMouseEnter={() => setHoveredKey(tile.key)}
                  onMouseLeave={handleLeave}
                >
                  <rect
                    x={tile.x0}
                    y={tile.y0}
                    width={tw}
                    height={th}
                    fill={fill}
                    stroke={
                      isHovered ? "rgba(255,255,255,0.35)" : tileBorder
                    }
                    strokeWidth={1}
                    style={{
                      transition: reduceMotion
                        ? "none"
                        : "fill 120ms ease, stroke 120ms ease",
                    }}
                  />
                  {showLabel && (
                    <text
                      x={cx}
                      y={cy}
                      textAnchor="middle"
                      style={{ textShadow: labelShadow }}
                    >
                      <tspan
                        x={cx}
                        dy="-0.15em"
                        fill={labelColor}
                        fontSize={12}
                        fontWeight={600}
                      >
                        {tile.countryShort}
                      </tspan>
                      <tspan
                        x={cx}
                        dy="1.25em"
                        fill={labelColor}
                        fontSize={11}
                        className="tabular-nums"
                      >
                        {formatShare(tile.share)}
                      </tspan>
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Tooltip — hover-only, non-focusable */}
          {tooltip.visible && (
            <div
              className="pointer-events-none absolute z-50 rounded-md border border-white/10 px-3 py-2 text-xs"
              style={{
                left: tooltip.x > W * 0.62 ? tooltip.x - 190 : tooltip.x + 14,
                top: tooltip.y,
                transform: "translateY(-50%)",
                background: isDark ? "rgba(24,24,27,0.95)" : "rgba(255,255,255,0.95)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                minWidth: 170,
                boxShadow: isDark
                  ? "0 4px 28px rgba(0,0,0,0.55)"
                  : "0 4px 16px rgba(0,0,0,0.10)",
              }}
            >
              <p className="font-semibold text-zinc-900 dark:text-white leading-tight mb-1">
                {tooltip.name}
              </p>
              <p className="flex justify-between gap-4">
                <span className="text-zinc-500">{t("originsTooltipRecords")}</span>
                <span className="font-semibold text-violet-600 dark:text-violet-400 tabular-nums">
                  {tooltip.value.toLocaleString()}
                </span>
              </p>
              <p className="flex justify-between gap-4">
                <span className="text-zinc-500">{t("originsTooltipShare")}</span>
                <span className="font-semibold text-violet-600 dark:text-violet-400 tabular-nums">
                  {formatShare(tooltip.share)}
                </span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Accessible data table (the numeric truth; non-color-only) ──────── */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <caption className="sr-only">{t("originsTableCaption")}</caption>
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th
                scope="col"
                className="py-1.5 pr-3 font-semibold text-zinc-500 dark:text-zinc-400"
              >
                {t("originsTableColCountry")}
              </th>
              <th
                scope="col"
                className="py-1.5 pr-3 font-semibold text-zinc-500 dark:text-zinc-400 text-right"
              >
                {t("originsTableColRecords")} — {metricLabel}
              </th>
              <th
                scope="col"
                className="py-1.5 font-semibold text-zinc-500 dark:text-zinc-400 text-right"
              >
                {t("originsTableColShare")}
              </th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row) => (
              <tr
                key={row.key}
                className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
              >
                <th
                  scope="row"
                  className="py-1.5 pr-3 font-medium text-left text-zinc-900 dark:text-zinc-100"
                >
                  {row.countryShort}
                </th>
                <td className="py-1.5 pr-3 text-right tabular-nums text-zinc-600 dark:text-zinc-400">
                  {row.value.toLocaleString()}
                </td>
                <td className="py-1.5 text-right tabular-nums text-zinc-600 dark:text-zinc-400">
                  {formatShare(row.share)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Coverage note (share math + Multinational exclusion) ───────────── */}
      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
        {t("originsCoverageNote", { countries: origins.length })}
      </p>

      {/* ── Country attribution note (co-attributed sums exceed unique totals) */}
      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
        {t("countryAttributionNote")}
      </p>
    </div>
  );
}
