"use client";

import Link from "next/link";
import AnimatedCounter from "@/components/ui/AnimatedCounter";

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle: string;
  trend?: string;
  trendUp?: boolean;
  color: string;
  href: string;
  /** If provided, renders value via AnimatedCounter instead of static text. */
  numericValue?: number;
  numericDecimals?: number;
  numericSuffix?: string;
  numericPrefix?: string;
}

export default function SummaryCard({
  title,
  value,
  subtitle,
  trend,
  trendUp,
  color,
  href,
  numericValue,
  numericDecimals = 0,
  numericSuffix,
  numericPrefix,
}: SummaryCardProps) {
  return (
    <Link
      href={href}
      className="glass glass-hover block p-5 outline-none focus-visible:ring-2 focus-visible:ring-violet-500/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07080d]"
      style={{
        boxShadow: `0 0 0 1px ${color}22, 0 4px 20px ${color}15`,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: color, boxShadow: `0 0 6px 1px ${color}66` }}
        />
        {trend && (
          <span
            className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${
              trendUp
                ? "bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/25"
                : "bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/25"
            }`}
          >
            {trendUp ? "↑" : "↓"} {trend}
          </span>
        )}
      </div>

      <div className="text-3xl font-bold mb-1.5 leading-none">
        {numericValue !== undefined ? (
          <AnimatedCounter
            value={numericValue}
            decimals={numericDecimals}
            prefix={numericPrefix}
            suffix={numericSuffix}
            durationMs={1600}
            className="text-gradient"
          />
        ) : (
          <span className="text-gradient">{value}</span>
        )}
      </div>

      <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 mb-0.5">{title}</div>
      <div className="text-xs text-zinc-500">{subtitle}</div>
    </Link>
  );
}