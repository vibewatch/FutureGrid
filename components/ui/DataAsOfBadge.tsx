"use client";

import { getDataAsOf, getLatestAsOf } from "@/lib/provenance";
import { useT } from "@/lib/i18n/useT";

export interface DataAsOfBadgeProps {
  /** Single dataset id to look up. */
  datasetId?: string;
  /** Multiple dataset ids — the most-recent asOf among them is used. */
  datasetIds?: string[];
  className?: string;
}

/**
 * Formats an asOf string for display.
 *  "2025"        → "2025"
 *  "2026-07-02"  → "Jul 2026"
 *  "2026-06"     → "Jun 2026"
 *  "2024-2034"   → "2024-2034"  (projection window: pass through unchanged)
 */
function formatAsOf(asOf: string): string {
  // Full ISO date (YYYY-MM-DD) or partial (YYYY-MM) — only accept valid months 01–12.
  // Projection windows like "2024-2034" do NOT match (2034 is not a valid month).
  if (/^\d{4}-(0[1-9]|1[0-2])(-\d{2})?$/.test(asOf)) {
    const [year, monthStr] = asOf.split("-");
    const month = parseInt(monthStr, 10) - 1;
    const date = new Date(Date.UTC(parseInt(year, 10), month, 1));
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  // Plain year string ("2025"), FY label ("FY 2025"), or projection window ("2024-2034") — display as-is.
  return asOf;
}

/** Resolve the best asOf from the given props. */
function resolveAsOf(props: DataAsOfBadgeProps): string | null {
  const ids: string[] = [];
  if (props.datasetId) ids.push(props.datasetId);
  if (props.datasetIds) ids.push(...props.datasetIds);

  if (ids.length > 0) {
    // Pick the most-recent (lexicographic max) non-null asOf
    let best: string | null = null;
    for (const id of ids) {
      const val = getDataAsOf(id);
      if (val && (best === null || val > best)) best = val;
    }
    return best;
  }

  return getLatestAsOf();
}

/**
 * Small "Data as of <date>" freshness badge.
 * Returns nothing when the date cannot be resolved.
 */
export default function DataAsOfBadge({
  datasetId,
  datasetIds,
  className = "",
}: DataAsOfBadgeProps) {
  const tc = useT("common");
  const asOf = resolveAsOf({ datasetId, datasetIds });

  if (!asOf) return null;

  const formatted = formatAsOf(asOf);
  const label = tc("dataAsOf", { date: formatted });

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium
        bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400
        border border-zinc-200 dark:border-zinc-700 ${className}`}
      title={label}
      aria-label={label}
    >
      {label}
    </span>
  );
}
