"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import * as d3 from "d3";
import { getOccupationTrend } from "@/lib/data";

// ── Brand colours ─────────────────────────────────────────────────────────────
const VIOLET = "#8b5cf6";
const CYAN   = "#22d3ee";

// ── Types ─────────────────────────────────────────────────────────────────────
type TrendPoint = { year: number; employment: number | null; wage: number | null };

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  cw: number;
  year: number;
  employment: number | null;
  wage: number | null;
}

interface OccupationTrendChartProps {
  code: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtEmp(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

function fmtWage(v: number): string {
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function OccupationTrendChart({ code }: OccupationTrendChartProps) {
  const svgRef       = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const isDark = (resolvedTheme ?? "dark") !== "light";

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, cw: 720, year: 0, employment: null, wage: null,
  });

  const data = useMemo<TrendPoint[]>(() => getOccupationTrend(code), [code]);

  const hasData = useMemo(() => {
    const vEmp  = data.filter((d) => d.employment != null).length;
    const vWage = data.filter((d) => d.wage != null).length;
    return vEmp >= 2 || vWage >= 2;
  }, [data]);

  const ariaLabel = useMemo(() => {
    if (data.length === 0) return `No historical trend data for occupation ${code}`;
    return `Employment and wage trend for occupation ${code}, ${data[0].year}–${data[data.length - 1].year}`;
  }, [code, data]);

  // ── D3 effect ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    const validEmp  = data.filter((d) => d.employment != null);
    const validWage = data.filter((d) => d.wage != null);

    // ── Insufficient data fallback ───────────────────────────────────────────
    if (validEmp.length < 2 && validWage.length < 2) {
      svg.attr("viewBox", "0 0 720 100");
      svg.append("text")
        .attr("x", 360).attr("y", 50)
        .attr("text-anchor", "middle")
        .attr("fill", "#71717a")
        .attr("font-size", "14px")
        .text("Insufficient history");
      return () => { svg.selectAll("*").interrupt(); };
    }

    const reduced = typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

    // Theme-aware colors
    const axisText  = isDark ? "#71717a" : "#52525b";
    const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
    const axisLine  = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)";
    const tickLine  = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
    const dotStroke = isDark ? "#09090b" : "#ffffff";
    const legendText = isDark ? "#a1a1aa" : "#52525b";

    // ── Layout ───────────────────────────────────────────────────────────────
    const W = 720, H = 300;
    const M = { top: 36, right: 62, bottom: 36, left: 62 };
    const iW = W - M.left - M.right;   // 596
    const iH = H - M.top  - M.bottom;  // 228
    svg.attr("viewBox", `0 0 ${W} ${H}`);

    // ── Defs ─────────────────────────────────────────────────────────────────
    const defs = svg.append("defs");

    const empGrad = defs.append("linearGradient")
      .attr("id", "otc-emp-area")
      .attr("x1", "0").attr("y1", "0").attr("x2", "0").attr("y2", "1");
    empGrad.append("stop").attr("offset", "0%").attr("stop-color", VIOLET).attr("stop-opacity", "0.30");
    empGrad.append("stop").attr("offset", "100%").attr("stop-color", VIOLET).attr("stop-opacity", "0.02");

    const wageGrad = defs.append("linearGradient")
      .attr("id", "otc-wage-area")
      .attr("x1", "0").attr("y1", "0").attr("x2", "0").attr("y2", "1");
    wageGrad.append("stop").attr("offset", "0%").attr("stop-color", CYAN).attr("stop-opacity", "0.25");
    wageGrad.append("stop").attr("offset", "100%").attr("stop-color", CYAN).attr("stop-opacity", "0.02");

    defs.append("clipPath").attr("id", "otc-clip")
      .append("rect").attr("width", iW).attr("height", iH + 2);

    // ── Scales ───────────────────────────────────────────────────────────────
    const xDomain = d3.extent(data, (d) => d.year) as [number, number];
    const xScale  = d3.scaleLinear().domain(xDomain).range([0, iW]);

    const empVals    = validEmp.map((d) => d.employment as number);
    const empExtent  = d3.extent(empVals) as [number, number];
    const empPad     = ((empExtent[1] - empExtent[0]) * 0.15) || empExtent[0] * 0.10;
    const yEmp       = d3.scaleLinear()
      .domain([Math.max(0, empExtent[0] - empPad), empExtent[1] + empPad])
      .range([iH, 0]).nice();

    const wageVals   = validWage.map((d) => d.wage as number);
    const wageExtent = d3.extent(wageVals) as [number, number];
    const wagePad    = ((wageExtent[1] - wageExtent[0]) * 0.15) || wageExtent[0] * 0.10;
    const yWage      = d3.scaleLinear()
      .domain([Math.max(0, wageExtent[0] - wagePad), wageExtent[1] + wagePad])
      .range([iH, 0]).nice();

    // ── Chart group ──────────────────────────────────────────────────────────
    const g = svg.append("g").attr("transform", `translate(${M.left},${M.top})`);

