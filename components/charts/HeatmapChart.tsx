"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import * as d3 from "d3";
import { getCountryMapData } from "@/lib/data";

// Top 25 countries: required majors (China, USA, India) + geographic diversity,
// all confirmed present in getCountryMapData() output.
const TARGET_ISO3 = [
  "USA", "CHN", "IND", "GBR", "DEU", "FRA", "JPN", "CAN", "AUS", "KOR",
  "SGP", "BRA", "MEX", "IDN", "TUR", "NLD", "ITA", "SWE", "ARE", "ZAF",
  "POL", "CHE", "DNK", "ESP", "NGA",
] as const;

interface MetricDef {
  key: string;
  label: string;
  shortLabel: string;
  format: (v: number) => string;
}

const METRICS: MetricDef[] = [
  { key: "usageIndex",            label: "AI Usage Index",        shortLabel: "AI Usage",     format: (v) => v.toFixed(2) + " idx" },
  { key: "diffusionPct",          label: "GenAI Diffusion",       shortLabel: "Diffusion",    format: (v) => v.toFixed(1) + "%" },
  { key: "aiReadiness",           label: "AI Readiness",          shortLabel: "Readiness",    format: (v) => v.toFixed(3) },
  { key: "digitalInfrastructure", label: "Digital Infrastructure",shortLabel: "Dig. Infra",   format: (v) => v.toFixed(3) },
  { key: "humanCapital",          label: "Human Capital",         shortLabel: "H. Capital",   format: (v) => v.toFixed(3) },
  { key: "innovation",            label: "Innovation",            shortLabel: "Innovation",   format: (v) => v.toFixed(3) },
  { key: "regulationEthics",      label: "Regulation & Ethics",   shortLabel: "Reg./Ethics",  format: (v) => v.toFixed(3) },
];

interface HeatCell {
  iso3: string;
  country: string;
  metricKey: string;
  metricLabel: string;
  /** 0–1 normalized value used for cell colour; null = no data */
  normValue: number | null;
  /** Human-readable real value for tooltip */
  rawDisplay: string;
}

interface TooltipData {
  visible: boolean;
  x: number;
  y: number;
  cw: number;
  country: string;
  metricLabel: string;
  rawDisplay: string;
  normValue: number | null;
}

/** Brand sequential scale: dark indigo → violet → cyan */
function metricColor(t: number): string {
  if (t <= 0.5) return d3.interpolateRgb("#1e1b4b", "#7c3aed")(t * 2);
  return d3.interpolateRgb("#7c3aed", "#06b6d4")((t - 0.5) * 2);
}

function normOf(v: number | null | undefined, max: number): number | null {
  if (v == null || max === 0) return null;
  return Math.min(1, v / max);
}

