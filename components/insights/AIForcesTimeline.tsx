"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import * as d3 from "d3";
import { getAIDemandSeries, getAILayoffSeries, type DemandPoint } from "@/lib/labor-signals";
import { useT } from "@/lib/i18n/useT";

type BarPoint = { year: number; cuts: number; date: Date };
type TimelineTooltip = { visible: boolean; x: number; y: number; cw: number; title: string; value: string; detail: string };

const CYAN = "#22d3ee";
const RED = "#ef4444";

function parseMonth(month: string): Date | null {
  const parsed = d3.timeParse("%Y-%m")(month);
  return parsed && Number.isFinite(parsed.getTime()) ? parsed : null;
}

function formatCuts(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

export default function AIForcesTimeline() {
  const t = useT("analysis");
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const isDark = (resolvedTheme ?? "dark") !== "light";
  const demand = useMemo(() => getAIDemandSeries(), []);
  const layoffs = useMemo(() => getAILayoffSeries(), []);
  const [country, setCountry] = useState(demand.countries.includes("US") ? "US" : demand.countries[0] ?? "");
  const [tooltip, setTooltip] = useState<TimelineTooltip>({ visible: false, x: 0, y: 0, cw: 760, title: "", value: "", detail: "" });

  const selectedSeries = useMemo(
    () => demand.series.find((series) => series.country === country) ?? demand.series.find((series) => series.country === "US") ?? demand.series[0] ?? { country: "", points: [] },
    [country, demand.series],
  );
  const linePoints = useMemo(
    () => selectedSeries.points.map((point) => ({ ...point, date: parseMonth(point.month) })).filter((point): point is DemandPoint & { date: Date } => point.date != null),
    [selectedSeries.points],
  );
  const annualBars = useMemo<BarPoint[]>(
    () => layoffs.annual.map((point) => ({ ...point, date: new Date(point.year, 6, 1) })).filter((point) => Number.isFinite(point.date.getTime())),
    [layoffs.annual],
  );
  const latest = demand.latest.find((point) => point.country === selectedSeries.country);
  const latestCuts = annualBars[annualBars.length - 1];
  const demandLabel = t("aiDemandLine");
  const layoffLabel = t("aiLayoffBars");

  useEffect(() => {
    const svgEl = svgRef.current;
    const containerEl = containerRef.current;
    if (!svgEl || !containerEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();
    if (linePoints.length < 2 && annualBars.length === 0) return;

    const axisText = isDark ? "#a1a1aa" : "#52525b";
    const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
    const axisLine = isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)";
    const dotStroke = isDark ? "#09090b" : "#ffffff";
    const W = 820;
    const H = 420;
    const M = { top: 34, right: 78, bottom: 52, left: 62 };
    const iW = W - M.left - M.right;
    const iH = H - M.top - M.bottom;
    svg.attr("viewBox", `0 0 ${W} ${H}`);

    const dates = [...linePoints.map((point) => point.date), ...annualBars.map((point) => point.date)];
    const xExtent = d3.extent(dates) as [Date, Date];
    const x = d3.scaleTime().domain(xExtent).range([0, iW]).nice();
    const yDemand = d3.scaleLinear().domain([0, Math.max(1, d3.max(linePoints, (point) => point.share) ?? 1) * 1.18]).range([iH, 0]).nice();
    const yCuts = d3.scaleLinear().domain([0, Math.max(1, d3.max(annualBars, (point) => point.cuts) ?? 1) * 1.18]).range([iH, 0]).nice();
    const g = svg.append("g").attr("transform", `translate(${M.left},${M.top})`);

    g.append("g").call(d3.axisLeft(yDemand).ticks(5).tickSize(-iW).tickFormat(() => "")).call((gg) => {
      gg.select(".domain").remove();
      gg.selectAll(".tick line").attr("stroke", gridColor).attr("stroke-dasharray", "3,4");
    });
    g.append("g").attr("transform", `translate(0,${iH})`).call(d3.axisBottom(x).ticks(7).tickFormat((date) => d3.timeFormat("%Y")(date as Date))).call((gg) => {
      gg.select(".domain").attr("stroke", axisLine);
      gg.selectAll(".tick line").attr("stroke", axisLine);
      gg.selectAll("text").attr("fill", axisText).attr("font-size", "11px");
    });
    g.append("g").call(d3.axisLeft(yDemand).ticks(5).tickFormat((value) => `${(value as number).toFixed(1)}%`)).call((gg) => {
      gg.select(".domain").attr("stroke", axisLine);
      gg.selectAll(".tick line").attr("stroke", axisLine);
      gg.selectAll("text").attr("fill", axisText).attr("font-size", "11px");
    });
    g.append("g").attr("transform", `translate(${iW},0)`).call(d3.axisRight(yCuts).ticks(5).tickFormat((value) => formatCuts(value as number))).call((gg) => {
      gg.select(".domain").attr("stroke", axisLine);
      gg.selectAll(".tick line").attr("stroke", axisLine);
      gg.selectAll("text").attr("fill", axisText).attr("font-size", "11px");
    });

    const barWidth = Math.max(18, Math.min(46, iW / Math.max(annualBars.length * 2.4, 1)));
    g.selectAll<SVGRectElement, BarPoint>("rect.layoff-bar")
      .data(annualBars)
      .join("rect")
      .attr("class", "layoff-bar")
      .attr("x", (d) => x(d.date) - barWidth / 2)
      .attr("y", (d) => yCuts(d.cuts))
      .attr("width", barWidth)
      .attr("height", (d) => iH - yCuts(d.cuts))
      .attr("rx", 5)
      .attr("fill", RED)
      .attr("fill-opacity", 0.35)
      .attr("stroke", RED)
      .attr("stroke-opacity", 0.45)
      .on("mousemove", (event: MouseEvent, d) => {
        const rect = containerEl.getBoundingClientRect();
        setTooltip({ visible: true, x: event.clientX - rect.left, y: event.clientY - rect.top, cw: containerEl.clientWidth, title: `${layoffLabel} · ${d.year}`, value: formatCuts(d.cuts), detail: t("cutsUnit") });
      })
      .on("mouseleave", () => setTooltip((previous) => ({ ...previous, visible: false })));

    const line = d3.line<DemandPoint & { date: Date }>().x((d) => x(d.date)).y((d) => yDemand(d.share)).curve(d3.curveMonotoneX);
    g.append("path")
      .datum(linePoints)
      .attr("fill", "none")
      .attr("stroke", CYAN)
      .attr("stroke-width", 3)
      .attr("stroke-linejoin", "round")
      .attr("d", line);

    g.selectAll<SVGCircleElement, DemandPoint & { date: Date }>("circle.demand-point")
      .data(linePoints)
      .join("circle")
      .attr("class", "demand-point")
      .attr("cx", (d) => x(d.date))
      .attr("cy", (d) => yDemand(d.share))
      .attr("r", 3.3)
      .attr("fill", CYAN)
      .attr("stroke", dotStroke)
      .attr("stroke-width", 1.1)
      .on("mousemove", (event: MouseEvent, d) => {
        const rect = containerEl.getBoundingClientRect();
        setTooltip({ visible: true, x: event.clientX - rect.left, y: event.clientY - rect.top, cw: containerEl.clientWidth, title: `${demandLabel} · ${d.month}`, value: `${d.share.toFixed(2)}%`, detail: selectedSeries.country });
      })
      .on("mouseleave", () => setTooltip((previous) => ({ ...previous, visible: false })));

    const legend = svg.append("g").attr("transform", "translate(80,12)");
    [{ label: demandLabel, color: CYAN }, { label: layoffLabel, color: RED }].forEach((item, index) => {
      const lx = index * 190;
      legend.append("rect").attr("x", lx).attr("y", 2).attr("width", 22).attr("height", 8).attr("rx", 4).attr("fill", item.color).attr("opacity", index === 0 ? 1 : 0.45);
      legend.append("text").attr("x", lx + 30).attr("y", 10).attr("fill", axisText).attr("font-size", "11px").text(item.label);
    });

    svg.append("text").attr("x", M.left).attr("y", H - 14).attr("fill", axisText).attr("font-size", "11px").text(t("aiDemandAxis"));
    svg.append("text").attr("x", W - M.right).attr("y", H - 14).attr("text-anchor", "end").attr("fill", axisText).attr("font-size", "11px").text(t("aiLayoffAxis"));

    return () => { svg.selectAll("*").interrupt(); };
  }, [annualBars, demandLabel, isDark, layoffLabel, linePoints, selectedSeries.country, t]);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-2xl border border-violet-400/25 bg-violet-500/10 p-4">
          <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">{t("aiForcesHeadline")}</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">{t("aiForcesSubhead")}</p>
        </div>
        <div className="grid gap-3 rounded-2xl border border-zinc-200 bg-white/55 p-4 dark:border-zinc-800 dark:bg-zinc-950/35 sm:grid-cols-3">
          <label className="sm:col-span-1">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-500">{t("countrySelectorLabel")}</span>
            <select value={country} onChange={(event) => setCountry(event.target.value)} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-violet-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white">
              {demand.countries.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <div className="rounded-xl bg-zinc-100/70 p-3 dark:bg-zinc-900/60">
            <p className="text-[11px] uppercase tracking-widest text-zinc-500">{t("latestDemand")}</p>
            <p className="mt-1 text-lg font-bold text-cyan-600 dark:text-cyan-300">{latest ? `${latest.share.toFixed(2)}%` : "—"}</p>
          </div>
          <div className="rounded-xl bg-zinc-100/70 p-3 dark:bg-zinc-900/60">
            <p className="text-[11px] uppercase tracking-widest text-zinc-500">{t("latestLayoffs")}</p>
            <p className="mt-1 text-lg font-bold text-red-600 dark:text-red-300">{latestCuts ? formatCuts(latestCuts.cuts) : "—"}</p>
          </div>
        </div>
      </div>

      <div ref={containerRef} className="relative w-full overflow-x-auto">
        <svg ref={svgRef} className="h-auto w-full" style={{ minHeight: 320 }} role="img" aria-label={t("aiForcesAria")} />
        {tooltip.visible && (
          <div
            className="pointer-events-none absolute z-50 min-w-[190px] rounded-xl border px-3.5 py-3 text-sm shadow-xl backdrop-blur"
            style={{
              left: tooltip.x > tooltip.cw * 0.62 ? tooltip.x - 220 : tooltip.x + 14,
              top: tooltip.y,
              transform: "translateY(-50%)",
              background: isDark ? "rgba(9,9,11,0.94)" : "rgba(255,255,255,0.96)",
              borderColor: "rgba(139,92,246,0.35)",
            }}
          >
            <p className="font-semibold text-zinc-900 dark:text-white">{tooltip.title}</p>
            <p className="mt-1 text-lg font-bold text-violet-600 dark:text-violet-300">{tooltip.value}</p>
            <p className="text-xs text-zinc-500">{tooltip.detail}</p>
          </div>
        )}
      </div>

      <p className="rounded-xl border border-zinc-200 bg-white/55 p-4 text-xs leading-relaxed text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/35 dark:text-zinc-400">
        {t("aiForcesCaption", { note: layoffs.note })}
      </p>
    </div>
  );
}
