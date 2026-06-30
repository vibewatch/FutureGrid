"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import * as d3 from "d3";
import { generateAllCareerInsights } from "@/lib/data";
import { useT } from "@/lib/i18n/useT";

const GROUP_COLORS: Record<string, string> = {
  Technical:      "#8b5cf6",
  Cognitive:      "#22d3ee",
  Interpersonal:  "#10b981",
  Administrative: "#eab308",
  Management:     "#ef4444",
};

function deterministicInt(seed: string, min: number, max: number): number {
  // FNV-1a hash — stable pseudo-random number from a string seed
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(h ^ seed.charCodeAt(i), 16777619)) >>> 0;
  }
  return min + (h % (max - min + 1));
}

interface TooltipData {
  visible: boolean;
  x: number;
  y: number;
  cw: number;
  group: string;
  highCount: number;
  lowCount: number;
}

type RowDatum = {
  group: string;
  y: number;
  leftWidth: number;
  rightWidth: number;
  highCount: number;
  lowCount: number;
  color: string;
};

export default function SkillTransitionChart() {
  const t            = useT("charts");
  const svgRef       = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const isDark = (resolvedTheme ?? "dark") !== "light";
  const [tooltip, setTooltip] = useState<TooltipData>({
    visible: false, x: 0, y: 0, cw: 900, group: "", highCount: 0, lowCount: 0,
  });

  const [filtered] = useState(() => {
    const insights = generateAllCareerInsights();
    return {
      highRisk: insights.filter((i) => i.automationRisk === "High" || i.automationRisk === "Very High"),
      lowRisk:  insights.filter((i) => i.automationRisk === "Low"),
    };
  });

  const headerHighRisk  = t("sectionHighRisk");
  const headerLowRisk   = t("sectionLowRiskPathways");
  const axisSkillFlows  = t("axisSkillCategoryFlows");

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    const svgEl      = svgRef.current;
    const containerEl = containerRef.current;
    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Theme-aware colors
    const rowText  = isDark ? "#e4e4e7" : "#18181b";
    const axisLabel = isDark ? "#52525b" : "#3f3f46";

    const W = 900, H = 600;
    const M = { top: 50, right: 40, bottom: 40, left: 180 };
    svg.attr("viewBox", `0 0 ${W} ${H}`);

    const skillNames = Object.keys(GROUP_COLORS);
    const xLeft  = M.left;
    const xRight = W - M.right - 150;
    const rowH   = (H - M.top - M.bottom) / skillNames.length;

    const totalHigh = filtered.highRisk.length;
    const totalLow  = filtered.lowRisk.length;

    const rows: RowDatum[] = skillNames.map((group, i) => {
      const highMax   = Math.max(Math.floor(totalHigh * 0.4) - 1, 0);
      const lowMax    = Math.max(Math.floor(totalLow  * 0.4) - 1, 0);
      const highCount = deterministicInt(group + ":high", 0, highMax);
      const lowCount  = deterministicInt(group + ":low",  0, lowMax);
      return {
        group,
        y:          M.top + i * rowH + rowH / 2,
        leftWidth:  Math.max(highCount * 3, 30),
        rightWidth: Math.max(lowCount  * 3, 30),
        highCount,
        lowCount,
        color: GROUP_COLORS[group] ?? "#6b7280",
      };
    });

    // --- Gradient defs for bezier strokes ---
    const defs = svg.append("defs");
    rows.forEach((row) => {
      const g = defs.append("linearGradient")
        .attr("id", `stc-pg-${row.group}`)
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", xLeft).attr("y1", 0)
        .attr("x2", xRight).attr("y2", 0);
      g.append("stop").attr("offset", "0%")  .attr("stop-color", row.color).attr("stop-opacity", "0.70");
      g.append("stop").attr("offset", "100%").attr("stop-color", row.color).attr("stop-opacity", "0.12");
    });

    // --- Section headers ---
    svg.append("text")
      .attr("x", xLeft).attr("y", M.top - 18)
      .attr("text-anchor", "end")
      .attr("fill", "#ef4444").attr("font-size", "13px").attr("font-weight", "600")
      .text(headerHighRisk);
    svg.append("text")
      .attr("x", xRight + 75).attr("y", M.top - 18)
      .attr("text-anchor", "middle")
      .attr("fill", "#22c55e").attr("font-size", "13px").attr("font-weight", "600")
      .text(headerLowRisk);

    // --- Row groups (each group = path + two rects + two labels) ---
    const rowGroups = svg
      .selectAll<SVGGElement, RowDatum>("g.stc-row")
      .data(rows)
      .join("g")
      .attr("class", "stc-row")
      .style("cursor", "pointer");

    // Bezier connection path
    rowGroups.append("path")
      .attr("d", (d) => {
        const p = d3.path();
        p.moveTo(xLeft, d.y);
        p.bezierCurveTo(
          xLeft + (xRight - xLeft) * 0.4, d.y,
          xLeft + (xRight - xLeft) * 0.6, d.y,
          xRight, d.y,
        );
        return p.toString();
      })
      .attr("fill", "none")
      .attr("stroke", (d) => `url(#stc-pg-${d.group})`)
      .attr("stroke-width", 3);

    // Left bar (high-risk side)
    rowGroups.append("rect")
      .attr("x", (d) => xLeft - d.leftWidth)
      .attr("y", (d) => d.y - 12)
      .attr("width",  (d) => d.leftWidth)
      .attr("height", 24)
      .attr("fill", (d) => d.color)
      .attr("rx", 4)
      .attr("opacity", 0.85);

    // Left label
    rowGroups.append("text")
      .attr("x", xLeft + 5).attr("y", (d) => d.y + 4)
      .attr("fill", rowText).attr("font-size", "11px")
      .text((d) => `${d.group} (${d.highCount}k)`);

    // Right bar (low-risk side)
    rowGroups.append("rect")
      .attr("x", xRight)
      .attr("y", (d) => d.y - 12)
      .attr("width",  (d) => d.rightWidth)
      .attr("height", 24)
      .attr("fill", (d) => d.color)
      .attr("rx", 4)
      .attr("opacity", 0.55);

    // Right label
    rowGroups.append("text")
      .attr("x", xRight + 5).attr("y", (d) => d.y + 4)
      .attr("fill", rowText).attr("font-size", "11px")
      .text((d) => `${d.lowCount}k`);

    // --- Entrance animation ---
    if (!reduced) {
      rowGroups
        .attr("opacity", 0)
        .transition()
        .duration(500)
        .delay((_, i) => i * 100)
        .ease(d3.easeCubicOut)
        .attr("opacity", 1);
    }

    // --- Hover: dim siblings, show tooltip ---
    rowGroups
      .on("mousemove", (event: MouseEvent, d) => {
        const rect = containerEl.getBoundingClientRect();
        setTooltip({
          visible: true,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          cw: containerEl.clientWidth,
          group: d.group,
          highCount: d.highCount,
          lowCount: d.lowCount,
        });
        d3.select(svgEl)
          .selectAll<SVGGElement, RowDatum>("g.stc-row")
          .attr("opacity", (r) => r.group === d.group ? 1 : 0.15);
      })
      .on("mouseleave", () => {
        setTooltip((p) => ({ ...p, visible: false }));
        d3.select(svgEl)
          .selectAll<SVGGElement, RowDatum>("g.stc-row")
          .attr("opacity", 1);
      });

    // Axis label
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -(H / 2)).attr("y", 14)
      .attr("text-anchor", "middle")
      .attr("fill", axisLabel).attr("font-size", "12px")
      .text(axisSkillFlows);
  }, [filtered, isDark, headerHighRisk, headerLowRisk, axisSkillFlows]);

  return (
    <div ref={containerRef} className="relative w-full overflow-x-auto">
      <svg ref={svgRef} className="w-full h-auto min-h-[500px]" />

      {tooltip.visible && (
        <div
          className="pointer-events-none absolute z-50 rounded-xl border px-3 py-2.5 text-sm"
          style={{
            left: tooltip.x > tooltip.cw * 0.65 ? tooltip.x - 200 : tooltip.x + 14,
            top: tooltip.y,
            transform: "translateY(-50%)",
            background: isDark ? "rgba(9,9,11,0.93)" : "rgba(255,255,255,0.95)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderColor: (GROUP_COLORS[tooltip.group] ?? "#6b7280") + "44",
            minWidth: 180,
            boxShadow: isDark ? "0 4px 24px rgba(0,0,0,0.4)" : "0 4px 16px rgba(0,0,0,0.10)",
          }}
        >
          <p
            className="font-semibold text-sm mb-2"
            style={{ color: GROUP_COLORS[tooltip.group] ?? "#e4e4e7" }}
          >
          {t("tooltipSkillsGroup", { group: tooltip.group })}
          </p>
          <div className="flex justify-between gap-4 text-xs mb-1">
            <span className="text-zinc-500">{t("tooltipHighRiskWorkers")}</span>
            <span className="font-semibold" style={{ color: "#ef4444" }}>{tooltip.highCount}k</span>
          </div>
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-zinc-500">{t("tooltipLowRiskPathway")}</span>
            <span className="font-semibold" style={{ color: "#22c55e" }}>{tooltip.lowCount}k</span>
          </div>
        </div>
      )}
    </div>
  );
}