    // Horizontal grid lines
    const gridScale = validEmp.length >= 2 ? yEmp : yWage;
    g.append("g")
      .call(d3.axisLeft(gridScale).ticks(5).tickSize(-iW).tickFormat(() => ""))
      .call((gg) => {
        gg.select(".domain").remove();
        gg.selectAll(".tick line")
          .attr("stroke", gridColor)
          .attr("stroke-dasharray", "3,5");
      });

    // ── X Axis ───────────────────────────────────────────────────────────────
    g.append("g")
      .attr("transform", `translate(0,${iH})`)
      .call(
        d3.axisBottom(xScale)
          .ticks(Math.min(data.length, 7))
          .tickFormat((d) => String(d as number))
      )
      .call((gg) => {
        gg.select(".domain").attr("stroke", axisLine);
        gg.selectAll(".tick line").attr("stroke", tickLine);
        gg.selectAll("text").attr("fill", axisText).attr("font-size", "11px");
      });

    // ── Left Y Axis (employment — violet) ────────────────────────────────────
    if (validEmp.length >= 2) {
      g.append("g")
        .call(d3.axisLeft(yEmp).ticks(5).tickFormat((d) => fmtEmp(d as number)))
        .call((gg) => {
          gg.select(".domain").attr("stroke", "rgba(139,92,246,0.35)");
          gg.selectAll(".tick line").attr("stroke", tickLine);
          gg.selectAll("text").attr("fill", VIOLET).attr("font-size", "10px");
        });
    }

    // ── Right Y Axis (wage — cyan) ────────────────────────────────────────────
    if (validWage.length >= 2) {
      g.append("g")
        .attr("transform", `translate(${iW},0)`)
        .call(d3.axisRight(yWage).ticks(5).tickFormat((d) => fmtWage(d as number)))
        .call((gg) => {
          gg.select(".domain").attr("stroke", "rgba(34,211,238,0.35)");
          gg.selectAll(".tick line").attr("stroke", tickLine);
          gg.selectAll("text").attr("fill", CYAN).attr("font-size", "10px");
        });
    }

    // ── Clipped drawing area ──────────────────────────────────────────────────
    const chart = g.append("g").attr("clip-path", "url(#otc-clip)");

    // ── Employment area + line ────────────────────────────────────────────────
    if (validEmp.length >= 2) {
      const areaEmp = d3.area<TrendPoint>()
        .defined((d) => d.employment != null)
        .x((d) => xScale(d.year))
        .y0(iH)
        .y1((d) => yEmp(d.employment as number))
        .curve(d3.curveMonotoneX);

      const lineEmp = d3.line<TrendPoint>()
        .defined((d) => d.employment != null)
        .x((d) => xScale(d.year))
        .y((d) => yEmp(d.employment as number))
        .curve(d3.curveMonotoneX);

      chart.append("path")
        .datum(data)
        .attr("fill", "url(#otc-emp-area)")
        .attr("d", areaEmp);

      const empPath = chart.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", VIOLET)
        .attr("stroke-width", 2.5)
        .attr("stroke-linejoin", "round")
        .attr("d", lineEmp);

      if (!reduced) {
        const len = (empPath.node() as SVGPathElement).getTotalLength();
        empPath
          .attr("stroke-dasharray", `${len} ${len}`)
          .attr("stroke-dashoffset", len)
          .transition().duration(900).ease(d3.easeCubicOut)
          .attr("stroke-dashoffset", 0);
      }

      chart.selectAll<SVGCircleElement, TrendPoint>("circle.otc-emp-dot")
        .data(validEmp)
        .join("circle")
        .attr("class", "otc-emp-dot")
        .attr("cx", (d) => xScale(d.year))
        .attr("cy", (d) => yEmp(d.employment as number))
        .attr("r", 3.5)
        .attr("fill", VIOLET)
        .attr("stroke", dotStroke)
        .attr("stroke-width", 1.5)
        .attr("opacity", reduced ? 1 : 0)
        .transition()
        .duration(reduced ? 0 : 400)
        .delay((_, i) => (reduced ? 0 : 900 + i * 60))
        .attr("opacity", 1);
    }

    // ── Wage area + line ──────────────────────────────────────────────────────
    if (validWage.length >= 2) {
      const areaWage = d3.area<TrendPoint>()
        .defined((d) => d.wage != null)
        .x((d) => xScale(d.year))
        .y0(iH)
        .y1((d) => yWage(d.wage as number))
        .curve(d3.curveMonotoneX);

      const lineWage = d3.line<TrendPoint>()
        .defined((d) => d.wage != null)
        .x((d) => xScale(d.year))
        .y((d) => yWage(d.wage as number))
        .curve(d3.curveMonotoneX);

      chart.append("path")
        .datum(data)
        .attr("fill", "url(#otc-wage-area)")
        .attr("d", areaWage);

      const wagePath = chart.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", CYAN)
        .attr("stroke-width", 2.5)
        .attr("stroke-linejoin", "round")
        .attr("d", lineWage);

      if (!reduced) {
        const len = (wagePath.node() as SVGPathElement).getTotalLength();
        wagePath
          .attr("stroke-dasharray", `${len} ${len}`)
          .attr("stroke-dashoffset", len)
          .transition().duration(900).delay(200).ease(d3.easeCubicOut)
          .attr("stroke-dashoffset", 0);
      }

      chart.selectAll<SVGCircleElement, TrendPoint>("circle.otc-wage-dot")
        .data(validWage)
        .join("circle")
        .attr("class", "otc-wage-dot")
        .attr("cx", (d) => xScale(d.year))
        .attr("cy", (d) => yWage(d.wage as number))
        .attr("r", 3.5)
        .attr("fill", CYAN)
        .attr("stroke", dotStroke)
        .attr("stroke-width", 1.5)
        .attr("opacity", reduced ? 1 : 0)
        .transition()
        .duration(reduced ? 0 : 400)
        .delay((_, i) => (reduced ? 0 : 1100 + i * 60))
        .attr("opacity", 1);
    }

