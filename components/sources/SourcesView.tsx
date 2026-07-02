"use client";

import Reveal from "@/components/ui/Reveal";
import { useT } from "@/lib/i18n/useT";
import type { DataSource } from "@/lib/data";
import DataExport from "@/components/sources/DataExport";

function LicenseBadge({ license }: { license: string }) {
  const isOpen =
    license.startsWith("CC") || license === "Public Domain";
  const badgeClass = `inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-mono ${
    isOpen
      ? "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20"
      : "bg-zinc-100 dark:bg-zinc-700/40 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-600/40"
  }`;

  if (license.startsWith("CC")) {
    return (
      <a
        href="https://creativecommons.org/licenses/by/4.0/"
        target="_blank"
        rel="noopener noreferrer"
        className={`${badgeClass} hover:underline`}
      >
        {license}
      </a>
    );
  }

  return <span className={badgeClass}>{license}</span>;
}

export interface SourcesViewProps {
  generatedAt: string;
  snapshotDate: string | null;
  sources: DataSource[];
  note: string | null;
}

export default function SourcesView({
  generatedAt,
  snapshotDate,
  sources,
  note,
}: SourcesViewProps) {
  const t = useT("sources");

  const primarySources = sources.filter(
    (s) => !s.usedFor.toLowerCase().includes("context"),
  );
  const contextSources = sources.filter((s) =>
    s.usedFor.toLowerCase().includes("context"),
  );

  return (
    <div className="space-y-12 max-w-[1000px]">
      {/* ─── HERO ─────────────────────────────────────────────────────────── */}
      <section className="pt-4 pb-2">
        <Reveal>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.1]">
            <span className="text-gradient">{t("heroHeadline")}</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
            {t("heroIntroBefore")}{" "}
            <span className="text-zinc-700 dark:text-zinc-200 font-medium">
              {t("heroIntroHighlight")}
            </span>{" "}
            {t("heroIntroAfter")}
          </p>
        </Reveal>

        {/* ─── SNAPSHOT DATE ───────────────────────────────────────────── */}
        <Reveal delay={200} className="mt-6">
          {snapshotDate ? (
            <div className="inline-flex items-center gap-2 text-sm font-medium text-violet-700 dark:text-violet-300 border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 rounded-full">
              <span
                className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0"
                aria-hidden="true"
              />
              {t("dataAsOf")}{" "}
              <time dateTime={generatedAt}>{snapshotDate}</time>
            </div>
          ) : null}
        </Reveal>
      </section>

      <hr className="divider-glow" />

      {/* ─── PRIMARY DATA SOURCES ────────────────────────────────────────── */}
      <Reveal delay={80}>
        <div>
          <h2 className="text-xl font-bold text-gradient mb-1">
            {t("primaryHeading")}
          </h2>
          <p className="text-xs text-zinc-500 mb-4">{t("primaryDesc")}</p>
          <hr className="divider-glow mb-6" />

          <div className="space-y-4">
            {primarySources.map((source, i) => (
              <Reveal key={`${source.name}-${i}`} delay={i * 60}>
                <article className="glass glass-hover p-5 rounded-xl space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-zinc-900 dark:text-white text-sm leading-snug">
                        {source.name}
                      </h3>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {source.publisher} &middot; {source.year}
                      </p>
                    </div>
                    <LicenseBadge license={source.license} />
                  </div>

                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    <span className="text-zinc-500 mr-1">
                      {t("fieldUsedForLabel")}
                    </span>
                    {source.usedFor}
                  </p>

                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors underline underline-offset-2"
                    aria-label={`Open ${source.name} on ${source.publisher} website (opens in new tab)`}
                  >
                    {t("viewDataset")}
                    <span aria-hidden="true">↗</span>
                  </a>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </Reveal>

      <hr className="divider-glow" />

      {/* ─── CONTEXT / VALIDATION CITATIONS ─────────────────────────────── */}
      {contextSources.length > 0 && (
        <Reveal delay={80}>
          <div>
            <h2 className="text-xl font-bold text-gradient mb-1">
              {t("contextHeading")}
            </h2>
            <p className="text-xs text-zinc-500 mb-4">{t("contextDesc")}</p>
            <hr className="divider-glow mb-6" />

            <div className="space-y-3">
              {contextSources.map((source, i) => (
                <Reveal key={`${source.name}-ctx-${i}`} delay={i * 50}>
                  <article className="glass p-4 rounded-xl flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-zinc-700 dark:text-zinc-200 text-sm leading-snug">
                        {source.name}
                      </h3>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {source.publisher} &middot; {source.year} &middot;{" "}
                        <span className="italic">{source.usedFor}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <LicenseBadge license={source.license} />
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-violet-400 hover:text-violet-300 transition-colors underline underline-offset-2"
                        aria-label={`Open ${source.name} (opens in new tab)`}
                      >
                        {t("viewLink")}
                      </a>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </Reveal>
      )}

      <hr className="divider-glow" />

      {/* ─── METHODOLOGY NOTE ────────────────────────────────────────────── */}
      {note && (
        <Reveal delay={0}>
          <div
            className="glass px-5 py-4 rounded-xl text-sm text-zinc-600 dark:text-zinc-400 max-w-3xl space-y-2"
            role="note"
            aria-label="Technical methodology note"
          >
            <p className="font-semibold text-zinc-700 dark:text-zinc-200">
              {t("techNoteTitle")}
            </p>
            <p className="leading-relaxed">{note}</p>
          </div>
        </Reveal>
      )}

      <hr className="divider-glow" />

      {/* ─── DATA EXPORT ─────────────────────────────────────────────────── */}
      <Reveal delay={0}>
        <DataExport />
      </Reveal>
    </div>
  );
}
