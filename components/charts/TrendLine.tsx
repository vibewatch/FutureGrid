"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

/**
 * Categorical series colours (fixed order, validated palette). Light/dark steps
 * are selected per mode rather than auto-flipped. Defined as literal class
 * strings so Tailwind generates them.
 */
const SERIES_CLASSES = [
  "text-[#2a78d6] dark:text-[#3987e5]",
  "text-[#eb6834] dark:text-[#d95926]",
  "text-[#1baf7a] dark:text-[#199e70]",
] as const;

export interface TrendSeries {
  name: string;
  points: { label: string; value: number }[];
}

interface Props {
  series: TrendSeries[];
  /** Accessible chart title (also used for the sr-only table caption). */
  title: string;
  /** Formats y values for ticks, labels and tooltips. */
  format?: (v: number) => string;
  height?: number;
  /** Fixed y-domain max; defaults to the data max rounded up to a "nice" step. */
  yMax?: number;
}

const DEFAULT_W = 560;
const M = { top: 12, right: 52, bottom: 26, left: 36 };

function niceMax(v: number): number {
  const step = v > 50 ? 20 : v > 20 ? 10 : 5;
  return Math.ceil(v / step) * step;
}

export default function TrendLine({ series, title, format = (v) => `${v.toFixed(1)}%`, height = 220, yMax }: Props) {
  const tableId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  // Render at the container's real pixel width so text stays at its true size.
  const [W, setW] = useState(DEFAULT_W);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      if (w > 0) setW(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const labels = series[0]?.points.map((p) => p.label) ?? [];
  const n = labels.length;
  const plotW = W - M.left - M.right;
  const plotH = height - M.top - M.bottom;

  const max = useMemo(
    () => yMax ?? niceMax(Math.max(...series.flatMap((s) => s.points.map((p) => p.value)), 1)),
    [series, yMax],
  );
  const ticks = [0, max / 2, max];
  const x = (i: number) => M.left + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => M.top + plotH - (v / max) * plotH;

  // Thin the x labels so they never collide (~70px per label at the rendered width).
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(plotW / 70))));

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || n === 0) return;
    const vx = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((vx - M.left) / plotW) * (n - 1));
    setHover(Math.min(n - 1, Math.max(0, i)));
  }

  return (
    <figure ref={wrapRef} className="relative">
      {series.length > 1 && (
        <figcaption className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400" aria-hidden="true">
          {series.map((s, si) => (
            <span key={s.name} className="inline-flex items-center gap-1.5">
              <span className={`inline-block h-[2px] w-3 rounded bg-current ${SERIES_CLASSES[si]}`} />
              {s.name}
            </span>
          ))}
        </figcaption>
      )}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${height}`}
        className="w-full touch-none select-none"
        style={{ height }}
        role="img"
        aria-label={title}
        aria-describedby={tableId}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {/* Recessive grid + y ticks */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} stroke="currentColor" strokeOpacity={t === 0 ? 0.25 : 0.08} />
            <text x={M.left - 6} y={y(t) + 3.5} textAnchor="end" fontSize="10" fill="currentColor" fillOpacity="0.5">
              {format(t).replace(/\.0(?=%|$)/, "")}
            </text>
          </g>
        ))}
        {labels.map((l, i) =>
          i === n - 1 || (i % labelEvery === 0 && x(n - 1) - x(i) >= 64) ? (
            <text key={l} x={x(i)} y={height - 8} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fontSize="10" fill="currentColor" fillOpacity="0.5">
              {l}
            </text>
          ) : null,
        )}

        {/* Series */}
        {series.map((s, si) => {
          const d = s.points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
          const last = s.points[s.points.length - 1];
          return (
            <g key={s.name} className={SERIES_CLASSES[si]}>
              <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              {last && (
                <>
                  <circle cx={x(n - 1)} cy={y(last.value)} r="4" fill="currentColor" stroke="var(--bg-elevated)" strokeWidth="2" />
                  <text x={x(n - 1) + 8} y={y(last.value) + 3.5} fontSize="11" fontWeight="600" className="fill-zinc-800 dark:fill-zinc-100">
                    {format(last.value)}
                  </text>
                </>
              )}
            </g>
          );
        })}

        {/* Hover crosshair */}
        {hover !== null && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={M.top} y2={M.top + plotH} stroke="currentColor" strokeOpacity="0.25" />
            {series.map((s, si) => (
              <circle key={s.name} cx={x(hover)} cy={y(s.points[hover].value)} r="4" className={SERIES_CLASSES[si]} fill="currentColor" stroke="var(--bg-elevated)" strokeWidth="2" />
            ))}
          </g>
        )}
      </svg>

      {hover !== null && (
        <div
          className="pointer-events-none absolute top-6 z-10 min-w-36 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-xs shadow-lg"
          style={{
            left: `${(x(hover) / W) * 100}%`,
            transform: hover > n / 2 ? "translateX(calc(-100% - 10px))" : "translateX(10px)",
          }}
        >
          <p className="mb-1 font-semibold text-zinc-900 dark:text-white">{labels[hover]}</p>
          {series.map((s, si) => (
            <p key={s.name} className="flex items-center justify-between gap-3 text-zinc-600 dark:text-zinc-300">
              <span className="inline-flex items-center gap-1.5">
                <span className={`inline-block h-2 w-2 rounded-full bg-current ${SERIES_CLASSES[si]}`} aria-hidden="true" />
                {s.name}
              </span>
              <span className="font-semibold tabular-nums text-zinc-900 dark:text-white">{format(s.points[hover].value)}</span>
            </p>
          ))}
        </div>
      )}

      <table id={tableId} className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            {series.map((s) => (
              <th key={s.name} scope="col">{s.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((l, i) => (
            <tr key={l}>
              <th scope="row">{l}</th>
              {series.map((s) => (
                <td key={s.name}>{format(s.points[i].value)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
