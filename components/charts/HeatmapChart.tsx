"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import * as d3 from "d3";
import { getSectorAggregates, generateAllCareerInsights } from "@/lib/data";

interface RegionalData {
  sector: string;
  region: string;
  risk: number;
}

const REGIONS = ["Northeast", "Midwest", "South", "West"];

interface TooltipData {
  visible: boolean;
  x: number;
  y: number;
  cw: number;
  sector: string;
  region: string;
  risk: number;
}

/** Brand-aligned risk colour: green → amber → red */
function riskColor(t: number): string {
  if (t <= 0.5) return d3.interpolateRgb("#22c55e", "#eab308")(t * 2);
  return d3.interpolateRgb("#eab308", "#ef4444")((t - 0.5) * 2);
}

export default function HeatmapChart() {
  const svgRef       = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData>({
    visible: false, x: 0, y: 0, cw: 600, sector: "", region: "", risk: 0,
  });

  const data: RegionalData[] = useMemo(() => {
    const sectors = getSectorAggregates();
    const all     = generateAllCareerInsights();
    return sectors.flatMap((s) =>
      REGIONS.map((region) => {
        const occ    = all.filter((o) => o.sectorName === s.sector);
        const avgRisk = occ.length > 0
          ? occ.reduce((sum, o) => sum + o.automationProbability, 0) / occ.length
          : s.avgRisk;
        const jitter = (Math.random() - 0.5) * 0.1;
        return { sector: s.sector, region, risk: Math.max(0, Math.min(1, avgRisk + jitter)) };
      })
    );
  }, []);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    const svgEl      = svgRef.current;
    const containerEl = containerRef.current;
    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const margin = { top: 50, right: 30, bottom: 80, left: 140 };
    const cellW  = 120, cellH = 36;
    const sectors = [...new Set(data.map((d) => d.sector))];
    const W = margin.left + REGIONS.length * cellW + margin.right;
    const H = margin.top  + sectors.length * cellH + margin.bottom;
    svg.attr("viewBox", `0 0 ${W} ${H}`);

    const xScale = d3.scaleBand()
      .domain(REGIONS)
      .range([margin.left, margin.left + REGIONS.length * cellW])
      .padding(0.06);

    const yScale = d3.scaleBand()
      .domain(sectors)
      .range([margin.top, margin.top + sectors.length * cellH])
      .padding(0.06);

    // --- Axes ---
    const xAxisG = svg.append("g")
      .attr("transform", `translate(0,${margin.top - 5})`)
      .call(d3.axisTop(xScale));
    xAxisG.select(".domain").attr("stroke", "rgba(255,255,255,0.10)");
    xAxisG.selectAll(".tick line").attr("stroke", "rgba(255,255,255,0.10)");
    xAxisG.selectAll("text").attr("fill", "#a1a1aa").attr("font-size", "12px").attr("font-weight", "600");

    const yAxisG = svg.append("g")
      .attr("transform", `translate(${margin.left - 5},0)`)
      .call(d3.axisLeft(yScale));
    yAxisG.select(".domain").attr("stroke", "rgba(255,255,255,0.10)");
    yAxisG.selectAll(".tick line").attr("stroke", "rgba(255,255,255,0.10)");
    yAxisG.selectAll<SVGTextElement, string>("text")
      .attr("fill", "#a1a1aa")
      .attr("text-anchor", "end")
      .attr("font-size", "11px")
      .each(function () {
        const node = d3.select(this);
        const t = node.text();
        if (t.length > 20) node.text(t.slice(0, 19) + "…");
      });

    // --- Cells ---
    const cells = svg
      .selectAll<SVGGElement, RegionalData>("g.hm-cell")
      .data(data)
      .join("g")
      .attr("class", "hm-cell")
      .attr("transform", (d) => `translate(${xScale(d.region)},${yScale(d.sector)})`)
      .style("cursor", "pointer");

    cells.append("rect")
      .attr("width",  xScale.bandwidth())
      .attr("height", yScale.bandwidth())
      .attr("fill",   (d) => riskColor(d.risk))
      .attr("rx", 4);

    cells.append("text")
      .attr("x",   xScale.bandwidth() / 2)
      .attr("y",   yScale.bandwidth() / 2)
      .attr("dy",  "0.35em")
      .attr("text-anchor", "middle")
      .attr("fill", (d) => (d.risk > 0.55 ? "#fff" : "#171717"))
      .attr("font-size",   "11px")
      .attr("font-weight", "500")
      .text((d) => `${(d.risk * 100).toFixed(0)}%`);

    // --- Entrance animation ---
    if (!reduced) {
      cells
        .attr("opacity", 0)
        .transition()
        .duration(400)
        .delay((_, i) => i * 18)
        .ease(d3.easeCubicOut)
        .attr("opacity", 1);
    }

    // --- Hover: highlight cell, dim others ---
    cells
      .on("mousemove", (event: MouseEvent, d) => {
        const rect = containerEl.getBoundingClientRect();
        setTooltip({
          visible: true,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          cw: containerEl.clientWidth,
          sector: d.sector,
          region: d.region,
          risk:   d.risk,
        });
        d3.select(svgEl)
          .selectAll<SVGGElement, RegionalData>("g.hm-cell")
          .attr("opacity", (c) =>
            c.sector === d.sector && c.region === d.region ? 1 : 0.30
          );
        // scale up hovered cell's rect for emphasis
        d3.select<SVGGElement, RegionalData>(event.currentTarget as SVGGElement)
          .select("rect")
          .attr("transform", "scale(1.06)")
          .attr("transform-origin", `${xScale.bandwidth() / 2} ${yScale.bandwidth() / 2}`);
      })
      .on("mouseleave", () => {
        setTooltip((p) => ({ ...p, visible: false }));
        d3.select(svgEl)
          .selectAll<SVGGElement, RegionalData>("g.hm-cell")
          .attr("opacity", 1)
          .select("rect")
          .attr("transform", null);
      });

    // Caption
    svg.append("text")
      .attr("x", W / 2).attr("y", H - 10)
      .attr("text-anchor", "middle")
      .attr("fill", "#52525b").attr("font-size", "11px")
      .text("AI Disruption Heatmap — green = low risk · red = high risk");
  }, [data]);

  return (
    <div ref={containerRef} className="relative w-full overflow-x-auto">
      <svg ref={svgRef} className="w-full h-auto min-h-[400px]" />

      {tooltip.visible && (
        <div
          className="pointer-events-none absolute z-50 rounded-xl border px-3 py-2.5 text-sm"
          style={{
            left: tooltip.x > tooltip.cw * 0.65 ? tooltip.x - 200 : tooltip.x + 14,
            top: tooltip.y,
            transform: "translateY(-50%)",
            background: "rgba(9,9,11,0.93)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderColor: riskColor(tooltip.risk) + "55",
            minWidth: 175,
            boxShadow: `0 4px 24px rgba(0,0,0,0.4)`,
          }}
        >
          <p className="font-semibold text-white text-sm leading-tight mb-0.5">{tooltip.sector}</p>
          <p className="text-xs text-zinc-500 mb-2">{tooltip.region}</p>
          <div className="flex items-center gap-2">
            <span
              className="text-lg font-bold"
              style={{ color: riskColor(tooltip.risk) }}
            >
              {(tooltip.risk * 100).toFixed(1)}%
            </span>
            <span className="text-xs text-zinc-400">automation risk</span>
          </div>
        </div>
      )}
    </div>
  );
}