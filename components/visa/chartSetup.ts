"use client";

/**
 * Shared Chart.js registration + brand palette for the /visa charts.
 * Registering once here avoids duplicate ChartJS.register calls across the
 * dynamically-imported chart components.
 */

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
);

/** Ordered qualitative palette (dark, light) for multi-series charts. */
export const SERIES_PALETTE: Array<{ dark: string; light: string }> = [
  { dark: "#8b5cf6", light: "#7c3aed" }, // violet
  { dark: "#22d3ee", light: "#0891b2" }, // cyan
  { dark: "#34d399", light: "#059669" }, // emerald
  { dark: "#f59e0b", light: "#d97706" }, // amber
  { dark: "#fb7185", light: "#e11d48" }, // rose
  { dark: "#60a5fa", light: "#2563eb" }, // blue
  { dark: "#c084fc", light: "#9333ea" }, // purple
  { dark: "#f472b6", light: "#db2777" }, // pink
  { dark: "#a3e635", light: "#65a30d" }, // lime
  { dark: "#facc15", light: "#ca8a04" }, // yellow
  { dark: "#94a3b8", light: "#64748b" }, // slate (for "Other")
];

/** Automation-risk tier colours (Low → Very High → Unclassified). */
export const TIER_COLORS: Record<string, { dark: string; light: string }> = {
  Low: { dark: "#34d399", light: "#059669" },
  Medium: { dark: "#facc15", light: "#ca8a04" },
  High: { dark: "#f59e0b", light: "#d97706" },
  "Very High": { dark: "#fb7185", light: "#e11d48" },
  Unclassified: { dark: "#94a3b8", light: "#64748b" },
};

export function seriesColor(i: number, isDark: boolean): string {
  const c = SERIES_PALETTE[i % SERIES_PALETTE.length];
  return isDark ? c.dark : c.light;
}

export interface ChartTheme {
  isDark: boolean;
  axisText: string;
  gridColor: string;
  borderClr: string;
  ttBg: string;
  ttTitle: string;
  ttBody: string;
  ttBorder: string;
}

/** Theme-aware colour tokens shared by every /visa chart. */
export function chartTheme(isDark: boolean): ChartTheme {
  return {
    isDark,
    axisText: isDark ? "#a1a1aa" : "#52525b",
    gridColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)",
    borderClr: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)",
    ttBg: isDark ? "rgba(9,9,11,0.92)" : "rgba(255,255,255,0.95)",
    ttTitle: isDark ? "#e4e4e7" : "#18181b",
    ttBody: isDark ? "#a1a1aa" : "#52525b",
    ttBorder: isDark ? "rgba(139,92,246,0.30)" : "rgba(139,92,246,0.25)",
  };
}
