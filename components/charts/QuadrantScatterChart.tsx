"use client";

import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { useTheme } from "next-themes";
import * as d3 from "d3";
import { useRouter } from "next/navigation";
import { generateAllCareerInsights, type CareerInsight } from "@/lib/data";
import { colorForRisk } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  cw: number;
  d: CareerInsight;
}

const EMPTY_INSIGHT: CareerInsight = {
  occupationCode: "",
  occupationName: "",
  automationRisk: "Low",
  automationProbability: 0,
  growthRate: null,
  medianSalary: 0,
  totalEmployment: null,
  projectedOpenings: null,
  outlook: "Average",
  sectorName: "",
  skills: [],
  employmentHistory: null,
  wageHistory: null,
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtSalary(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${Math.round(v / 1_000)}K`;
  return `$${v}`;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function QuadrantScatterChart() {
  const router    = useRouter();
  const routerRef = useRef(router);
  useEffect(() => { routerRef.current = router; }, [router]);

  const svgRef       = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomRef      = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const { resolvedTheme } = useTheme();
  const isDark = (resolvedTheme ?? "dark") !== "light";

  const [isZoomed, setIsZoomed] = useState(false);
  const [tooltip, setTooltip]   = useState<TooltipState>({
    visible: false, x: 0, y: 0, cw: 700, d: EMPTY_INSIGHT,
  });

  const data = useMemo(() => generateAllCareerInsights(), []);

  // ── D3 draw ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const svgEl       = svgRef.current;
    const containerEl = containerRef.current;
    if (!svgEl || !containerEl || data.length === 0) return;

    const svg     = d3.select<SVGSVGElement, unknown>(svgEl);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ── Theme-aware colours ────────────────────────────────────────────────────
    const axisText  = isDark ? "#71717a" : "#52525b";
    const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
    const axisLine  = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";
    const quadLine  = isDark ? "rgba(255,255,255,0.24)" : "rgba(0,0,0,0.20)";
    const quadLabel = isDark ? "rgba(255,255,255,0.30)" : "rgba(0,0,0,0.26)";

    svg.selectAll("*").remove();

    // ── Dimensions ─────────────────────────────────────────────────────────────
    const W      = 700;
    const H      = 480;
    const margin = { top: 44, right: 40, bottom: 64, left: 78 };
    svg.attr("viewBox", `0 0 ${W} ${H}`);

    // ── Base scales ────────────────────────────────────────────────────────────
    const xMax   = Math.ceil(((d3.max(data, (d) => d.automationProbability) ?? 0.8) * 100) / 10) * 10;
    const xScale = d3.scaleLinear()
      .domain([0, xMax])
      .range([margin.left, W - margin.right])
      .nice();

    const [salMin, salMax] = d3.extent(data, (d) => d.medianSalary) as [number, number];
    const yScale = d3.scaleLog()
      .domain([salMin * 0.90, salMax * 1.06])
      .range([H - margin.bottom, margin.top])
      .nice();

    const maxEmp = d3.max(data, (d) => d.totalEmployment ?? 0) ?? 1;
    const rScale = d3.scaleSqrt().domain([0, maxEmp]).range([3, 15]);
    const dotR   = (d: CareerInsight) =>
      d.totalEmployment != null ? rScale(d.totalEmployment) : 3;

    // ── Quadrant thresholds (data-driven) ─────────────────────────────────────
    // Median exposure is often 0 (many occupations lack a measured probability),
    // so fall back to the mean for a more informative visual split.
    const expThreshold =
      (d3.median(data, (d) => d.automationProbability) ||
       d3.mean(data, (d) => d.automationProbability)) ?? 0.35;
    const salThreshold = d3.median(data, (d) => d.medianSalary) ?? 60_000;

    // ── Clip path (plot area) ──────────────────────────────────────────────────
    svg.append("defs")
      .append("clipPath").attr("id", "qsc-clip")
      .append("rect")
      .attr("x", margin.left).attr("y", margin.top)
      .attr("width",  W - margin.left - margin.right)
      .attr("height", H - margin.top  - margin.bottom);

    // ── Plot-area groups (clipped; content rebuilt on zoom) ────────────────────
    const gPlot      = svg.append("g").attr("clip-path", "url(#qsc-clip)");
    const gGrid      = gPlot.append("g");
    const gQuadLines = gPlot.append("g");
    const gDots      = gPlot.append("g");

    // ── Axis groups (outside clip; rebuilt on zoom) ────────────────────────────
    const gXAxis = svg.append("g").attr("transform", `translate(0,${H - margin.bottom})`);
    const gYAxis = svg.append("g").attr("transform", `translate(${margin.left},0)`);

    // ── Fixed decorators (drawn once) ─────────────────────────────────────────
    svg.append("text")
      .attr("x", margin.left + (W - margin.left - margin.right) / 2)
      .attr("y", H - 10)
      .attr("text-anchor", "middle")
      .attr("fill", axisText).attr("font-size", "11px")
      .text("AI Exposure →");

    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -(margin.top + (H - margin.top - margin.bottom) / 2))
      .attr("y", 18)
      .attr("text-anchor", "middle")
      .attr("fill", axisText).attr("font-size", "11px")
      .text("Median Annual Salary (log) →");

    // Corner labels — always pinned to the four corners of the plot area
    const pad = 9;
    const corners = [
      { x: margin.left + pad,      y: H - margin.bottom - pad, anchor: "start", base: "auto",    text: "Lower pay · Lower exposure"  },
      { x: W - margin.right - pad, y: H - margin.bottom - pad, anchor: "end",   base: "auto",    text: "Lower pay · Higher exposure" },
      { x: margin.left + pad,      y: margin.top + pad,        anchor: "start", base: "hanging", text: "Higher pay · Lower exposure"  },
      { x: W - margin.right - pad, y: margin.top + pad,        anchor: "end",   base: "hanging", text: "Higher pay · Higher exposure" },
    ] as const;
    const gCorners = svg.append("g");
    corners.forEach((c) => {
      gCorners.append("text")
        .attr("x", c.x).attr("y", c.y)
        .attr("text-anchor", c.anchor)
        .attr("dominant-baseline", c.base)
        .attr("fill", quadLabel)
        .attr("font-size", "9px")
        .attr("font-style", "italic")
        .attr("pointer-events", "none")
        .text(c.text);
    });

    // ── Redraw helpers (called on initial draw + zoom) ─────────────────────────
    type XScale = d3.ScaleLinear<number, number>;
    type YScale = d3.ScaleLogarithmic<number, number>;

    function redrawGrid(xS: XScale, yS: YScale): void {
      gGrid.selectAll("*").remove();
      gGrid.selectAll<SVGLineElement, number>(".vg")
        .data(xS.ticks(7)).join("line").attr("class", "vg")
        .attr("x1", (v) => xS(v)).attr("x2", (v) => xS(v))
        .attr("y1", margin.top).attr("y2", H - margin.bottom)
        .attr("stroke", gridColor).attr("stroke-dasharray", "3,3");
      gGrid.selectAll<SVGLineElement, d3.NumberValue>(".hg")
        .data(yS.ticks(5)).join("line").attr("class", "hg")
        .attr("x1", margin.left).attr("x2", W - margin.right)
        .attr("y1", (v) => yS(+v)).attr("y2", (v) => yS(+v))
        .attr("stroke", gridColor).attr("stroke-dasharray", "3,3");
    }

    function redrawQuadLines(xS: XScale, yS: YScale): void {
      gQuadLines.selectAll("*").remove();
      const qx = xS(expThreshold * 100);
      const qy = yS(salThreshold);
      if (qx >= margin.left && qx <= W - margin.right) {
        gQuadLines.append("line")
          .attr("x1", qx).attr("x2", qx)
          .attr("y1", margin.top).attr("y2", H - margin.bottom)
          .attr("stroke", quadLine).attr("stroke-width", 1.5)
          .attr("stroke-dasharray", "5,4");
      }
      if (qy >= margin.top && qy <= H - margin.bottom) {
        gQuadLines.append("line")
          .attr("x1", margin.left).attr("x2", W - margin.right)
          .attr("y1", qy).attr("y2", qy)
          .attr("stroke", quadLine).attr("stroke-width", 1.5)
          .attr("stroke-dasharray", "5,4");
      }
    }

    function redrawAxes(xS: XScale, yS: YScale): void {
      gXAxis.call(
        d3.axisBottom(xS).ticks(7).tickFormat((d) => `${+d}%`),
      );
      gXAxis.select(".domain").attr("stroke", axisLine);
      gXAxis.selectAll(".tick line").attr("stroke", axisLine);
      gXAxis.selectAll("text").attr("fill", axisText).attr("font-size", "11px");

      gYAxis.call(
        d3.axisLeft(yS).ticks(5, (d: d3.NumberValue) => `$${d3.format(".2~s")(+d)}`),
      );
      gYAxis.select(".domain").attr("stroke", axisLine);
      gYAxis.selectAll(".tick line").attr("stroke", axisLine);
      gYAxis.selectAll("text").attr("fill", axisText).attr("font-size", "11px");
    }

    redrawGrid(xScale, yScale);
    redrawQuadLines(xScale, yScale);
    redrawAxes(xScale, yScale);

    // ── Dots ───────────────────────────────────────────────────────────────────
    const dots = gDots
      .selectAll<SVGCircleElement, CareerInsight>("circle.qsc-dot")
      .data(data, (d) => d.occupationCode)
      .join("circle")
      .attr("class", "qsc-dot")
      .attr("cx", (d) => xScale(d.automationProbability * 100))
      .attr("cy", (d) => yScale(d.medianSalary))
      .attr("r",  dotR)
      .attr("fill", (d) => colorForRisk(d.automationRisk))
      .attr("fill-opacity", 0.65)
      .attr("stroke", (d) => colorForRisk(d.automationRisk))
      .attr("stroke-width", 0.8)
      .attr("stroke-opacity", 0.55)
      .style("cursor", "pointer");

    // ── Entrance animation ─────────────────────────────────────────────────────
    if (!reduced) {
      dots
        .attr("r", 0)
        .transition()
        .duration(550)
        .delay((_, i) => Math.min(i * 0.4, 180))
        .ease(d3.easeBackOut.overshoot(1.2))
        .attr("r", dotR);
    }

    // ── Hover / click interactions ─────────────────────────────────────────────
    dots
      .on("mousemove", (event: MouseEvent, d) => {
        const rect = containerEl.getBoundingClientRect();
        setTooltip({
          visible: true,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          cw: containerEl.clientWidth,
          d,
        });
        d3.select(svgEl)
          .selectAll<SVGCircleElement, CareerInsight>("circle.qsc-dot")
          .attr("fill-opacity", (c) => (c.occupationCode === d.occupationCode ? 1 : 0.10))
          .attr("stroke-opacity", (c) => (c.occupationCode === d.occupationCode ? 1 : 0.06));
      })
      .on("mouseleave", () => {
        setTooltip((p) => ({ ...p, visible: false }));
        d3.select(svgEl)
          .selectAll<SVGCircleElement, CareerInsight>("circle.qsc-dot")
          .attr("fill-opacity", 0.65)
          .attr("stroke-opacity", 0.55);
      })
      .on("click", (_, d) => {
        routerRef.current.push(`/careers/${encodeURIComponent(d.occupationCode)}`);
      });

    // ── Zoom behaviour ─────────────────────────────────────────────────────────
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.4, 20])
      .extent([[margin.left, margin.top], [W - margin.right, H - margin.bottom]])
      .on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        const t    = event.transform;
        const xNew = t.rescaleX(xScale);
        const yNew = t.rescaleY(yScale) as YScale;
        setIsZoomed(t.k !== 1 || t.x !== 0 || t.y !== 0);
        redrawGrid(xNew, yNew);
        redrawQuadLines(xNew, yNew);
        redrawAxes(xNew, yNew);
        dots
          .attr("cx", (d) => xNew(d.automationProbability * 100))
          .attr("cy", (d) => yNew(d.medianSalary));
      });

    zoomRef.current = zoom;
    svg.call(zoom);

    // ── Cleanup ────────────────────────────────────────────────────────────────
    return () => {
      svg.selectAll("*").interrupt();
      svg.on(".zoom", null);
    };
  }, [data, isDark]);

  // ── Reset zoom ────────────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    const svgEl = svgRef.current;
    if (!svgEl || !zoomRef.current) return;
    d3.select<SVGSVGElement, unknown>(svgEl)
      .transition()
      .duration(350)
      .call(zoomRef.current.transform, d3.zoomIdentity);
    setIsZoomed(false);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="relative w-full overflow-x-auto">
      {/* Main chart */}
      <svg
        ref={svgRef}
        className="w-full h-auto"
        style={{ minHeight: 320 }}
        role="img"
        aria-label="Exposure × Pay quadrant scatter of all occupations: AI exposure (x-axis) vs median annual salary (y-axis, log scale), coloured by automation risk. Scroll or pinch to zoom; click a dot to explore that occupation."
      />

      {/* Reset zoom button — appears only when zoomed */}
      {isZoomed && (
        <button
          onClick={handleReset}
          className="absolute top-2 right-2 rounded-md border px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-80"
          style={{
            background:         isDark ? "rgba(9,9,11,0.85)"     : "rgba(255,255,255,0.92)",
            borderColor:        isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)",
            color:              isDark ? "#a1a1aa"                : "#52525b",
            backdropFilter:     "blur(8px)",
          }}
          aria-label="Reset zoom to default view"
        >
          Reset zoom
        </button>
      )}

      {/* Glass tooltip */}
      {tooltip.visible && (
        <div
          className="pointer-events-none absolute z-50 rounded-xl border px-3.5 py-3 text-sm"
          style={{
            left:               tooltip.x > tooltip.cw * 0.60 ? tooltip.x - 232 : tooltip.x + 14,
            top:                tooltip.y,
            transform:          "translateY(-50%)",
            background:         isDark ? "rgba(9,9,11,0.93)"    : "rgba(255,255,255,0.95)",
            backdropFilter:     "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderColor:        colorForRisk(tooltip.d.automationRisk) + "55",
            minWidth:           220,
            boxShadow:          isDark ? "0 4px 28px rgba(0,0,0,0.55)" : "0 4px 16px rgba(0,0,0,0.10)",
          }}
        >
          <p className="font-semibold text-zinc-900 dark:text-white text-sm mb-0.5 leading-tight">
            {tooltip.d.occupationName}
          </p>
          <p className="text-[11px] text-zinc-500 mb-2">{tooltip.d.sectorName}</p>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">AI Exposure</span>
              <span className="font-semibold" style={{ color: colorForRisk(tooltip.d.automationRisk) }}>
                {(tooltip.d.automationProbability * 100).toFixed(1)}%{" — "}{tooltip.d.automationRisk}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">Salary</span>
              <span className="font-semibold text-zinc-900 dark:text-white">
                ${tooltip.d.medianSalary.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">Employment</span>
              <span className="text-zinc-900 dark:text-white">
                {tooltip.d.totalEmployment != null
                  ? tooltip.d.totalEmployment.toLocaleString()
                  : "—"}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-zinc-500 mt-2.5">Click to explore occupation →</p>
        </div>
      )}

      {/* Risk-band legend */}
      <div className="absolute bottom-2 right-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-zinc-500 dark:text-zinc-400 pointer-events-none select-none">
        {(
          [
            ["#22c55e", "Low"],
            ["#eab308", "Medium"],
            ["#f97316", "High"],
            ["#ef4444", "Very High"],
          ] as const
        ).map(([color, label]) => (
          <span key={label} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
        <span className="ml-1 text-zinc-600 dark:text-zinc-500">dot size = employment</span>
      </div>

      {/* Screen-reader accessible occupation list */}
      <ul className="sr-only" aria-label="Occupations">
        {data.map((d) => (
          <li key={d.occupationCode}>
            <a href={`/careers/${encodeURIComponent(d.occupationCode)}`}>
              {d.occupationName}: {(d.automationProbability * 100).toFixed(1)}% AI exposure,{" "}
              {fmtSalary(d.medianSalary)} median salary, risk {d.automationRisk}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
