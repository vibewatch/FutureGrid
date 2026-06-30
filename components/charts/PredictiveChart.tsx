"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import * as d3 from "d3";
import { generateAllCareerInsights } from "@/lib/data";
import { colorForRisk } from "@/lib/utils";
import { useT } from "@/lib/i18n/useT";

interface PredictiveChartProps {
  selectedSector?: string;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  cw: number;
  name: string;
  sector: string;
  openings: number;
  risk: string;
  prob: number;
}

export default function PredictiveChart({ selectedSector }: PredictiveChartProps) {
  const t            = useT("charts");
  const svgRef       = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const isDark = (resolvedTheme ?? "dark") !== "light";
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, cw: 800, name: "", sector: "", openings: 0, risk: "", prob: 0,
  });

  const { topOccupations, summary } = useMemo(() => {
    const insights = generateAllCareerInsights();
    const filtered = selectedSector
      ? insights.filter((i) => i.sectorName === selectedSector)
      : insights;
    const withOpenings = filtered.filter((i) => i.projectedOpenings != null && i.projectedOpenings > 0);
    const top = [...withOpenings]
      .sort((a, b) => (b.projectedOpenings as number) - (a.projectedOpenings as number))
      .slice(0, 15);
    const brightCount = top.filter((i) => i.outlook === "Bright").length;
    const avgExposure = top.length > 0
      ? top.reduce((s, i) => s + i.automationProbability, 0) / top.length
      : 0;
    return { topOccupations: top, summary: { count: top.length, avgExposure, brightCount } };
  }, [selectedSector]);

  const emptyText = t("emptyNoProjectionData");

  useEffect(() => {
    const svgEl       = svgRef.current;
    const containerEl = containerRef.current;
    if (!svgEl || !containerEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    // Theme-aware colors
    const axisText  = isDark ? "#a1a1aa" : "#52525b";
    const titleText = isDark ? "#d4d4d8" : "#3f3f46";
    const gridColor = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)";
    const axisLine  = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

    if (topOccupations.length === 0) {
      svg.attr("viewBox", "0 0 720 200");
      svg.append("text")
        .attr("x", 360).attr("y", 100)
        .attr("text-anchor", "middle")
        .attr("fill", axisText).attr("font-size", "14px")
        .text(emptyText);
      return () => { svg.selectAll("*").interrupt(); };
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const W = 720;
    const rowH = 32;
    const M = { top: 48, right: 130, bottom: 20, left: 230 };
    const H = M.top + topOccupations.length * rowH + M.bottom;
    svg.attr("viewBox", `0 0 ${W} ${H}`);

    // Gradient defs
    const defs = svg.append("defs");
    const grad = defs.append("linearGradient")
      .attr("id", "pc-grad")
      .attr("x1", "0").attr("y1", "0").attr("x2", "1").attr("y2", "0");
    grad.append("stop").attr("offset", "0%").attr("stop-color", "#8b5cf6").attr("stop-opacity", "0.9");
    grad.append("stop").attr("offset", "100%").attr("stop-color", "#22d3ee").attr("stop-opacity", "0.82");

    const maxOpenings = d3.max(topOccupations, (d) => d.projectedOpenings as number) ?? 1;
    const xScale = d3.scaleLinear()
      .domain([0, maxOpenings])
      .range([0, W - M.left - M.right])
      .nice();

    const yScale = d3.scaleBand()
      .domain(topOccupations.map((d) => d.occupationName))
      .range([0, topOccupations.length * rowH])
      .padding(0.28);

    // Chart area group offset by left/top margin
    const g = svg.append("g").attr("transform", `translate(${M.left},${M.top})`);

    // Title
    svg.append("text")
      .attr("x", M.left + (W - M.left - M.right) / 2)
      .attr("y", 22)
      .attr("text-anchor", "middle")
      .attr("fill", titleText)
      .attr("font-size", "13px")
      .attr("font-weight", "500")
      .text(`Top Occupations by Projected Annual Openings${selectedSector ? `: ${selectedSector}` : ""}`);

    // X-axis at top
    const xAxisG = g.append("g").call(
      d3.axisTop(xScale)
        .ticks(5)
        .tickFormat((d) => {
          const v = d as number;
          return v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v);
        })
    );
    xAxisG.select(".domain").remove();
    xAxisG.selectAll(".tick line").attr("stroke", axisLine);
    xAxisG.selectAll("text").attr("fill", axisText).attr("font-size", "11px");

    // Vertical grid lines
    g.append("g")
      .call(
        d3.axisTop(xScale)
          .ticks(5)
          .tickSize(topOccupations.length * rowH)
          .tickFormat(() => "")
      )
      .call((gg) => {
        gg.select(".domain").remove();
        gg.selectAll(".tick line")
          .attr("stroke", gridColor)
          .attr("stroke-dasharray", "3,4")
          .attr("transform", `translate(0,${topOccupations.length * rowH})`);
      });

    // Occupation name labels (acting as y-axis)
    g.append("g")
      .call(d3.axisLeft(yScale).tickSize(0))
      .call((gg) => {
        gg.select(".domain").remove();
        gg.selectAll("text")
          .attr("fill", axisText)
          .attr("font-size", "11px")
          .attr("x", -8)
          .attr("text-anchor", "end")
          .each(function () {
            const node = d3.select(this);
            const t = node.text();
            if (t.length > 28) node.text(t.slice(0, 27) + "…");
          });
      });

    // Bars
    type Datum = (typeof topOccupations)[number];
    const bars = g
      .selectAll<SVGRectElement, Datum>("rect.pc-bar")
      .data(topOccupations)
      .join("rect")
      .attr("class", "pc-bar")
      .attr("y", (d) => yScale(d.occupationName)!)
      .attr("height", yScale.bandwidth())
      .attr("rx", 3)
      .attr("fill", "url(#pc-grad)")
      .attr("stroke", "rgba(139,92,246,0.20)")
      .attr("stroke-width", 0.5)
      .style("cursor", "default");

    if (reduced) {
      bars.attr("x", 0).attr("width", (d) => xScale(d.projectedOpenings as number));
    } else {
      bars
        .attr("x", 0)
        .attr("width", 0)
        .transition()
        .duration(600)
        .delay((_, i) => i * 40)
        .ease(d3.easeCubicOut)
        .attr("width", (d) => xScale(d.projectedOpenings as number));
    }

    // Value labels at end of bars
    g.selectAll<SVGTextElement, Datum>("text.pc-label")
      .data(topOccupations)
      .join("text")
      .attr("class", "pc-label")
      .attr("y", (d) => (yScale(d.occupationName) as number) + yScale.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("fill", axisText)
      .attr("font-size", "10px")
      .attr("pointer-events", "none")
      .attr("x", (d) => xScale(d.projectedOpenings as number) + 6)
      .text((d) => (d.projectedOpenings as number).toLocaleString());

    // Hover interactions
    bars
      .on("mousemove", (event: MouseEvent, d) => {
        const rect = containerEl.getBoundingClientRect();
        setTooltip({
          visible: true,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          cw: containerEl.clientWidth,
          name: d.occupationName,
          sector: d.sectorName,
          openings: d.projectedOpenings as number,
          risk: d.automationRisk,
          prob: d.automationProbability,
        });
        g.selectAll<SVGRectElement, Datum>("rect.pc-bar")
          .attr("opacity", (b) => b.occupationName === d.occupationName ? 1 : 0.3);
      })
      .on("mouseleave", () => {
        setTooltip((p) => ({ ...p, visible: false }));
        g.selectAll<SVGRectElement, unknown>("rect.pc-bar").attr("opacity", 1);
      });

    return () => { svg.selectAll("*").interrupt(); };
  }, [topOccupations, selectedSector, isDark, emptyText]);

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div
          className="rounded-xl border p-3"
          style={{ background: "var(--glass-bg)", borderColor: "var(--glass-border)", backdropFilter: "blur(12px)" }}
        >
          <div
            className="text-2xl font-bold"
            style={{ background: "linear-gradient(90deg,#8b5cf6,#22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
          >
            {summary.count}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{t("statOccupationsShown")}</div>
        </div>
        <div
          className="rounded-xl border p-3"
          style={{ background: "var(--glass-bg)", borderColor: "var(--glass-border)", backdropFilter: "blur(12px)" }}
        >
          <div className="text-2xl font-bold" style={{ color: "#22d3ee" }}>
            {(summary.avgExposure * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{t("statAvgAIExposure")}</div>
        </div>
        <div
          className="rounded-xl border p-3"
          style={{ background: "var(--glass-bg)", borderColor: "var(--glass-border)", backdropFilter: "blur(12px)" }}
        >
          <div className="text-2xl font-bold" style={{ color: "#22c55e" }}>
            {summary.brightCount}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{t("statBrightOutlook")}</div>
        </div>
      </div>

      {/* Chart */}
      <div ref={containerRef} className="relative w-full overflow-x-auto">
        <svg
          ref={svgRef}
          className="w-full h-auto"
          style={{ minHeight: 300 }}
          aria-label="Horizontal bar chart: top occupations by projected annual openings"
          role="img"
        />

        {tooltip.visible && (
          <div
            className="pointer-events-none absolute z-50 rounded-xl border px-3.5 py-3 text-sm"
            style={{
              left: tooltip.x > tooltip.cw * 0.65 ? tooltip.x - 230 : tooltip.x + 14,
              top: tooltip.y,
              transform: "translateY(-50%)",
              background: isDark ? "rgba(9,9,11,0.93)" : "rgba(255,255,255,0.95)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderColor: "rgba(139,92,246,0.35)",
              minWidth: 215,
              boxShadow: isDark ? "0 4px 28px rgba(0,0,0,0.55)" : "0 4px 16px rgba(0,0,0,0.10)",
            }}
          >
            <p className="font-semibold text-zinc-900 dark:text-white leading-tight mb-0.5 max-w-[210px] truncate">{tooltip.name}</p>
            <p className="text-xs text-zinc-500 mb-2">{tooltip.sector}</p>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between gap-4">
                <span className="text-zinc-500">{t("labelProjectedOpenings")}</span>
                <span
                  className="font-bold"
                  style={{ background: "linear-gradient(90deg,#8b5cf6,#22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
                >
                  {tooltip.openings.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-zinc-500">{t("labelAIExposure")}</span>
                <span className="font-semibold" style={{ color: colorForRisk(tooltip.risk) }}>
                  {(tooltip.prob * 100).toFixed(1)}% — {tooltip.risk}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}