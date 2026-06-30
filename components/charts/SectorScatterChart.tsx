"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import * as d3 from "d3";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSectorAggregatesExtended, getSectorAggregates } from "@/lib/data";
import type { SectorAggregate } from "@/lib/data";
import { useT } from "@/lib/i18n/useT";

// ── Helpers ───────────────────────────────────────────────────────────────────

function bandColor(avgRisk: number): string {
  if (avgRisk < 0.30) return "#22c55e";
  if (avgRisk < 0.50) return "#eab308";
  if (avgRisk < 0.70) return "#f97316";
  return "#ef4444";
}

// ── Tooltip state ─────────────────────────────────────────────────────────────

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  cw: number;
  item: SectorAggregate;
}

const EMPTY_ITEM: SectorAggregate = {
  sector: "", avgRisk: 0, avgGrowth: null, avgSalary: null, totalEmployment: null, brightShare: 0, occupationCount: 0,
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function SectorScatterChart() {
  const t            = useT("charts");
  const router         = useRouter();
  const svgRef         = useRef<SVGSVGElement>(null);
  const containerRef   = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const isDark = (resolvedTheme ?? "dark") !== "light";
  // Keep router stable in closure — avoids adding router to D3 effect deps
  const routerRef      = useRef(router);
  // Update ref in an effect (never during render) to satisfy react-hooks/refs
  useEffect(() => { routerRef.current = router; }, [router]);

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, cw: 600, item: EMPTY_ITEM,
  });

  // ── Data ───────────────────────────────────────────────────────────────────

  const data = useMemo((): SectorAggregate[] => {
    const extended = getSectorAggregatesExtended();
    if (extended.length > 0) return extended;
    // Fallback to basic aggregates
    return getSectorAggregates().map((s) => ({
      ...s,
      avgSalary: null,
      totalEmployment: null,
      brightShare: 0,
    }));
  }, []);

  // ── D3 draw ────────────────────────────────────────────────────────────────

  const labelAxisAIExposure    = t("axisAIExposure");
  const labelBrightOutlookShare = t("axisBrightOutlookShare");

  useEffect(() => {
    const svgEl       = svgRef.current;
    const containerEl = containerRef.current;
    if (!svgEl) return;

    const svg     = d3.select(svgEl);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Theme-aware colors
    const axisText   = isDark ? "#71717a" : "#52525b";
    const gridColor  = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
    const axisLine   = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";
    const bubbleText = isDark ? "rgba(255,255,255,0.90)" : "rgba(0,0,0,0.80)";

    if (!containerEl || data.length === 0) return () => { svg.selectAll("*").interrupt(); };

    svg.selectAll("*").remove();

    // Dimensions
    const W      = 640;
    const H      = 420;
    const margin = { top: 32, right: 32, bottom: 58, left: 68 };
    svg.attr("viewBox", `0 0 ${W} ${H}`);

    // ── Scales ──────────────────────────────────────────────────────────────

    const xScale = d3.scaleLinear()
      .domain([0, 100])
      .range([margin.left, W - margin.right])
      .nice();

    const yExtent   = d3.extent(data, (d) => d.brightShare * 100) as [number, number];
    const yPadding  = Math.max(3, (yExtent[1] - yExtent[0]) * 0.18);
    const yScale    = d3.scaleLinear()
      .domain([Math.max(0, yExtent[0] - yPadding), Math.min(100, yExtent[1] + yPadding)])
      .range([H - margin.bottom, margin.top])
      .nice();

    const maxEmp = d3.max(data, (d) => d.totalEmployment) ?? 1;
    const rScale = d3.scaleSqrt()
      .domain([0, maxEmp])
      .range([9, 40]);

    // Null totalEmployment → minimal radius so the bubble still renders
    const bubbleR = (d: SectorAggregate) =>
      d.totalEmployment != null ? rScale(d.totalEmployment) : 7;

    // ── Grid lines ──────────────────────────────────────────────────────────

    svg.append("g")
      .attr("transform", `translate(0,${H - margin.bottom})`)
      .call(
        d3.axisBottom(xScale).ticks(5).tickSize(-(H - margin.top - margin.bottom))
      )
      .call((g) => {
        g.select(".domain").remove();
        g.selectAll(".tick line")
          .attr("stroke", gridColor)
          .attr("stroke-dasharray", "3,3");
        g.selectAll(".tick text").remove();
      });

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(
        d3.axisLeft(yScale).ticks(5).tickSize(-(W - margin.left - margin.right))
      )
      .call((g) => {
        g.select(".domain").remove();
        g.selectAll(".tick line")
          .attr("stroke", gridColor)
          .attr("stroke-dasharray", "3,3");
        g.selectAll(".tick text").remove();
      });

    // ── Axes ────────────────────────────────────────────────────────────────

    const xAxisG = svg.append("g")
      .attr("transform", `translate(0,${H - margin.bottom})`)
      .call(
        d3.axisBottom(xScale)
          .ticks(5)
          .tickFormat((d) => `${d}%`)
      );
    xAxisG.select(".domain").attr("stroke", axisLine);
    xAxisG.selectAll(".tick line").attr("stroke", axisLine);
    xAxisG.selectAll("text").attr("fill", axisText).attr("font-size", "11px");

    svg.append("text")
      .attr("x", margin.left + (W - margin.left - margin.right) / 2)
      .attr("y", H - 8)
      .attr("text-anchor", "middle")
      .attr("fill", axisText)
      .attr("font-size", "11px")
      .text(labelAxisAIExposure);

    const yAxisG = svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(
        d3.axisLeft(yScale)
          .ticks(5)
          .tickFormat((d) => `${d}%`)
      );
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
      .text(labelBrightOutlookShare);

    // ── Bubbles ─────────────────────────────────────────────────────────────

    const bubbles = svg
      .selectAll<SVGGElement, SectorAggregate>("g.sc-bubble")
      .data(data)
      .join("g")
      .attr("class", "sc-bubble")
      .attr("transform", (d) =>
        `translate(${xScale(d.avgRisk * 100)},${yScale(d.brightShare * 100)})`
      )
      .style("cursor", "pointer");

    // Glow ring (low opacity, same color, slightly larger)
    bubbles.append("circle")
      .attr("r", (d) => bubbleR(d) + 3)
      .attr("fill", "none")
      .attr("stroke", (d) => bandColor(d.avgRisk))
      .attr("stroke-width", 1)
      .attr("opacity", 0.25);

    // Main bubble
    bubbles.append("circle")
      .attr("class", "sc-dot")
      .attr("r", bubbleR)
      .attr("fill", (d) => bandColor(d.avgRisk))
      .attr("fill-opacity", 0.72)
      .attr("stroke", (d) => bandColor(d.avgRisk))
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.85);

    // Short label on larger bubbles (first word of sector name)
    bubbles.each(function (d) {
      const r = bubbleR(d);
      if (r < 20) return;
      d3.select(this)
        .append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("fill", bubbleText)
        .attr("font-size", Math.min(10, r * 0.42) + "px")
        .attr("font-weight", "600")
        .attr("pointer-events", "none")
        .attr("user-select", "none")
        .text(d.sector.split(" ")[0]);
    });

    // ── Entrance animation ───────────────────────────────────────────────────

    if (!reduced) {
      const tX = (d: SectorAggregate) => xScale(d.avgRisk * 100);
      const tY = (d: SectorAggregate) => yScale(d.brightShare * 100);

      bubbles
        .attr("transform", (d) => `translate(${tX(d)},${tY(d)}) scale(0)`)
        .transition()
        .duration(520)
        .delay((_, i) => i * 55)
        .ease(d3.easeBackOut.overshoot(1.15))
        .attr("transform", (d) => `translate(${tX(d)},${tY(d)}) scale(1)`);
    }

    // ── Hover interactions ───────────────────────────────────────────────────

    bubbles
      .on("mousemove", (event: MouseEvent, d) => {
        const rect = containerEl.getBoundingClientRect();
        setTooltip({
          visible: true,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          cw: containerEl.clientWidth,
          item: d,
        });
        // Dim others, enlarge hovered
        d3.select(svgEl)
          .selectAll<SVGCircleElement, SectorAggregate>("g.sc-bubble .sc-dot")
          .attr("fill-opacity", (c) => (c.sector === d.sector ? 1 : 0.18))
          .attr("stroke-opacity", (c) => (c.sector === d.sector ? 1 : 0.12));

        d3.select<SVGGElement, SectorAggregate>(event.currentTarget as SVGGElement)
          .select<SVGCircleElement>(".sc-dot")
          .attr("r", bubbleR(d) * 1.22);
      })
      .on("mouseleave", () => {
        setTooltip((p) => ({ ...p, visible: false }));
        d3.select(svgEl)
          .selectAll<SVGCircleElement, SectorAggregate>("g.sc-bubble .sc-dot")
          .attr("fill-opacity", 0.72)
          .attr("stroke-opacity", 0.85)
          .attr("r", bubbleR);
      })
      .on("click", (_, d) => {
        routerRef.current.push(`/sectors/${encodeURIComponent(d.sector)}`);
      });

    return () => { svg.selectAll("*").interrupt(); };
  }, [data, isDark, labelAxisAIExposure, labelBrightOutlookShare]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="relative w-full overflow-x-auto">
      <svg
        ref={svgRef}
        className="w-full h-auto"
        style={{ minHeight: 280 }}
        aria-label="Sector scatter chart: AI exposure vs bright-outlook share"
        role="img"
      />

      {/* Screen-reader / keyboard accessible sector links */}
      <ul className="sr-only" aria-label="Sectors">
        {data.map((d) => (
          <li key={d.sector}>
            <Link href={`/sectors/${encodeURIComponent(d.sector)}`}>{d.sector}</Link>
          </li>
        ))}
      </ul>

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="pointer-events-none absolute z-50 rounded-xl border px-3.5 py-3 text-sm"
          style={{
            left: tooltip.x > tooltip.cw * 0.62 ? tooltip.x - 224 : tooltip.x + 14,
            top: tooltip.y,
            transform: "translateY(-50%)",
            background: isDark ? "rgba(9,9,11,0.93)" : "rgba(255,255,255,0.95)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderColor: bandColor(tooltip.item.avgRisk) + "55",
            minWidth: 210,
            boxShadow: isDark ? "0 4px 28px rgba(0,0,0,0.55)" : "0 4px 16px rgba(0,0,0,0.10)",
          }}
        >
          <p className="font-semibold text-zinc-900 dark:text-white text-sm mb-2 leading-tight">
            {tooltip.item.sector}
          </p>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">{t("labelAIExposure")}</span>
              <span
                className="font-semibold"
                style={{ color: bandColor(tooltip.item.avgRisk) }}
              >
                {(tooltip.item.avgRisk * 100).toFixed(1)}% —{" "}
                {tooltip.item.avgRisk < 0.30 ? t("legendLow") : tooltip.item.avgRisk < 0.50 ? t("legendMedium") : tooltip.item.avgRisk < 0.70 ? t("legendHigh") : t("legendVeryHigh")}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">{t("labelBrightOutlook")}</span>
              <span className="font-semibold text-green-500 dark:text-green-400">
                {(tooltip.item.brightShare * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">{t("labelEmployment")}</span>
              <span className="text-zinc-900 dark:text-white font-medium">
                {tooltip.item.totalEmployment != null
                  ? tooltip.item.totalEmployment.toLocaleString()
                  : "—"}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-zinc-500 mt-2.5">{t("tooltipClickSector")}</p>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-2 right-3 flex items-center gap-3 text-[10px] text-zinc-600 pointer-events-none select-none">
        {(
          [
            ["#22c55e", "legendLow"],
            ["#eab308", "legendMedium"],
            ["#f97316", "legendHigh"],
            ["#ef4444", "legendVeryHigh"],
          ] as const
        ).map(([color, key]) => (
          <span key={key} className="flex items-center gap-1">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
            {t(key)}
          </span>
        ))}
        <span className="ml-1 text-zinc-700">{t("legendBubbleEmp")}</span>
      </div>
    </div>
  );
}