    // ── Legend ────────────────────────────────────────────────────────────────
    const showEmp  = validEmp.length >= 2;
    const showWage = validWage.length >= 2;
    const legendW  = (showEmp ? 105 : 0) + (showEmp && showWage ? 20 : 0) + (showWage ? 105 : 0);
    let lx = (W - legendW) / 2;
    const legendG = svg.append("g").attr("transform", "translate(0,10)");

    if (showEmp) {
      legendG.append("rect").attr("x", lx).attr("y", 4)
        .attr("width", 22).attr("height", 3).attr("rx", 1.5).attr("fill", VIOLET);
      legendG.append("text").attr("x", lx + 28).attr("y", 8)
        .attr("dominant-baseline", "middle")
        .attr("fill", legendText).attr("font-size", "11px")
        .text("Employment");
      lx += 105 + 20;
    }

    if (showWage) {
      legendG.append("rect").attr("x", lx).attr("y", 4)
        .attr("width", 22).attr("height", 3).attr("rx", 1.5).attr("fill", CYAN);
      legendG.append("text").attr("x", lx + 28).attr("y", 8)
        .attr("dominant-baseline", "middle")
        .attr("fill", legendText).attr("font-size", "11px")
        .text("Median Wage");
    }

    // ── Hover overlay ─────────────────────────────────────────────────────────
    const bisectYear = d3.bisector<TrendPoint, number>((d) => d.year).center;

    g.append("rect")
      .attr("width", iW).attr("height", iH)
      .attr("fill", "transparent")
      .style("cursor", "crosshair")
      .on("mousemove", (event: MouseEvent) => {
        const containerEl = containerRef.current;
        if (!containerEl) return;
        const [mx] = d3.pointer(event);
        const yearVal = xScale.invert(mx);
        const idx = Math.max(0, Math.min(data.length - 1, bisectYear(data, yearVal)));
        const pt = data[idx];
        if (!pt) return;
        const rect = containerEl.getBoundingClientRect();
        setTooltip({
          visible: true,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          cw: containerEl.clientWidth,
          year: pt.year,
          employment: pt.employment,
          wage: pt.wage,
        });
      })
      .on("mouseleave", () => setTooltip((p) => ({ ...p, visible: false })));

    return () => { svg.selectAll("*").interrupt(); };
  }, [data, isDark]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="relative w-full">
      <svg
        ref={svgRef}
        className="w-full h-auto"
        style={{ minHeight: hasData ? 200 : 60 }}
        role="img"
        aria-label={ariaLabel}
      >
        <title>Occupation Employment &amp; Wage Trend</title>
      </svg>

      {/* Screen-reader data table */}
      <span className="sr-only">
        {`Multi-year BLS OEWS history for SOC ${code}: `}
        {data.map((d) =>
          `${d.year} — employment: ${d.employment != null ? d.employment.toLocaleString() : "N/A"}, ` +
          `median wage: ${d.wage != null ? `$${d.wage.toLocaleString()}` : "N/A"}`
        ).join("; ")}
        {"."}
      </span>

      {/* Glass tooltip */}
      {tooltip.visible && (
        <div
          className="pointer-events-none absolute z-50 rounded-xl border px-3.5 py-3 text-sm"
          style={{
            left: tooltip.x > tooltip.cw * 0.65 ? tooltip.x - 195 : tooltip.x + 14,
            top: tooltip.y,
            transform: "translateY(-50%)",
            background: isDark ? "rgba(9,9,11,0.93)" : "rgba(255,255,255,0.95)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderColor: "rgba(139,92,246,0.35)",
            minWidth: 185,
            boxShadow: isDark ? "0 4px 28px rgba(0,0,0,0.55)" : "0 4px 16px rgba(0,0,0,0.10)",
          }}
        >
          <p className="font-semibold text-zinc-900 dark:text-white mb-1.5">{tooltip.year}</p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between gap-4">
              <span style={{ color: VIOLET }}>Employment</span>
              <span className="font-semibold text-zinc-900 dark:text-white">
                {tooltip.employment != null ? tooltip.employment.toLocaleString() : "—"}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span style={{ color: CYAN }}>Median Wage</span>
              <span className="font-semibold text-zinc-900 dark:text-white">
                {tooltip.wage != null ? `$${tooltip.wage.toLocaleString()}` : "—"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
