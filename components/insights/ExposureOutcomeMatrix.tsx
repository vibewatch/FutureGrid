"use client";

import type {
  ExposureOutcomeMatrix as ExposureOutcomeMatrixData,
  ExposureOutcomePoint,
} from "@/lib/exposure-outcome";
import AccessibleChart from "@/components/charts/AccessibleChart";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import * as d3 from "d3";
import { useT } from "@/lib/i18n/useT";

type Metric = "employment" | "wage";
type TooltipState = {
  visible: boolean;
  x: number;
  y: number;
  cw: number;
  point: ExposureOutcomePoint | null;
};

/** Continuous disruption color: teal (low) → violet (mid) → amber (high). */
function disruptionColor(score: number | null): string {
  if (score == null) return "#71717a";
  return d3.interpolateRgbBasis(["#22d3ee", "#8b5cf6", "#f97316"])(score / 100);
}

function fmtPct(v: number | null): string {
  if (v == null) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

/** Gap values are in percentage points (pp), not raw percentages. */
function fmtGap(v: number | null): string {
  if (v == null) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}pp`;
}

function fmtJobs(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000).toLocaleString()}K`;
  return v.toLocaleString();
}

function fmtR(v: number): string {
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}`;
}

export default function ExposureOutcomeMatrix({
  matrix,
}: {
  matrix: ExposureOutcomeMatrixData;
}) {
  const t = useT("analysis");
  const router = useRouter();
  const routerRef = useRef(router);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const [metric, setMetric] = useState<Metric>("employment");
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    cw: 760,
    point: null,
  });

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  const yAccessor = useMemo(
    () =>
      metric === "employment"
        ? (p: ExposureOutcomePoint) => p.empGrowth as number
        : (p: ExposureOutcomePoint) => p.wageGrowth as number,
    [metric],
  );

  const plottablePoints = useMemo(
    () =>
      matrix.points.filter(
        (p) =>
          p.gap != null &&
          (metric === "employment" ? p.empGrowth : p.wageGrowth) != null,
      ),
    [matrix, metric],
  );

  const mobileRows = useMemo(
    () =>
      [...matrix.points]
        .filter((p) => p.disruptionRank != null)
        .sort(
          (a, b) => (a.disruptionRank ?? 9999) - (b.disruptionRank ?? 9999),
        )
        .slice(0, 20),
    [matrix],
  );

  // Pre-compute i18n strings used inside D3 effect to keep dep array stable.
  const xAxisLabel = t("matrixAxisGap");
  const yAxisLabel =
    metric === "employment" ? t("axisEmploymentGrowth") : t("axisWageGrowth");
  const qLatentGrowing = t("matrixQuadrantLatentGrowing");
  const qLatentShrinking = t("matrixQuadrantLatentShrinking");
  const qAdoptionGrowing = t("matrixQuadrantAdoptionGrowing");
  const qAdoptionShrinking = t("matrixQuadrantAdoptionShrinking");
  const noDataLabel = t("matrixNoData");

  useEffect(() => {
    const svgEl = svgRef.current;
    const containerEl = containerRef.current;
    if (!svgEl || !containerEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    const axisText = isDark ? "#a1a1aa" : "#52525b";
    const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
    const axisLine = isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)";
    const zeroLine = isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.18)";
    const quadrantColor = isDark ? "rgba(255,255,255,0.24)" : "rgba(0,0,0,0.20)";
    const dotStroke = isDark ? "#09090b" : "#ffffff";

    const W = 760;
    const H = 440;
    const M = { top: 36, right: 36, bottom: 64, left: 72 };
    const iW = W - M.left - M.right;
    const iH = H - M.top - M.bottom;
    svg.attr("viewBox", `0 0 ${W} ${H}`);

    if (plottablePoints.length === 0) {
      svg
        .append("text")
        .attr("x", W / 2)
        .attr("y", H / 2)
        .attr("text-anchor", "middle")
        .attr("fill", axisText)
        .attr("font-size", "13px")
        .text(noDataLabel);
      return;
    }

    const gaps = plottablePoints.map((p) => p.gap as number);
    const ys = plottablePoints.map(yAccessor);
    const gapExt = d3.extent(gaps) as [number, number];
    const yExt = d3.extent(ys) as [number, number];
    const gapPad = Math.max(2, (gapExt[1] - gapExt[0]) * 0.08);
    const yPad = Math.max(0.5, (yExt[1] - yExt[0]) * 0.12);

    const x = d3
      .scaleLinear()
      .domain([gapExt[0] - gapPad, gapExt[1] + gapPad])
      .range([0, iW])
      .nice();
    const y = d3
      .scaleLinear()
      .domain([yExt[0] - yPad, yExt[1] + yPad])
      .range([iH, 0])
      .nice();
    const r = d3
      .scaleSqrt()
      .domain([0, d3.max(matrix.points, (p) => p.employment) ?? 1])
      .range([3, 16]);

    const g = svg
      .append("g")
      .attr("transform", `translate(${M.left},${M.top})`);

    // Gridlines
    g.append("g")
      .call(
        d3
          .axisLeft(y)
          .ticks(6)
          .tickSize(-iW)
          .tickFormat(() => ""),
      )
      .call((gg) => {
        gg.select(".domain").remove();
        gg
          .selectAll(".tick line")
          .attr("stroke", gridColor)
          .attr("stroke-dasharray", "3,4");
      });

    // Quadrant zero-reference lines
    const xDom = x.domain();
    const yDom = y.domain();
    const hasXZero = xDom[0] <= 0 && xDom[1] >= 0;
    const hasYZero = yDom[0] <= 0 && yDom[1] >= 0;

    if (hasXZero) {
      g.append("line")
        .attr("x1", x(0))
        .attr("x2", x(0))
        .attr("y1", 0)
        .attr("y2", iH)
        .attr("stroke", zeroLine)
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "4,3");
    }
    if (hasYZero) {
      g.append("line")
        .attr("x1", 0)
        .attr("x2", iW)
        .attr("y1", y(0))
        .attr("y2", y(0))
        .attr("stroke", zeroLine)
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "4,3");
    }

    // Quadrant labels (only when both zero lines are visible)
    if (hasXZero && hasYZero) {
      const qTexts: [number, number, string, "start" | "end"][] = [
        [4, 14, qAdoptionGrowing, "start"],
        [iW - 4, 14, qLatentGrowing, "end"],
        [4, iH - 8, qAdoptionShrinking, "start"],
        [iW - 4, iH - 8, qLatentShrinking, "end"],
      ];
      for (const [tx, ty, label, anchor] of qTexts) {
        g.append("text")
          .attr("x", tx)
          .attr("y", ty)
          .attr("fill", quadrantColor)
          .attr("font-size", "10px")
          .attr("text-anchor", anchor)
          .text(label);
      }
    }

    // Axes
    g.append("g")
      .attr("transform", `translate(0,${iH})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(6)
          .tickFormat((d) => `${(d as number).toFixed(0)}pp`),
      )
      .call((gg) => {
        gg.select(".domain").attr("stroke", axisLine);
        gg.selectAll(".tick line").attr("stroke", axisLine);
        gg.selectAll("text").attr("fill", axisText).attr("font-size", "11px");
      });

    g.append("g")
      .call(
        d3
          .axisLeft(y)
          .ticks(6)
          .tickFormat((d) => `${(d as number).toFixed(1)}%`),
      )
      .call((gg) => {
        gg.select(".domain").attr("stroke", axisLine);
        gg.selectAll(".tick line").attr("stroke", axisLine);
        gg.selectAll("text").attr("fill", axisText).attr("font-size", "11px");
      });

    // Axis labels
    svg
      .append("text")
      .attr("x", M.left + iW / 2)
      .attr("y", H - 14)
      .attr("text-anchor", "middle")
      .attr("fill", axisText)
      .attr("font-size", "11px")
      .text(xAxisLabel);

    svg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -(M.top + iH / 2))
      .attr("y", 16)
      .attr("text-anchor", "middle")
      .attr("fill", axisText)
      .attr("font-size", "11px")
      .text(yAxisLabel);

    // Bubbles
    const bubbles = g
      .selectAll<SVGGElement, ExposureOutcomePoint>("g.matrix-point")
      .data(plottablePoints, (d) => d.code)
      .join("g")
      .attr("class", "matrix-point")
      .attr(
        "transform",
        (p) => `translate(${x(p.gap as number)},${y(yAccessor(p))})`,
      )
      .attr("tabindex", 0)
      .attr("role", "button")
      .attr(
        "aria-label",
        (p) =>
          `${p.title} (${p.code}): ${xAxisLabel} ${fmtGap(p.gap)}, ${yAxisLabel} ${fmtPct(metric === "employment" ? p.empGrowth : p.wageGrowth)}`,
      )
      .style("cursor", "pointer");

    bubbles
      .append("circle")
      .attr("r", (p) => r(p.employment))
      .attr("fill", (p) => disruptionColor(p.disruptionScore))
      .attr("fill-opacity", 0.72)
      .attr("stroke", dotStroke)
      .attr("stroke-width", 1.1);

    bubbles
      .on("mousemove", (event: MouseEvent, p) => {
        const rect = containerEl.getBoundingClientRect();
        setTooltip({
          visible: true,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          cw: containerEl.clientWidth,
          point: p,
        });
        g.selectAll<SVGCircleElement, ExposureOutcomePoint>(
          "g.matrix-point circle",
        ).attr("fill-opacity", (q) => (q.code === p.code ? 1 : 0.16));
        d3.select(event.currentTarget as SVGGElement)
          .select("circle")
          .attr("stroke", "#f97316")
          .attr("stroke-width", 2.5);
      })
      .on("mouseleave", () => {
        setTooltip((prev) => ({ ...prev, visible: false }));
        g.selectAll<SVGGElement, ExposureOutcomePoint>("g.matrix-point")
          .each(function () {
            const isFocused =
              d3.select(this).attr("data-focused") === "true";
            d3.select(this)
              .select("circle")
              .attr("fill-opacity", isFocused ? 1 : 0.72)
              .attr("stroke", isFocused ? "#7c3aed" : dotStroke)
              .attr("stroke-width", isFocused ? 3.5 : 1.1);
          });
      })
      .on("focus", (event: FocusEvent, p) => {
        const containerRect = containerEl.getBoundingClientRect();
        const el = event.currentTarget as SVGGElement;
        const elRect = el.getBoundingClientRect();
        setTooltip({
          visible: true,
          x: elRect.left - containerRect.left + elRect.width,
          y: elRect.top - containerRect.top + elRect.height / 2,
          cw: containerEl.clientWidth,
          point: p,
        });
        // Visible focus ring — matches/exceeds hover stroke emphasis (WCAG 2.4.7)
        g.selectAll("g.matrix-point").attr("data-focused", null);
        d3.select(el)
          .attr("data-focused", "true")
          .select("circle")
          .attr("stroke", "#7c3aed")
          .attr("stroke-width", 3.5)
          .attr("fill-opacity", 1);
      })
      .on("blur", (event: FocusEvent) => {
        const el = event.currentTarget as SVGGElement;
        d3.select(el).attr("data-focused", null);
        setTooltip((prev) => ({ ...prev, visible: false }));
        d3.select(el)
          .select("circle")
          .attr("stroke", dotStroke)
          .attr("stroke-width", 1.1)
          .attr("fill-opacity", 0.72);
      })
      .on("keydown", (event: KeyboardEvent, p) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          routerRef.current.push(`/careers/${encodeURIComponent(p.code)}`);
        }
      })
      .on("click", (_, p) =>
        routerRef.current.push(`/careers/${encodeURIComponent(p.code)}`),
      );

    return () => {
      svg.selectAll("*").interrupt();
    };
  }, [
    isDark,
    matrix,
    metric,
    noDataLabel,
    plottablePoints,
    yAccessor,
    xAxisLabel,
    yAxisLabel,
    qLatentGrowing,
    qLatentShrinking,
    qAdoptionGrowing,
    qAdoptionShrinking,
  ]);

  const { summary, methodology } = matrix;

  return (
    <div className="space-y-5">
      {/* Metric toggle + coverage stats */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex w-fit rounded-full border border-zinc-200 bg-white/70 p-1 text-xs font-semibold dark:border-zinc-800 dark:bg-zinc-950/40">
          {(["employment", "wage"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setMetric(opt)}
              aria-pressed={metric === opt}
              className={`rounded-full px-3 py-1.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 ${
                metric === opt
                  ? "brand-grad text-white shadow"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              {opt === "employment" ? t("metricEmployment") : t("metricWage")}
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-500">
          {t("matrixOccupationCount", { n: String(plottablePoints.length) })}
          {" · "}
          {t("matrixDataWindow", {
            from: String(summary.outcomeWindow.fromYear),
            to: String(summary.outcomeWindow.toYear),
          })}
        </p>
      </div>

      {/* Scatter chart (hidden on mobile, shown sm+) */}
      <AccessibleChart
        label={t("matrixAria")}
        summary={
          <table>
            <caption className="sr-only">
              {t("matrixTableTruncationCaption", { n: String(matrix.points.length) })}
            </caption>
            <thead>
              <tr>
                <th scope="col">{t("matrixTableHeaderTitle")}</th>
                <th scope="col">{t("matrixTableHeaderSoc")}</th>
                <th scope="col">{t("matrixTableHeaderGap")}</th>
                <th scope="col">{t("matrixTableHeaderEmpGrowth")}</th>
                <th scope="col">{t("matrixTableHeaderWageGrowth")}</th>
              </tr>
            </thead>
            <tbody>
              {matrix.points.slice(0, 60).map((p) => (
                <tr key={p.code}>
                  <td>{p.title}</td>
                  <td>{p.code}</td>
                  <td>{fmtGap(p.gap)}</td>
                  <td>{fmtPct(p.empGrowth)}</td>
                  <td>{fmtPct(p.wageGrowth)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        }
        className="hidden sm:block"
      >
        <div ref={containerRef} className="relative w-full overflow-x-auto">
          <svg
            ref={svgRef}
            className="h-auto w-full"
            style={{ minHeight: 320 }}
          />
          <ul className="sr-only" aria-label={t("matrixSrList")}>
            {matrix.points.map((p) => (
              <li key={p.code}>
                <Link href={`/careers/${encodeURIComponent(p.code)}`}>
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>

          {/* Tooltip */}
          {tooltip.visible && tooltip.point && (
            <div
              role="tooltip"
              className="pointer-events-none absolute z-50 min-w-[264px] rounded-xl border px-3.5 py-3 text-sm shadow-xl backdrop-blur"
              style={{
                left:
                  tooltip.x > tooltip.cw * 0.58
                    ? tooltip.x - 280
                    : tooltip.x + 14,
                top: tooltip.y,
                transform: "translateY(-50%)",
                background: isDark
                  ? "rgba(9,9,11,0.95)"
                  : "rgba(255,255,255,0.97)",
                borderColor: "rgba(139,92,246,0.35)",
              }}
            >
              <p className="max-w-[240px] font-semibold leading-tight text-zinc-900 dark:text-white">
                {tooltip.point.title}
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                {tooltip.point.sector}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-zinc-400">
                {t("matrixTooltipCode")}: {tooltip.point.code}
              </p>

              {/* AI exposure lenses */}
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between gap-4">
                  <span className="text-zinc-500">{t("lens_capability")}</span>
                  <span className="font-semibold tabular-nums">
                    {tooltip.point.capability != null
                      ? `${tooltip.point.capability.toFixed(1)}%`
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-zinc-500">{t("lens_usage")}</span>
                  <span className="font-semibold tabular-nums">
                    {tooltip.point.usage != null
                      ? `${tooltip.point.usage.toFixed(1)}%`
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-zinc-500">{t("lens_ability")}</span>
                  <span className="font-semibold tabular-nums">
                    {tooltip.point.ability != null
                      ? `${tooltip.point.ability.toFixed(1)}%`
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-zinc-500">{t("lens_automation")}</span>
                  <span className="font-semibold tabular-nums">
                    {tooltip.point.automation != null
                      ? `${tooltip.point.automation.toFixed(1)}%`
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-zinc-500">{t("gapLabel")}</span>
                  <span className="font-bold tabular-nums text-amber-600 dark:text-amber-300">
                    {fmtGap(tooltip.point.gap)}
                  </span>
                </div>
              </div>

              {/* Labor-market outcomes */}
              <div className="mt-2 space-y-1 border-t border-zinc-200/60 pt-2 text-xs dark:border-zinc-800/60">
                <div className="flex justify-between gap-4">
                  <span className="text-zinc-500">
                    {t("axisEmploymentGrowth")}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {fmtPct(tooltip.point.empGrowth)}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-zinc-500">{t("axisWageGrowth")}</span>
                  <span className="font-semibold tabular-nums">
                    {fmtPct(tooltip.point.wageGrowth)}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-zinc-500">{t("labelEmployment")}</span>
                  <span className="font-semibold">
                    {fmtJobs(tooltip.point.employment)}
                  </span>
                </div>
              </div>

              {/* Disruption */}
              {(tooltip.point.disruptionScore != null ||
                tooltip.point.disruptionRank != null) && (
                <div className="mt-2 space-y-1 border-t border-zinc-200/60 pt-2 text-xs dark:border-zinc-800/60">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-zinc-500">
                      {t("matrixTooltipDisruptionScore")}
                    </span>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white"
                      style={{
                        background: disruptionColor(
                          tooltip.point.disruptionScore,
                        ),
                      }}
                      aria-label={t("matrixDisruptionScoreAria", {
                        score: tooltip.point.disruptionScore?.toFixed(0) ?? "—",
                        rank: String(tooltip.point.disruptionRank ?? "—"),
                      })}
                    >
                      {tooltip.point.disruptionScore?.toFixed(0) ?? "—"}
                      {tooltip.point.disruptionRank != null &&
                        ` · #${tooltip.point.disruptionRank}`}
                    </span>
                  </div>
                </div>
              )}

              <p className="mt-2 text-[10px] text-zinc-500">
                {t("tooltipClickCareer")}
              </p>
            </div>
          )}
        </div>
      </AccessibleChart>

      {/* Disruption-score color legend */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
        <span className="font-medium text-zinc-600 dark:text-zinc-400">
          {t("matrixDisruptionLegendTitle")}:
        </span>
        <span className="shrink-0">{t("matrixDisruptionLow")}</span>
        <div
          className="hidden sm:block h-3 w-32 flex-1 max-w-[8rem] rounded-full"
          aria-hidden="true"
          style={{
            background:
              "linear-gradient(to right, #22d3ee 0%, #8b5cf6 50%, #f97316 100%)",
          }}
        />
        <span className="shrink-0">{t("matrixDisruptionHigh")}</span>
        <span className="ml-auto hidden sm:inline text-zinc-400">
          {t("matrixBubbleAreaNote")}
        </span>
      </div>

      {/* Correlations panel + methodology caveat */}
      <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
        <div className="rounded-2xl border border-zinc-200 bg-white/55 p-4 dark:border-zinc-800 dark:bg-zinc-950/35">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            {t("matrixCorrelationTitle")}
          </p>
          <p className="mt-1 text-[10px] italic text-zinc-400">
            {t("matrixCorrelationSubtitle")}
          </p>
          <div className="mt-3 space-y-2">
            {(
              [
                {
                  label: t("matrixCorrelationCapEmp"),
                  r: matrix.capabilityVsEmpGrowthR,
                  active: metric === "employment",
                },
                {
                  label: t("matrixCorrelationCapWage"),
                  r: matrix.capabilityVsWageGrowthR,
                  active: metric === "wage",
                },
                {
                  label: t("matrixCorrelationGapEmp"),
                  r: matrix.gapVsEmpGrowthR,
                  active: metric === "employment",
                },
                {
                  label: t("matrixCorrelationGapWage"),
                  r: matrix.gapVsWageGrowthR,
                  active: metric === "wage",
                },
              ] as { label: string; r: number; active: boolean }[]
            ).map(({ label, r: rVal, active }) => (
              <div
                key={label}
                className="grid grid-cols-[1fr_52px] items-center gap-3 text-xs"
              >
                <span
                  className={`truncate ${
                    active
                      ? "font-medium text-zinc-900 dark:text-white"
                      : "text-zinc-500"
                  }`}
                >
                  {label}
                </span>
                <span
                  className={`rounded-full px-2 py-1 text-center font-bold tabular-nums ${
                    rVal < 0
                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                      : "bg-violet-500/15 text-violet-700 dark:text-violet-300"
                  }`}
                >
                  {fmtR(rVal)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-300">
            {t("matrixCaveatTitle")}
          </p>
          <ul className="mt-2 space-y-1.5">
            {methodology.caveats.slice(0, 3).map((caveat, i) => (
              <li
                key={i}
                className="text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-300"
              >
                · {caveat}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Mobile ranked-card fallback (visible only < sm) */}
      <div className="sm:hidden space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          {t("matrixFallbackTitle")}
        </p>
        <div className="space-y-2">
          {mobileRows.map((p) => (
            <Link
              key={p.code}
              href={`/careers/${encodeURIComponent(p.code)}`}
              className="block rounded-xl border border-zinc-200 bg-white/55 px-4 py-3 motion-safe:transition-colors hover:bg-violet-500/5 dark:border-zinc-800 dark:bg-zinc-950/35"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                    {p.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-zinc-500">
                    {p.sector}
                  </p>
                </div>
                {p.disruptionScore != null && (
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold text-white"
                    style={{ background: disruptionColor(p.disruptionScore) }}
                    aria-label={t("matrixDisruptionScoreAria", {
                      score: p.disruptionScore.toFixed(0),
                      rank: String(p.disruptionRank ?? "—"),
                    })}
                  >
                    #{p.disruptionRank}
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500">
                <span>
                  {t("gapLabel")}:{" "}
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {fmtGap(p.gap)}
                  </span>
                </span>
                <span>
                  {t("metricEmployment")}:{" "}
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {fmtPct(p.empGrowth)}
                  </span>
                </span>
                <span>
                  {t("metricWage")}:{" "}
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {fmtPct(p.wageGrowth)}
                  </span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
