export type GuardrailBadgeKind = "observed" | "proxy" | "restricted" | "descriptive";

export const GUARDRAIL_BADGES: Record<
  GuardrailBadgeKind,
  { label: string; description: string; className: string }
> = {
  observed: {
    label: "Observed",
    description: "Provider or public-record observations, not modeled estimates.",
    className:
      "border-emerald-300/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  proxy: {
    label: "Proxy",
    description: "Proxy or seed-derived signal; use directionally, not as direct measurement.",
    className:
      "border-amber-300/50 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  restricted: {
    label: "Restricted",
    description: "Source terms restrict redistribution or complete raw-data access.",
    className:
      "border-rose-300/50 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
  descriptive: {
    label: "Descriptive-only",
    description: "Descriptive context only; not causal, predictive, or prescriptive.",
    className:
      "border-sky-300/50 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
};

export function inferGuardrailBadgeKind(text: string): GuardrailBadgeKind {
  const normalized = text.toLowerCase();
  if (
    /\b(restricted|prohibited|non-commercial|terms|tos|no explicit open license|unavailable)\b/.test(
      normalized,
    )
  ) {
    return "restricted";
  }
  if (/\b(proxy|seed|synthetic|catalog|estimated|forecast|model(?:ed)?|openrouter)\b/.test(normalized)) {
    return "proxy";
  }
  if (/\b(descriptive|context|benchmark|caveat|comparison)\b/.test(normalized)) {
    return "descriptive";
  }
  return "observed";
}

export default function GuardrailBadge({
  kind,
  className = "",
}: {
  kind: GuardrailBadgeKind;
  className?: string;
}) {
  const badge = GUARDRAIL_BADGES[kind];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none ${badge.className} ${className}`}
      title={badge.description}
      aria-label={`${badge.label}: ${badge.description}`}
    >
      {badge.label}
    </span>
  );
}
