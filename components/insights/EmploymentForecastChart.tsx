"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import * as d3 from "d3";
import { getAISignalData, getEmploymentForecast, getNationalForecast, type ForecastPoint } from "@/lib/analysis";
import { useT } from "@/lib/i18n/useT";

const VIOLET = "#8b5cf6";
const CYAN = "#22d3ee";
const GREEN = "#22c55e";

type TooltipState = { visible: boolean; x: number; y: number; cw: number; point: ForecastPoint | null; label: string };

function formatJobs(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : value > 0 ? "+" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)}K`;
  return `${sign}${abs.toLocaleString()}`;
}

function recomputeAdjusted(baseline: ForecastPoint[], exposure: number, sensitivity: number): ForecastPoint[] {
  const expFrac = exposure / 100;
  const annualDrag = sensitivity * expFrac * 0.04;
  return baseline.map((point) => {
    const k = point.year - 2025;
    return { ...point, value: Math.round(point.value * Math.pow(1 - annualDrag, k)) };
  });
}

export default function EmploymentForecastChart() {
  const t = useT("analysis");
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const isDark = (resolvedTheme ?? "dark") !== "light";
  const [selectedCode, setSelectedCode] = useState("");
  const [query, setQuery] = useState("");
  const [sensitivity, setSensitivity] = useState(0.5);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, cw: 760, point: null, label: "" });
  const nationalForecastLabel = t("nationalForecast");
  const historyLineLabel = t("historyLine");
  const baselineLineLabel = t("baselineLine");
  const aiAdjustedLineLabel = t("aiAdjustedLine");

  const national = useMemo(() => getNationalForecast(), []);
  const occupations = useMemo(() => getAISignalData().points.filter((p) => getEmploymentForecast(p.code)).sort((a, b) => a.name.localeCompare(b.name)), []);
  const selectedForecast = useMemo(() => selectedCode ? getEmploymentForecast(selectedCode) : null, [selectedCode]);
  const shownOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? occupations.filter((o) => o.name.toLowerCase().includes(q) || o.code.includes(q) || o.sector.toLowerCase().includes(q)) : occupations;
    return base.slice(0, 18);
  }, [occupations, query]);

  const chartData = useMemo(() => {
    if (selectedForecast) {
      const aiAdjusted = recomputeAdjusted(selectedForecast.baseline, selectedForecast.exposure, sensitivity);
      const b2030 = selectedForecast.baseline.find((p) => p.year === 2030)?.value ?? 0;
      const a2030 = aiAdjusted.find((p) => p.year === 2030)?.value ?? 0;
      return { title: selectedForecast.name, sector: selectedForecast.sector, exposure: selectedForecast.exposure, history: selectedForecast.history, baseline: selectedForecast.baseline, aiAdjusted, delta: a2030 - b2030, selected: true };
    }
    return { title: nationalForecastLabel, sector: "", exposure: 0, history: national.history, baseline: national.baseline, aiAdjusted: national.aiAdjusted, delta: national.deltaJobs2030, selected: false };
  }, [national, nationalForecastLabel, selectedForecast, sensitivity]);

  const headline = t("forecastHeadline", { delta: formatJobs(chartData.delta) });

  useEffect(() => {
    const svgEl = svgRef.current;
    const containerEl = containerRef.current;
    if (!svgEl || !containerEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    const allPoints = [...chartData.history, ...chartData.baseline, ...chartData.aiAdjusted];
    if (allPoints.length < 2) return;

    const axisText = isDark ? "#a1a1aa" : "#52525b";
    const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
    const axisLine = isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)";
    const dotStroke = isDark ? "#09090b" : "#ffffff";
    const W = 760;
    const H = 390;
    const M = { top: 34, right: 36, bottom: 50, left: 76 };
    const iW = W - M.left - M.right;
    const iH = H - M.top - M.bottom;
    svg.attr("viewBox", `0 0 ${W} ${H}`);

    const x = d3.scaleLinear().domain(d3.extent(allPoints, (d) => d.year) as [number, number]).range([0, iW]);
    const yExtent = d3.extent(allPoints, (d) => d.value) as [number, number];
    const yPad = Math.max(1, (yExtent[1] - yExtent[0]) * 0.16);
    const y = d3.scaleLinear().domain([Math.max(0, yExtent[0] - yPad), yExtent[1] + yPad]).range([iH, 0]).nice();
    const line = d3.line<ForecastPoint>().x((d) => x(d.year)).y((d) => y(d.value)).curve(d3.curveMonotoneX);
    const g = svg.append("g").attr("transform", `translate(${M.left},${M.top})`);

    g.append("g").call(d3.axisLeft(y).ticks(5).tickSize(-iW).tickFormat(() => "")).call((gg) => {
      gg.select(".domain").remove();
      gg.selectAll(".tick line").attr("stroke", gridColor).attr("stroke-dasharray", "3,4");
    });
    g.append("g").attr("transform", `translate(0,${iH})`).call(d3.axisBottom(x).ticks(8).tickFormat((d) => String(d))).call((gg) => {
      gg.select(".domain").attr("stroke", axisLine);
      gg.selectAll(".tick line").attr("stroke", axisLine);
      gg.selectAll("text").attr("fill", axisText).attr("font-size", "11px");
    });
    g.append("g").call(d3.axisLeft(y).ticks(5).tickFormat((d) => formatJobs(d as number).replace("+", ""))).call((gg) => {
      gg.select(".domain").attr("stroke", axisLine);
      gg.selectAll(".tick line").attr("stroke", axisLine);
      gg.selectAll("text").attr("fill", axisText).attr("font-size", "11px");
    });

    const series = [
      { key: "history", label: historyLineLabel, data: chartData.history, color: VIOLET, dash: null },
      { key: "baseline", label: baselineLineLabel, data: chartData.baseline, color: GREEN, dash: "7,5" },
      { key: "ai", label: aiAdjustedLineLabel, data: chartData.aiAdjusted, color: CYAN, dash: "7,5" },
    ];

    for (const s of series) {
      g.append("path")
        .datum(s.data)
        .attr("fill", "none")
        .attr("stroke", s.color)
        .attr("stroke-width", 2.8)
        .attr("stroke-linejoin", "round")
        .attr("stroke-dasharray", s.dash ?? null)
        .attr("d", line);
      g.selectAll<SVGCircleElement, ForecastPoint>(`circle.forecast-${s.key}`)
        .data(s.data)
        .join("circle")
        .attr("class", `forecast-${s.key}`)
        .attr("cx", (d) => x(d.year))
        .attr("cy", (d) => y(d.value))
        .attr("r", 3.5)
        .attr("fill", s.color)
        .attr("stroke", dotStroke)
        .attr("stroke-width", 1.2)
        .on("mousemove", (event: MouseEvent, d) => {
          const rect = containerEl.getBoundingClientRect();
          setTooltip({ visible: true, x: event.clientX - rect.left, y: event.clientY - rect.top, cw: containerEl.clientWidth, point: d, label: s.label });
        })
        .on("mouseleave", () => setTooltip((p) => ({ ...p, visible: false })));
    }

    const legend = svg.append("g").attr("transform", "translate(90,12)");
    series.forEach((s, i) => {
      const lx = i * 145;
      legend.append("line").attr("x1", lx).attr("x2", lx + 24).attr("y1", 7).attr("y2", 7).attr("stroke", s.color).attr("stroke-width", 3).attr("stroke-dasharray", s.dash ?? null);
      legend.append("text").attr("x", lx + 31).attr("y", 10).attr("fill", axisText).attr("font-size", "11px").text(s.label);
    });

    return () => { svg.selectAll("*").interrupt(); };
  }, [aiAdjustedLineLabel, baselineLineLabel, chartData, historyLineLabel, isDark]);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-2xl border border-violet-400/25 bg-violet-500/10 p-4">
          <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">{headline}</p>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{chartData.selected ? t("forecastSelectedSubhead", { name: chartData.title, exposure: chartData.exposure.toFixed(1) }) : t("forecastNationalSubhead")}</p>
        </div>
        <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white/55 p-4 dark:border-zinc-800 dark:bg-zinc-950/35">
          <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500" htmlFor="occupation-search">{t("occupationSearchLabel")}</label>
          <input
            id="occupation-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("occupationSearchPlaceholder")}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-violet-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
          />
          <select
            value={selectedCode}
            onChange={(e) => setSelectedCode(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-violet-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            aria-label={t("occupationSelectLabel")}
          >
            <option value="">{t("nationalOption")}</option>
            {shownOptions.map((o) => <option key={o.code} value={o.code}>{o.name} ({o.code})</option>)}
          </select>
          <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500" htmlFor="sensitivity">{t("sensitivityLabel", { value: sensitivity.toFixed(2) })}</label>
          <input id="sensitivity" type="range" min="0" max="1" step="0.05" value={sensitivity} onChange={(e) => setSensitivity(Number(e.target.value))} disabled={!selectedForecast} className="w-full accent-violet-500 disabled:opacity-45" />
          {!selectedForecast && <p className="text-[11px] text-zinc-500">{t("sensitivityNationalNote")}</p>}
        </div>
      </div>
      <div ref={containerRef} className="relative w-full overflow-x-auto">
        <svg ref={svgRef} className="h-auto w-full" style={{ minHeight: 300 }} role="img" aria-label={t("forecastAria")} />
        {tooltip.visible && tooltip.point && (
          <div className="pointer-events-none absolute z-50 rounded-xl border px-3.5 py-3 text-sm shadow-xl backdrop-blur" style={{ left: tooltip.x > tooltip.cw * 0.62 ? tooltip.x - 220 : tooltip.x + 14, top: tooltip.y, transform: "translateY(-50%)", background: isDark ? "rgba(9,9,11,0.94)" : "rgba(255,255,255,0.96)", borderColor: "rgba(139,92,246,0.35)" }}>
            <p className="font-semibold text-zinc-900 dark:text-white">{tooltip.label} · {tooltip.point.year}</p>
            <p className="mt-1 text-xs text-zinc-500">{formatJobs(tooltip.point.value).replace("+", "")}</p>
          </div>
        )}
      </div>
      {selectedForecast && <Link className="inline-flex text-xs font-semibold text-violet-600 hover:underline dark:text-violet-300" href={`/careers/${encodeURIComponent(selectedForecast.code)}`}>{t("openCareerProfile")} →</Link>}
    </div>
  );
}
