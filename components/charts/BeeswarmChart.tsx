"use client";

import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import * as d3 from "d3";
import type { CareerInsight } from "@/lib/data";
import { colorForRisk } from "@/lib/utils";
import { useT } from "@/lib/i18n/useT";

// ── Categorical sector palette (20 distinct colors) ──────────────────────────

const SECTOR_COLORS = [
  "#818cf8", "#34d399", "#f472b6", "#fb923c", "#38bdf8",
  "#a3e635", "#e879f9", "#fbbf24", "#22d3ee", "#f87171",
  "#4ade80", "#c084fc", "#fdba74", "#67e8f9", "#86efac",
  "#fde68a", "#a5b4fc", "#6ee7b7", "#fca5a5", "#93c5fd",
];

function getSectorColor(sectorName: string, sectorIndex: Map<string, number>): string {
  const idx = sectorIndex.get(sectorName) ?? 0;
  return SECTOR_COLORS[idx % SECTOR_COLORS.length];
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface SimNode extends CareerInsight {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  index?: number;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  cw: number;
  item: CareerInsight;
}

const EMPTY_ITEM: CareerInsight = {
  occupationCode: "",
  occupationName: "",
  automationRisk: "Low",
  automationProbability: 0,
  growthRate: null,
  medianSalary: 0,
  totalEmployment: null,
  projectedOpenings: null,
  outlook: "Average",
  sectorName: "",
  skills: [],
  employmentHistory: null,
  wageHistory: null,
};

export interface BeeswarmChartProps {
  data: CareerInsight[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BeeswarmChart({ data }: BeeswarmChartProps) {
  const t              = useT("charts");
  const router         = useRouter();
  const svgRef         = useRef<SVGSVGElement>(null);
  const containerRef   = useRef<HTMLDivElement>(null);
  const simRef         = useRef<d3.Simulation<SimNode, undefined> | null>(null);
  const { resolvedTheme } = useTheme();
  const isDark = (resolvedTheme ?? "dark") !== "light";

  const routerRef = useRef(router);
  useEffect(() => { routerRef.current = router; }, [router]);

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, cw: 800, item: EMPTY_ITEM,
  });

  // Sector → stable color index
  const sectorIndex = useMemo(() => {
    const sectors = Array.from(new Set(data.map((d) => d.sectorName))).sort();
    return new Map(sectors.map((s, i) => [s, i]));
  }, [data]);

  // Unique sectors for legend
  const sectors = useMemo(
    () => Array.from(sectorIndex.keys()),
    [sectorIndex],
  );

  // Top-5 exposed occupations for SR summary
  const top5 = useMemo(
    () =>
      [...data]
        .sort((a, b) => b.automationProbability - a.automationProbability)
        .slice(0, 5)
        .map((d) => d.occupationName)
        .join(", "),
    [data],
  );

  const axisAIExposure = t("axisAIExposure");

  // ── D3 beeswarm ──────────────────────────────────────────────────────────

  const draw = useCallback(() => {
    const svgEl       = svgRef.current;
    const containerEl = containerRef.current;
    if (!svgEl || !containerEl || data.length === 0) return;

    // Stop any running simulation
    simRef.current?.stop();

    const svg     = d3.select(svgEl);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Theme-aware colors
    const axisText  = isDark ? "#71717a" : "#52525b";
    const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
    const axisLine  = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";

    svg.selectAll("*").remove();

    // Dimensions
    const W      = 900;
    const H      = 480;
    const margin = { top: 24, right: 24, bottom: 48, left: 56 };
    const innerW = W - margin.left - margin.right;
    const innerH = H - margin.top  - margin.bottom;

    svg.attr("viewBox", `0 0 ${W} ${H}`).attr("aria-hidden", "true");

    // ── Scales ──────────────────────────────────────────────────────────────

    const xScale = d3.scaleLinear()
      .domain([0, 1])
      .range([margin.left, W - margin.right])
      .nice();

    const maxEmp = d3.max(data, (d) => d.totalEmployment ?? 0) ?? 1;
    const rScale = d3.scaleSqrt()
      .domain([0, maxEmp])
      .range([3, 11]);

    const radius = (d: CareerInsight) =>
      d.totalEmployment != null ? Math.max(3, rScale(d.totalEmployment)) : 3.5;

    // ── Grid lines ──────────────────────────────────────────────────────────

    const g = svg.append("g");

    g.append("g")
      .attr("transform", `translate(0,${H - margin.bottom})`)
      .call(
        d3.axisBottom(xScale).ticks(5).tickSize(-(innerH))
      )
      .call((ax) => {
        ax.select(".domain").remove();
        ax.selectAll(".tick line")
          .attr("stroke", gridColor)
          .attr("stroke-dasharray", "3,3");
        ax.selectAll(".tick text").remove();
      });

    // ── X-axis ──────────────────────────────────────────────────────────────

    const xAxisG = g.append("g")
      .attr("transform", `translate(0,${H - margin.bottom})`)
      .call(
        d3.axisBottom(xScale)
          .ticks(5)
          .tickFormat((v) => `${Math.round(+v * 100)}%`)
      );
    xAxisG.select(".domain").attr("stroke", axisLine);
    xAxisG.selectAll(".tick line").attr("stroke", axisLine);
    xAxisG.selectAll("text").attr("fill", axisText).attr("font-size", "11px");

    // X-axis label
    g.append("text")
      .attr("x", margin.left + innerW / 2)
      .attr("y", H - 6)
      .attr("text-anchor", "middle")
      .attr("fill", axisText)
      .attr("font-size", "11px")
      .text(axisAIExposure);

    // ── Dot group ───────────────────────────────────────────────────────────

    const dotsG = g.append("g").attr("class", "dots");

    // Clone data so the force sim can mutate positions
    const nodes: SimNode[] = data.map((d) => ({
      ...d,
      x: xScale(d.automationProbability),
      y: margin.top + innerH / 2 + (Math.random() - 0.5) * 20,
    }));

    const circles = dotsG
      .selectAll<SVGCircleElement, SimNode>("circle.bee-dot")
      .data(nodes)
      .join("circle")
      .attr("class", "bee-dot")
      .attr("r", (d) => radius(d))
      .attr("fill", (d) => getSectorColor(d.sectorName, sectorIndex))
      .attr("fill-opacity", 0.78)
      .attr("stroke", (d) => getSectorColor(d.sectorName, sectorIndex))
      .attr("stroke-width", 0.8)
      .attr("stroke-opacity", 0.55)
      .style("cursor", "pointer");

    if (!reduced) {
      circles.attr("opacity", 0);
    }

    // ── Force simulation ─────────────────────────────────────────────────────

    const sim = d3.forceSimulation<SimNode>(nodes)
      .force("x", d3.forceX<SimNode>((d) => xScale(d.automationProbability)).strength(0.9))
      .force("y", d3.forceY<SimNode>(margin.top + innerH / 2).strength(0.05))
      .force("collide", d3.forceCollide<SimNode>((d) => radius(d) + 1).strength(0.85))
      .alphaDecay(0.028)
      .velocityDecay(0.4);

    simRef.current = sim;

    if (reduced) {
      // Run synchronously to settled layout, no animation
      sim.stop();
      for (let i = 0; i < 300; i++) sim.tick();
      circles
        .attr("cx", (d) => d.x)
        .attr("cy", (d) => d.y);
    } else {
      // Animated settle
      sim.on("tick", () => {
        circles
          .attr("cx", (d) => d.x)
          .attr("cy", (d) => d.y);
      });

      // Fade-in after brief delay
      circles
        .transition()
        .delay((_, i) => Math.min(i * 0.8, 400))
        .duration(300)
        .attr("opacity", 1);
    }

    // ── Hover & click ───────────────────────────────────────────────────────

    circles
      .on("mousemove", function (event: MouseEvent, d: SimNode) {
        const rect = containerEl.getBoundingClientRect();
        setTooltip({
          visible: true,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          cw: containerEl.clientWidth,
          item: d,
        });
        d3.select(svgEl)
          .selectAll<SVGCircleElement, SimNode>("circle.bee-dot")
          .attr("fill-opacity", (c: SimNode) =>
            c.occupationCode === d.occupationCode ? 1 : 0.12
          )
          .attr("stroke-opacity", (c: SimNode) =>
            c.occupationCode === d.occupationCode ? 1 : 0.08
          );
        d3.select<SVGCircleElement, SimNode>(this)
          .attr("r", radius(d) * 1.6)
          .attr("stroke-width", 2);
      })
      .on("mouseleave", () => {
        setTooltip((p) => ({ ...p, visible: false }));
        d3.select(svgEl)
          .selectAll<SVGCircleElement, SimNode>("circle.bee-dot")
          .attr("fill-opacity", 0.78)
          .attr("stroke-opacity", 0.55)
          .attr("stroke-width", 0.8)
          .attr("r", (d: SimNode) => radius(d));
      })
      .on("click", (_: MouseEvent, d: SimNode) => {
        routerRef.current.push(`/careers/${encodeURIComponent(d.occupationCode)}`);
      });

    return () => {
      sim.stop();
      svg.selectAll("*").interrupt();
    };
  }, [data, isDark, sectorIndex, axisAIExposure]);

  useEffect(() => {
    const cleanup = draw();
    return () => {
      simRef.current?.stop();
      cleanup?.();
    };
  }, [draw]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Chart */}
      <div
        ref={containerRef}
        className="relative w-full overflow-x-auto"
        role="img"
        aria-label={`Beeswarm chart: ${data.length} occupations by AI exposure`}
      >
        <svg
          ref={svgRef}
          className="w-full h-auto"
          style={{ minHeight: 280 }}
        />

        {/* Screen-reader summary */}
        <p className="sr-only">
          {`Beeswarm chart showing ${data.length} occupations by AI exposure. Top exposed: ${top5}.`}
        </p>

        {/* SR occupation list for keyboard/AT users */}
        <ul className="sr-only" aria-label="Occupations">
          {data.slice(0, 50).map((d) => (
            <li key={d.occupationCode}>
              <a href={`/careers/${encodeURIComponent(d.occupationCode)}`}>
                {d.occupationName} — {(d.automationProbability * 100).toFixed(0)}% AI exposure
              </a>
            </li>
          ))}
        </ul>

        {/* Tooltip */}
        {tooltip.visible && (
          <div
            className="pointer-events-none absolute z-50 rounded-xl border px-3.5 py-3 text-sm"
            style={{
              left: tooltip.x > tooltip.cw * 0.62 ? tooltip.x - 240 : tooltip.x + 14,
              top: tooltip.y,
              transform: "translateY(-50%)",
              background: isDark ? "rgba(9,9,11,0.93)" : "rgba(255,255,255,0.96)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderColor: colorForRisk(tooltip.item.automationRisk) + "55",
              minWidth: 220,
              boxShadow: isDark
                ? "0 4px 28px rgba(0,0,0,0.55)"
                : "0 4px 16px rgba(0,0,0,0.10)",
            }}
          >
            <p className="font-semibold text-zinc-900 dark:text-white text-sm mb-0.5 leading-tight">
              {tooltip.item.occupationName}
            </p>
            <p className="text-[11px] text-zinc-500 mb-2">{tooltip.item.sectorName}</p>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between gap-4">
                <span className="text-zinc-500">{t("labelAIExposure")}</span>
                <span
                  className="font-semibold"
                  style={{ color: colorForRisk(tooltip.item.automationRisk) }}
                >
                  {(tooltip.item.automationProbability * 100).toFixed(1)}%{" "}
                  — {tooltip.item.automationRisk}
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
              <div className="flex justify-between gap-4">
                <span className="text-zinc-500">{t("labelMedianSalary")}</span>
                <span className="text-zinc-900 dark:text-white font-medium">
                  {tooltip.item.medianSalary > 0
                    ? `$${tooltip.item.medianSalary.toLocaleString()}`
                    : "—"}
                </span>
              </div>
            </div>
            <p className="text-[10px] text-zinc-500 mt-2.5">{t("tooltipClickCareer")}</p>
          </div>
        )}
      </div>

      {/* Sector legend (wrapped, scrollable on mobile) */}
      <div
        className="flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-zinc-600 dark:text-zinc-400 select-none"
        aria-hidden="true"
      >
        {sectors.map((s) => (
          <span key={s} className="flex items-center gap-1">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: getSectorColor(s, sectorIndex) }}
            />
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
