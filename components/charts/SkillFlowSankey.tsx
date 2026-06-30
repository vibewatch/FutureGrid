"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import * as d3 from "d3";
import { sankey, sankeyLinkHorizontal } from "d3-sankey";
import type { SankeyGraph, SankeyNode, SankeyLink } from "d3-sankey";
import { getHighExposureOccupations, getReskillingPaths } from "@/lib/data";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NodeDatum {
  id: string;
  name: string;
  column: "source" | "target";
  code: string;
}

interface LinkDatum {
  sourceCode: string;
  targetCode: string;
  value: number;
}

type SNode = SankeyNode<NodeDatum, LinkDatum>;
type SLink = SankeyLink<NodeDatum, LinkDatum>;

// ─── Palette ──────────────────────────────────────────────────────────────────

const SOURCE_COLOR = "#ef4444"; // red — high-exposure origin
const TARGET_COLORS = [
  "#8b5cf6", "#22d3ee", "#10b981", "#f59e0b", "#3b82f6",
  "#a78bfa", "#34d399", "#fbbf24", "#60a5fa", "#f472b6",
];
const LINK_OPACITY_DEFAULT = 0.35;
const LINK_OPACITY_HIGHLIGHT = 0.75;
const LINK_OPACITY_DIM = 0.06;
const NODE_OPACITY_DIM = 0.2;

function truncate(s: string, max = 28): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

// ─── Build Sankey graph data ──────────────────────────────────────────────────

interface SankeyData {
  nodes: NodeDatum[];
  rawLinks: LinkDatum[];
  summary: string;
}

