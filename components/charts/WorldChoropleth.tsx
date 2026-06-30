"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import * as d3 from "d3";
import type { GeoPermissibleObjects, ExtendedFeatureCollection } from "d3-geo";
import worldGeo from "@/data/world-countries.geo.json";
import { getCountryMapData } from "@/lib/data";
import type { CountryMapDatum } from "@/lib/data";

// ── Constants ──────────────────────────────────────────────────────────────────

const W = 960;
const H = 500;

const NO_DATA_FILL = "#27272a"; // zinc-800
const PROXY_STROKE = "#f59e0b"; // amber-400
const BASE_STROKE  = "#52525b"; // zinc-600
const HOVER_STROKE = "#ffffff";

// ── Brand ramp: dark-indigo → violet → cyan ────────────────────────────────────

function brandRamp(t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped < 0.5) return d3.interpolateRgb("#1a0a2e", "#8b5cf6")(clamped * 2);
  return d3.interpolateRgb("#8b5cf6", "#22d3ee")((clamped - 0.5) * 2);
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  datum: CountryMapDatum | null;
}

interface CountryPath {
  iso3: string;
  datum: CountryMapDatum | null;
  d: string;
  fill: string;
  hasProxy: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function WorldChoropleth() {
  const svgRef       = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [hovered,        setHovered]        = useState<string | null>(null);
  const [tooltip,        setTooltip]        = useState<TooltipState>({
    visible: false, x: 0, y: 0, datum: null,
  });
  const [entered,        setEntered]        = useState(false);
  const [containerWidth, setContainerWidth] = useState(W);

  // ── Data ──────────────────────────────────────────────────────────────────

  const dataByIso3 = useMemo(() => {
    const map = new Map<string, CountryMapDatum>();
    for (const d of getCountryMapData()) map.set(d.iso3, d);
    return map;
  }, []);

  const maxIndex = useMemo(() => {
    let max = 0;
    for (const d of dataByIso3.values()) {
      if (d.hasClaudeData && d.usageIndex != null && d.usageIndex > max) max = d.usageIndex;
    }
    return max > 0 ? max : 1;
  }, [dataByIso3]);

  const colorScale = useMemo(
    () => d3.scaleSequential([0, maxIndex], brandRamp),
    [maxIndex],
  );

  // ── Geo ───────────────────────────────────────────────────────────────────

  const pathGen = useMemo(() => {
    const proj = d3
      .geoNaturalEarth1()
      .fitSize([W, H], worldGeo as unknown as ExtendedFeatureCollection);
    return d3.geoPath().projection(proj);
  }, []);

  const countryPaths = useMemo<CountryPath[]>(() => {
    const fc = worldGeo as {
      features: Array<{
        id: string;
        type: string;
        properties: { name: string };
        geometry: unknown;
      }>;
    };
    return fc.features.map((feature) => {
      const iso3     = feature.id;
      const datum    = dataByIso3.get(iso3) ?? null;
      const dStr     = pathGen(feature as unknown as GeoPermissibleObjects) ?? "";
      const hasProxy = datum?.proxyNote != null;
      const fill     = datum?.hasClaudeData && datum.usageIndex != null
        ? colorScale(datum.usageIndex)
        : NO_DATA_FILL;
      return { iso3, datum, d: dStr, fill, hasProxy };
    });
  }, [dataByIso3, colorScale, pathGen]);

  // Top-15 countries for the accessible SR list
  const top15 = useMemo(() =>
    [...dataByIso3.values()]
      .filter(d => d.hasClaudeData && d.usageIndex != null)
      .sort((a, b) => (b.usageIndex ?? 0) - (a.usageIndex ?? 0))
      .slice(0, 15),
    [dataByIso3],
  );

  // ── Entrance animation (rAF-deferred; CSS handles prefers-reduced-motion) ──

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // ── Track container width for tooltip clamping ───────────────────────────

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ── D3 cleanup on unmount ────────────────────────────────────────────────

  useEffect(() => {
    const svgEl = svgRef.current;
    return () => {
      if (svgEl) d3.select(svgEl).selectAll("*").interrupt();
    };
  }, []);

  // ── Pointer handlers ──────────────────────────────────────────────────────

  const handleMouseEnter = useCallback((e: React.MouseEvent, iso3: string) => {
    setHovered(iso3);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      visible: true,
      x: e.clientX - rect.left + 14,
      y: e.clientY - rect.top - 8,
      datum: dataByIso3.get(iso3) ?? null,
    });
  }, [dataByIso3]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip(prev => ({
      ...prev,
      x: e.clientX - rect.left + 14,
      y: e.clientY - rect.top - 8,
    }));
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHovered(null);
    setTooltip(prev => ({ ...prev, visible: false }));
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="relative w-full" ref={containerRef}>

