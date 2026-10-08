import Link from "next/link";
import type { ReactNode } from "react";

export interface StatTileProps {
  label: string;
  value: ReactNode;
  /** Short context line under the value (period, denominator…). */
  detail?: ReactNode;
  /** Signed change, rendered with an arrow + text so it never relies on colour alone. */
  delta?: { value: number; suffix?: string; label?: string } | null;
  source?: string;
  href?: string;
}

/**
 * KPI tile: label, hero figure, optional delta and provenance line. Uses the
 * system sans with proportional figures for the hero value.
 */
export default function StatTile({ label, value, detail, delta, source, href }: StatTileProps) {
  const body = (
    <>
      <p className="eyebrow">{label}</p>
      <p className="mt-2 text-[28px] font-semibold leading-none tracking-tight text-zinc-900 dark:text-white">{value}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
        {delta && (
          <span
            className={`inline-flex items-center gap-0.5 font-semibold ${
              delta.value >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"
            }`}
          >
            <span aria-hidden="true">{delta.value >= 0 ? "▲" : "▼"}</span>
            {delta.value >= 0 ? "+" : "−"}
            {Math.abs(delta.value).toFixed(1)}
            {delta.suffix ?? ""}
            {delta.label && <span className="font-normal text-zinc-500 dark:text-zinc-400">&nbsp;{delta.label}</span>}
          </span>
        )}
        {detail && <span>{detail}</span>}
      </div>
      {source && <p className="mt-3 border-t border-[var(--border)] pt-2 text-[11px] text-zinc-400 dark:text-zinc-500">{source}</p>}
    </>
  );

  const cls = "glass block h-full p-4";
  return href ? (
    <Link href={href} className={`${cls} glass-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
