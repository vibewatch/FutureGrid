"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import * as d3 from "d3";
import { type ExposureLens, type OccExposure, type ExposureComparison } from "@/lib/analysis";
import { useT } from "@/lib/i18n/useT";

type TooltipState = { visible: boolean; x: number; y: number; cw: number; point: OccExposure | null };

const LENSES: ExposureLens[] = ["usage", "capability", "ability", "automation"];
const VIOLET = "#8b5cf6";
const CYAN = "#22d3ee";
const AMBER = "#f59e0b";

function formatPct(value: number | null): string {
  return value == null ? "—" : `${value.toFixed(1)}%`;
}

function formatJobs(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000).toLocaleString()}K`;
  return value.toLocaleString();
}

function lensKey(a: ExposureLens, b: ExposureLens): string {
  return [a, b].sort().join("~");
}

function barWidth(value: number | null): string {
  return `${Math.max(0, Math.min(100, value ?? 0))}%`;
}

export default function ExposureLensComparison({ comparison, leaders }: { comparison: ExposureComparison; leaders: OccExposure[] }) {
  const t = useT("analysis");
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const isDark = (resolvedTheme ?? "dark") !== "light";
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, cw: 760, point: null });

  const scatterPoints = useMemo(
    () => comparison.occupations.filter((occupation) => occupation.capability != null && occupation.usage != null),
    [comparison.occupations],
  );
  const usageCapability = comparison.correlations.find((correlation) => lensKey(correlation.a, correlation.b) === "capability~usage");
  const selectedPoint = tooltip.point ?? leaders[0] ?? null;
  const xAxisLabel = t("axisCapabilityExposure");
  const yAxisLabel = t("axisUsageExposure");
  const gapLabel = t("gapLabel");

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
    const W = 780;
    const H = 460;
    const M = { top: 34, right: 34, bottom: 62, left: 70 };
    const iW = W - M.left - M.right;
    const iH = H - M.top - M.bottom;
    svg.attr("viewBox", `0 0 ${W} ${H}`);

    const x = d3.scaleLinear().domain([0, 100]).range([0, iW]);
    const y = d3.scaleLinear().domain([0, 100]).range([iH, 0]);
    const r = d3.scaleSqrt().domain([0, d3.max(scatterPoints, (d) => d.employment) ?? 1]).range([3.5, 16]);
    const maxGap = Math.max(1, d3.max(scatterPoints, (d) => Math.max(0, d.gap ?? 0)) ?? 1);
    const color = d3.scaleSequential((value: number) => d3.interpolateRgb(CYAN, AMBER)(value)).domain([0, maxGap]);
    const g = svg.append("g").attr("transform", `translate(${M.left},${M.top})`);

    g.append("g").call(d3.axisLeft(y).ticks(5).tickSize(-iW).tickFormat(() => "")).call((gg) => {
      gg.select(".domain").remove();
      gg.selectAll(".tick line").attr("stroke", gridColor).attr("stroke-dasharray", "3,4");
    });
    g.append("g").attr("transform", `translate(0,${iH})`).call(d3.axisBottom(x).ticks(5).tickFormat((d) => `${d}%`)).call((gg) => {
      gg.select(".domain").attr("stroke", axisLine);
      gg.selectAll(".tick line").attr("stroke", axisLine);
      gg.selectAll("text").attr("fill", axisText).attr("font-size", "11px");
    });
    g.append("g").call(d3.axisLeft(y).ticks(5).tickFormat((d) => `${d}%`)).call((gg) => {
      gg.select(".domain").attr("stroke", axisLine);
      gg.selectAll(".tick line").attr("stroke", axisLine);
      gg.selectAll("text").attr("fill", axisText).attr("font-size", "11px");
    });

    g.append("line")
      .attr("x1", x(0)).attr("x2", x(100)).attr("y1", y(0)).attr("y2", y(100))
      .attr("stroke", VIOLET).attr("stroke-width", 2).attr("stroke-dasharray", "7,5").attr("opacity", 0.75);
    g.append("text").attr("x", x(69)).attr("y", y(75)).attr("fill", axisText).attr("font-size", "11px").text(t("referenceLineLabel"));

    svg.append("text").attr("x", M.left + iW / 2).attr("y", H - 14).attr("text-anchor", "middle").attr("fill", axisText).attr("font-size", "11px").text(xAxisLabel);
    svg.append("text").attr("transform", "rotate(-90)").attr("x", -(M.top + iH / 2)).attr("y", 16).attr("text-anchor", "middle").attr("fill", axisText).attr("font-size", "11px").text(yAxisLabel);

    const points = g.selectAll<SVGCircleElement, OccExposure>("circle.exposure-point")
      .data(scatterPoints, (d) => d.code)
      .join("circle")
      .attr("class", "exposure-point")
      .attr("cx", (d) => x(d.capability ?? 0))
      .attr("cy", (d) => y(d.usage ?? 0))
      .attr("r", (d) => r(d.employment))
      .attr("fill", (d) => color(Math.max(0, d.gap ?? 0)))
      .attr("fill-opacity", 0.72)
      .attr("stroke", dotStroke)
      .attr("stroke-width", 1.1)
      .style("cursor", "pointer");

    points
      .on("mousemove", (event: MouseEvent, d) => {
        const rect = containerEl.getBoundingClientRect();
        setTooltip({ visible: true, x: event.clientX - rect.left, y: event.clientY - rect.top, cw: containerEl.clientWidth, point: d });
        points.attr("fill-opacity", (p) => p.code === d.code ? 1 : 0.16);
        d3.select(event.currentTarget as SVGCircleElement).attr("stroke", VIOLET).attr("stroke-width", 2.4);
      })
      .on("mouseleave", () => {
        setTooltip((previous) => ({ ...previous, visible: false }));
        points.attr("fill-opacity", 0.72).attr("stroke", dotStroke).attr("stroke-width", 1.1);
      })
      .on("click", (_, d) => router.push(`/careers/${encodeURIComponent(d.code)}`));

    return () => { svg.selectAll("*").interrupt(); };
  }, [gapLabel, isDark, router, scatterPoints, t, xAxisLabel, yAxisLabel]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{t("exposureScatterIntro", { count: scatterPoints.length })}</p>
            {usageCapability && (
              <div className="w-fit rounded-2xl border border-violet-400/25 bg-violet-500/10 px-4 py-3 text-sm text-zinc-700 dark:text-zinc-200">
                <span className="font-semibold text-violet-600 dark:text-violet-300">{t("lensCorrelationBadge")}</span>{" "}
                r {usageCapability.r.toFixed(2)} · n {usageCapability.n}
              </div>
            )}
          </div>
          <div ref={containerRef} className="relative w-full overflow-x-auto">
            <svg ref={svgRef} className="h-auto w-full" style={{ minHeight: 330 }} role="img" aria-label={t("exposureScatterAria")} />
            <ul className="sr-only" aria-label={t("exposureScatterSrList")}>
              {scatterPoints.map((occupation) => <li key={occupation.code}><Link href={`/careers/${encodeURIComponent(occupation.code)}`}>{occupation.name}</Link></li>)}
            </ul>
            {tooltip.visible && tooltip.point && (
              <div
                className="pointer-events-none absolute z-50 min-w-[250px] rounded-xl border px-3.5 py-3 text-sm shadow-xl backdrop-blur"
                style={{
                  left: tooltip.x > tooltip.cw * 0.62 ? tooltip.x - 270 : tooltip.x + 14,
                  top: tooltip.y,
                  transform: "translateY(-50%)",
                  background: isDark ? "rgba(9,9,11,0.94)" : "rgba(255,255,255,0.96)",
                  borderColor: "rgba(139,92,246,0.35)",
                }}
              >
                <p className="max-w-[230px] font-semibold leading-tight text-zinc-900 dark:text-white">{tooltip.point.name}</p>
                <p className="mt-1 text-xs text-zinc-500">{tooltip.point.sector}</p>
                <div className="mt-2 space-y-1 text-xs">
                  {LENSES.map((lens) => <div key={lens} className="flex justify-between gap-4"><span className="text-zinc-500">{t(`lens_${lens}`)}</span><span className="font-semibold">{formatPct(tooltip.point?.[lens] ?? null)}</span></div>)}
                  <div className="flex justify-between gap-4"><span className="text-zinc-500">{gapLabel}</span><span className="font-semibold">{formatPct(tooltip.point.gap)}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-zinc-500">{t("labelEmployment")}</span><span className="font-semibold">{formatJobs(tooltip.point.employment)}</span></div>
                </div>
                <p className="mt-2 text-[10px] text-zinc-500">{t("tooltipClickCareer")}</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white/55 p-4 dark:border-zinc-800 dark:bg-zinc-950/35">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{t("lensAgreementTitle")}</p>
            <div className="mt-3 space-y-2">
              {comparison.correlations.map((correlation) => {
                const negative = correlation.r < 0;
                const strong = correlation.r >= 0.75;
                return (
                  <div key={`${correlation.a}-${correlation.b}`} className="grid grid-cols-[1fr_58px] items-center gap-3 text-xs">
                    <span className="truncate text-zinc-600 dark:text-zinc-400">{t(`lens_${correlation.a}`)} ~ {t(`lens_${correlation.b}`)}</span>
                    <span className={`rounded-full px-2 py-1 text-center font-bold tabular-nums ${negative ? "bg-red-500/15 text-red-600 dark:text-red-300" : strong ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"}`}>{correlation.r.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 rounded-xl border border-amber-400/25 bg-amber-500/10 p-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">{t("automationFlipExplainer")}</p>
          </div>

          {selectedPoint && (
            <div className="rounded-2xl border border-zinc-200 bg-white/55 p-4 dark:border-zinc-800 dark:bg-zinc-950/35">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{t("selectedLensTitle")}</p>
              <p className="mt-2 text-sm font-semibold text-zinc-900 dark:text-white">{selectedPoint.name}</p>
              <div className="mt-3 space-y-2">
                {LENSES.map((lens) => (
                  <div key={lens}>
                    <div className="mb-1 flex justify-between text-xs text-zinc-500"><span>{t(`lens_${lens}`)}</span><span>{formatPct(selectedPoint[lens])}</span></div>
                    <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800"><div className="h-2 rounded-full brand-grad" style={{ width: barWidth(selectedPoint[lens]) }} /></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white/55 p-4 dark:border-zinc-800 dark:bg-zinc-950/35">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{t("gapLeaderboardTitle")}</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t("gapLeaderboardExplainer")}</p>
          </div>
        </div>
        <div className="space-y-2">
          {leaders.map((occupation) => (
            <button key={occupation.code} type="button" onClick={() => router.push(`/careers/${encodeURIComponent(occupation.code)}`)} className="grid w-full gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-violet-500/5 sm:grid-cols-[minmax(0,1fr)_260px_70px] sm:items-center">
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-white">{occupation.name}</span>
                <span className="mt-1 block truncate text-xs text-zinc-500">{occupation.sector}</span>
              </span>
              <span className="space-y-1">
                <span className="grid grid-cols-[74px_1fr_44px] items-center gap-2 text-[11px] text-zinc-500"><span>{t("lens_capability")}</span><span className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800"><span className="block h-2 rounded-full bg-violet-500" style={{ width: barWidth(occupation.capability) }} /></span><span className="tabular-nums">{formatPct(occupation.capability)}</span></span>
                <span className="grid grid-cols-[74px_1fr_44px] items-center gap-2 text-[11px] text-zinc-500"><span>{t("lens_usage")}</span><span className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800"><span className="block h-2 rounded-full bg-cyan-400" style={{ width: barWidth(occupation.usage) }} /></span><span className="tabular-nums">{formatPct(occupation.usage)}</span></span>
              </span>
              <span className="text-right text-sm font-bold text-amber-600 dark:text-amber-300">{formatPct(occupation.gap)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