export default function HeatmapChart() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData>({
    visible: false, x: 0, y: 0, cw: 800,
    country: "", metricLabel: "", rawDisplay: "", normValue: null,
  });

  const { cells, countries } = useMemo(() => {
    const allCountries = getCountryMapData();
    const subset = TARGET_ISO3
      .map((iso3) => allCountries.find((c) => c.iso3 === iso3))
      .filter((c): c is NonNullable<typeof c> => c !== undefined);

    // Per-metric maxima across this 25-country subset for normalization
    const maxUsage = Math.max(...subset.map((c) => c.usageIndex ?? 0));
    const maxReadiness = Math.max(...subset.map((c) => c.aiReadiness ?? 0));
    const maxDI  = Math.max(...subset.map((c) => c.readinessSubIndices?.digitalInfrastructure ?? 0));
    const maxHC  = Math.max(...subset.map((c) => c.readinessSubIndices?.humanCapital ?? 0));
    const maxINV = Math.max(...subset.map((c) => c.readinessSubIndices?.innovation ?? 0));
    const maxRE  = Math.max(...subset.map((c) => c.readinessSubIndices?.regulationEthics ?? 0));

    const fmt = (m: MetricDef, v: number | null | undefined): string =>
      v != null ? m.format(v) : "—";

    const cells: HeatCell[] = subset.flatMap((c) => {
      const si = c.readinessSubIndices;
      return METRICS.map((m): HeatCell => {
        let rawVal: number | null | undefined;
        let normValue: number | null;
        switch (m.key) {
          case "usageIndex":
            rawVal = c.usageIndex; normValue = normOf(rawVal, maxUsage); break;
          case "diffusionPct":
            rawVal = c.diffusionPct; normValue = normOf(rawVal, 100); break;
          case "aiReadiness":
            rawVal = c.aiReadiness; normValue = normOf(rawVal, maxReadiness); break;
          case "digitalInfrastructure":
            rawVal = si?.digitalInfrastructure; normValue = normOf(rawVal, maxDI); break;
          case "humanCapital":
            rawVal = si?.humanCapital; normValue = normOf(rawVal, maxHC); break;
          case "innovation":
            rawVal = si?.innovation; normValue = normOf(rawVal, maxINV); break;
          case "regulationEthics":
            rawVal = si?.regulationEthics; normValue = normOf(rawVal, maxRE); break;
          default:
            rawVal = null; normValue = null;
        }
        return {
          iso3: c.iso3,
          country: c.name,
          metricKey: m.key,
          metricLabel: m.label,
          normValue,
          rawDisplay: fmt(m, rawVal),
        };
      });
    });

    return { cells, countries: subset.map((c) => c.iso3) };
  }, []);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    const svgEl = svgRef.current;
    const containerEl = containerRef.current;
    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const metricKeys = METRICS.map((m) => m.key);

    const margin = { top: 65, right: 24, bottom: 52, left: 162 };
    const cellW = 100;
    const cellH = 30;
    const W = margin.left + metricKeys.length * cellW + margin.right;
    const H = margin.top + countries.length * cellH + margin.bottom;
    svg.attr("viewBox", `0 0 ${W} ${H}`);

    const xScale = d3.scaleBand()
      .domain(metricKeys)
      .range([margin.left, margin.left + metricKeys.length * cellW])
      .padding(0.05);

    const yScale = d3.scaleBand()
      .domain(countries)
      .range([margin.top, margin.top + countries.length * cellH])
      .padding(0.05);

    // ── Column headers ──
    const nameMap = new Map(cells.map((d) => [d.iso3, d.country]));
    METRICS.forEach((m) => {
      const x = (xScale(m.key) ?? 0) + xScale.bandwidth() / 2;
      svg.append("text")
        .attr("x", x).attr("y", margin.top - 10)
        .attr("text-anchor", "middle")
        .attr("fill", "#a1a1aa").attr("font-size", "11px").attr("font-weight", "600")
        .text(m.shortLabel);
    });

    // ── Row labels ──
    countries.forEach((iso3) => {
      const y = (yScale(iso3) ?? 0) + yScale.bandwidth() / 2;
      const name = nameMap.get(iso3) ?? iso3;
      svg.append("text")
        .attr("x", margin.left - 8).attr("y", y)
        .attr("text-anchor", "end").attr("dominant-baseline", "middle")
        .attr("fill", "#a1a1aa").attr("font-size", "11px")
        .text(name.length > 21 ? name.slice(0, 20) + "…" : name);
    });

    // ── Cells ──
    const cellG = svg
      .selectAll<SVGGElement, HeatCell>("g.hm-cell")
      .data(cells)
      .join("g")
      .attr("class", "hm-cell")
      .attr("transform", (d) => `translate(${xScale(d.metricKey)},${yScale(d.iso3)})`)
      .style("cursor", "pointer");

    cellG.append("rect")
      .attr("width", xScale.bandwidth())
      .attr("height", yScale.bandwidth())
      .attr("fill", (d) => d.normValue != null ? metricColor(d.normValue) : "#27272a")
      .attr("rx", 3);

    // ── Entrance animation ──
    if (!reduced) {
      cellG
        .attr("opacity", 0)
        .transition().duration(400)
        .delay((_, i) => i * 6)
        .ease(d3.easeCubicOut)
        .attr("opacity", 1);
    }

    // ── Hover ──
    cellG
      .on("mousemove", (event: MouseEvent, d) => {
        const rect = containerEl.getBoundingClientRect();
        setTooltip({
          visible: true,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          cw: containerEl.clientWidth,
          country: d.country,
          metricLabel: d.metricLabel,
          rawDisplay: d.rawDisplay,
          normValue: d.normValue,
        });
        svg.selectAll<SVGGElement, HeatCell>("g.hm-cell")
          .attr("opacity", (c) => c.iso3 === d.iso3 && c.metricKey === d.metricKey ? 1 : 0.25);
        d3.select<SVGGElement, HeatCell>(event.currentTarget as SVGGElement)
          .select("rect")
          .attr("transform", "scale(1.06)")
          .attr("transform-origin", `${xScale.bandwidth() / 2} ${yScale.bandwidth() / 2}`);
      })
      .on("mouseleave", () => {
        setTooltip((p) => ({ ...p, visible: false }));
        svg.selectAll<SVGGElement, HeatCell>("g.hm-cell")
          .attr("opacity", 1)
          .select("rect")
          .attr("transform", null);
      });

    // ── Legend ──
    const legendX = margin.left;
    const legendW = metricKeys.length * cellW;
    const legendY = H - 38;
    const steps = 200;
    for (let i = 0; i < steps; i++) {
      svg.append("rect")
        .attr("x", legendX + (i / steps) * legendW)
        .attr("y", legendY)
        .attr("width", legendW / steps + 1)
        .attr("height", 8)
        .attr("fill", metricColor(i / steps));
    }
    svg.append("text").attr("x", legendX).attr("y", legendY + 20)
      .attr("fill", "#71717a").attr("font-size", "10px").text("Low");
    svg.append("text").attr("x", legendX + legendW / 2).attr("y", legendY + 20)
      .attr("text-anchor", "middle").attr("fill", "#52525b").attr("font-size", "10px")
      .text("Normalised 0–1 per metric (colour only) · grey = no data");
    svg.append("text").attr("x", legendX + legendW).attr("y", legendY + 20)
      .attr("text-anchor", "end").attr("fill", "#71717a").attr("font-size", "10px")
      .text("High");

    return () => { svg.selectAll("*").interrupt(); };
  }, [cells, countries]);

  return (
    <div ref={containerRef} className="relative w-full overflow-x-auto">
      <svg
        ref={svgRef}
        className="w-full h-auto min-h-[600px]"
        role="img"
        aria-label="Country × AI-metric heatmap: 25 major economies scored on 7 real AI indicators"
      >
        <title>Country × AI-Metric Heatmap</title>
      </svg>
      <span className="sr-only">
        Heatmap comparing 25 countries on 7 real AI metrics: AI Usage Index, GenAI Diffusion
        rate, AI Readiness (IMF AIPI composite), and four AIPI sub-indices (digital
        infrastructure, human capital, innovation, regulation &amp; ethics). Each metric is
        independently normalised to 0–1 for colour comparability. Grey cells indicate no data.
        Hover over individual cells to see the real underlying value.
      </span>

      {tooltip.visible && (
        <div
          className="pointer-events-none absolute z-50 rounded-xl border px-3 py-2.5 text-sm"
          style={{
            left: tooltip.x > tooltip.cw * 0.65 ? tooltip.x - 210 : tooltip.x + 14,
            top: tooltip.y,
            transform: "translateY(-50%)",
            background: "rgba(9,9,11,0.93)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderColor: tooltip.normValue != null
              ? metricColor(tooltip.normValue) + "55"
              : "#3f3f4680",
            minWidth: 185,
            boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
          }}
        >
          <p className="font-semibold text-white text-sm leading-tight mb-0.5">{tooltip.country}</p>
          <p className="text-xs text-zinc-500 mb-2">{tooltip.metricLabel}</p>
          <span
            className="text-lg font-bold"
            style={{ color: tooltip.normValue != null ? metricColor(tooltip.normValue) : "#52525b" }}
          >
            {tooltip.rawDisplay}
          </span>
        </div>
      )}
    </div>
  );
}