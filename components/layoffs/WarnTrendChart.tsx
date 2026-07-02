"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import * as d3 from "d3";
import type { WarnMonth } from "@/lib/warn-types";
import { useT } from "@/lib/i18n/useT";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMonth(ym: string): string {
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function fmtMonthShort(ym: string): string {
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

function fmtK(n: number): string {
  if (n >= 10_000) return `${(n / 1_000).toFixed(0)}K`;
  if (n >= 1_000)  return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  cw: number;
  d: WarnMonth | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function WarnTrendChart({ byMonth }: { byMonth: WarnMonth[] }) {
  const t            = useT("layoffs");
  const svgRef       = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { resolvedTheme } = useTheme();
  const isDark = (resolvedTheme ?? "dark") !== "light";

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, cw: 700, d: null,
  });

  // Extract i18n labels so they appear in the effect deps array
  const labelEmployees = t("axisEmployees");
  const labelNotices   = t("axisNotices");

  // ── D3 draw ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const svgEl       = svgRef.current;
    const containerEl = containerRef.current;
    if (!svgEl || !containerEl || byMonth.length === 0) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const svg     = d3.select<SVGSVGElement, unknown>(svgEl);

    // ── Theme-aware colours ──────────────────────────────────────────────────
    const axisText  = isDark ? "#71717a" : "#52525b";
    const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
    const axisLine  = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";
    const barColor  = isDark ? "#7c3aed" : "#8b5cf6";
    const lineColor = isDark ? "#f59e0b" : "#d97706";

    svg.selectAll("*").remove();

    // ── Dimensions ───────────────────────────────────────────────────────────
    const W      = 700;
    const H      = 320;
    const margin = { top: 28, right: 58, bottom: 72, left: 74 };
    svg.attr("viewBox", `0 0 ${W} ${H}`);

    // ── Scales ───────────────────────────────────────────────────────────────
    const xScale = d3.scaleBand()
      .domain(byMonth.map((d) => d.month))
      .range([margin.left, W - margin.right])
      .padding(0.28);

    const maxEmp = d3.max(byMonth, (d) => d.employees) ?? 1;
    const yScale = d3.scaleLinear()
      .domain([0, maxEmp * 1.15])
      .range([H - margin.bottom, margin.top])
      .nice();

    const maxNotices = d3.max(byMonth, (d) => d.notices) ?? 1;
    const yScaleN = d3.scaleLinear()
      .domain([0, maxNotices * 1.15])
      .range([H - margin.bottom, margin.top])
      .nice();

    // ── Clip path ────────────────────────────────────────────────────────────
    svg.append("defs")
      .append("clipPath").attr("id", "wtc-clip")
      .append("rect")
      .attr("x", margin.left).attr("y", margin.top)
      .attr("width",  W - margin.left - margin.right)
      .attr("height", H - margin.top  - margin.bottom);

    const gPlot = svg.append("g").attr("clip-path", "url(#wtc-clip)");

    // ── Horizontal grid lines ─────────────────────────────────────────────────
    gPlot.selectAll<SVGLineElement, number>(".hg")
      .data(yScale.ticks(5))
      .join("line").attr("class", "hg")
      .attr("x1", margin.left).attr("x2", W - margin.right)
      .attr("y1", (v) => yScale(v)).attr("y2", (v) => yScale(v))
      .attr("stroke", gridColor).attr("stroke-dasharray", "3,3");

    // ── Bars — employees ──────────────────────────────────────────────────────
    const bars = gPlot.selectAll<SVGRectElement, WarnMonth>("rect.wtc-bar")
      .data(byMonth)
      .join("rect").attr("class", "wtc-bar")
      .attr("x",     (d) => xScale(d.month)!)
      .attr("width", xScale.bandwidth())
      .attr("fill",  barColor)
      .attr("fill-opacity", 0.85)
      .attr("rx", 2);

    if (reduced) {
      bars
        .attr("y",      (d) => yScale(d.employees))
        .attr("height", (d) => H - margin.bottom - yScale(d.employees));
    } else {
      bars
        .attr("y",      H - margin.bottom)
        .attr("height", 0)
        .transition()
        .duration(480)
        .delay((_, i) => i * 22)
        .ease(d3.easeQuadOut)
        .attr("y",      (d) => yScale(d.employees))
        .attr("height", (d) => H - margin.bottom - yScale(d.employees));
    }

    // ── Line — notice count ───────────────────────────────────────────────────
    const lineGen = d3.line<WarnMonth>()
      .x((d) => (xScale(d.month) ?? 0) + xScale.bandwidth() / 2)
      .y((d) => yScaleN(d.notices))
      .curve(d3.curveMonotoneX);

    gPlot.append("path")
      .datum(byMonth)
      .attr("fill",           "none")
      .attr("stroke",         lineColor)
      .attr("stroke-width",   2.5)
      .attr("stroke-linejoin","round")
      .attr("stroke-linecap", "round")
      .attr("d", lineGen);

    // Dots on line
    gPlot.selectAll<SVGCircleElement, WarnMonth>("circle.wtc-dot")
      .data(byMonth)
      .join("circle").attr("class", "wtc-dot")
      .attr("cx", (d) => (xScale(d.month) ?? 0) + xScale.bandwidth() / 2)
      .attr("cy", (d) => yScaleN(d.notices))
      .attr("r",  4)
      .attr("fill",         lineColor)
      .attr("stroke",       isDark ? "#18181b" : "#ffffff")
      .attr("stroke-width", 1.5);

    // ── X axis ────────────────────────────────────────────────────────────────
    const gX = svg.append("g").attr("transform", `translate(0,${H - margin.bottom})`);
    gX.call(
      d3.axisBottom(xScale).tickFormat((d) => fmtMonthShort(d as string)),
    );
    gX.select(".domain").attr("stroke", axisLine);
    gX.selectAll(".tick line").attr("stroke", axisLine);
    gX.selectAll<SVGTextElement, string>("text")
      .attr("fill", axisText)
      .attr("font-size", "10px")
      .attr("transform", "rotate(-40)")
      .attr("text-anchor", "end")
      .attr("dx", "-0.5em")
      .attr("dy", "0.35em");

    // ── Y axis left (employees) ───────────────────────────────────────────────
    const gYL = svg.append("g").attr("transform", `translate(${margin.left},0)`);
    gYL.call(d3.axisLeft(yScale).ticks(5).tickFormat((v) => fmtK(+v)));
    gYL.select(".domain").attr("stroke", axisLine);
    gYL.selectAll(".tick line").attr("stroke", axisLine);
    gYL.selectAll("text").attr("fill", axisText).attr("font-size", "10px");

    // Y axis label left
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -(margin.top + (H - margin.top - margin.bottom) / 2))
      .attr("y", 16)
      .attr("text-anchor", "middle")
      .attr("fill", axisText)
      .attr("font-size", "10px")
      .text(labelEmployees);

    // ── Y axis right (notices) ────────────────────────────────────────────────
    const gYR = svg.append("g").attr("transform", `translate(${W - margin.right},0)`);
    gYR.call(d3.axisRight(yScaleN).ticks(5));
    gYR.select(".domain").attr("stroke", axisLine);
    gYR.selectAll(".tick line").attr("stroke", axisLine);
    gYR.selectAll("text").attr("fill", axisText).attr("font-size", "10px");

    // Y axis label right
    svg.append("text")
      .attr("transform", "rotate(90)")
      .attr("x", margin.top + (H - margin.top - margin.bottom) / 2)
      .attr("y", -(W - margin.right + 40))
      .attr("text-anchor", "middle")
      .attr("fill", axisText)
      .attr("font-size", "10px")
      .text(labelNotices);

    // ── Hover overlay (transparent rects over each bar column) ────────────────
    svg.append("g")
      .selectAll<SVGRectElement, WarnMonth>("rect.wtc-overlay")
      .data(byMonth)
      .join("rect").attr("class", "wtc-overlay")
      .attr("x",      (d) => xScale(d.month)!)
      .attr("width",  xScale.bandwidth())
      .attr("y",      margin.top)
      .attr("height", H - margin.top - margin.bottom)
      .attr("fill",   "transparent")
      .style("cursor", "pointer")
      .on("mousemove", (event: MouseEvent, d) => {
        const rect = containerEl.getBoundingClientRect();
        setTooltip({
          visible: true,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          cw: containerEl.clientWidth,
          d,
        });
        svg.selectAll<SVGRectElement, WarnMonth>("rect.wtc-bar")
          .attr("fill-opacity", (c) => (c.month === d.month ? 1 : 0.30));
      })
      .on("mouseleave", () => {
        setTooltip((prev) => ({ ...prev, visible: false }));
        svg.selectAll<SVGRectElement, WarnMonth>("rect.wtc-bar")
          .attr("fill-opacity", 0.85);
      });

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      svg.selectAll("*").interrupt();
    };
  }, [byMonth, isDark, labelEmployees, labelNotices]);

  // ── Peak month (for sr-only summary) ────────────────────────────────────────
  const peak = byMonth.length
    ? byMonth.reduce((a, b) => (a.employees > b.employees ? a : b))
    : null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="relative w-full overflow-x-auto">
      <svg
        ref={svgRef}
        className="w-full h-auto"
        style={{ minHeight: 220 }}
        role="img"
        aria-label={t("srChartLabel")}
      />

      {/* Legend */}
      <div className="flex items-center gap-5 mt-2 text-[11px] text-zinc-500 dark:text-zinc-400 justify-end pr-2 pointer-events-none select-none">
        <span className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: isDark ? "#7c3aed" : "#8b5cf6" }}
          />
          {t("employees")}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="block w-4 h-0.5 rounded"
            style={{ backgroundColor: isDark ? "#f59e0b" : "#d97706" }}
          />
          {t("notices")}
        </span>
      </div>

      {/* Tooltip */}
      {tooltip.visible && tooltip.d && (
        <div
          className="pointer-events-none absolute z-50 rounded-xl border px-3.5 py-3 text-sm"
          style={{
            left:               tooltip.x > tooltip.cw * 0.60 ? tooltip.x - 200 : tooltip.x + 14,
            top:                tooltip.y,
            transform:          "translateY(-50%)",
            background:         isDark ? "rgba(9,9,11,0.95)" : "rgba(255,255,255,0.97)",
            backdropFilter:     "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderColor:        isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)",
            minWidth:           190,
            boxShadow:          isDark ? "0 4px 28px rgba(0,0,0,0.55)" : "0 4px 16px rgba(0,0,0,0.10)",
          }}
        >
          <p className="font-semibold text-zinc-900 dark:text-white mb-2">
            {fmtMonth(tooltip.d.month)}
          </p>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between gap-6">
              <span className="text-zinc-500">{t("employees")}</span>
              <span
                className="font-semibold"
                style={{ color: isDark ? "#7c3aed" : "#8b5cf6" }}
              >
                {tooltip.d.employees.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-zinc-500">{t("notices")}</span>
              <span
                className="font-semibold"
                style={{ color: isDark ? "#f59e0b" : "#d97706" }}
              >
                {tooltip.d.notices}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Screen-reader accessible summary */}
      <p className="sr-only">
        {peak
          ? t("srChartSummary", {
              months:        String(byMonth.length),
              peakMonth:     fmtMonth(peak.month),
              peakEmployees: peak.employees.toLocaleString(),
            })
          : ""}
      </p>
    </div>
  );
}
