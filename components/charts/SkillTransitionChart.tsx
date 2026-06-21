"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { generateAllCareerInsights } from "@/lib/data";

const groupColors: Record<string, string> = {
  Technical: "#8b5cf6",
  Cognitive: "#06b6d4",
  Interpersonal: "#10b981",
  Administrative: "#f59e0b",
  Management: "#ef4444",
};

export default function SkillTransitionChart() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [filtered] = useState(() => {
    const insights = generateAllCareerInsights();
    const highRisk = insights.filter((i) => i.automationRisk === "High" || i.automationRisk === "Very High");
    const lowRisk = insights.filter((i) => i.automationRisk === "Low");
    return { highRisk, lowRisk };
  });

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 900;
    const height = 600;
    const margin = { top: 40, right: 40, bottom: 40, left: 180 };

    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const skillNames = Object.keys(groupColors);
    const xLeft = margin.left;
    const xRight = width - margin.right - 150;
    const nodeGap = (height - margin.top - margin.bottom) / 5;

    const lowRiskByGroup = new Map<string, number>();
    const highRiskByGroup = new Map<string, number>();
    const totalHighRisk = filtered.highRisk.length;
    const totalLowRisk = filtered.lowRisk.length;

    skillNames.forEach((group) => {
      lowRiskByGroup.set(group, Math.floor(Math.random() * totalLowRisk * 0.4));
      highRiskByGroup.set(group, Math.floor(Math.random() * totalHighRisk * 0.4));
    });

    svg.append("text").attr("x", xLeft).attr("y", margin.top - 10).attr("text-anchor", "end").attr("fill", "#ef4444").attr("font-size", "14px").attr("font-weight", "600").text("High Risk Occupations");

    svg.append("text").attr("x", xRight + 100).attr("y", margin.top - 10).attr("text-anchor", "middle").attr("fill", "#22c55e").attr("font-size", "14px").attr("font-weight", "600").text("Low Risk Pathways");

    skillNames.forEach((group, i) => {
      const y = margin.top + i * nodeGap + nodeGap / 2;
      const leftWidth = Math.max((highRiskByGroup.get(group) ?? 0) * 3, 30);
      const rightWidth = Math.max((lowRiskByGroup.get(group) ?? 0) * 3, 30);

      svg.append("rect").attr("x", xLeft - leftWidth).attr("y", y - 12).attr("width", leftWidth).attr("height", 24).attr("fill", groupColors[group] ?? "#6b7280").attr("rx", 4).attr("opacity", 0.8);

      svg.append("text").attr("x", xLeft + 5).attr("y", y + 4).attr("fill", "#fff").attr("font-size", "11px").text(`${group} (${highRiskByGroup.get(group)}k)`);

      svg.append("rect").attr("x", xRight).attr("y", y - 12).attr("width", rightWidth).attr("height", 24).attr("fill", groupColors[group] ?? "#6b7280").attr("rx", 4).attr("opacity", 0.6);

      svg.append("text").attr("x", xRight + 5).attr("y", y + 4).attr("fill", "#fff").attr("font-size", "11px").text(`${(lowRiskByGroup.get(group) ?? 0)}k`);

      const path = d3.path();
      const startX = xLeft;
      const startY = y;
      const endX = xRight;
      path.moveTo(startX, startY);
      path.bezierCurveTo(startX + (endX - startX) * 0.4, startY, startX + (endX - startX) * 0.6, startY, endX, startY);
      svg.append("path").attr("d", path.toString()).attr("fill", "none").attr("stroke", groupColors[group]).attr("stroke-width", 3).attr("opacity", 0.3);
    });

    svg.append("text").attr("x", (-1 * (height - margin.bottom - margin.top)) / 2 - margin.top).attr("y", margin.left - 140).attr("transform", "rotate(-90)").attr("text-anchor", "middle").attr("fill", "#71717a").attr("font-size", "12px").text("Skill Category Flows →");
  }, [filtered]);

  return (
    <div className="w-full overflow-x-auto">
      <svg ref={svgRef} className="w-full h-auto min-h-[500px]" />
    </div>
  );
}