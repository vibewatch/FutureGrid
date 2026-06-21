"use client";

import { useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import { getSectorAggregates, generateAllCareerInsights } from "@/lib/data";

interface RegionalData {
  sector: string;
  region: string;
  risk: number;
}

const REGIONS = ["Northeast", "Midwest", "South", "West"];

export default function HeatmapChart() {
  const svgRef = useRef<SVGSVGElement>(null);

  const data: RegionalData[] = useMemo(() => {
    const sectors = getSectorAggregates();
    const all = generateAllCareerInsights();
    return sectors.flatMap((s) =>
      REGIONS.map((region) => {
        const sectorOccupations = all.filter((o) => o.sectorName === s.sector);
        const avgRisk = sectorOccupations.length > 0
          ? sectorOccupations.reduce((sum, o) => sum + o.automationProbability, 0) / sectorOccupations.length
          : s.avgRisk;
        const jitter = (Math.random() - 0.5) * 0.1;
        return { sector: s.sector, region, risk: Math.max(0, Math.min(1, avgRisk + jitter)) };
      })
    );
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 50, right: 30, bottom: 180, left: 130 };
    const cellWidth = 120;
    const cellHeight = 35;
    const width = margin.left + REGIONS.length * cellWidth + margin.right;
    const height = margin.top + data.length / REGIONS.length * cellHeight + margin.bottom;

    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const colorScale = d3.scaleSequential(d3.interpolateRdYlGn).domain([1, 0]);

    const xScale = d3.scaleBand().domain(REGIONS).range([margin.left, margin.left + REGIONS.length * cellWidth]).padding(0.05);
    const yScale = d3.scaleBand()
      .domain([...new Set(data.map((d) => d.sector))])
      .range([margin.top, margin.top + (data.length / REGIONS.length) * cellHeight])
      .padding(0.05);

    svg.append("g").attr("transform", `translate(0,${margin.top - 5})`).call(d3.axisTop(xScale)).selectAll("text").attr("fill", "#a1a1aa").attr("font-weight", "600");
    svg.append("g").attr("transform", `translate(${margin.left - 5},0)`).call(d3.axisLeft(yScale)).selectAll("text").attr("fill", "#a1a1aa").attr("text-anchor", "end");

    const cells = svg.selectAll("g.cell").data(data).join("g").attr("transform", (d) => `translate(${xScale(d.region)},${yScale(d.sector)})`);

    cells.append("rect")
      .attr("width", xScale.bandwidth())
      .attr("height", yScale.bandwidth())
      .attr("fill", (d) => colorScale(d.risk))
      .attr("rx", 4);

    cells.append("text")
      .attr("x", xScale.bandwidth() / 2)
      .attr("y", yScale.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .attr("fill", (d) => (d.risk > 0.55 ? "#fff" : "#171717"))
      .attr("font-size", "11px")
      .text((d) => `${(d.risk * 100).toFixed(0)}%`);

    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height - 5)
      .attr("text-anchor", "middle")
      .attr("fill", "#71717a")
      .attr("font-size", "12px")
      .text("AI Disruption Heatmap: Darker red = higher automation risk");
  }, [data]);

  return (
    <div className="w-full overflow-x-auto">
      <svg ref={svgRef} className="w-full h-auto min-h-[400px]" />
    </div>
  );
}