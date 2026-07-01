"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import * as d3 from "d3";
import { getAISignalData, type SignalPoint } from "@/lib/analysis";
import { useT } from "@/lib/i18n/useT";

type Metric = "employment" | "wage";

type TooltipState = {
  visible: boolean;
  x: number;
  y: number;
  cw: number;
  point: SignalPoint | null;
};

const VIOLET = "#8b5cf6";
const CYAN = "#22d3ee";
const SECTOR_COLORS = ["#8b5cf6", "#22d3ee", "#f97316", "#22c55e", "#eab308", "#ec4899", "#06b6d4", "#ef4444", "#14b8a6", "#a855f7"];

function formatPct(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export default function AISignalScatter() {
  const t = useT("analysis");
  const router = useRouter();
  const routerRef = useRef(router);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const isDark = (resolvedTheme ?? "dark") !== "light";
  const [metric, setMetric] = useState<Metric>("employment");
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, cw: 760, point: null });

  useEffect(() => { routerRef.current = router; }, [router]);

  const data = useMemo(() => getAISignalData(), []);
  const activeRegression = metric === "employment" ? data.empRegression : data.wageRegression;
  const activeQuartile = data.quartiles.find((q) => q.metric === metric) ?? data.quartiles[0];
  const growthAccessor = useMemo(
    () => metric === "employment" ? ((d: SignalPoint) => d.empGrowth) : ((d: SignalPoint) => d.wageGrowth),
    [metric],
  );
  const xAxisLabel = t("axisAIExposure");
  const yAxisLabel = metric === "employment" ? t("axisEmploymentGrowth") : t("axisWageGrowth");
  const metricLabel = metric === "employment" ? t("metricEmployment") : t("metricWage");
  const caption = t("signalCaption", {
    empR: data.empRegression.r.toFixed(2),
    wageR: data.wageRegression.r.toFixed(2),
  });

  useEffect(() => {
    const svgEl = svgRef.current;
    const containerEl = containerRef.current;
    if (!svgEl || !containerEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    const axisText = isDark ? "#a1a1aa" : "#52525b";
    const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
    const axisLine = isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)";
    const dotStroke = isDark ? "#09090b" : "#ffffff";
    const regressionColor = metric === "employment" ? VIOLET : CYAN;

    const W = 760;
    const H = 440;
    const M = { top: 34, right: 36, bottom: 62, left: 70 };
    const iW = W - M.left - M.right;
    const iH = H - M.top - M.bottom;
    svg.attr("viewBox", `0 0 ${W} ${H}`);

    const yValues = data.points.map(growthAccessor);
    const yExtent = d3.extent(yValues) as [number, number];
    const yPad = Math.max(0.8, (yExtent[1] - yExtent[0]) * 0.16);
    const x = d3.scaleLinear().domain([0, 100]).range([0, iW]);
    const y = d3.scaleLinear().domain([yExtent[0] - yPad, yExtent[1] + yPad]).range([iH, 0]).nice();
    const r = d3.scaleSqrt().domain([0, d3.max(data.points, (d) => d.employment) ?? 1]).range([4, 18]);
    const color = d3.scaleOrdinal<string, string>()
      .domain(Array.from(new Set(data.points.map((d) => d.sector))))
      .range(SECTOR_COLORS);

    const g = svg.append("g").attr("transform", `translate(${M.left},${M.top})`);

    g.append("g")
      .call(d3.axisLeft(y).ticks(6).tickSize(-iW).tickFormat(() => ""))
      .call((gg) => {
        gg.select(".domain").remove();
        gg.selectAll(".tick line").attr("stroke", gridColor).attr("stroke-dasharray", "3,4");
      });
    g.append("g")
      .attr("transform", `translate(0,${iH})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat((d) => `${d}%`))
      .call((gg) => {
        gg.select(".domain").attr("stroke", axisLine);
        gg.selectAll(".tick line").attr("stroke", axisLine);
        gg.selectAll("text").attr("fill", axisText).attr("font-size", "11px");
      });
    g.append("g")
      .call(d3.axisLeft(y).ticks(6).tickFormat((d) => `${(d as number).toFixed(1)}%`))
      .call((gg) => {
        gg.select(".domain").attr("stroke", axisLine);
        gg.selectAll(".tick line").attr("stroke", axisLine);
        gg.selectAll("text").attr("fill", axisText).attr("font-size", "11px");
      });

    svg.append("text").attr("x", M.left + iW / 2).attr("y", H - 14).attr("text-anchor", "middle").attr("fill", axisText).attr("font-size", "11px").text(xAxisLabel);
    svg.append("text").attr("transform", "rotate(-90)").attr("x", -(M.top + iH / 2)).attr("y", 16).attr("text-anchor", "middle").attr("fill", axisText).attr("font-size", "11px").text(yAxisLabel);

    const linePoints: [number, number][] = [[0, activeRegression.intercept], [100, activeRegression.intercept + activeRegression.slope * 100]];
    g.append("path")
      .datum(linePoints)
      .attr("fill", "none")
      .attr("stroke", regressionColor)
      .attr("stroke-width", 2.5)
      .attr("stroke-dasharray", "7,5")
      .attr("d", d3.line<[number, number]>().x((d) => x(d[0])).y((d) => y(d[1])));

    const points = g.selectAll<SVGGElement, SignalPoint>("g.signal-point")
      .data(data.points)
      .join("g")
      .attr("class", "signal-point")
      .attr("transform", (d) => `translate(${x(d.exposure)},${y(growthAccessor(d))})`)
      .style("cursor", "pointer");

    points.append("circle")
      .attr("r", (d) => r(d.employment))
      .attr("fill", (d) => color(d.sector))
      .attr("fill-opacity", 0.72)
      .attr("stroke", dotStroke)
      .attr("stroke-width", 1.2);

    points
      .on("mousemove", (event: MouseEvent, d) => {
        const rect = containerEl.getBoundingClientRect();
        setTooltip({ visible: true, x: event.clientX - rect.left, y: event.clientY - rect.top, cw: containerEl.clientWidth, point: d });
        g.selectAll<SVGCircleElement, SignalPoint>("g.signal-point circle")
          .attr("fill-opacity", (p) => p.code === d.code ? 1 : 0.16);
        d3.select(event.currentTarget as SVGGElement).select("circle").attr("stroke", regressionColor).attr("stroke-width", 2.5);
      })
      .on("mouseleave", () => {
        setTooltip((p) => ({ ...p, visible: false }));
        g.selectAll<SVGCircleElement, SignalPoint>("g.signal-point circle")
          .attr("fill-opacity", 0.72)
          .attr("stroke", dotStroke)
          .attr("stroke-width", 1.2);
      })
      .on("click", (_, d) => routerRef.current.push(`/careers/${encodeURIComponent(d.code)}`));

    return () => { svg.selectAll("*").interrupt(); };
  }, [activeRegression, data, growthAccessor, isDark, metric, xAxisLabel, yAxisLabel]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex w-fit rounded-full border border-zinc-200 bg-white/70 p-1 text-xs font-semibold dark:border-zinc-800 dark:bg-zinc-950/40">
          {(["employment", "wage"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setMetric(option)}
              aria-pressed={metric === option}
              className={`rounded-full px-3 py-1.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 ${metric === option ? "brand-grad text-white shadow" : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"}`}
            >
              {option === "employment" ? t("metricEmployment") : t("metricWage")}
            </button>
          ))}
        </div>
        <div className="rounded-2xl border border-violet-400/25 bg-violet-500/10 px-4 py-3 text-sm text-zinc-700 dark:text-zinc-200">
          <span className="font-semibold text-violet-600 dark:text-violet-300">{t("pearsonBadge")}</span>{" "}
          r {activeRegression.r.toFixed(2)} · R² {activeRegression.r2.toFixed(2)} · n {activeRegression.n}
        </div>
      </div>

      <div ref={containerRef} className="relative w-full overflow-x-auto">
        <svg ref={svgRef} className="h-auto w-full" style={{ minHeight: 320 }} role="img" aria-label={t("signalAria")} />
        <ul className="sr-only" aria-label={t("signalSrList")}>
          {data.points.map((p) => <li key={p.code}><Link href={`/careers/${encodeURIComponent(p.code)}`}>{p.name}</Link></li>)}
        </ul>
        {tooltip.visible && tooltip.point && (
          <div
            className="pointer-events-none absolute z-50 min-w-[230px] rounded-xl border px-3.5 py-3 text-sm shadow-xl backdrop-blur"
            style={{
              left: tooltip.x > tooltip.cw * 0.62 ? tooltip.x - 250 : tooltip.x + 14,
              top: tooltip.y,
              transform: "translateY(-50%)",
              background: isDark ? "rgba(9,9,11,0.94)" : "rgba(255,255,255,0.96)",
              borderColor: "rgba(139,92,246,0.35)",
            }}
          >
            <p className="max-w-[220px] font-semibold leading-tight text-zinc-900 dark:text-white">{tooltip.point.name}</p>
            <p className="mt-1 text-xs text-zinc-500">{tooltip.point.sector}</p>
            <div className="mt-2 space-y-1 text-xs">
              <div className="flex justify-between gap-4"><span className="text-zinc-500">{t("labelExposure")}</span><span className="font-semibold">{tooltip.point.exposure.toFixed(1)}%</span></div>
              <div className="flex justify-between gap-4"><span className="text-zinc-500">{metricLabel}</span><span className="font-semibold">{formatPct(growthAccessor(tooltip.point))}</span></div>
              <div className="flex justify-between gap-4"><span className="text-zinc-500">{t("labelEmployment")}</span><span className="font-semibold">{tooltip.point.employment.toLocaleString()}</span></div>
            </div>
            <p className="mt-2 text-[10px] text-zinc-500">{t("tooltipClickCareer")}</p>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <p className="rounded-xl border border-zinc-200 bg-white/55 p-4 text-sm leading-relaxed text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/35 dark:text-zinc-400">
          {caption}
        </p>
        {activeQuartile && (
          <div className="rounded-xl border border-zinc-200 bg-white/55 p-4 dark:border-zinc-800 dark:bg-zinc-950/35">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">{t("quartileTitle")}</p>
            {[{ key: "low", label: t("lowExposureQuartile"), value: activeQuartile.lowAvgGrowth }, { key: "high", label: t("highExposureQuartile"), value: activeQuartile.highAvgGrowth }].map((bar) => {
              const width = Math.min(100, Math.max(8, Math.abs(bar.value) * 18));
              return (
                <div key={bar.key} className="mb-2 last:mb-0">
                  <div className="mb-1 flex justify-between text-xs text-zinc-500"><span>{bar.label}</span><span>{formatPct(bar.value)}</span></div>
                  <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800"><div className="h-2 rounded-full" style={{ width: `${width}%`, background: bar.key === "low" ? VIOLET : CYAN }} /></div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
