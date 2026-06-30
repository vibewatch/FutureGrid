"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import * as d3 from "d3";
import { generateAllCareerInsights } from "@/lib/data";
import type { CareerInsight } from "@/lib/data";
import { useT } from "@/lib/i18n/useT";

// ── Brand sequential color scale (matches HeatmapChart) ──────────────────────

function exposureColor(t: number): string {
  if (t <= 0.5) return d3.interpolateRgb("#1e1b4b", "#7c3aed")(t * 2);
  return d3.interpolateRgb("#7c3aed", "#06b6d4")((t - 0.5) * 2);
}

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtEmp(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return n.toFixed(0);
}

function fmtSalary(n: number): string {
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return "$" + (n / 1_000).toFixed(0) + "K";
  return "$" + n.toFixed(0);
}

// ── Hierarchy types ───────────────────────────────────────────────────────────

interface TreeNode {
  name: string;
  children?: TreeNode[];
  value?: number;
  insight?: CareerInsight;
}

// ── Tooltip state ─────────────────────────────────────────────────────────────

interface TooltipData {
  visible: boolean;
  x: number;
  y: number;
  cw: number;
  insight: CareerInsight;
}

const DUMMY_INSIGHT: CareerInsight = {
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

// ── Component ─────────────────────────────────────────────────────────────────

export default function TreemapChart() {
  const t      = useT("charts");
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const isDark = (resolvedTheme ?? "dark") !== "light";

  const router = useRouter();
  const routerRef = useRef(router);
  useEffect(() => { routerRef.current = router; }, [router]);

  const [tooltip, setTooltip] = useState<TooltipData>({
    visible: false, x: 0, y: 0, cw: 800, insight: DUMMY_INSIGHT,
  });
  const [focusSector, setFocusSector] = useState<string | null>(null);

  // ── Data ───────────────────────────────────────────────────────────────────

  const allInsights = useMemo(
    () => generateAllCareerInsights().filter((i) => (i.totalEmployment ?? 0) > 0),
    [],
  );

  // Sectors sorted by total employment (largest first)
  const sectors = useMemo(() => {
    const groups = d3.group(allInsights, (i) => i.sectorName);
    return Array.from(groups.entries()).sort(
      (a, b) =>
        d3.sum(b[1], (o) => o.totalEmployment ?? 0) -
        d3.sum(a[1], (o) => o.totalEmployment ?? 0),
    );
  }, [allInsights]);

  const treeData = useMemo((): TreeNode => {
    const filtered = focusSector
      ? sectors.filter(([s]) => s === focusSector)
      : sectors;
    return {
      name: "root",
      children: filtered.map(([sector, occs]) => ({
        name: sector,
        children: occs
          .slice()
          .sort((a, b) => (b.totalEmployment ?? 0) - (a.totalEmployment ?? 0))
          .map((o) => ({
            name: o.occupationName,
            value: o.totalEmployment ?? 0,
            insight: o,
          })),
      })),
    };
  }, [sectors, focusSector]);

  // ── D3 draw ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const svgEl = svgRef.current;
    const containerEl = containerRef.current;
    if (!svgEl || !containerEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Theme-aware palette
    const sectorBg      = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
    const sectorStroke  = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)";
    const sectorLabel   = isDark ? "#a1a1aa" : "#52525b";
    const tileStroke    = isDark ? "rgba(0,0,0,0.50)" : "rgba(255,255,255,0.45)";

    const W = 1200;
    const H = focusSector ? 520 : 700;
    svg.attr("viewBox", `0 0 ${W} ${H}`);

    if ((treeData.children?.length ?? 0) === 0) return;

    const hierarchy = d3
      .hierarchy<TreeNode>(treeData)
      .sum((d) => d.value ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    const treemapLayout = d3
      .treemap<TreeNode>()
      .size([W, H])
      .paddingTop(24)
      .paddingInner(2)
      .paddingOuter(focusSector ? 2 : 6)
      .round(true);

    const root = treemapLayout(hierarchy);
    type TNode = d3.HierarchyRectangularNode<TreeNode>;

    const depth1 = (root.children ?? []) as TNode[];
    const depth2 = root.leaves() as TNode[];

    const tw = (d: TNode) => Math.max(0, d.x1 - d.x0);
    const th = (d: TNode) => Math.max(0, d.y1 - d.y0);
    const exposure = (d: TNode) => d.data.insight?.automationProbability ?? 0.5;

    // ── Sector background tiles (depth 1) ────────────────────────────────────

    const sectorGs = svg
      .selectAll<SVGGElement, TNode>("g.tm-sector")
      .data(depth1)
      .join("g")
      .attr("class", "tm-sector")
      .attr("transform", (d) => `translate(${d.x0},${d.y0})`)
      .style("cursor", focusSector ? "default" : "pointer")
      .on("click", (_, d) => {
        if (!focusSector) setFocusSector(d.data.name);
      });

    sectorGs
      .append("rect")
      .attr("width", tw)
      .attr("height", th)
      .attr("fill", sectorBg)
      .attr("stroke", sectorStroke)
      .attr("stroke-width", 1)
      .attr("rx", 4);

    sectorGs
      .append("text")
      .attr("x", 6)
      .attr("y", 15)
      .attr("fill", sectorLabel)
      .attr("font-size", "11px")
      .attr("font-weight", "700")
      .attr("pointer-events", "none")
      .attr("user-select", "none")
      .text((d) => {
        const w = tw(d);
        const label = focusSector ? d.data.name : d.data.name.split(" ")[0];
        const maxChars = Math.max(2, Math.floor(w / 7.5));
        return label.length > maxChars ? label.slice(0, maxChars - 1) + "…" : label;
      });

    // ── Occupation tiles (depth 2) ────────────────────────────────────────────

    const tileGs = svg
      .selectAll<SVGGElement, TNode>("g.tm-tile")
      .data(depth2)
      .join("g")
      .attr("class", "tm-tile")
      .attr("transform", (d) => `translate(${d.x0},${d.y0})`)
      .style("cursor", "pointer");

    tileGs
      .append("rect")
      .attr("class", "tm-rect")
      .attr("width", tw)
      .attr("height", th)
      .attr("fill", (d) => exposureColor(exposure(d)))
      .attr("fill-opacity", 0.88)
      .attr("stroke", tileStroke)
      .attr("stroke-width", 1)
      .attr("rx", 2);

    // Labels on tiles large enough to display text
    tileGs.each(function (d) {
      const w = tw(d);
      const h = th(d);
      if (w < 36 || h < 16) return;

      const g = d3.select(this);
      const name = d.data.insight?.occupationName ?? "";
      const maxChars = Math.max(3, Math.floor(w / 6.5));
      const truncated =
        name.length > maxChars ? name.slice(0, maxChars - 1) + "…" : name;
      const pct = (exposure(d) * 100).toFixed(0) + "%";
      const fontSize = Math.min(11, Math.max(8, Math.floor(w / 12)));

      const textAttrs = (sel: d3.Selection<SVGTextElement, TNode, SVGGElement, unknown>) =>
        sel
          .attr("pointer-events", "none")
          .attr("user-select", "none")
          .attr("paint-order", "stroke")
          .attr("stroke", "rgba(0,0,0,0.35)")
          .attr("stroke-width", 2.5)
          .attr("fill", "#ffffff");

      const nameEl = g.append<SVGTextElement>("text");
      textAttrs(nameEl as unknown as d3.Selection<SVGTextElement, TNode, SVGGElement, unknown>);
      nameEl
        .attr("x", 4)
        .attr("y", h < 28 ? h / 2 + fontSize * 0.35 : fontSize + 4)
        .attr("font-size", fontSize + "px")
        .attr("font-weight", "500")
        .text(truncated);

      if (h >= 28) {
        const pctEl = g.append<SVGTextElement>("text");
        textAttrs(pctEl as unknown as d3.Selection<SVGTextElement, TNode, SVGGElement, unknown>);
        pctEl
          .attr("x", 4)
          .attr("y", fontSize + 4 + 11)
          .attr("font-size", "9px")
          .attr("opacity", 0.8)
          .text(pct + " AI");
      }
    });

    // ── Entrance animation ────────────────────────────────────────────────────

    if (!reduced) {
      tileGs
        .attr("opacity", 0)
        .transition()
        .duration(380)
        .delay((_, i) => Math.min(i * 2.5, 280))
        .ease(d3.easeCubicOut)
        .attr("opacity", 1);
    }

    // ── Hover interactions ────────────────────────────────────────────────────

    tileGs
      .on("mousemove", (event: MouseEvent, d) => {
        const rect = containerEl.getBoundingClientRect();
        if (d.data.insight) {
          setTooltip({
            visible: true,
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            cw: containerEl.clientWidth,
            insight: d.data.insight,
          });
        }
        svg
          .selectAll<SVGRectElement, TNode>("g.tm-tile .tm-rect")
          .attr("fill-opacity", (c) =>
            c.data.insight?.occupationCode === d.data.insight?.occupationCode
              ? 1
              : 0.28,
          );
      })
      .on("mouseleave", () => {
        setTooltip((p) => ({ ...p, visible: false }));
        svg
          .selectAll<SVGRectElement, TNode>("g.tm-tile .tm-rect")
          .attr("fill-opacity", 0.88);
      })
      .on("click", (event: MouseEvent, d) => {
        event.stopPropagation();
        const code = d.data.insight?.occupationCode;
        if (code) routerRef.current.push(`/careers/${encodeURIComponent(code)}`);
      });

    return () => { svg.selectAll("*").interrupt(); };
  }, [treeData, isDark, focusSector]);

  // ── Screen-reader summary ─────────────────────────────────────────────────

  const srSummary = useMemo(() => {
    const top5 = sectors.slice(0, 5).map(([name, occs]) => {
      const emp = d3.sum(occs, (o) => o.totalEmployment ?? 0);
      return `${name} (${fmtEmp(emp)} workers)`;
    });
    const topOcc = allInsights
      .slice()
      .sort((a, b) => (b.totalEmployment ?? 0) - (a.totalEmployment ?? 0))
      .slice(0, 3)
      .map((o) => `${o.occupationName} (${fmtEmp(o.totalEmployment ?? 0)})`);
    return { top5, topOcc };
  }, [sectors, allInsights]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Back / zoom controls */}
      <div className="mb-2 flex items-center justify-between min-h-[24px]">
        {focusSector ? (
          <button
            className="text-xs font-medium text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
            onClick={() => setFocusSector(null)}
            aria-label="Back to all sectors"
          >
            {t("treemapBack")}
          </button>
        ) : (
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            {t("treemapClickHint")}
          </p>
        )}
        {focusSector && (
          <span className="text-xs font-semibold text-zinc-300 dark:text-zinc-300">
            {focusSector}
          </span>
        )}
      </div>

      {/* Treemap SVG */}
      <svg
        ref={svgRef}
        className="w-full h-auto"
        style={{ minHeight: 340 }}
        role="img"
        aria-label={
          focusSector
            ? `Occupation treemap for ${focusSector}: tiles sized by employment, colored by AI exposure probability`
            : "Sector workforce treemap: sectors contain occupation tiles sized by total employment and colored by AI exposure probability"
        }
      >
        <title>Sector → Occupation Workforce Treemap</title>
      </svg>

      {/* Screen-reader summary */}
      <span className="sr-only">
        Interactive treemap of workforce distribution across sectors and occupations.
        Tile area represents total employment. Color encodes AI exposure probability on a
        scale from deep indigo (low) through violet to cyan (high). Click an occupation tile
        to view full career details. Click a sector header tile to zoom into that sector.
        Top sectors by employment:{" "}
        {srSummary.top5.join(", ")}.
        Largest occupations: {srSummary.topOcc.join(", ")}.
      </span>

      {/* Glass tooltip */}
      {tooltip.visible && (
        <div
          className="pointer-events-none absolute z-50 rounded-xl border px-3.5 py-3 text-sm"
          style={{
            left:
              tooltip.x > tooltip.cw * 0.65
                ? tooltip.x - 234
                : tooltip.x + 14,
            top: tooltip.y,
            transform: "translateY(-50%)",
            background: isDark
              ? "rgba(9,9,11,0.93)"
              : "rgba(255,255,255,0.95)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderColor:
              exposureColor(tooltip.insight.automationProbability) + "55",
            minWidth: 224,
            boxShadow: isDark
              ? "0 4px 28px rgba(0,0,0,0.55)"
              : "0 4px 16px rgba(0,0,0,0.10)",
          }}
        >
          <p className="font-semibold text-zinc-900 dark:text-white text-sm mb-0.5 leading-tight">
            {tooltip.insight.occupationName}
          </p>
          <p className="text-xs text-zinc-500 mb-2">{tooltip.insight.sectorName}</p>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">{t("labelAIExposure")}</span>
              <span
                className="font-semibold"
                style={{
                  color: exposureColor(tooltip.insight.automationProbability),
                }}
              >
                {(tooltip.insight.automationProbability * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">{t("labelEmployment")}</span>
              <span className="font-medium text-zinc-900 dark:text-white">
                {tooltip.insight.totalEmployment != null
                  ? tooltip.insight.totalEmployment.toLocaleString()
                  : "—"}
              </span>
            </div>
            {tooltip.insight.medianSalary > 0 && (
              <div className="flex justify-between gap-4">
                <span className="text-zinc-500">{t("labelMedianSalary")}</span>
                <span className="font-medium text-zinc-900 dark:text-white">
                  {fmtSalary(tooltip.insight.medianSalary)}
                </span>
              </div>
            )}
          </div>
          <p className="text-[10px] text-zinc-500 mt-2.5">
            {t("tooltipClickCareer")}
          </p>
        </div>
      )}

      {/* Color legend */}
      <div className="mt-2.5 flex items-center gap-2 text-[10px] text-zinc-500 dark:text-zinc-500 select-none pointer-events-none">
        <span>{t("legendLowAIExposure")}</span>
        <div
          className="flex-1 max-w-[160px] h-2 rounded"
          style={{
            background:
              "linear-gradient(to right, #1e1b4b, #7c3aed, #06b6d4)",
          }}
        />
        <span>{t("legendHighAIExposure")}</span>
        <span className="ml-3 text-zinc-600 dark:text-zinc-600">
          {t("legendAreaEmp")}
        </span>
      </div>
    </div>
  );
}
