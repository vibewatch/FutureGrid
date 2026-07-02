"use client";

import {
  useEffect,
  useRef,
  useMemo,
  useState,
  useCallback,
} from "react";
import { useTheme } from "next-themes";
import * as d3 from "d3";
import { generateAllCareerInsights, type CareerInsight } from "@/lib/data";
import { colorForRisk } from "@/lib/utils";
import { useT } from "@/lib/i18n/useT";

// ── Constants ──────────────────────────────────────────────────────────────────

const TOP_N = 15;
const ADVANCE_MS = 1200;

const W = 700;
const BAR_H = 28;
const BAR_GAP = 6;
const M = { top: 12, right: 92, bottom: 8, left: 198 };
const H = M.top + TOP_N * (BAR_H + BAR_GAP) - BAR_GAP + M.bottom;

// ── Types ──────────────────────────────────────────────────────────────────────

interface FrameEntry {
  occupationCode: string;
  occupationName: string;
  employment: number;
  rank: number; // 0-based top-N rank
  automationRisk: string;
}

interface Frame {
  year: string;
  entries: FrameEntry[]; // length <= TOP_N, sorted employment desc
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function yPos(rank: number): number {
  return M.top + rank * (BAR_H + BAR_GAP);
}

function fmtEmployment(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

/** Build one Frame for each year from the dataset. */
function buildFrames(
  data: CareerInsight[],
  employmentHistories: Record<string, Record<string, number>>,
): Frame[] {
  // Collect all year keys present in the employment histories
  const yearSet = new Set<string>();
  for (const hist of Object.values(employmentHistories)) {
    for (const yr of Object.keys(hist)) yearSet.add(yr);
  }
  if (yearSet.size === 0) return [];

  const years = Array.from(yearSet).sort();

  return years.map((year) => {
    const withEmp: Array<{ insight: CareerInsight; emp: number }> = [];
    for (const insight of data) {
      const emp = employmentHistories[insight.occupationCode]?.[year];
      if (emp != null && emp > 0) withEmp.push({ insight, emp });
    }
    withEmp.sort((a, b) => b.emp - a.emp);
    const top = withEmp.slice(0, TOP_N);
    const entries: FrameEntry[] = top.map(({ insight, emp }, i) => ({
      occupationCode: insight.occupationCode,
      occupationName: insight.occupationName,
      employment:     emp,
      rank:           i,
      automationRisk: insight.automationRisk,
    }));
    return { year, entries };
  });
}

// ── Component ──────────────────────────────────────────────────────────────────

interface BarChartRaceProps {
  /** SOC code → { year → employment }. Supplied by a Server Component so the
   *  full snapshot history stays out of client chunks. */
  employmentHistories: Record<string, Record<string, number>>;
}

export default function BarChartRace({ employmentHistories }: BarChartRaceProps) {
  const t       = useT("explore");
  const tCharts = useT("charts");

  const { resolvedTheme } = useTheme();
  const isDark = (resolvedTheme ?? "dark") !== "light";

  const svgRef       = useRef<SVGSVGElement>(null);
  const yearLabelRef = useRef<SVGTextElement>(null);

  const [yearIdx, setYearIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const reduced = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const allData = useMemo(() => generateAllCareerInsights(), []);
  const frames  = useMemo(
    () => buildFrames(allData, employmentHistories),
    [allData, employmentHistories],
  );
  const years   = useMemo(() => frames.map((f) => f.year), [frames]);

  // ── Auto-advance timer ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isPlaying || reduced) return;
    const id = setInterval(() => {
      setYearIdx((i) => {
        if (i >= frames.length - 1) {
          setIsPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, ADVANCE_MS);
    return () => clearInterval(id);
  }, [isPlaying, frames.length, reduced]);

  const handlePlayPause = useCallback(() => {
    if (yearIdx >= frames.length - 1) {
      // At end — replay from start
      setYearIdx(0);
      setIsPlaying(true);
    } else {
      setIsPlaying((v) => !v);
    }
  }, [yearIdx, frames.length]);

  const handleReplay = useCallback(() => {
    setYearIdx(0);
    setIsPlaying(true);
  }, []);

  // ── D3 render ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || frames.length === 0) return;

    const frame = frames[yearIdx];
    if (!frame) return;

    const svg = d3.select<SVGSVGElement, unknown>(svgEl);

    // Theme colours
    const textColor  = isDark ? "#a1a1aa" : "#52525b";
    const labelColor = isDark ? "#d4d4d8" : "#27272a";
    const valueColor = isDark ? "#71717a" : "#71717a";
    const trackColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";

    // x scale based on max employment in this frame
    const maxEmp = d3.max(frame.entries, (d) => d.employment) ?? 1;
    const xScale = d3.scaleLinear()
      .domain([0, maxEmp * 1.06])
      .range([0, W - M.left - M.right]);

    const TWEEN_MS = reduced ? 0 : 700;

    // ── Background tracks (drawn once, rebuilt on maxEmp change) ───────────────
    const gTracks = svg.selectAll<SVGGElement, null>(".tracks-layer")
      .data([null])
      .join("g")
      .attr("class", "tracks-layer");

    gTracks
      .selectAll<SVGRectElement, number>(".track")
      .data(d3.range(TOP_N))
      .join("rect")
      .attr("class", "track")
      .attr("x", M.left)
      .attr("y", (i) => yPos(i))
      .attr("width", W - M.left - M.right)
      .attr("height", BAR_H)
      .attr("rx", 3)
      .attr("fill", trackColor);

    // ── Bar groups ────────────────────────────────────────────────────────────

    svg
      .selectAll<SVGGElement, FrameEntry>(".bar-group")
      .data(frame.entries, (d) => d.occupationCode)
      .join(
        (enter) => {
          const g = enter.append("g").attr("class", "bar-group");
          // Initial position — start at bottom, fade in
          g.attr("transform", `translate(0, ${yPos(TOP_N)})`)
           .attr("opacity", 0);

          // Background bar (track for this entry — handled above globally, skip)
          // Colored fill bar
          g.append("rect")
            .attr("class", "bar-fill")
            .attr("x", M.left)
            .attr("y", 0)
            .attr("height", BAR_H)
            .attr("rx", 3)
            .attr("width", (d) => xScale(d.employment))
            .attr("fill", (d) => colorForRisk(d.automationRisk))
            .attr("fill-opacity", 0.72);

          // Occupation name label (left)
          g.append("text")
            .attr("class", "bar-name")
            .attr("x", M.left - 6)
            .attr("y", BAR_H / 2)
            .attr("dominant-baseline", "middle")
            .attr("text-anchor", "end")
            .attr("font-size", "10px")
            .attr("fill", labelColor)
            .text((d) => d.occupationName);

          // Employment value label (right)
          g.append("text")
            .attr("class", "bar-value")
            .attr("x", M.left + xScale(0) + 4)
            .attr("y", BAR_H / 2)
            .attr("dominant-baseline", "middle")
            .attr("text-anchor", "start")
            .attr("font-size", "9.5px")
            .attr("fill", valueColor)
            .text((d) => fmtEmployment(d.employment));

          // Animate in
          g.transition()
            .duration(TWEEN_MS)
            .attr("transform", (d) => `translate(0, ${yPos(d.rank)})`)
            .attr("opacity", 1);

          return g;
        },
        (update) => {
          // Animate to new rank + new bar width
          const t = update.transition().duration(TWEEN_MS).ease(d3.easeCubicInOut);

          t.attr("transform", (d) => `translate(0, ${yPos(d.rank)})`)
           .attr("opacity", 1);

          t.select<SVGRectElement>(".bar-fill")
            .attr("width", (d) => xScale(d.employment))
            .attr("fill", (d) => colorForRisk(d.automationRisk));

          t.select<SVGTextElement>(".bar-name")
            .attr("fill", labelColor);

          t.select<SVGTextElement>(".bar-value")
            .attr("x", (d) => M.left + xScale(d.employment) + 4)
            .attr("fill", valueColor)
            .tween("text", function (d) {
              const prev = parseFloat(this.textContent?.replace(/[KM]/g, "") ?? "0");
              const next = d.employment;
              const i = d3.interpolateNumber(prev, next);
              return (t2: number) => {
                (this as SVGTextElement).textContent = fmtEmployment(i(t2));
              };
            });

          return update;
        },
        (exit) =>
          exit.transition()
            .duration(TWEEN_MS)
            .attr("opacity", 0)
            .attr("transform", `translate(0, ${yPos(TOP_N)})`)
            .remove(),
      );

    // ── Year ticker (big background label) ───────────────────────────────────

    const yearLabel = svg
      .selectAll<SVGTextElement, null>(".year-ticker")
      .data([null])
      .join("text")
      .attr("class", "year-ticker")
      .attr("x", W - M.right - 2)
      .attr("y", H - M.bottom - 2)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "auto")
      .attr("font-size", "68px")
      .attr("font-weight", "800")
      .attr("fill", isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)")
      .attr("pointer-events", "none")
      .attr("font-family", "ui-monospace, SFMono-Regular, monospace");

    yearLabel
      .transition()
      .duration(TWEEN_MS / 2)
      .text(frame.year);

    // ── x-axis ────────────────────────────────────────────────────────────────

    const axisLine  = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";

    const gXAxis = svg
      .selectAll<SVGGElement, null>(".x-axis")
      .data([null])
      .join("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(${M.left}, ${M.top - 2})`);

    gXAxis.transition().duration(TWEEN_MS).call(
      d3.axisTop(xScale)
        .ticks(5)
        .tickFormat((d) => fmtEmployment(+d))
        .tickSize(0),
    );
    gXAxis.select(".domain").attr("stroke", axisLine);
    gXAxis.selectAll("text")
      .attr("fill", textColor)
      .attr("font-size", "9px")
      .attr("dy", "-4px");

    // Stop in-flight transitions on unmount/re-render so they can't fire after
    // the node is gone (e.g. when /report mounts/unmounts the chart).
    return () => {
      svg.selectAll("*").interrupt();
    };
  }, [yearIdx, frames, isDark, reduced]);

  // ── Render ────────────────────────────────────────────────────────────────────

  if (frames.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-zinc-500 text-sm">
        {t("raceNoData")}
      </div>
    );
  }

  const atEnd   = yearIdx >= frames.length - 1;
  const atStart = yearIdx === 0;

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Header */}
      <div>
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          {t("raceTitle")}
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          {t("raceSubhead")}
        </p>
      </div>

      {/* SVG chart */}
      <div className="relative w-full overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          style={{ minHeight: 200 }}
          role="img"
          aria-label={`${t("raceTitle")} — ${t("raceYear")}: ${years[yearIdx] ?? ""}`}
        >
          <text ref={yearLabelRef} />
        </svg>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-2 px-1">
        {/* Scrubber */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 w-8 text-right shrink-0">
            {years[0]}
          </span>
          <input
            type="range"
            min={0}
            max={frames.length - 1}
            step={1}
            value={yearIdx}
            onChange={(e) => {
              setIsPlaying(false);
              setYearIdx(Number(e.target.value));
            }}
            className="flex-1 accent-indigo-500 cursor-pointer"
            aria-label={t("raceYear")}
          />
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 w-8 shrink-0">
            {years[years.length - 1]}
          </span>
        </div>

        {/* Year label + buttons */}
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-sm font-mono font-semibold text-zinc-700 dark:text-zinc-300 min-w-[3.5rem]"
            aria-live="polite"
            aria-atomic="true"
          >
            {t("raceYear")}: {years[yearIdx] ?? ""}
          </span>

          <div className="flex items-center gap-1.5">
            {/* Replay */}
            <button
              onClick={handleReplay}
              disabled={atStart && !isPlaying}
              className="rounded-md border px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{
                background:   isDark ? "rgba(9,9,11,0.85)"     : "rgba(255,255,255,0.92)",
                borderColor:  isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)",
                color:        isDark ? "#a1a1aa"                : "#52525b",
                backdropFilter: "blur(8px)",
              }}
              aria-label={t("raceReplay")}
            >
              {t("raceReplay")}
            </button>

            {/* Play / Pause */}
            <button
              onClick={handlePlayPause}
              disabled={reduced}
              title={reduced ? "Animation disabled (prefers-reduced-motion)" : undefined}
              className="rounded-md border px-3 py-1 text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{
                background:   isDark ? "rgba(99,102,241,0.18)"  : "rgba(99,102,241,0.10)",
                borderColor:  isDark ? "rgba(99,102,241,0.45)"  : "rgba(99,102,241,0.35)",
                color:        isDark ? "#a5b4fc"                 : "#4f46e5",
                backdropFilter: "blur(8px)",
              }}
              aria-label={isPlaying ? t("racePause") : t("racePlay")}
            >
              {isPlaying ? t("racePause") : atEnd ? t("raceReplay") : t("racePlay")}
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[10px] text-zinc-500 dark:text-zinc-400 select-none">
        {(
          [
            ["#22c55e", tCharts("legendLow")],
            ["#eab308", tCharts("legendMedium")],
            ["#f97316", tCharts("legendHigh")],
            ["#ef4444", tCharts("legendVeryHigh")],
          ] as const
        ).map(([color, label]) => (
          <span key={label} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
        <span className="text-zinc-400 dark:text-zinc-500">
          {t("raceEmployment")}
        </span>
      </div>

      {/* Screen-reader accessible table for current year */}
      <table className="sr-only" aria-label={`${t("raceTitle")} — ${years[yearIdx] ?? ""}`}>
        <caption>{`${t("raceYear")}: ${years[yearIdx] ?? ""}`}</caption>
        <thead>
          <tr>
            <th scope="col">{t("raceRank")}</th>
            <th scope="col">{t("raceOccupation")}</th>
            <th scope="col">{t("raceEmployment")}</th>
          </tr>
        </thead>
        <tbody>
          {frames[yearIdx]?.entries.map((e) => (
            <tr key={e.occupationCode}>
              <td>{e.rank + 1}</td>
              <td>{e.occupationName}</td>
              <td>{e.employment.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
