"use client";

import Reveal from "@/components/ui/Reveal";
import { useT } from "@/lib/i18n/useT";
import type { DatasetProvenance } from "@/lib/provenance";

// ─── Cleared download entries ─────────────────────────────────────────────────
export interface ClearedDownload {
  id: string;
  filename: string;
  label: string;
  license: string;
  attribution: string;
  /** Path relative to basePath, starting with /. Defaults to /data/{filename}. */
  publicPath?: string;
  sizeNote?: string;
}

export interface FlaggedDownload {
  id: string;
  label: string;
  reason: string;
}

export interface MethodologyViewProps {
  datasets: DatasetProvenance[];
  basePath: string;
  clearedDownloads: ClearedDownload[];
  flaggedDownloads: FlaggedDownload[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white"
    >
      {children}
    </h2>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 mt-6 mb-2">
      {children}
    </h3>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
      {children}
    </p>
  );
}

function LensRow({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="flex gap-3 py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <span className="shrink-0 w-40 text-sm font-medium text-violet-700 dark:text-violet-300">
        {label}
      </span>
      <span className="text-sm text-zinc-600 dark:text-zinc-400">{desc}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MethodologyView({
  datasets,
  basePath,
  clearedDownloads,
  flaggedDownloads,
}: MethodologyViewProps) {
  const t = useT("methodology");

  // Sort datasets by generatedAt descending (newest first)
  const sortedDatasets = [...datasets].sort((a, b) =>
    b.generatedAt.localeCompare(a.generatedAt),
  );

  return (
    <div className="space-y-16 max-w-[900px]">
      {/* ─── HERO ──────────────────────────────────────────────────────────── */}
      <section className="pt-4 pb-2" aria-labelledby="methodology-hero">
        <Reveal>
          <h1
            id="methodology-hero"
            className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.1]"
          >
            <span className="text-gradient">{t("heroHeadline")}</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
            {t("heroSubhead")}
          </p>
        </Reveal>
      </section>

      {/* ─── PROMINENT CAVEAT ─────────────────────────────────────────────── */}
      <Reveal>
        <aside
          role="note"
          aria-label={t("caveatHeading")}
          className="rounded-xl border-2 border-amber-400 dark:border-amber-500/60 bg-amber-50 dark:bg-amber-900/20 p-5 space-y-3"
        >
          <p className="text-base font-bold text-amber-800 dark:text-amber-300">
            {t("caveatHeading")}
          </p>
          <p className="text-sm leading-relaxed text-amber-900 dark:text-amber-200">
            {t("caveatBody")}
          </p>
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 rounded-lg px-3 py-2">
            {t("caveatNullNote")}
          </p>
        </aside>
      </Reveal>

      {/* ─── AI EXPOSURE BLENDING ─────────────────────────────────────────── */}
      <section
        aria-labelledby="methodology-exposure"
        className="space-y-4"
        data-testid="section-exposure"
      >
        <Reveal>
          <SectionHeading id="methodology-exposure">
            {t("exposureHeading")}
          </SectionHeading>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {t("exposureSubhead")}
          </p>
        </Reveal>

        <Reveal delay={100}>
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 divide-y divide-zinc-100 dark:divide-zinc-700 overflow-hidden">
            <LensRow label={t("exposureLensUsage")} desc={t("exposureLensUsageDesc")} />
            <LensRow label={t("exposureLensCapability")} desc={t("exposureLensCapabilityDesc")} />
            <LensRow label={t("exposureLensAbility")} desc={t("exposureLensAbilityDesc")} />
            <LensRow label={t("exposureLensAutomation")} desc={t("exposureLensAutomationDesc")} />
          </div>
        </Reveal>

        <Reveal delay={150}>
          <SubHeading>Consensus & Gap</SubHeading>
          <Prose>{t("exposureConsensusDesc")}</Prose>
          <Prose>{t("exposureGapDesc")}</Prose>
        </Reveal>

        <Reveal delay={200}>
          <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1">
              Caveat
            </p>
            <Prose>{t("exposureCaveat")}</Prose>
          </div>
        </Reveal>
      </section>

      {/* ─── WARN PRESSURE RANKING ────────────────────────────────────────── */}
      <section
        aria-labelledby="methodology-warn"
        className="space-y-4"
        data-testid="section-warn"
      >
        <Reveal>
          <SectionHeading id="methodology-warn">
            {t("warnHeading")}
          </SectionHeading>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {t("warnSubhead")}
          </p>
        </Reveal>

        <Reveal delay={100}>
          <SubHeading>{t("warnEligibilityTitle")}</SubHeading>
          <Prose>{t("warnEligibilityDesc")}</Prose>
          <p className="mt-2 text-sm font-medium text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700/40 rounded-lg px-3 py-2">
            {t("warnNullNote")}
          </p>
        </Reveal>

        <Reveal delay={150}>
          <SubHeading>{t("warnScoringTitle")}</SubHeading>
          <Prose>{t("warnScoringDesc")}</Prose>
        </Reveal>

        <Reveal delay={180}>
          <SubHeading>{t("warnWindowTitle")}</SubHeading>
          <Prose>{t("warnWindowDesc")}</Prose>
        </Reveal>

        <Reveal delay={200}>
          <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1">
              Caveat
            </p>
            <Prose>{t("warnCaveat")}</Prose>
          </div>
        </Reveal>
      </section>

      {/* ─── MARKET-SIGNAL SCORING ────────────────────────────────────────── */}
      <section
        aria-labelledby="methodology-market"
        className="space-y-4"
        data-testid="section-market"
      >
        <Reveal>
          <SectionHeading id="methodology-market">
            {t("marketHeading")}
          </SectionHeading>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {t("marketSubhead")}
          </p>
        </Reveal>

        <Reveal delay={100}>
          <SubHeading>{t("marketScoringTitle")}</SubHeading>
          <Prose>{t("marketScoringDesc")}</Prose>
        </Reveal>

        <Reveal delay={150}>
          <SubHeading>Data Source</SubHeading>
          <Prose>{t("marketBenchmarkDesc")}</Prose>
        </Reveal>

        <Reveal delay={180}>
          <div
            role="note"
            aria-label={t("marketNonAdvisoryTitle")}
            className="rounded-lg border border-red-200 dark:border-red-700/40 bg-red-50 dark:bg-red-900/20 p-4"
          >
            <p className="text-sm font-bold text-red-700 dark:text-red-300 mb-1">
              {t("marketNonAdvisoryTitle")}
            </p>
            <Prose>{t("marketNonAdvisoryDesc")}</Prose>
          </div>
        </Reveal>

        <Reveal delay={200}>
          <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1">
              Caveat
            </p>
            <Prose>{t("marketCaveat")}</Prose>
          </div>
        </Reveal>
      </section>

      {/* ─── FORECAST / REGRESSION / DISRUPTION ──────────────────────────── */}
      <section
        aria-labelledby="methodology-forecast"
        className="space-y-4"
        data-testid="section-forecast"
      >
        <Reveal>
          <SectionHeading id="methodology-forecast">
            {t("forecastHeading")}
          </SectionHeading>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {t("forecastSubhead")}
          </p>
        </Reveal>

        <Reveal delay={100}>
          <SubHeading>{t("regressionTitle")}</SubHeading>
          <Prose>{t("regressionDesc")}</Prose>
        </Reveal>

        <Reveal delay={150}>
          <SubHeading>{t("forecastTitle")}</SubHeading>
          <Prose>{t("forecastDesc")}</Prose>
        </Reveal>

        <Reveal delay={180}>
          <SubHeading>{t("disruptionTitle")}</SubHeading>
          <Prose>{t("disruptionDesc")}</Prose>
        </Reveal>

        <Reveal delay={200}>
          <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1">
              Caveat
            </p>
            <Prose>{t("forecastCaveat")}</Prose>
          </div>
        </Reveal>
      </section>

      {/* ─── DATA CHANGELOG ──────────────────────────────────────────────── */}
      <section
        aria-labelledby="methodology-changelog"
        className="space-y-4"
        data-testid="section-changelog"
      >
        <Reveal>
          <SectionHeading id="methodology-changelog">
            {t("changelogHeading")}
          </SectionHeading>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {t("changelogSubhead")}
          </p>
        </Reveal>

        <Reveal delay={100}>
          {sortedDatasets.length === 0 ? (
            <p className="text-sm text-zinc-400">{t("changelogNoData")}</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
              <table
                className="w-full text-sm"
                aria-label={t("changelogHeading")}
              >
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60">
                    {[
                      { key: "changelogColDataset", w: "w-40" },
                      { key: "changelogColAsOf", w: "w-28" },
                      { key: "changelogColGenerated", w: "w-36" },
                      { key: "changelogColVersion", w: "w-16" },
                      { key: "changelogColRows", w: "w-24" },
                      { key: "changelogColSource", w: "" },
                    ].map(({ key, w }) => (
                      <th
                        key={key}
                        scope="col"
                        className={`text-left px-3 py-2.5 font-semibold text-zinc-600 dark:text-zinc-300 ${w}`}
                      >
                        {t(key)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {sortedDatasets.map((ds) => {
                    const srcName =
                      typeof ds.source === "object" && ds.source !== null
                        ? (ds.source as { name?: string }).name ?? t("changelogNa")
                        : typeof ds.source === "string"
                        ? ds.source
                        : t("changelogNa");
                    return (
                      <tr
                        key={ds.id}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                      >
                        <td className="px-3 py-2 font-mono text-xs text-violet-700 dark:text-violet-300 whitespace-nowrap">
                          {ds.id}
                        </td>
                        <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                          {ds.asOf ?? t("changelogNa")}
                        </td>
                        <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                          {formatDate(ds.generatedAt)}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-zinc-500 dark:text-zinc-500">
                          {ds.version ?? t("changelogNa")}
                        </td>
                        <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400 text-right">
                          {ds.rows != null ? ds.rows.toLocaleString() : t("changelogNa")}
                        </td>
                        <td className="px-3 py-2 text-zinc-500 dark:text-zinc-500 text-xs max-w-[240px] truncate">
                          {srcName}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Reveal>
      </section>

      {/* ─── DOWNLOAD ────────────────────────────────────────────────────── */}
      <section
        aria-labelledby="methodology-download"
        className="space-y-6"
        data-testid="section-download"
      >
        <Reveal>
          <SectionHeading id="methodology-download">
            {t("downloadHeading")}
          </SectionHeading>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {t("downloadSubhead")}
          </p>
        </Reveal>

        {/* Cleared downloads */}
        <Reveal delay={100}>
          <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
            {t("downloadClearedHeading")}
          </h3>
          <div className="mt-3 space-y-3" data-testid="cleared-downloads">
            {clearedDownloads.map((dl) => {
              const href = `${basePath}${dl.publicPath ?? `/data/${dl.filename}`}`;
              return (
                <div
                  key={dl.id}
                  className="rounded-lg border border-green-200 dark:border-green-700/40 bg-green-50 dark:bg-green-900/10 p-4 flex flex-col sm:flex-row sm:items-start gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                      {dl.label}
                      {dl.sizeNote && (
                        <span className="ml-2 text-xs font-normal text-zinc-400">
                          {t("downloadSizeNote", { size: dl.sizeNote })}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="font-medium">{t("downloadLicenseLabel")}</span>{" "}
                      {dl.license}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="font-medium">{t("downloadAttributionLabel")}</span>{" "}
                      {dl.attribution}
                    </p>
                  </div>
                  <a
                    href={href}
                    download={dl.filename}
                    className="shrink-0 inline-flex items-center gap-1.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-400 px-3 py-1.5 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    {t("downloadClearedLabel")}
                  </a>
                </div>
              );
            })}
          </div>
        </Reveal>

        {/* Flagged / restricted */}
        <Reveal delay={150}>
          <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
            {t("downloadFlaggedHeading")}
          </h3>
          <div className="mt-3 space-y-2" data-testid="flagged-downloads">
            {flaggedDownloads.map((dl) => (
              <div
                key={dl.id}
                className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2"
                data-testid={`flagged-${dl.id}`}
              >
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {dl.label}
                  </span>
                  <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                    {t("downloadUnavailableReason")} {dl.reason}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="inline-flex items-center text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/30 px-2 py-0.5 rounded-full">
                    {t("downloadUnavailable")}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-zinc-400">
            {t("downloadComplianceLink")}:{" "}
            <a
              href="https://github.com/huangyingting/FutureGrid/blob/main/data/COMPLIANCE.md"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              data/COMPLIANCE.md
            </a>
          </p>
        </Reveal>
      </section>
    </div>
  );
}
