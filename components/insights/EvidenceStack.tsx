"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import {
  getEvidenceStack,
  type EvidenceConclusion,
  type EvidenceConfidence,
  type EvidenceSourceFamily,
  type EvidenceStatus,
} from "@/lib/evidence";
import { useT } from "@/lib/i18n/useT";

type MatrixStatus = EvidenceStatus | "not-used";
type DisplayFamily = Omit<EvidenceSourceFamily, "id"> & { id: string };

const STATUS_STYLES: Record<MatrixStatus, { badge: string; dot: string; cell: string; text: string }> = {
  agreement: {
    badge: "border-emerald-400/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.5)]",
    cell: "border-emerald-400/40 bg-emerald-500/25",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  mixed: {
    badge: "border-amber-400/35 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    dot: "bg-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.45)]",
    cell: "border-amber-400/40 bg-amber-500/25",
    text: "text-amber-700 dark:text-amber-300",
  },
  "coverage-gap": {
    badge: "border-rose-400/35 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    dot: "bg-rose-400 shadow-[0_0_16px_rgba(251,113,133,0.45)]",
    cell: "border-rose-400/40 bg-rose-500/25",
    text: "text-rose-700 dark:text-rose-300",
  },
  watch: {
    badge: "border-cyan-400/35 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
    dot: "bg-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.45)]",
    cell: "border-cyan-400/40 bg-cyan-500/25",
    text: "text-cyan-700 dark:text-cyan-300",
  },
  "not-used": {
    badge: "border-zinc-300 bg-zinc-100 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-500",
    dot: "bg-zinc-300 dark:bg-zinc-700",
    cell: "border-zinc-200 bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-900/70",
    text: "text-zinc-500",
  },
};

const STATUS_LABEL_KEYS: Record<MatrixStatus, string> = {
  agreement: "evidenceStatusAgreement",
  mixed: "evidenceStatusMixed",
  "coverage-gap": "evidenceStatusCoverageGap",
  watch: "evidenceStatusWatch",
  "not-used": "evidenceStatusNotUsed",
};

const CONFIDENCE_LABEL_KEYS: Record<EvidenceConfidence, string> = {
  high: "evidenceConfidenceHigh",
  medium: "evidenceConfidenceMedium",
  low: "evidenceConfidenceLow",
};

function familyIds(conclusion: EvidenceConclusion): string[] {
  return conclusion.sourceFamilies;
}

function statusLabel(t: ReturnType<typeof useT>, status: MatrixStatus): string {
  return t(STATUS_LABEL_KEYS[status]);
}

function confidenceLabel(t: ReturnType<typeof useT>, confidence: EvidenceConfidence): string {
  return t(CONFIDENCE_LABEL_KEYS[confidence]);
}

function familyForId(families: Map<string, EvidenceSourceFamily>, id: string): DisplayFamily {
  return families.get(id) ?? {
    id,
    label: id,
    description: id,
    coverage: "",
    freshness: "",
    href: "/sources",
  };
}

function linksForConclusion(conclusion: EvidenceConclusion) {
  return conclusion.links?.length
    ? conclusion.links
    : [{ href: conclusion.recommendedViewHref, label: "Open view" }];
}

