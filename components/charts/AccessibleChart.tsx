"use client";

import type { ReactNode } from "react";

interface AccessibleChartProps {
  /** Accessible name for the chart region (aria-label on the figure element) */
  label: string;
  /**
   * Concise text alternative rendered as a visually-hidden figcaption.
   * Accepts a string or any React node (e.g. a <table> for structured data).
   */
  summary: ReactNode;
  /** Additional className forwarded to the wrapping figure element */
  className?: string;
  children: ReactNode;
}

/**
 * Reusable accessible chart wrapper.
 *
 * Wraps any chart in a semantic <figure> with:
 *  • aria-label  — provides the accessible name for the chart region
 *  • sr-only <figcaption> — provides a concise text / table alternative
 *
 * Usage:
 *   <AccessibleChart label={t("a11yMyChartName")} summary={t("a11yMyChartSummary")}>
 *     <svg … />
 *   </AccessibleChart>
 */
export default function AccessibleChart({
  label,
  summary,
  className,
  children,
}: AccessibleChartProps) {
  return (
    <figure aria-label={label} className={className}>
      {children}
      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
}