      {/* Accessible list of top countries (screen readers only) */}
      <ul className="sr-only" aria-label="Top 15 countries by AI usage index">
        {top15.map(d => (
          <li key={d.iso3}>
            {d.name}: usage index {d.usageIndex?.toFixed(2)}
            {d.usagePct != null ? `, global share ${(d.usagePct * 100).toFixed(2)}%` : ""}
          </li>
        ))}
        <li>
          Note: China (CHN) is displayed with proxy data from CNNIC and QuestMobile because
          Claude.ai is unavailable in mainland China. These figures represent general AI
          adoption, not Claude.ai usage specifically.
        </li>
      </ul>

      {/* World map SVG */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="choropleth-svg w-full h-auto"
        role="img"
        aria-label="World choropleth map showing AI (Claude.ai) usage index by country. Colour intensity indicates per-capita usage; grey countries have no Claude.ai data; China is shown with a dashed amber border indicating proxy data only."
        style={{
          opacity:   entered ? 1 : 0,
          transform: entered ? "scale(1)" : "scale(0.97)",
        }}
      >
        <g>
          {countryPaths.map(({ iso3, d, fill, hasProxy }) => {
            const isHovered = hovered === iso3;
            const dimmed    = hovered !== null && !isHovered;

            return (
              <path
                key={iso3}
                d={d}
                fill={fill}
                stroke={isHovered ? HOVER_STROKE : hasProxy ? PROXY_STROKE : BASE_STROKE}
                strokeWidth={isHovered ? 1.5 : hasProxy ? 1.2 : 0.4}
                strokeDasharray={hasProxy && !isHovered ? "3 2" : undefined}
                style={{
                  opacity:    dimmed ? 0.5 : 1,
                  filter:     isHovered ? "brightness(1.4)" : undefined,
                  transition: "opacity 0.12s ease, filter 0.12s ease",
                  cursor:     "pointer",
                }}
                onMouseEnter={e => handleMouseEnter(e, iso3)}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              />
            );
          })}
        </g>
      </svg>

      {/* HTML Tooltip */}
      {tooltip.visible && tooltip.datum && (
        <div
          className="glass pointer-events-none absolute z-50 rounded-xl px-3 py-2.5 text-sm shadow-2xl border border-zinc-700/60"
          style={{
            left:     Math.min(tooltip.x, containerWidth - 260),
            top:      Math.max(tooltip.y - 64, 4),
            maxWidth: 256,
          }}
        >
          <p className="font-semibold text-white leading-tight">{tooltip.datum.name}</p>
          {tooltip.datum.hasClaudeData ? (
            <div className="mt-1.5 space-y-0.5">
              <p className="text-zinc-400 text-xs">
                AI usage index:{" "}
                <span className="text-cyan-300 font-mono font-semibold">
                  {tooltip.datum.usageIndex?.toFixed(2)}
                </span>
              </p>
              {tooltip.datum.usagePct != null && (
                <p className="text-zinc-400 text-xs">
                  Global share:{" "}
                  <span className="text-violet-300 font-mono font-semibold">
                    {(tooltip.datum.usagePct * 100).toFixed(2)}%
                  </span>
                </p>
              )}
            </div>
          ) : (
            <div className="mt-1.5 space-y-1">
              <p className="text-zinc-400 text-xs">No Claude.ai usage data</p>
              {tooltip.datum.proxyNote && (
                <p className="text-amber-300/80 text-xs leading-snug">
                  {tooltip.datum.proxyNote}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-start gap-x-6 gap-y-2 px-1">
        {/* Sequential gradient bar */}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wide">Low</span>
            <div
              className="w-28 h-2.5 rounded"
              style={{
                background: `linear-gradient(to right, ${brandRamp(0)}, ${brandRamp(0.33)}, ${brandRamp(0.67)}, ${brandRamp(1)})`,
              }}
            />
            <span className="text-[10px] text-zinc-500 uppercase tracking-wide font-mono">
              {maxIndex.toFixed(1)}
            </span>
          </div>
          <p className="text-[10px] text-zinc-600 mt-0.5">AI usage index (per-capita)</p>
        </div>

        {/* No-data swatch */}
        <div className="flex items-center gap-1.5 pt-px">
          <div className="w-4 h-2.5 rounded" style={{ background: NO_DATA_FILL }} />
          <span className="text-[10px] text-zinc-500">No Claude.ai data</span>
        </div>

        {/* Proxy / restricted swatch */}
        <div className="flex items-center gap-1.5 pt-px">
          <div
            className="w-4 h-2.5 rounded border border-dashed"
            style={{
              background:   NO_DATA_FILL,
              borderColor:  PROXY_STROKE,
            }}
          />
          <span className="text-[10px] text-zinc-500">Proxy / restricted data</span>
        </div>
      </div>
    </div>
  );
}
