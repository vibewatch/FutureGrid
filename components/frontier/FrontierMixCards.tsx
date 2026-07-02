"use client";

import { useMemo } from "react";
import { getAccessibilityMix, getDomainMix } from "@/lib/ai-frontier";
import { useT } from "@/lib/i18n/useT";

function MiniBar({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex-1 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700/60 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

export default function FrontierMixCards() {
  const t = useT("frontier");
  const access = useMemo(() => getAccessibilityMix(), []);
  const domains = useMemo(() => getDomainMix().slice(0, 8), []);

  const totalAccess = access.openWeights + access.closed + access.unknown;
  const maxDomain = domains[0]?.count ?? 1;

  const accessItems = [
    {
      label: t("mixOpenWeights"),
      value: access.openWeights,
      pct: totalAccess > 0 ? Math.round((access.openWeights / totalAccess) * 100) : 0,
      color: "#22c55e",
    },
    {
      label: t("mixClosed"),
      value: access.closed,
      pct: totalAccess > 0 ? Math.round((access.closed / totalAccess) * 100) : 0,
      color: "#f97316",
    },
    {
      label: t("mixUnknown"),
      value: access.unknown,
      pct: totalAccess > 0 ? Math.round((access.unknown / totalAccess) * 100) : 0,
      color: "#71717a",
    },
  ];

  const domainColors = [
    "#8b5cf6",
    "#06b6d4",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#ec4899",
    "#6366f1",
    "#84cc16",
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Access mix card */}
      <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          {t("mixAccessTitle")}
        </h3>
        <div className="space-y-2.5">
          {accessItems.map(({ label, value, pct, color }) => (
            <div key={label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {label}
                </span>
                <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
                  {value.toLocaleString()} · {pct}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MiniBar value={value} max={totalAccess} color={color} />
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-zinc-500 dark:text-zinc-500 leading-snug pt-1">
          {totalAccess.toLocaleString()} {t("mixCountLabel")}
        </p>
      </div>

      {/* Domain mix card */}
      <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
            {t("mixDomainsTitle")}
          </h3>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-500 mt-0.5">
            {t("mixDomainsSubhead")}
          </p>
        </div>
        <div className="space-y-2">
          {domains.map((d, i) => (
            <div key={d.domain} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {d.domain}
                </span>
                <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
                  {d.count.toLocaleString()}
                </span>
              </div>
              <MiniBar
                value={d.count}
                max={maxDomain}
                color={domainColors[i % domainColors.length]}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