function buildSankeyData(maxSources = 6, maxTargets = 5): SankeyData {
  const highExp = getHighExposureOccupations(20);
  const pickedSources = highExp.slice(0, maxSources);

  const nodeMap = new Map<string, NodeDatum>();
  const rawLinks: LinkDatum[] = [];
  const targetColorIdx = new Map<string, number>();
  let colorCount = 0;

  for (const src of pickedSources) {
    const srcId = `src:${src.occupationCode}`;
    if (!nodeMap.has(srcId)) {
      nodeMap.set(srcId, {
        id: srcId,
        name: src.occupationName,
        column: "source",
        code: src.occupationCode,
      });
    }

    const paths = getReskillingPaths(src.occupationCode, maxTargets);
    for (const p of paths) {
      const tgtId = `tgt:${p.occupationCode}`;
      if (!nodeMap.has(tgtId)) {
        nodeMap.set(tgtId, {
          id: tgtId,
          name: p.occupationName,
          column: "target",
          code: p.occupationCode,
        });
        targetColorIdx.set(tgtId, colorCount++ % TARGET_COLORS.length);
      }
      rawLinks.push({
        sourceCode: srcId,
        targetCode: tgtId,
        value: Math.max(p.sharedCount, 1),
      });
    }
  }

  const sources = pickedSources.map((s) => s.occupationName).join(", ");
  const targetCount = [...nodeMap.values()].filter((n) => n.column === "target").length;
  const summary = `Career transition flows from ${pickedSources.length} high-AI-exposure occupations (${sources}) to ${targetCount} resilient career pathways, sized by shared skill count.`;

  return {
    nodes: [...nodeMap.values()],
    rawLinks,
    summary,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SkillFlowSankey() {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const isDark = (resolvedTheme ?? "dark") !== "light";
  const router = useRouter();

  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    html: string;
    accentColor: string;
  }>({ visible: false, x: 0, y: 0, html: "", accentColor: "#8b5cf6" });

  const { nodes, rawLinks, summary } = useMemo(() => buildSankeyData(6, 5), []);

  // Target colour lookup
  const targetColorMap = useMemo(() => {
    const map = new Map<string, string>();
    let i = 0;
    for (const n of nodes) {
      if (n.column === "target") {
        map.set(n.id, TARGET_COLORS[i++ % TARGET_COLORS.length]);
      }
    }
    return map;
  }, [nodes]);

  useEffect(() => {
    const svgEl = svgRef.current;
    const wrapEl = wrapRef.current;
    if (!svgEl || !wrapEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ── Layout constants ────────────────────────────────────────────────────
    const W = 960;
    const H = 560;
    const PAD = { top: 24, right: 200, bottom: 24, left: 200 };
    svg.attr("viewBox", `0 0 ${W} ${H}`).attr("aria-hidden", "true");

    // Theme colours
    const labelColor = isDark ? "#e4e4e7" : "#18181b";
    const subLabelColor = isDark ? "#71717a" : "#52525b";
    const bgTooltip = isDark ? "rgba(9,9,11,0.93)" : "rgba(255,255,255,0.95)";
    const borderTooltip = isDark ? "#3f3f46" : "#d4d4d8";

    // ── Build d3-sankey graph ───────────────────────────────────────────────
    const nodeIndex = new Map<string, number>(nodes.map((n, i) => [n.id, i]));

    const graphNodes: NodeDatum[] = nodes.map((n) => ({ ...n }));
    const graphLinks: (LinkDatum & { source: number; target: number })[] =
      rawLinks
        .filter((l) => nodeIndex.has(l.sourceCode) && nodeIndex.has(l.targetCode))
        .map((l) => ({
          ...l,
          source: nodeIndex.get(l.sourceCode)!,
          target: nodeIndex.get(l.targetCode)!,
        }));

    const graph: SankeyGraph<NodeDatum, LinkDatum> = sankey<NodeDatum, LinkDatum>()
      .nodeId((d) => d.id)
      .nodeWidth(16)
      .nodePadding(14)
      .extent([[PAD.left, PAD.top], [W - PAD.right, H - PAD.bottom]])(
        { nodes: graphNodes, links: graphLinks as unknown as SLink[] },
      );

    const { nodes: snodes, links: slinks } = graph;

    // ── Links ───────────────────────────────────────────────────────────────
    const linkG = svg.append("g").attr("class", "sankey-links");

    const linkPath = sankeyLinkHorizontal();

    const linkSel = linkG
      .selectAll<SVGPathElement, SLink>("path")
      .data(slinks)
      .join("path")
      .attr("class", "sankey-link")
      .attr("d", (d) => linkPath(d) ?? "")
      .attr("fill", "none")
      .attr("stroke-width", (d) => Math.max(1, (d.width ?? 1)))
      .attr("stroke", (d) => {
        const tgt = d.target as SNode;
        return targetColorMap.get(tgt.id) ?? SOURCE_COLOR;
      })
      .attr("stroke-opacity", LINK_OPACITY_DEFAULT)
      .attr("data-src", (d) => (d.source as SNode).id)
      .attr("data-tgt", (d) => (d.target as SNode).id);

    // ── Nodes ────────────────────────────────────────────────────────────────
    const nodeG = svg.append("g").attr("class", "sankey-nodes");

    const nodeSel = nodeG
      .selectAll<SVGRectElement, SNode>("rect")
      .data(snodes)
      .join("rect")
      .attr("class", "sankey-node")
      .attr("x", (d) => d.x0 ?? 0)
      .attr("y", (d) => d.y0 ?? 0)
      .attr("width", (d) => (d.x1 ?? 0) - (d.x0 ?? 0))
      .attr("height", (d) => Math.max(1, (d.y1 ?? 0) - (d.y0 ?? 0)))
      .attr("rx", 3)
      .attr("fill", (d) => {
        if (d.column === "source") return SOURCE_COLOR;
        return targetColorMap.get(d.id) ?? "#8b5cf6";
      })
      .attr("fill-opacity", 0.9)
      .attr("data-id", (d) => d.id)
      .style("cursor", (d) => (d.column === "target" ? "pointer" : "default"));

    // ── Labels ───────────────────────────────────────────────────────────────
    const labelG = svg.append("g").attr("class", "sankey-labels");

    labelG
      .selectAll<SVGTextElement, SNode>("text")
      .data(snodes)
      .join("text")
      .attr("x", (d) => (d.column === "source"
        ? (d.x0 ?? 0) - 6
        : (d.x1 ?? 0) + 6))
      .attr("y", (d) => ((d.y0 ?? 0) + (d.y1 ?? 0)) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", (d) => (d.column === "source" ? "end" : "start"))
      .attr("fill", labelColor)
      .attr("font-size", "11px")
      .attr("font-weight", "500")
      .style("pointer-events", "none")
      .text((d) => truncate(d.name, 26));

    // Column headings
    const srcX = (snodes.find((n) => n.column === "source")?.x0 ?? PAD.left) + 8;
    const tgtX = (snodes.find((n) => n.column === "target")?.x1 ?? W - PAD.right) - 8;

    svg.append("text")
      .attr("x", srcX).attr("y", PAD.top - 8)
      .attr("fill", "#ef4444").attr("font-size", "12px").attr("font-weight", "700")
      .attr("text-anchor", "middle")
      .text("High AI Exposure");

    svg.append("text")
      .attr("x", tgtX).attr("y", PAD.top - 8)
      .attr("fill", "#22c55e").attr("font-size", "12px").attr("font-weight", "700")
      .attr("text-anchor", "middle")
      .text("Resilient Pathways");

    // ── Hover interactions ────────────────────────────────────────────────────

    function highlightNode(id: string) {
      // Links: highlight connected, dim others
      linkSel
        .attr("stroke-opacity", (d) => {
          const src = (d.source as SNode).id;
          const tgt = (d.target as SNode).id;
          return src === id || tgt === id
            ? LINK_OPACITY_HIGHLIGHT
            : LINK_OPACITY_DIM;
        });
      // Nodes: dim unconnected
      nodeSel
        .attr("fill-opacity", (d) => {
          if (d.id === id) return 1;
          const connected = slinks.some((l) => {
            const src = (l.source as SNode).id;
            const tgt = (l.target as SNode).id;
            return (src === id && tgt === d.id) || (tgt === id && src === d.id);
          });
          return connected ? 0.85 : NODE_OPACITY_DIM;
        });
    }

    function resetHighlight() {
      linkSel.attr("stroke-opacity", LINK_OPACITY_DEFAULT);
      nodeSel.attr("fill-opacity", 0.9);
      setTooltip((p) => ({ ...p, visible: false }));
    }

    nodeSel
      .on("mousemove", (event: MouseEvent, d) => {
        const wrapRect = wrapEl.getBoundingClientRect();
        const nodeColor = d.column === "source"
          ? SOURCE_COLOR
          : (targetColorMap.get(d.id) ?? "#8b5cf6");
        const inCount = (d.targetLinks ?? []).length;
        const outCount = (d.sourceLinks ?? []).length;
        const totalFlow = Math.round(d.value ?? 0);
        const detail = d.column === "source"
          ? `${outCount} pathway${outCount !== 1 ? "s" : ""} · ${totalFlow} shared skill${totalFlow !== 1 ? "s" : ""}`
          : `From ${inCount} source${inCount !== 1 ? "s" : ""} · ${totalFlow} shared skill${totalFlow !== 1 ? "s" : ""}`;

        setTooltip({
          visible: true,
          x: event.clientX - wrapRect.left,
          y: event.clientY - wrapRect.top,
          html: `<strong>${d.name}</strong><br/><span>${detail}</span>`,
          accentColor: nodeColor,
        });
        highlightNode(d.id);
      })
      .on("mouseleave", () => {
        resetHighlight();
      })
      .on("click", (_, d) => {
        if (d.column === "target") {
          router.push(`/careers/${d.code}`);
        }
      });

    linkSel
      .on("mousemove", (event: MouseEvent, d) => {
        const wrapRect = wrapEl.getBoundingClientRect();
        const src = d.source as SNode;
        const tgt = d.target as SNode;
        const accent = targetColorMap.get(tgt.id) ?? "#8b5cf6";
        setTooltip({
          visible: true,
          x: event.clientX - wrapRect.left,
          y: event.clientY - wrapRect.top,
          html: `<strong>${truncate(src.name, 24)} → ${truncate(tgt.name, 24)}</strong><br/><span>${d.value} shared skill${(d.value ?? 1) !== 1 ? "s" : ""}</span>`,
          accentColor: accent,
        });
        linkSel.attr("stroke-opacity", (l) =>
          l === d ? LINK_OPACITY_HIGHLIGHT : LINK_OPACITY_DIM,
        );
        nodeSel.attr("fill-opacity", (n) => {
          const srcId = (d.source as SNode).id;
          const tgtId = (d.target as SNode).id;
          return n.id === srcId || n.id === tgtId ? 1 : NODE_OPACITY_DIM;
        });
      })
      .on("mouseleave", () => {
        resetHighlight();
      });

    // ── Entrance animation ────────────────────────────────────────────────────
    if (!reduced) {
      nodeSel
        .attr("opacity", 0)
        .transition().duration(500).delay((_, i) => i * 40)
        .ease(d3.easeCubicOut)
        .attr("opacity", 1);

      linkSel
        .attr("stroke-opacity", 0)
        .transition().duration(600).delay((_, i) => 200 + i * 20)
        .ease(d3.easeCubicOut)
        .attr("stroke-opacity", LINK_OPACITY_DEFAULT);
    }

    void bgTooltip; void borderTooltip; void subLabelColor; // used in JSX
  }, [nodes, rawLinks, targetColorMap, isDark, router]);

  const { resolvedTheme: _rt } = useTheme();
  const isDarkJsx = (_rt ?? "dark") !== "light";

  return (
    <div ref={wrapRef} className="relative w-full overflow-x-auto">
      {/* Accessible wrapper */}
      <div role="img" aria-label="Career transition flow diagram">
        {/* Screen-reader summary */}
        <p className="sr-only">{summary}</p>
        <svg
          ref={svgRef}
          className="w-full h-auto"
          style={{ minHeight: 420 }}
        />
      </div>

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="pointer-events-none absolute z-50 rounded-xl border px-3 py-2.5 text-sm"
          style={{
            left: tooltip.x + 14,
            top: tooltip.y,
            transform: "translateY(-50%)",
            background: isDarkJsx ? "rgba(9,9,11,0.93)" : "rgba(255,255,255,0.95)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderColor: tooltip.accentColor + "55",
            boxShadow: isDarkJsx
              ? "0 4px 24px rgba(0,0,0,0.45)"
              : "0 4px 16px rgba(0,0,0,0.10)",
            minWidth: 200,
          }}
          dangerouslySetInnerHTML={{ __html: tooltip.html }}
        />
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-3 px-1 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: SOURCE_COLOR }} />
          High AI-exposure source
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "#8b5cf6" }} />
          Resilient career target
        </span>
        <span className="text-zinc-400 dark:text-zinc-500">Link width = shared skill count · Click a target to explore</span>
      </div>
    </div>
  );
}
