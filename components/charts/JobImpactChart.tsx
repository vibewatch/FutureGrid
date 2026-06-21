"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { colorForRisk } from "@/lib/utils";
import { generateAllCareerInsights } from "@/lib/data";

interface JobImpactChartProps {
  selectedSector?: string;
}

export default function JobImpactChart({ selectedSector }: JobImpactChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data] = useState(() => {
    const insights = generateAllCareerInsights();
    return insights.sort((a, b) => b.automationProbability - a.automationProbability).slice(0, 20);
  });

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 800;
    const height = 500;
    const margin = { top: 30, right: 120, bottom: 180, left: 60 };

    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const filtered = selectedSector
      ? data.filter((d) => d.sectorName === selectedSector)
      : data;

    if (filtered.length === 0) {
      svg.append("text").attr("x", width / 2).attr("y", height / 2).attr("text-anchor", "middle").attr("class", "fill-zinc-400").text("No data available");
      return;
    }

    const x = d3.scaleBand()
      .domain(filtered.map((d) => d.occupationName))
      .range([margin.left, width - margin.right])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, 1])
      .range([height - margin.bottom, margin.top]);

    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .attr("text-anchor", "end")
      .attr("font-size", "11px")
      .attr("fill", "#a1a1aa");

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).tickFormat(d3.format(".0%")))
      .selectAll("text").attr("fill", "#a1a1aa");

    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height - 5)
      .attr("text-anchor", "middle")
      .attr("fill", "#71717a")
      .attr("font-size", "13px")
      .text("Occupations");

    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -(height / 2))
      .attr("y", 15)
      .attr("text-anchor", "middle")
      .attr("fill", "#71717a")
      .attr("font-size", "13px")
      .text("Automation Probability");

    svg.selectAll("rect")
      .data(filtered)
      .join("rect")
      .attr("x", (d) => x(d.occupationName)!)
      .attr("y", (d) => y(d.automationProbability))
      .attr("width", x.bandwidth())
      .attr("height", (d) => y(0) - y(d.automationProbability))
      .attr("fill", (d) => colorForRisk(d.automationRisk))
      .attr("rx", 3)
      .append("title")
      .text((d) => `${d.occupationName}: ${(d.automationProbability * 100).toFixed(1)}% risk`);
  }, [data, selectedSector]);

  return (
    <div className="w-full overflow-x-auto">
      <svg ref={svgRef} className="w-full h-auto min-h-[400px]" />
    </div>
  );
}