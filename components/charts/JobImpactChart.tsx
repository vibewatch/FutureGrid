"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import * as d3 from "d3";
import { colorForRisk } from "@/lib/utils";
import { generateAllCareerInsights } from "@/lib/data";
import { useT } from "@/lib/i18n/useT";
import AccessibleChart from "./AccessibleChart";

interface JobImpactChartProps {
  selectedSector?: string;
}

interface TooltipData {
  visible: boolean;
  x: number;
  y: number;
  cw: number;
  name: string;
  prob: number;
  risk: string;
  sector: string;
}

const RISK_GRAD_IDS: Array<[string, string]> = [
  ["Low",       "#22c55e"],
  ["Medium",    "#eab308"],
  ["High",      "#f97316"],
  ["Very-High", "#ef4444"],
];

const RISK_GLOW: Record<string, string> = {
  Low:         "rgba(34,197,94,0.22)",
  Medium:      "rgba(234,179,8,0.22)",
  High:        "rgba(249,115,22,0.22)",
  "Very High": "rgba(239,68,68,0.22)",
};

export default function JobImpactChart({ selectedSector }: JobImpactChartProps) {
  const t           = useT("charts");
  const svgRef      = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const isDark = (resolvedTheme ?? "dark") !== "light";
  const [tooltip, setTooltip] = useState<TooltipData>({
    visible: false, x: 0, y: 0, cw: 800, name: "", prob: 0, risk: "", sector: "",
  });

  const [data] = useState(() => {
    const insights = generateAllCareerInsights();
    return [...insights]
      .sort((a, b) => b.automationProbability - a.automationProbability)
      .slice(0, 20);
  });

  const labelOccupations = t("labelOccupations");
  const labelAIExposure  = t("labelAIExposure");
  const emptyText        = t("emptyNoSectorData");

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    const svgEl      = svgRef.current;
    const containerEl = containerRef.current;
    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Theme-aware colors
    const axisText  = isDark ? "#a1a1aa" : "#52525b";
    const axisLabel = isDark ? "#52525b" : "#3f3f46";
    const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
    const axisLine  = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";

    const W = 800, H = 500;
    const M = { top: 30, right: 40, bottom: 180, left: 60 };
    svg.attr("viewBox", `0 0 ${W} ${H}`);

    const filtered = selectedSector
      ? data.filter((d) => d.sectorName === selectedSector)
      : data;

    if (filtered.length === 0) {
      svg.append("text")
        .attr("x", W / 2).attr("y", H / 2)
        .attr("text-anchor", "middle")
        .attr("fill", axisText).attr("font-size", "14px")
        .text(emptyText);
      return;
    }

    // --- Gradient defs (top-opaque → bottom-transparent per risk colour) ---
    const defs = svg.append("defs");
    RISK_GRAD_IDS.forEach(([id, color]) => {
      const g = defs.append("linearGradient")
        .attr("id", `jib-${id}`)
        .attr("x1", "0").attr("y1", "0").attr("x2", "0").attr("y2", "1");
      g.append("stop").attr("offset", "0%")  .attr("stop-color", color).attr("stop-opacity", "0.95");
      g.append("stop").attr("offset", "100%").attr("stop-color", color).attr("stop-opacity", "0.38");
    });

    // --- Scales ---
    const x = d3.scaleBand()
      .domain(filtered.map((d) => d.occupationName))
      .range([M.left, W - M.right])
      .padding(0.25);

    const y = d3.scaleLinear()
      .domain([0, 1])
      .range([H - M.bottom, M.top]);

    // --- Horizontal gridlines ---
    const grid = svg.append("g").attr("transform", `translate(${M.left},0)`);
    grid.call(
      d3.axisLeft(y).tickSize(-(W - M.left - M.right)).tickFormat(() => "").ticks(5)
    );
    grid.selectAll("line")
      .attr("stroke", gridColor)
      .attr("stroke-dasharray", "3,5");
    grid.select(".domain").remove();

    // --- X axis ---
    const xAxis = svg.append("g")
      .attr("transform", `translate(0,${H - M.bottom})`)
      .call(d3.axisBottom(x).tickSize(4));
    xAxis.select(".domain").attr("stroke", axisLine);
    xAxis.selectAll(".tick line").attr("stroke", axisLine);
    xAxis.selectAll<SVGTextElement, string>("text")
      .attr("transform", "rotate(-45)")
      .attr("text-anchor", "end")
      .attr("font-size", "10px")
      .attr("fill", axisText)
      .attr("dy", "0.32em")
      .attr("dx", "-0.5em")
      .each(function () {
        const node = d3.select(this);
        const t = node.text();
        if (t.length > 22) node.text(t.slice(0, 21) + "…");
      });

    // --- Y axis ---
    const yAxis = svg.append("g")
      .attr("transform", `translate(${M.left},0)`)
      .call(d3.axisLeft(y).tickFormat(d3.format(".0%")).ticks(5).tickSize(4));
    yAxis.select(".domain").attr("stroke", axisLine);
    yAxis.selectAll(".tick line").attr("stroke", axisLine);
    yAxis.selectAll("text").attr("fill", axisText).attr("font-size", "11px");

    // --- Axis labels ---
    svg.append("text")
      .attr("x", W / 2).attr("y", H - 5)
      .attr("text-anchor", "middle")
      .attr("fill", axisLabel).attr("font-size", "12px")
      .text(labelOccupations);
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -(H / 2)).attr("y", 15)
      .attr("text-anchor", "middle")
      .attr("fill", axisLabel).attr("font-size", "12px")
      .text(labelAIExposure);

    // --- Bars ---
    type Datum = (typeof filtered)[number];
    const bars = svg
      .selectAll<SVGRectElement, Datum>("rect.bar")
      .data(filtered)
      .join("rect")
      .attr("class", "bar")
      .attr("x", (d) => x(d.occupationName)!)
      .attr("width", x.bandwidth())
      .attr("rx", 3)
      .attr("fill", (d) => `url(#jib-${d.automationRisk.replace(" ", "-")})`)
      .attr("stroke", (d) => colorForRisk(d.automationRisk))
      .attr("stroke-width", 0.5)
      .attr("stroke-opacity", 0.6)
      .style("cursor", "pointer");

    if (reduced) {
      bars
        .attr("y", (d) => y(d.automationProbability))
        .attr("height", (d) => y(0) - y(d.automationProbability));
    } else {
      bars
        .attr("y", y(0))
        .attr("height", 0)
        .transition()
        .duration(700)
        .delay((_, i) => i * 30)
        .ease(d3.easeCubicOut)
        .attr("y", (d) => y(d.automationProbability))
        .attr("height", (d) => y(0) - y(d.automationProbability));
    }

    // --- Hover interactions ---
    bars
      .on("mousemove", (event: MouseEvent, d) => {
        const rect = containerEl.getBoundingClientRect();
        setTooltip({
          visible: true,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          cw: containerEl.clientWidth,
          name: d.occupationName,
          prob: d.automationProbability,
          risk: d.automationRisk,
          sector: d.sectorName,
        });
        d3.select(svgEl)
          .selectAll<SVGRectElement, Datum>("rect.bar")
          .attr("opacity",       (b) => b.occupationName === d.occupationName ? 1 : 0.25)
          .attr("stroke-width",  (b) => b.occupationName === d.occupationName ? 1.5 : 0.5)
          .attr("stroke-opacity",(b) => b.occupationName === d.occupationName ? 1 : 0.15);
      })
      .on("mouseleave", () => {
        setTooltip((p) => ({ ...p, visible: false }));
        d3.select(svgEl)
          .selectAll<SVGRectElement, unknown>("rect.bar")
          .attr("opacity", 1)
          .attr("stroke-width", 0.5)
          .attr("stroke-opacity", 0.6);
      });
  }, [data, selectedSector, isDark, labelOccupations, labelAIExposure, emptyText]);

  return (
    <AccessibleChart
      label={t("a11yJobImpactName")}
      summary={
        <>
          <p>{t("a11yJobImpactSummary")}</p>
          <table>
            <caption>{t("a11yJobImpactName")}</caption>
            <thead>
              <tr>
                <th scope="col">{t("labelOccupations")}</th>
                <th scope="col">{t("labelAIExposure")}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.occupationCode}>
                  <td>{d.occupationName}</td>
                  <td>{(d.automationProbability * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      }
    >
      <div ref={containerRef} className="relative w-full overflow-x-auto">
        <svg ref={svgRef} className="w-full h-auto min-h-[400px]" aria-hidden="true" />

        {tooltip.visible && (
        <div
          className="pointer-events-none absolute z-50 rounded-xl border px-3 py-2.5 text-sm"
          style={{
            left: tooltip.x > tooltip.cw * 0.65 ? tooltip.x - 215 : tooltip.x + 14,
            top: tooltip.y,
            transform: "translateY(-50%)",
            background: isDark ? "rgba(9,9,11,0.93)" : "rgba(255,255,255,0.95)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderColor: colorForRisk(tooltip.risk) + "44",
            minWidth: 195,
            boxShadow: isDark
              ? `0 4px 24px ${RISK_GLOW[tooltip.risk] ?? "rgba(0,0,0,0.4)"}`
              : `0 4px 16px rgba(0,0,0,0.10)`,
          }}
        >
          <p className="font-semibold text-zinc-900 dark:text-white leading-tight mb-0.5 max-w-[200px] truncate">
            {tooltip.name}
          </p>
          <p className="text-xs text-zinc-500 mb-2">{tooltip.sector}</p>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold" style={{ color: colorForRisk(tooltip.risk) }}>
              {(tooltip.prob * 100).toFixed(1)}%
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                background: colorForRisk(tooltip.risk) + "22",
                color: colorForRisk(tooltip.risk),
                border: `1px solid ${colorForRisk(tooltip.risk)}40`,
              }}
            >
              {tooltip.risk}
            </span>
          </div>
        </div>
      )}
    </div>
    </AccessibleChart>
  );
}