import Link from "next/link";
import { getHighlights } from "@/lib/data";
import { colorForRisk, formatCurrency } from "@/lib/utils";
import type { HighlightEntry, Highlights } from "@/lib/data";

// ── Panel config ──────────────────────────────────────────────────────────────

type PanelConfig = {
  key: keyof Highlights;
  title: string;
  icon: string;
  accent: string;
  metric: (e: HighlightEntry) => string;
  metricLabel: string;
  barValue: (e: HighlightEntry) => number;
  barColor: (e: HighlightEntry) => string;
};

const PANELS: PanelConfig[] = [
  {
    key: "mostAtRisk",
    title: "Most AI-Exposed",
    icon: "⚠️",
    accent: "#ef4444",
    metric: (e) => `${Math.round(e.automationProbability * 100)}%`,
    metricLabel: "AI exposure",
    barValue: (e) => e.automationProbability,
    barColor: (e) => colorForRisk(e.automationRisk),
  },
  {
    key: "brightOutlook",
    title: "Bright Outlook",
    icon: "📈",
    accent: "#22c55e",
    metric: (e) => e.projectedOpenings != null ? e.projectedOpenings.toLocaleString() : "Bright ↗",
    metricLabel: "proj. annual openings",
    barValue: (e) => e.projectedOpenings ?? 0,
    barColor: () => "#22c55e",
  },
  {
    key: "mostResilient",
    title: "Most Resilient",
    icon: "🛡️",
    accent: "#8b5cf6",
    metric: (e) => `${Math.round((1 - e.automationProbability) * 100)}/100`,
    metricLabel: "resiliency score",
    barValue: (e) => 1 - e.automationProbability,
    barColor: () => "#8b5cf6",
  },
  {
    key: "highestPaid",
    title: "Highest Paid",
    icon: "💰",
    accent: "#f59e0b",
    metric: (e) => formatCurrency(e.medianSalary),
    metricLabel: "median salary",
    barValue: (e) => e.medianSalary,
    barColor: () => "#f59e0b",
  },
  {
    key: "largestWorkforce",
    title: "Largest Workforce",
    icon: "👥",
    accent: "#3b82f6",
    metric: (e) => e.totalEmployment != null ? e.totalEmployment.toLocaleString() : "—",
    metricLabel: "employees",
    barValue: (e) => e.totalEmployment ?? 0,
    barColor: () => "#3b82f6",
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function HighlightsBento() {
  const highlights = getHighlights(5);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {PANELS.map(({ key, title, icon, accent, metric, metricLabel, barValue, barColor }) => {
          const entries = highlights[key];
          const maxBar = entries.length > 0 ? Math.max(...entries.map((e) => barValue(e))) : 1;

          return (
            <div
              key={key}
              className="glass rounded-2xl p-5 flex flex-col gap-0"
              style={{ borderTop: `2px solid ${accent}33` }}
            >
              {/* Header */}
              <div className="flex items-center gap-2 mb-1">
                <span aria-hidden="true" className="text-lg leading-none">
                  {icon}
                </span>
                <h3
                  className="font-bold text-sm"
                  style={{
                    background: `linear-gradient(90deg, ${accent}, ${accent}99)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {title}
                </h3>
              </div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-3">
                {metricLabel}
              </p>

              {/* Ranked list */}
              <ol className="space-y-2" aria-label={`${title} occupations`}>
                {entries.map((e, i) => {
                  const pct = maxBar > 0 ? (barValue(e) / maxBar) * 100 : 0;
                  const color = barColor(e);
                  return (
                    <li key={e.occupationCode}>
                      <Link
                        href={`/careers/${e.occupationCode}`}
                        className="glass-hover block rounded-lg px-2 py-1.5 -mx-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <span className="flex items-start gap-1.5 min-w-0">
                            <span
                              className="text-[10px] font-bold tabular-nums shrink-0 mt-px"
                              style={{ color: accent }}
                            >
                              {i + 1}.
                            </span>
                            <span className="text-xs text-zinc-700 dark:text-zinc-200 leading-tight font-medium line-clamp-2">
                              {e.occupationName}
                            </span>
                          </span>
                          <span
                            className="shrink-0 text-xs font-semibold tabular-nums whitespace-nowrap"
                            style={{ color }}
                          >
                            {metric(e)}
                          </span>
                        </div>
                        {/* Mini bar */}
                        <div className="h-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800/80 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: color }}
                          />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-zinc-600 mt-4 leading-relaxed">
        AI-exposure figures reflect observed AI (LLM) usage from the Anthropic Economic Index (2025), mapped to O*NET tasks — a relative exposure measure, not a prediction of job loss.{" "}
        <Link href="/sources" className="text-zinc-500 hover:text-zinc-400 underline underline-offset-2">
          See Sources
        </Link>
        .
      </p>
    </>
  );
}
