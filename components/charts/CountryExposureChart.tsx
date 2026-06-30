"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import * as d3 from "d3";
import { getCountryExposure } from "@/lib/data";
import type { CountryExposure } from "@/lib/data";
import { useT } from "@/lib/i18n/useT";

// ── Types ─────────────────────────────────────────────────────────────────────

type Metric   = "usageIndex" | "usagePct";
type ViewMode = "bar" | "scatter";

interface TooltipState {
  visible : boolean;
  x       : number;
  y       : number;
  cw      : number;
  item    : CountryExposure;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const BRAND_VIOLET = "#8b5cf6";
const BRAND_CYAN   = "#22d3ee";
const TOP_N        = 20;

const EMPTY_ITEM: CountryExposure = {
  iso3: "", name: "", usageIndex: null, usagePct: null,
  usageCount: null, gdpPerWorkingAgeCapita: null,
};

// Brand-gradient interpolation t ∈ [0, 1]
function brandColor(t: number): string {
  return d3.interpolateRgb(BRAND_VIOLET, BRAND_CYAN)(Math.max(0, Math.min(1, t)));
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CountryExposureChart() {
  const t            = useT("charts");
  const svgRef       = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const isDark = (resolvedTheme ?? "dark") !== "light";

  const [metric,   setMetric]   = useState<Metric>("usageIndex");
  const [viewMode, setViewMode] = useState<ViewMode>("bar");
  const [tooltip,  setTooltip]  = useState<TooltipState>({
    visible: false, x: 0, y: 0, cw: 600, item: EMPTY_ITEM,
  });

  const allData = useMemo(() => getCountryExposure(), []);

  const axisBarAIUsage = t("barAxisAIUsageIndex");
  const axisBarGlobal  = t("barAxisGlobalShare");
  const axisGDPWorker  = t("axisGDPPerWorker");
  const axisAIUsageIdx = t("axisAIUsageIndexArrow");

  // Top-N countries for the ranked bar chart, sorted by selected metric
  const barData = useMemo(() => {
    const val = (d: CountryExposure) =>
      metric === "usageIndex" ? (d.usageIndex ?? 0) : (d.usagePct ?? 0);
    return [...allData]
      .filter(d => val(d) > 0)
      .sort((a, b) => val(b) - val(a))
      .slice(0, TOP_N);
  }, [allData, metric]);

  // Countries for the scatter (both usageIndex and GDP must be present)
  const scatterData = useMemo(() =>
    allData.filter(d =>
      (d.usageIndex ?? 0) > 0 && (d.gdpPerWorkingAgeCapita ?? 0) >= 1000,
    ),
    [allData],
  );

  // ── D3 draw ───────────────────────────────────────────────────────────────

  useEffect(() => {
    const svgEl       = svgRef.current;
    const containerEl = containerRef.current;
    if (!svgEl || !containerEl) return;

    const svg     = d3.select(svgEl);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Theme-aware colors
    const axisText     = isDark ? "#71717a" : "#52525b";
    const gridColor    = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
    const axisLine     = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";
    const trackFill    = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";
    const axisLabelOp  = isDark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.40)";
    const barLabelOp   = isDark ? "rgba(255,255,255,0.52)" : "rgba(0,0,0,0.55)";
    const countryLabel = (i: number) =>
      isDark
        ? `rgba(255,255,255,${i < 5 ? 0.88 : 0.62})`
        : `rgba(0,0,0,${i < 5 ? 0.82 : 0.60})`;
    const scatterLabel = isDark ? "rgba(255,255,255,0.72)" : "rgba(0,0,0,0.65)";

    svg.selectAll("*").remove();

    // ─── BAR CHART ──────────────────────────────────────────────────────────
    if (viewMode === "bar") {
      const BAR_H  = 22;
      const GAP    = 5;
      const margin = { top: 36, right: 80, bottom: 16, left: 148 };
      const W      = 640;
      const N      = barData.length;
      if (N === 0) { svg.attr("viewBox", `0 0 ${W} 80`); return; }

      const H      = margin.top + N * (BAR_H + GAP) - GAP + margin.bottom;
      const chartW = W - margin.left - margin.right;

      svg.attr("viewBox", `0 0 ${W} ${H}`);

      const val = (d: CountryExposure) =>
        metric === "usageIndex" ? (d.usageIndex ?? 0) : (d.usagePct ?? 0);

      const maxVal = d3.max(barData, val) ?? 1;
      const xScale = d3.scaleLinear()
        .domain([0, maxVal])
        .range([0, chartW])
        .nice();

      // ── Gradient defs ────────────────────────────────────────────────────
      const defs = svg.append("defs");
      const grad = defs.append("linearGradient")
        .attr("id", "ce-bar-grad")
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", "0").attr("y1", "0")
        .attr("x2", String(chartW)).attr("y2", "0");
      grad.append("stop").attr("offset",   "0%").attr("stop-color", BRAND_VIOLET);
      grad.append("stop").attr("offset", "100%").attr("stop-color", BRAND_CYAN);

      // ── Axis label ───────────────────────────────────────────────────────
      svg.append("text")
        .attr("x", margin.left)
        .attr("y", 18)
        .attr("fill", axisLabelOp)
        .attr("font-size", "10px")
        .attr("letter-spacing", "0.06em")
        .text(
          metric === "usageIndex"
            ? axisBarAIUsage
            : axisBarGlobal,
        );

      const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const rows = g
        .selectAll<SVGGElement, CountryExposure>("g.ce-row")
        .data(barData, d => d.iso3)
        .join("g")
        .attr("class", "ce-row")
        .attr("transform", (_, i) => `translate(0,${i * (BAR_H + GAP)})`);

      // Country name labels
      rows.append("text")
        .attr("x", -8)
        .attr("y", BAR_H / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "end")
        .attr("fill", (_, i) => countryLabel(i))
        .attr("font-size", "12px")
        .attr("font-weight", (_, i) => (i < 3 ? "600" : "400"))
        .text(d => d.name.length > 20 ? d.name.slice(0, 18) + "\u2026" : d.name);

      // Background track
      rows.append("rect")
        .attr("class", "ce-track")
        .attr("x", 0).attr("y", 0)
        .attr("width", chartW).attr("height", BAR_H)
        .attr("rx", 4)
        .attr("fill", trackFill);

      // Brand-gradient bar
      const bars = rows.append("rect")
        .attr("class", "ce-bar")
        .attr("x", 0).attr("y", 0)
        .attr("height", BAR_H).attr("rx", 4)
        .attr("fill", "url(#ce-bar-grad)");

      if (reduced) {
        bars.attr("width", d => xScale(val(d)));
      } else {
        bars.attr("width", 0)
          .transition()
          .duration(520)
          .delay((_, i) => i * 28)
          .ease(d3.easeCubicOut)
          .attr("width", d => xScale(val(d)));
      }

      // Value labels (fade in after bars arrive)
      const vlabels = rows.append("text")
        .attr("class", "ce-vl")
        .attr("x", d => xScale(val(d)) + 6)
        .attr("y", BAR_H / 2)
        .attr("dy", "0.35em")
        .attr("fill", barLabelOp)
        .attr("font-size", "11px")
        .text(d =>
          metric === "usageIndex"
            ? val(d).toFixed(2)
            : `${(val(d) * 100).toFixed(2)}%`,
        );

      if (!reduced) {
        vlabels.attr("opacity", 0)
          .transition().duration(250)
          .delay((_, i) => i * 28 + 460)
          .attr("opacity", 1);
      }

      // Invisible hover target spanning the full row width
      rows.append("rect")
        .attr("x", -margin.left)
        .attr("y", -1)
        .attr("width", W)
        .attr("height", BAR_H + 2)
        .attr("fill", "transparent")
        .on("mousemove", (event: MouseEvent, d) => {
          const rect = containerEl.getBoundingClientRect();
          setTooltip({
            visible: true,
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            cw: containerEl.clientWidth,
            item: d,
          });
          // Dim sibling bars
          g.selectAll<SVGRectElement, CountryExposure>(".ce-bar")
            .attr("opacity", c => (c.iso3 === d.iso3 ? 1 : 0.30));
        })
        .on("mouseleave", () => {
          setTooltip(p => ({ ...p, visible: false }));
          g.selectAll(".ce-bar").attr("opacity", 1);
        });

    // ─── SCATTER CHART ───────────────────────────────────────────────────────
    } else {
      const W      = 640;
      const H      = 440;
      const margin = { top: 36, right: 48, bottom: 62, left: 72 };

      svg.attr("viewBox", `0 0 ${W} ${H}`);

      if (scatterData.length === 0) return;

      const gdpVals = scatterData.map(d => d.gdpPerWorkingAgeCapita as number);
      const idxVals = scatterData.map(d => d.usageIndex as number);
      const gdpMin  = Math.max(500, (d3.min(gdpVals) ?? 1000) * 0.6);
      const gdpMax  = (d3.max(gdpVals) ?? 100000) * 1.25;
      const idxMax  = (d3.max(idxVals) ?? 7) * 1.15;

      const xScale = d3.scaleLog()
        .domain([gdpMin, gdpMax])
        .range([margin.left, W - margin.right])
        .clamp(true);

      const yScale = d3.scaleLinear()
        .domain([0, idxMax])
        .range([H - margin.bottom, margin.top])
        .nice();

      // ── Grid ─────────────────────────────────────────────────────────────
      svg.append("g")
        .selectAll<SVGLineElement, number>("line.ce-xgrid")
        .data(xScale.ticks(5))
        .join("line")
        .attr("class", "ce-xgrid")
        .attr("x1", d => xScale(d)).attr("x2", d => xScale(d))
        .attr("y1", margin.top).attr("y2", H - margin.bottom)
        .attr("stroke", gridColor)
        .attr("stroke-dasharray", "3,3");

      svg.append("g")
        .selectAll<SVGLineElement, number>("line.ce-ygrid")
        .data(yScale.ticks(5))
        .join("line")
        .attr("class", "ce-ygrid")
        .attr("x1", margin.left).attr("x2", W - margin.right)
        .attr("y1", d => yScale(d)).attr("y2", d => yScale(d))
        .attr("stroke", gridColor)
        .attr("stroke-dasharray", "3,3");

      // ── Axes ─────────────────────────────────────────────────────────────
      const xAxisG = svg.append("g")
        .attr("transform", `translate(0,${H - margin.bottom})`)
        .call(
          d3.axisBottom(xScale)
            .ticks(5)
            .tickFormat(d => `$${d3.format(".0s")(d)}`),
        );
      xAxisG.select(".domain").attr("stroke", axisLine);
      xAxisG.selectAll(".tick line").attr("stroke", axisLine);
      xAxisG.selectAll("text").attr("fill", axisText).attr("font-size", "11px");

      svg.append("text")
        .attr("x", margin.left + (W - margin.left - margin.right) / 2)
        .attr("y", H - 10)
        .attr("text-anchor", "middle")
        .attr("fill", axisText)
        .attr("font-size", "11px")
        .text(axisGDPWorker);

      const yAxisG = svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(yScale).ticks(5));
      yAxisG.select(".domain").attr("stroke", axisLine);
      yAxisG.selectAll(".tick line").attr("stroke", axisLine);
      yAxisG.selectAll("text").attr("fill", axisText).attr("font-size", "11px");

      svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -(margin.top + (H - margin.top - margin.bottom) / 2))
        .attr("y", 16)
        .attr("text-anchor", "middle")
        .attr("fill", axisText)
        .attr("font-size", "11px")
        .text(axisAIUsageIdx);

      // ── Dots ─────────────────────────────────────────────────────────────
      const dots = svg
        .selectAll<SVGCircleElement, CountryExposure>("circle.ce-dot")
        .data(scatterData, d => d.iso3)
        .join("circle")
        .attr("class", "ce-dot")
        .attr("cx", d => xScale(d.gdpPerWorkingAgeCapita!))
        .attr("cy", d => yScale(d.usageIndex!))
        .attr("fill", d => brandColor((d.usageIndex ?? 0) / idxMax))
        .attr("fill-opacity", 0.75)
        .attr("stroke", d => brandColor((d.usageIndex ?? 0) / idxMax))
        .attr("stroke-width", 1.5)
        .attr("stroke-opacity", 0.90);

      if (reduced) {
        dots.attr("r", 5);
      } else {
        dots.attr("r", 0)
          .transition()
          .duration(420)
          .delay((_, i) => Math.min(i * 5, 320))
          .ease(d3.easeBackOut.overshoot(1.2))
          .attr("r", 5);
      }

      // Country name labels for top 8 by usageIndex
      const labelData = [...scatterData]
        .sort((a, b) => (b.usageIndex ?? 0) - (a.usageIndex ?? 0))
        .slice(0, 8);

      svg
        .selectAll<SVGTextElement, CountryExposure>("text.ce-country-lbl")
        .data(labelData, d => d.iso3)
        .join("text")
        .attr("class", "ce-country-lbl")
        .attr("pointer-events", "none")
        .attr("x", d => xScale(d.gdpPerWorkingAgeCapita!) + 8)
        .attr("y", d => yScale(d.usageIndex!))
        .attr("dy", "0.35em")
        .attr("fill", scatterLabel)
        .attr("font-size", "10px")
        .attr("font-weight", "600")
        // Use first word only for brevity, avoid text collision
        .text(d => d.name.split(" ")[0]);

      // ── Hover ─────────────────────────────────────────────────────────────
      dots
        .on("mousemove", (event: MouseEvent, d) => {
          const rect = containerEl.getBoundingClientRect();
          setTooltip({
            visible: true,
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            cw: containerEl.clientWidth,
            item: d,
          });
          d3.select(svgEl)
            .selectAll<SVGCircleElement, CountryExposure>("circle.ce-dot")
            .attr("fill-opacity", c => (c.iso3 === d.iso3 ? 1 : 0.12))
            .attr("stroke-opacity", c => (c.iso3 === d.iso3 ? 1 : 0.08));
          d3.select<SVGCircleElement, CountryExposure>(
            event.currentTarget as SVGCircleElement,
          ).attr("r", 7);
        })
        .on("mouseleave", () => {
          setTooltip(p => ({ ...p, visible: false }));
          d3.select(svgEl)
            .selectAll<SVGCircleElement, CountryExposure>("circle.ce-dot")
            .attr("fill-opacity", 0.75)
            .attr("stroke-opacity", 0.90)
            .attr("r", 5);
        });
    }

    // Interrupt all running transitions on unmount / re-render
    return () => { svg.selectAll("*").interrupt(); };
  }, [barData, scatterData, metric, viewMode, isDark, axisBarAIUsage, axisBarGlobal, axisGDPWorker, axisAIUsageIdx]);

  // ── Render ─────────────────────────────────────────────────────────────────

  const { item } = tooltip;

  return (
    <div ref={containerRef} className="relative w-full">

      {/* ── Controls ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">

        {/* Metric toggle — only relevant for bar view */}
        {viewMode === "bar" && (
          <div className="flex items-center gap-0.5 p-1 glass rounded-lg">
            <button
              onClick={() => setMetric("usageIndex")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                metric === "usageIndex"
                  ? "bg-violet-600/30 text-violet-300"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t("metricPerCapitaIndex")}
            </button>
            <button
              onClick={() => setMetric("usagePct")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                metric === "usagePct"
                  ? "bg-violet-600/30 text-violet-300"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t("labelGlobalShare")}
            </button>
          </div>
        )}

        {/* View toggle */}
        <div className="flex items-center gap-0.5 p-1 glass rounded-lg ml-auto">
          <button
            onClick={() => setViewMode("bar")}
            aria-label="Ranked bar chart"
            title="Ranked bar chart"
            className={`p-1.5 rounded-md transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
              viewMode === "bar"
                ? "bg-violet-600/30 text-violet-300"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3"  y="9"  width="4" height="12" rx="1" />
              <rect x="10" y="5"  width="4" height="16" rx="1" />
              <rect x="17" y="2"  width="4" height="19" rx="1" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode("scatter")}
            aria-label="GDP vs AI usage scatter plot"
            title="GDP vs AI usage scatter"
            className={`p-1.5 rounded-md transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
              viewMode === "scatter"
                ? "bg-violet-600/30 text-violet-300"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="7"  cy="8"  r="2" />
              <circle cx="18" cy="5"  r="2" />
              <circle cx="13" cy="17" r="2" />
              <circle cx="4"  cy="16" r="2" />
              <circle cx="17" cy="14" r="2" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── SVG canvas ─────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <svg
          ref={svgRef}
          className="w-full h-auto"
          style={{ minHeight: 240 }}
          role="img"
          aria-label={
            viewMode === "bar"
              ? `Top ${TOP_N} countries by ${metric === "usageIndex" ? "AI usage per-capita index" : "share of global AI usage"}, ranked bar chart`
              : "Scatter plot: AI usage index versus GDP per working-age adult by country"
          }
        />
      </div>

      {/* ── Screen-reader accessible list ──────────────────────────────────── */}
      <ul className="sr-only" aria-label="Top countries by AI adoption">
        {barData.map(d => (
          <li key={d.iso3}>
            {d.name}: usage index {d.usageIndex != null ? d.usageIndex.toFixed(2) : "N/A"},{" "}
            global share {d.usagePct != null ? `${(d.usagePct * 100).toFixed(2)}%` : "N/A"}
          </li>
        ))}
      </ul>

      {/* ── Glass tooltip ───────────────────────────────────────────────────── */}
      {tooltip.visible && item.name && (
        <div
          className="pointer-events-none absolute z-50 rounded-xl border px-3.5 py-3 text-sm"
          style={{
            left       : tooltip.x > tooltip.cw * 0.60 ? tooltip.x - 218 : tooltip.x + 14,
            top        : tooltip.y,
            transform  : "translateY(-50%)",
            background : isDark ? "rgba(9,9,11,0.93)" : "rgba(255,255,255,0.95)",
            backdropFilter       : "blur(12px)",
            WebkitBackdropFilter : "blur(12px)",
            borderColor: "rgba(139,92,246,0.35)",
            minWidth   : 206,
            boxShadow  : isDark ? "0 4px 28px rgba(0,0,0,0.55)" : "0 4px 16px rgba(0,0,0,0.10)",
          }}
        >
          <p className="font-semibold text-zinc-900 dark:text-white text-sm mb-2 leading-tight">
            {item.name}
            <span className="ml-2 text-zinc-500 font-normal text-xs">{item.iso3}</span>
          </p>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">{t("labelUsageIndex")}</span>
              <span className="font-semibold text-violet-300">
                {item.usageIndex != null ? item.usageIndex.toFixed(2) : "—"}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">{t("labelGlobalShare")}</span>
              <span className="font-semibold text-cyan-300">
                {item.usagePct != null ? `${(item.usagePct * 100).toFixed(2)}%` : "—"}
              </span>
            </div>
            {item.usageCount != null && item.usageCount > 0 && (
              <div className="flex justify-between gap-4">
                <span className="text-zinc-500">{t("labelUsageCount")}</span>
                <span className="text-zinc-900 dark:text-white font-medium">
                  {item.usageCount.toLocaleString()}
                </span>
              </div>
            )}
            {item.gdpPerWorkingAgeCapita != null && item.gdpPerWorkingAgeCapita > 0 && (
              <div className="flex justify-between gap-4">
                <span className="text-zinc-500">{t("labelGDPWorker")}</span>
                <span className="text-zinc-900 dark:text-white font-medium">
                  ${Math.round(item.gdpPerWorkingAgeCapita).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
