"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useTheme } from "next-themes";
import * as d3 from "d3";
import {
  getComputeModels,
  getModernEraRegression,
  formatFlop,
} from "@/lib/ai-frontier";
import type { AIFrontierModel } from "@/lib/ai-frontier";
import { useT } from "@/lib/i18n/useT";

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  cw: number;
  model: AIFrontierModel;
}

const EMPTY_MODEL: AIFrontierModel = {
  name: "",
  organization: "",
  orgCategory: null,
  country: null,
  countries: [],
  date: "",
  year: 2000,
  decimalYear: 2000,
  domains: [],
  task: null,
  parameters: null,
  computeFlop: 1,
  log10Compute: 0,
  trainingCostUsd2023: null,
  powerDrawW: null,
  frontier: false,
  openWeights: null,
  accessibility: null,
  confidence: null,
  link: null,
};

export default function ComputeTimelineChart() {
  const t = useT("frontier");
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const isDark = (resolvedTheme ?? "dark") !== "light";

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    cw: 700,
    model: EMPTY_MODEL,
  });

  const allModels = useMemo(() => getComputeModels(), []);
  const regression = useMemo(() => getModernEraRegression(), []);

  const labelAxisDate = t("axisDate");
  const labelAxisCompute = t("axisCompute");
  const labelAnnotation = t("timelineAnnotation");
  const labelLegendAll = t("legendAll");
  const labelLegendFrontier = t("legendFrontier");
  const labelLegendTrend = t("legendTrend");

  useEffect(() => {
    const svgEl = svgRef.current;
    const containerEl = containerRef.current;
    if (!svgEl || !containerEl || allModels.length === 0) return;

    const svg = d3.select(svgEl);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Theme-aware colors
    const axisText = isDark ? "#71717a" : "#52525b";
    const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
    const axisLine = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";
    const bgAnnot = isDark ? "rgba(9,9,11,0.80)" : "rgba(255,255,255,0.85)";
    const colorAll = isDark ? "rgba(139,92,246,0.45)" : "rgba(139,92,246,0.55)";
    const strokeAll = isDark ? "rgba(139,92,246,0.70)" : "rgba(124,58,237,0.75)";
    const colorFrontier = isDark ? "#f59e0b" : "#d97706";
    const colorTrend = isDark ? "rgba(251,191,36,0.85)" : "rgba(217,119,6,0.90)";

    svg.selectAll("*").remove();

    const W = 860;
    const H = 500;
    const margin = { top: 30, right: 40, bottom: 60, left: 80 };
    svg.attr("viewBox", `0 0 ${W} ${H}`);

    // ── Scales ──────────────────────────────────────────────────────────────
    const xExtent = d3.extent(allModels, (d) => d.decimalYear) as [number, number];
    const xScale = d3
      .scaleLinear()
      .domain([Math.floor(xExtent[0]) - 0.5, Math.ceil(xExtent[1]) + 0.5])
      .range([margin.left, W - margin.right]);

    const yMin = Math.floor(d3.min(allModels, (d) => d.log10Compute) ?? 0) - 0.5;
    const yMax = Math.ceil(d3.max(allModels, (d) => d.log10Compute) ?? 30) + 1;
    const yScale = d3
      .scaleLinear()
      .domain([yMin, yMax])
      .range([H - margin.bottom, margin.top]);

    // ── Grid lines ──────────────────────────────────────────────────────────
    const gridTicks = Array.from(
      { length: Math.ceil(yMax) - Math.floor(yMin) + 1 },
      (_, i) => Math.floor(yMin) + i,
    ).filter((v) => v >= yMin && v <= yMax);

    const gridG = svg.append("g").attr("class", "grid");
    for (const v of gridTicks) {
      gridG
        .append("line")
        .attr("x1", margin.left)
        .attr("x2", W - margin.right)
        .attr("y1", yScale(v))
        .attr("y2", yScale(v))
        .attr("stroke", gridColor)
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "3,3");
    }

    // ── Trend line (modern era only) ─────────────────────────────────────────
    if (regression != null) {
      const { slopeLog10PerYear, intercept, startYear, endYear } = regression;
      const trendPoints: Array<[number, number]> = [];
      for (let yr = startYear; yr <= endYear + 0.5; yr += 0.25) {
        const log10 = slopeLog10PerYear * yr + intercept;
        if (log10 >= yMin && log10 <= yMax) {
          trendPoints.push([yr, log10]);
        }
      }
      const line = d3
        .line<[number, number]>()
        .x((d) => xScale(d[0]))
        .y((d) => yScale(d[1]))
        .curve(d3.curveBasis);

      svg
        .append("path")
        .datum(trendPoints)
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", colorTrend)
        .attr("stroke-width", 2.5)
        .attr("stroke-dasharray", "7,4")
        .attr("opacity", 0.85);

      // Trend annotation label
      const midYr = (startYear + endYear) / 2;
      const midLog10 = slopeLog10PerYear * midYr + intercept;
      const annotX = xScale(midYr - 3);
      const annotY = yScale(midLog10 + 2.5);
      if (annotX > margin.left && annotX < W - margin.right - 60) {
        svg
          .append("text")
          .attr("x", annotX)
          .attr("y", annotY)
          .attr("text-anchor", "middle")
          .attr("fill", colorTrend)
          .attr("font-size", "11px")
          .attr("font-style", "italic")
          .attr("paint-order", "stroke")
          .attr("stroke", bgAnnot)
          .attr("stroke-width", 4)
          .attr("stroke-linejoin", "round")
          .text(labelAnnotation);
      }
    }

    // ── Non-frontier dots ────────────────────────────────────────────────────
    const nonFrontier = allModels.filter((d) => !d.frontier);
    const frontierModels = allModels.filter((d) => d.frontier);

    const nonFrontierG = svg.append("g").attr("class", "non-frontier");
    nonFrontierG
      .selectAll<SVGCircleElement, AIFrontierModel>("circle")
      .data(nonFrontier)
      .join("circle")
      .attr("cx", (d) => xScale(d.decimalYear))
      .attr("cy", (d) => yScale(d.log10Compute))
      .attr("r", 3.5)
      .attr("fill", colorAll)
      .attr("stroke", strokeAll)
      .attr("stroke-width", 0.8)
      .style("cursor", "pointer");

    // ── Frontier dots ────────────────────────────────────────────────────────
    const frontierG = svg.append("g").attr("class", "frontier-dots");
    // Glow ring
    frontierG
      .selectAll<SVGCircleElement, AIFrontierModel>("circle.glow")
      .data(frontierModels)
      .join("circle")
      .attr("class", "glow")
      .attr("cx", (d) => xScale(d.decimalYear))
      .attr("cy", (d) => yScale(d.log10Compute))
      .attr("r", 8)
      .attr("fill", "none")
      .attr("stroke", colorFrontier)
      .attr("stroke-width", 1)
      .attr("opacity", 0.3);

    const frontierDots = frontierG
      .selectAll<SVGCircleElement, AIFrontierModel>("circle.dot")
      .data(frontierModels)
      .join("circle")
      .attr("class", "dot")
      .attr("cx", (d) => xScale(d.decimalYear))
      .attr("cy", (d) => yScale(d.log10Compute))
      .attr("r", 5.5)
      .attr("fill", colorFrontier)
      .attr("fill-opacity", 0.85)
      .attr("stroke", colorFrontier)
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer");

    // Entrance animation
    if (!reduced) {
      frontierDots
        .attr("r", 0)
        .transition()
        .duration(500)
        .delay((_, i) => i * 15)
        .ease(d3.easeBackOut.overshoot(1.2))
        .attr("r", 5.5);
    }

    // ── Axes ────────────────────────────────────────────────────────────────
    const xAxisYears = Array.from(
      { length: Math.ceil(xExtent[1]) - Math.floor(xExtent[0]) + 1 },
      (_, i) => Math.floor(xExtent[0]) + i,
    ).filter((y) => y % 5 === 0);

    const xAxisG = svg
      .append("g")
      .attr("transform", `translate(0,${H - margin.bottom})`)
      .call(
        d3
          .axisBottom(xScale)
          .tickValues(xAxisYears)
          .tickFormat((d) => String(Math.round(d as number))),
      );
    xAxisG.select(".domain").attr("stroke", axisLine);
    xAxisG.selectAll(".tick line").attr("stroke", axisLine);
    xAxisG
      .selectAll("text")
      .attr("fill", axisText)
      .attr("font-size", "11px");

    svg
      .append("text")
      .attr("x", margin.left + (W - margin.left - margin.right) / 2)
      .attr("y", H - 10)
      .attr("text-anchor", "middle")
      .attr("fill", axisText)
      .attr("font-size", "11px")
      .text(labelAxisDate);

    const yAxisG = svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(
        d3
          .axisLeft(yScale)
          .tickValues(gridTicks.filter((v) => v % 5 === 0 || (v >= 0 && v <= 5)))
          .tickFormat((d) => `10^${d}`),
      );
    yAxisG.select(".domain").attr("stroke", axisLine);
    yAxisG.selectAll(".tick line").attr("stroke", axisLine);
    yAxisG
      .selectAll("text")
      .attr("fill", axisText)
      .attr("font-size", "10px");

    svg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -(margin.top + (H - margin.top - margin.bottom) / 2))
      .attr("y", 16)
      .attr("text-anchor", "middle")
      .attr("fill", axisText)
      .attr("font-size", "11px")
      .text(labelAxisCompute);

    // ── Legend ───────────────────────────────────────────────────────────────
    const legendX = W - margin.right - 180;
    const legendY = margin.top + 10;
    const legendData = [
      { color: colorAll, stroke: strokeAll, label: labelLegendAll, r: 3.5 },
      { color: colorFrontier, stroke: colorFrontier, label: labelLegendFrontier, r: 5.5 },
    ];
    const legendG = svg.append("g").attr("class", "legend");
    legendData.forEach(({ color, stroke, label, r }, i) => {
      const gy = legendY + i * 20;
      legendG
        .append("circle")
        .attr("cx", legendX)
        .attr("cy", gy)
        .attr("r", r)
        .attr("fill", color)
        .attr("fill-opacity", 0.85)
        .attr("stroke", stroke)
        .attr("stroke-width", 1);
      legendG
        .append("text")
        .attr("x", legendX + 12)
        .attr("y", gy)
        .attr("dy", "0.35em")
        .attr("fill", axisText)
        .attr("font-size", "11px")
        .text(label);
    });
    // Trend legend item
    legendG
      .append("line")
      .attr("x1", legendX - 6)
      .attr("x2", legendX + 6)
      .attr("y1", legendY + 40)
      .attr("y2", legendY + 40)
      .attr("stroke", colorTrend)
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,3");
    legendG
      .append("text")
      .attr("x", legendX + 12)
      .attr("y", legendY + 40)
      .attr("dy", "0.35em")
      .attr("fill", axisText)
      .attr("font-size", "11px")
      .text(labelLegendTrend);

    // ── Interaction overlays ─────────────────────────────────────────────────

    function showTooltip(event: MouseEvent, d: AIFrontierModel) {
      // containerEl is guaranteed non-null by the early return guard above
      const el = containerEl as HTMLDivElement;
      const rect = el.getBoundingClientRect();
      setTooltip({
        visible: true,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        cw: el.clientWidth,
        model: d,
      });
    }
    function hideTooltip() {
      setTooltip((p) => ({ ...p, visible: false }));
    }

    nonFrontierG
      .selectAll<SVGCircleElement, AIFrontierModel>("circle")
      .on("mousemove", (event: MouseEvent, d) => showTooltip(event, d))
      .on("mouseleave", hideTooltip);

    frontierDots
      .on("mousemove", (event: MouseEvent, d) => {
        showTooltip(event, d);
        d3.select<SVGCircleElement, AIFrontierModel>(
          event.currentTarget as SVGCircleElement,
        ).attr("r", 8);
      })
      .on("mouseleave", (event: MouseEvent) => {
        hideTooltip();
        d3.select<SVGCircleElement, AIFrontierModel>(
          event.currentTarget as SVGCircleElement,
        ).attr("r", 5.5);
      });

    return () => {
      svg.selectAll("*").interrupt();
    };
  }, [
    allModels,
    regression,
    isDark,
    labelAxisDate,
    labelAxisCompute,
    labelAnnotation,
    labelLegendAll,
    labelLegendFrontier,
    labelLegendTrend,
  ]);

  const tooltipModel = tooltip.model;

  return (
    <div ref={containerRef} className="relative w-full overflow-x-auto">
      <svg
        ref={svgRef}
        className="w-full h-auto"
        style={{ minHeight: 300 }}
        aria-label={t("timelineSectionTitle")}
        role="img"
      />

      {/* Screen-reader model list */}
      <ul className="sr-only" aria-label={t("timelineSectionTitle")}>
        {allModels
          .filter((m) => m.frontier)
          .map((m) => (
            <li key={`${m.name}-${m.date}`}>
              {m.name} — {m.organization} — {m.date} — {formatFlop(m.computeFlop)}
            </li>
          ))}
      </ul>

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="pointer-events-none absolute z-50 rounded-xl border px-3.5 py-3 text-sm"
          style={{
            left:
              tooltip.x > tooltip.cw * 0.62
                ? tooltip.x - 260
                : tooltip.x + 14,
            top: tooltip.y,
            transform: "translateY(-50%)",
            background: isDark ? "rgba(9,9,11,0.94)" : "rgba(255,255,255,0.96)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderColor: tooltipModel.frontier
              ? "rgba(245,158,11,0.45)"
              : "rgba(139,92,246,0.35)",
            minWidth: 240,
            boxShadow: isDark
              ? "0 4px 28px rgba(0,0,0,0.55)"
              : "0 4px 16px rgba(0,0,0,0.10)",
          }}
        >
          <div className="flex items-start gap-2 mb-2">
            <p className="font-semibold text-zinc-900 dark:text-white text-sm leading-tight flex-1">
              {tooltipModel.name}
            </p>
            {tooltipModel.frontier && (
              <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-400/25">
                {t("frontierBadge")}
              </span>
            )}
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">{t("tooltipOrg")}</span>
              <span className="font-medium text-zinc-800 dark:text-zinc-200 text-right max-w-[160px] truncate">
                {tooltipModel.organization}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">{t("tooltipDate")}</span>
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                {tooltipModel.date}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">{t("tooltipCompute")}</span>
              <span className="font-semibold text-violet-600 dark:text-violet-400">
                {formatFlop(tooltipModel.computeFlop)}
              </span>
            </div>
            {tooltipModel.country && (
              <div className="flex justify-between gap-4">
                <span className="text-zinc-500">{t("tooltipCountry")}</span>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  {tooltipModel.country}
                </span>
              </div>
            )}
            {tooltipModel.confidence && (
              <div className="flex justify-between gap-4">
                <span className="text-zinc-500">{t("tooltipConfidence")}</span>
                <span className="text-zinc-600 dark:text-zinc-400">
                  {tooltipModel.confidence}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
