"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import * as d3 from "d3";
import type { GeoPermissibleObjects, ExtendedFeatureCollection } from "d3-geo";
import { getCountryMapData } from "@/lib/data";
import type { CountryMapDatum } from "@/lib/data";

// ── Constants ──────────────────────────────────────────────────────────────────

const W = 960;
const H = 500;

const NO_DATA_FILL = "#27272a"; // zinc-800
const PROXY_STROKE = "#f59e0b"; // amber-400
const BASE_STROKE  = "#52525b"; // zinc-600
const HOVER_STROKE = "#ffffff";

// Inlined at build time from next.config.ts env block; empty string on localhost.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// ── Brand ramp: dark-indigo → violet → cyan ────────────────────────────────────

function brandRamp(t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped < 0.5) return d3.interpolateRgb("#1a0a2e", "#8b5cf6")(clamped * 2);
  return d3.interpolateRgb("#8b5cf6", "#22d3ee")((clamped - 0.5) * 2);
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Metric = "claude" | "diffusion" | "readiness";

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

// ── Tooltip content (module-level to avoid unstable-nested-component lint) ────

function TooltipContent({ datum, metric }: { datum: CountryMapDatum; metric: Metric }) {
  if (metric === "readiness") {
    if (datum.aiReadiness != null) {
      return (
        <div className="mt-1.5 space-y-0.5">
          <p className="text-zinc-400 text-xs">
            AI readiness:{" "}
            <span className="text-cyan-300 font-mono font-semibold">
              {datum.aiReadiness.toFixed(2)}
            </span>
            <span className="text-zinc-600 text-[10px] ml-1">IMF AIPI, 0–1</span>
          </p>
        </div>
      );
    }
    return <p className="text-zinc-400 text-xs mt-1.5">No AI readiness data</p>;
  }

  if (metric === "diffusion") {
    if (datum.diffusionPct != null) {
      return (
        <div className="mt-1.5 space-y-0.5">
          <p className="text-zinc-400 text-xs">
            GenAI use:{" "}
            <span className="text-cyan-300 font-mono font-semibold">
              {datum.diffusionPct.toFixed(1)}%
            </span>
            <span className="text-zinc-600 text-[10px] ml-1">of working-age pop.</span>
          </p>
          {datum.iso3 === "CHN" && datum.proxyNote && (
            <p className="text-zinc-500 text-[10px] leading-snug mt-1">
              {datum.proxyNote}
            </p>
          )}
        </div>
      );
    }
    return <p className="text-zinc-400 text-xs mt-1.5">No GenAI diffusion data</p>;
  }

  if (datum.hasClaudeData) {
    return (
      <div className="mt-1.5 space-y-0.5">
        <p className="text-zinc-400 text-xs">
          AI usage index:{" "}
          <span className="text-cyan-300 font-mono font-semibold">
            {datum.usageIndex?.toFixed(2)}
          </span>
        </p>
        {datum.usagePct != null && (
          <p className="text-zinc-400 text-xs">
            Global share:{" "}
            <span className="text-violet-300 font-mono font-semibold">
              {(datum.usagePct * 100).toFixed(2)}%
            </span>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-1.5 space-y-1">
      <p className="text-zinc-400 text-xs">No Claude.ai usage data</p>
      {datum.proxyNote && (
        <p className="text-amber-300/80 text-xs leading-snug">{datum.proxyNote}</p>
      )}
    </div>
  );
}

// ── Loading skeleton ───────────────────────────────────────────────────────────

function MapSkeleton() {
  return (
    <div className="w-full animate-pulse" aria-hidden="true">
      {/* Map area — matches SVG aspect ratio 960×500 */}
      <div
        className="w-full rounded-xl glass opacity-30"
        style={{ aspectRatio: "960 / 500" }}
      />
      {/* Legend row */}
      <div className="mt-3 flex items-center gap-4 px-1">
        <div className="h-2.5 w-36 rounded glass opacity-30" />
        <div className="h-2.5 w-16 rounded glass opacity-30" />
        <div className="h-2.5 w-24 rounded glass opacity-30" />
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function WorldChoropleth() {
  const svgRef       = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [metric,         setMetric]         = useState<Metric>("claude");
  const [hovered,        setHovered]        = useState<string | null>(null);
  const [tooltip,        setTooltip]        = useState<TooltipState>({
    visible: false, x: 0, y: 0, datum: null,
  });
  const [entered,        setEntered]        = useState(false);
  const [containerWidth, setContainerWidth] = useState(W);
  const [geoData,        setGeoData]        = useState<GeoData | null>(null);
  const [geoError,       setGeoError]       = useState<string | null>(null);

  // ── Fetch world geometry once on mount ────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    fetch(`${BASE_PATH}/world-countries.geo.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<GeoData>;
      })
      .then((data) => { if (!cancelled) setGeoData(data); })
      .catch((err) => { if (!cancelled) setGeoError(String(err)); });
    return () => { cancelled = true; };
  }, []);

  // ── Entrance animation — fires once geometry is ready ─────────────────────

  useEffect(() => {
    if (!geoData) return;
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [geoData]);

  // ── Data ──────────────────────────────────────────────────────────────────

  const dataByIso3 = useMemo(() => {
    const map = new Map<string, CountryMapDatum>();
    for (const d of getCountryMapData()) map.set(d.iso3, d);
    return map;
  }, []);

  // Claude color scale
  const maxIndex = useMemo(() => {
    let max = 0;
    for (const d of dataByIso3.values()) {
      if (d.hasClaudeData && d.usageIndex != null && d.usageIndex > max) max = d.usageIndex;
    }
    return max > 0 ? max : 1;
  }, [dataByIso3]);

  const claudeColorScale = useMemo(
    () => d3.scaleSequential([0, maxIndex], brandRamp),
    [maxIndex],
  );

  // Diffusion color scale
  const maxDiffusion = useMemo(() => {
    let max = 0;
    for (const d of dataByIso3.values()) {
      if (d.diffusionPct != null && d.diffusionPct > max) max = d.diffusionPct;
    }
    return max > 0 ? max : 31;
  }, [dataByIso3]);

  const diffusionColorScale = useMemo(
    () => d3.scaleSequential([0, maxDiffusion], brandRamp),
    [maxDiffusion],
  );

  // Readiness color scale — IMF AIPI domain ~0.18→0.80
  const readinessColorScale = useMemo(
    () => d3.scaleSequential([0.18, 0.80], brandRamp),
    [],
  );

  // ── Geo ───────────────────────────────────────────────────────────────────

  const pathGen = useMemo(() => {
    if (!geoData) return null;
    const proj = d3
      .geoNaturalEarth1()
      .fitSize([W, H], geoData as unknown as ExtendedFeatureCollection);
    return d3.geoPath().projection(proj);
  }, [geoData]);

  const countryPaths = useMemo<CountryPath[]>(() => {
    if (!geoData || !pathGen) return [];
    return geoData.features.map((feature) => {
      const iso3  = feature.id;
      const datum = dataByIso3.get(iso3) ?? null;
      const dStr  = pathGen(feature as unknown as GeoPermissibleObjects) ?? "";

      let fill: string;
      let hasProxy: boolean;

      if (metric === "readiness") {
        fill     = datum?.aiReadiness != null
          ? readinessColorScale(datum.aiReadiness)
          : NO_DATA_FILL;
        hasProxy = false;
      } else if (metric === "diffusion") {
        fill     = datum?.diffusionPct != null
          ? diffusionColorScale(datum.diffusionPct)
          : NO_DATA_FILL;
        hasProxy = false;
      } else {
        fill     = datum?.hasClaudeData && datum.usageIndex != null
          ? claudeColorScale(datum.usageIndex)
          : NO_DATA_FILL;
        hasProxy = datum?.proxyNote != null;
      }

      return { iso3, datum, d: dStr, fill, hasProxy };
    });
  }, [geoData, pathGen, dataByIso3, metric, claudeColorScale, diffusionColorScale, readinessColorScale]);

  // SR top-15 list — metric-aware
  const srTop15 = useMemo(() => {
    if (metric === "diffusion") {
      return [...dataByIso3.values()]
        .filter(d => d.diffusionPct != null)
        .sort((a, b) => (b.diffusionPct ?? 0) - (a.diffusionPct ?? 0))
        .slice(0, 15);
    }
    if (metric === "readiness") {
      return [...dataByIso3.values()]
        .filter(d => d.aiReadiness != null)
        .sort((a, b) => (b.aiReadiness ?? 0) - (a.aiReadiness ?? 0))
        .slice(0, 15);
    }
    return [...dataByIso3.values()]
      .filter(d => d.hasClaudeData && d.usageIndex != null)
      .sort((a, b) => (b.usageIndex ?? 0) - (a.usageIndex ?? 0))
      .slice(0, 15);
  }, [dataByIso3, metric]);

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

  // ── SVG aria-label (metric-aware) ─────────────────────────────────────────

  const svgAriaLabel = metric === "claude"
    ? "World choropleth map showing AI (Claude.ai) usage index by country. Colour intensity indicates per-capita usage; grey countries have no Claude.ai data; China is shown with a dashed amber border indicating proxy data only."
    : metric === "diffusion"
    ? "World choropleth map showing GenAI diffusion by country, as percentage of working-age population using generative AI (Microsoft AIEI Q1 2026, ~147 economies). Grey countries have no data. China is included with real data at 16.4%."
    : "World choropleth map showing AI readiness by country based on the IMF AI Preparedness Index (AIPI), scored 0–1. Higher scores indicate greater capacity and readiness for AI adoption. Grey countries have no data.";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="relative w-full" ref={containerRef}>

      {/* Metric toggle — segmented control */}
      <div
        role="group"
        aria-label="Map metric"
        className="flex w-fit rounded-xl glass p-0.5 mb-3 text-xs font-medium"
      >
        {(["claude", "diffusion", "readiness"] as Metric[]).map((m) => {
          const active = metric === m;
          return (
            <button
              key={m}
              type="button"
              aria-pressed={active}
              onClick={() => setMetric(m)}
              className="relative px-3 py-1.5 rounded-[10px] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              style={
                active
                  ? {
                      background: "linear-gradient(135deg, #7c3aed 0%, #0891b2 100%)",
                      color: "#fff",
                      boxShadow: "0 2px 8px rgba(124,58,237,0.35)",
                    }
                  : { background: "transparent", color: "#71717a" }
              }
            >
              {m === "claude" ? "Claude.ai usage" : m === "diffusion" ? "GenAI diffusion" : "AI readiness"}
            </button>
          );
        })}
      </div>

      {/* Error state */}
      {geoError && (
        <p className="text-zinc-500 text-sm py-12 text-center">
          Map unavailable — could not load world geometry.
        </p>
      )}

      {/* Loading skeleton */}
      {!geoData && !geoError && <MapSkeleton />}

      {/* Map content — rendered once geometry is loaded */}
      {geoData && (
        <>
          {/* Accessible list of top countries (screen readers only) */}
          <ul
            className="sr-only"
            aria-label={
              metric === "claude"
                ? "Top 15 countries by AI usage index"
                : metric === "diffusion"
                ? "Top 15 countries by GenAI diffusion rate"
                : "Top 15 countries by AI readiness score"
            }
          >
            {srTop15.map(d => (
              <li key={d.iso3}>
                {metric === "diffusion"
                  ? `${d.name}: GenAI diffusion ${d.diffusionPct?.toFixed(1)}%`
                  : metric === "readiness"
                  ? `${d.name}: AI readiness ${d.aiReadiness?.toFixed(2)}`
                  : `${d.name}: usage index ${d.usageIndex?.toFixed(2)}${d.usagePct != null ? `, global share ${(d.usagePct * 100).toFixed(2)}%` : ""}`
                }
              </li>
            ))}
            {metric === "claude" && (
              <li>
                Note: China (CHN) is displayed with proxy data from CNNIC and QuestMobile because
                Claude.ai is unavailable in mainland China. These figures represent general AI
                adoption, not Claude.ai usage specifically.
              </li>
            )}
          </ul>

          {/* World map SVG */}
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="choropleth-svg w-full h-auto"
            role="img"
            aria-label={svgAriaLabel}
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
              <TooltipContent datum={tooltip.datum} metric={metric} />
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
                <span className="text-[10px] text-zinc-500 font-mono">
                  {metric === "claude" ? maxIndex.toFixed(1) : metric === "diffusion" ? `${maxDiffusion.toFixed(1)}%` : "0.80"}
                </span>
              </div>
              <p className="text-[10px] text-zinc-600 mt-0.5">
                {metric === "claude"
                  ? "AI usage index (per-capita)"
                  : metric === "diffusion"
                  ? "GenAI diffusion (% of working-age pop)"
                  : "AI readiness (IMF AIPI, 0–1)"}
              </p>
            </div>

            {/* No-data swatch */}
            <div className="flex items-center gap-1.5 pt-px">
              <div className="w-4 h-2.5 rounded" style={{ background: NO_DATA_FILL }} />
              <span className="text-[10px] text-zinc-500">
                {metric === "claude" ? "No Claude.ai data" : "No data"}
              </span>
            </div>

            {/* Proxy / restricted swatch — Claude layer only */}
            {metric === "claude" && (
              <div className="flex items-center gap-1.5 pt-px">
                <div
                  className="w-4 h-2.5 rounded border border-dashed"
                  style={{
                    background:  NO_DATA_FILL,
                    borderColor: PROXY_STROKE,
                  }}
                />
                <span className="text-[10px] text-zinc-500">Proxy / restricted data</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