export default function EvidenceStack() {
  const t = useT("analysis");
  const headingId = useId();
  const stack = useMemo(() => getEvidenceStack(), []);
  const familiesById = useMemo(
    () => new Map(stack.sourceFamilies.map((family) => [family.id, family])),
    [stack.sourceFamilies],
  );
  const [selectedId, setSelectedId] = useState(stack.conclusions[0]?.id ?? "");
  const selected = stack.conclusions.find((conclusion) => conclusion.id === selectedId) ?? stack.conclusions[0] ?? null;

  return (
    <section aria-labelledby={headingId} className="space-y-6">
      <div className="glass p-5 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-500">{t("evidenceEyebrow")}</p>
            <h2 id={headingId} className="mt-1 text-2xl font-bold text-gradient">
              {t("evidenceTitle")}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {stack.summary.finding}
            </p>
            <p className="mt-3 rounded-2xl border border-cyan-400/25 bg-cyan-500/10 p-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {stack.summary.caveat}
            </p>
          </div>

          <dl className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1" aria-label={t("evidenceSummaryLabel")}>
            <SummaryMetric label={t("evidenceConclusionCount")} value={stack.conclusions.length.toLocaleString()} />
            <SummaryMetric label={t("evidenceSourceFamilyCount")} value={stack.sourceFamilies.length.toLocaleString()} />
            <SummaryMetric label={t("evidenceGeneratedLabel")} value={stack.generatedAt.slice(0, 10)} />
          </dl>
        </div>
      </div>

      <div className="glass p-5 sm:p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-gradient">{t("evidenceSourceFamilyStripTitle")}</h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t("evidenceSourceFamilyStripExplainer")}</p>
          </div>
          <Link href="/sources" className="text-sm font-semibold text-violet-600 underline-offset-4 hover:underline dark:text-violet-300">
            {t("evidenceSourceNotesLink")} →
          </Link>
        </div>

        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label={t("evidenceSourceFamiliesAria")}>
          {stack.sourceFamilies.map((family) => (
            <li key={family.id}>
              <Link
                href={family.href}
                className="block h-full rounded-2xl border border-zinc-200 bg-white/55 p-4 transition-colors hover:border-violet-400/50 hover:bg-violet-500/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 dark:border-zinc-800 dark:bg-zinc-950/35"
              >
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">{family.label}</h4>
                  <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {family.id}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">{family.description}</p>
                <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
                  <span className="font-semibold">{t("evidenceCoverageLabel")}</span> {family.coverage}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px] 2xl:grid-cols-[minmax(0,1fr)_460px]">
        <div className="glass p-5 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="text-lg font-bold text-gradient">{t("evidenceMatrixTitle")}</h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t("evidenceMatrixExplainer")}</p>
            </div>
            <StatusLegend t={t} />
          </div>

          <ol className="space-y-3" aria-label={t("evidenceRowsAria")}>
            {stack.conclusions.map((conclusion, index) => {
              const isSelected = selected?.id === conclusion.id;
              const conclusionFamilyIds = new Set(familyIds(conclusion));
              return (
                <li key={conclusion.id}>
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedId(conclusion.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 ${
                      isSelected
                        ? "border-violet-400/50 bg-violet-500/10"
                        : "border-zinc-200 bg-white/55 hover:border-violet-400/35 hover:bg-violet-500/5 dark:border-zinc-800 dark:bg-zinc-950/35"
                    }`}
                  >
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.35fr)_minmax(0,auto)] xl:items-center">
                      <div className="min-w-0">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 text-xs font-bold tabular-nums text-zinc-500">0{index + 1}</span>
                          <div>
                            <h4 className="font-semibold leading-snug text-zinc-900 dark:text-white">{conclusion.title}</h4>
                            <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{conclusion.finding}</p>
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {familyIds(conclusion).map((familyId) => {
                                const family = familyForId(familiesById, familyId);
                                return (
                                  <span
                                    key={familyId}
                                    className="rounded-full border border-zinc-200 bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300"
                                  >
                                    {family.label}
                                    <span className="sr-only"> {familyId}</span>
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 hidden grid-cols-9 gap-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 lg:grid">
                          {stack.sourceFamilies.map((family) => (
                            <span key={family.id} className="truncate text-center" title={family.label}>
                              {family.id}
                            </span>
                          ))}
                        </div>
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9" aria-label={t("evidenceMatrixAria")}>
                          {stack.sourceFamilies.map((family) => {
                            const cellStatus: MatrixStatus = conclusionFamilyIds.has(family.id) ? conclusion.status : "not-used";
                            return (
                              <span
                                key={family.id}
                                className={`h-11 rounded-xl border ${STATUS_STYLES[cellStatus].cell}`}
                                title={`${family.label}: ${statusLabel(t, cellStatus)}`}
                                aria-label={`${family.label}: ${statusLabel(t, cellStatus)}`}
                              >
                                <span className="sr-only">{family.id}</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 xl:justify-end">
                        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[conclusion.status].badge}`}>
                          <span className={`h-2 w-2 rounded-full ${STATUS_STYLES[conclusion.status].dot}`} aria-hidden="true" />
                          {statusLabel(t, conclusion.status)}
                        </span>
                        <span className="rounded-full border border-zinc-200 bg-white/70 px-3 py-1 text-xs font-semibold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300">
                          {confidenceLabel(t, conclusion.confidence)}
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        {selected && (
          <aside className="glass h-fit p-5 sm:p-6 xl:sticky xl:top-8" aria-labelledby={`${headingId}-selected`}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-500">{t("evidenceSelectedTitle")}</p>
            <h3 id={`${headingId}-selected`} className="mt-2 text-xl font-bold text-gradient">{selected.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{selected.finding}</p>

            <div className="mt-4 rounded-2xl border border-zinc-200 bg-white/55 p-4 dark:border-zinc-800 dark:bg-zinc-950/35">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{t("evidenceCaveatLabel")}</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{selected.caveat}</p>
            </div>

            <div className="mt-4 rounded-2xl border border-zinc-200 bg-white/55 p-4 dark:border-zinc-800 dark:bg-zinc-950/35">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{t("evidenceKeyMetricsLabel")}</p>
              <dl className="mt-3 space-y-3">
                {selected.metrics.map((metric) => (
                  <div key={metric.id}>
                    <dt className="text-xs text-zinc-500">{metric.label}</dt>
                    <dd className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-white">{metric.value}</dd>
                    {metric.detail && <dd className="mt-0.5 text-xs leading-relaxed text-zinc-500">{metric.detail}</dd>}
                  </div>
                ))}
              </dl>
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{t("evidenceViewLinksLabel")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {linksForConclusion(selected).map((link) => (
                  <Link
                    key={`${selected.id}-${link.href}`}
                    href={link.href}
                    className="rounded-full border border-violet-400/35 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-500/15 dark:text-violet-300"
                  >
                    {link.label} →
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/55 p-4 dark:border-zinc-800 dark:bg-zinc-950/35">
      <dt className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{label}</dt>
      <dd className="mt-1 text-2xl font-extrabold text-gradient">{value}</dd>
    </div>
  );
}

function StatusLegend({ t }: { t: ReturnType<typeof useT> }) {
  const statuses: MatrixStatus[] = ["agreement", "mixed", "coverage-gap", "watch"];
  return (
    <div className="flex flex-wrap gap-2" aria-label={t("evidenceLegendTitle")}>
      {statuses.map((status) => (
        <span key={status} className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[status].badge}`}>
          <span className={`h-2 w-2 rounded-full ${STATUS_STYLES[status].dot}`} aria-hidden="true" />
          {statusLabel(t, status)}
        </span>
      ))}
    </div>
  );
}
