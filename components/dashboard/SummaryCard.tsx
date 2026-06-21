"use client";

import Link from "next/link";

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle: string;
  trend?: string;
  trendUp?: boolean;
  color: string;
  href: string;
}

export default function SummaryCard({ title, value, subtitle, trend, trendUp, color, href }: SummaryCardProps) {
  return (
    <Link href={href} className={`block rounded-xl bg-zinc-800/50 border border-zinc-700/50 p-5 hover:border-zinc-600 transition-colors`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: color }} />
        {trend && (
          <span className={`text-xs font-medium ${trendUp ? "text-green-400" : "text-red-400"}`}>
            {trend}
          </span>
        )}
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm font-medium text-zinc-300">{title}</div>
      <div className="text-xs text-zinc-500 mt-1">{subtitle}</div>
    </Link>
  );
}