"use client";

import Link from "next/link";
import { useId } from "react";
import type { AdoptionSignalsDataset, SignalPanel, SignalValue } from "@/lib/adoption-signals";
import { useT } from "@/lib/i18n/useT";

type ModelMeta = {
  id?: string;
  modelId?: string;
  name?: string;
  label?: string;
  value?: number;
  downloads?: number;
  count?: number;
  formattedValue?: string;
};

type SignalMeta = Record<string, unknown>;

type Translator = ReturnType<typeof useT>;

function metaOf(value: SignalValue): SignalMeta {
  return value.meta && typeof value.meta === "object" ? (value.meta as SignalMeta) : {};
}

function numeric(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function displayValue(value: SignalValue) {
  return value.formattedValue;
}

function placeLabel(value: SignalValue) {
  return value.geography ? `${value.label} · ${value.geography}` : value.label;
}

function PanelShell({ panel, t, children }: { panel: SignalPanel; t: Translator; children: React.ReactNode }) {
  const title = t(panel.titleKey);
  return (
    <article className="glass flex h-full flex-col rounded-2xl p-5 sm:p-6" aria-labelledby={`${panel.id}-heading`}>
      <div className="flex flex-1 flex-col">
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-violet-500 dark:text-violet-300">
            {panel.family}
          </p>
          <h3 id={`${panel.id}-heading`} className="mt-1 text-lg font-bold leading-tight text-zinc-900 dark:text-white">
            {title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {t(panel.descriptionKey)}
          </p>
        </div>

        <div className="flex-1">{children}</div>

        <div className="mt-5 space-y-2 border-t border-zinc-200 pt-4 text-xs leading-relaxed text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          <p>
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">{t("adoptionSignalsSourceLabel")}</span>{" "}
            {panel.sourceSummary}
          </p>
          <p>
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">{t("adoptionSignalsPeriodLabel")}</span>{" "}
            {panel.periodSummary}
          </p>
          {panel.caveat && (
            <p>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">{t("adoptionSignalsCaveatLabel")}</span>{" "}
              {panel.caveat}
            </p>
          )}
          <Link
            href="/sources"
            className="inline-flex rounded-full text-violet-600 underline underline-offset-4 transition-colors hover:text-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 dark:text-violet-300 dark:hover:text-violet-200"
          >
            {t("adoptionSignalsViewSources")}
          </Link>
        </div>
      </div>
    </article>
  );
}

function BarListPanel({ panel, t }: { panel: SignalPanel; t: Translator }) {
  const values = [...panel.values].sort((a, b) => b.value - a.value);
  const max = Math.max(...values.map((value) => Math.max(0, value.value)), 1);

  return (
    <div className="space-y-4">
      <ol className="space-y-3" aria-label={t("adoptionSignalsBarListAria", { title: t(panel.titleKey) })}>
        {values.map((value) => {
          const width = `${Math.max(3, Math.min(100, (Math.max(0, value.value) / max) * 100))}%`;
          return (
            <li key={value.id} className="space-y-1.5">
              <div className="flex items-start justify-between gap-3 text-xs">
                <span className="min-w-0 font-medium leading-snug text-zinc-700 dark:text-zinc-300">{placeLabel(value)}</span>
                <span className="shrink-0 font-bold tabular-nums text-violet-600 dark:text-violet-300">{displayValue(value)}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-800" aria-hidden="true">
                <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width }} />
              </div>
            </li>
          );
        })}
      </ol>

      {panel.benchmarks && panel.benchmarks.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label={t("adoptionSignalsBenchmarksLabel")}>
          {panel.benchmarks.map((benchmark) => (
            <span key={benchmark.id} className="rounded-full border border-zinc-200 bg-white/65 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
              {benchmark.label}: <span className="tabular-nums">{displayValue(benchmark)}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function KpiGridPanel({ panel }: { panel: SignalPanel }) {
  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {panel.values.map((value) => (
        <div key={value.id} className="rounded-2xl border border-zinc-200 bg-white/60 p-4 dark:border-zinc-800 dark:bg-zinc-950/35">
          <dt className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">{placeLabel(value)}</dt>
          <dd className="mt-1 text-2xl font-extrabold text-gradient tabular-nums">{displayValue(value)}</dd>
          <dd className="mt-1 text-[11px] text-zinc-500">{value.period}</dd>
        </div>
      ))}
    </dl>
  );
}

function StackedSharePanel({ panel, t }: { panel: SignalPanel; t: Translator }) {
  const total = panel.values.reduce((sum, value) => sum + Math.max(0, value.value), 0);
  const max = total > 0 && total <= 100 ? 100 : Math.max(total, 1);

  return (
    <div className="space-y-4" aria-label={t("adoptionSignalsStackedShareAria", { title: t(panel.titleKey) })}>
      <div className="flex h-4 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800" aria-hidden="true">
        {panel.values.map((value) => {
          const width = `${Math.max(2, (Math.max(0, value.value) / max) * 100)}%`;
          return <span key={value.id} className="h-full odd:bg-violet-500 even:bg-cyan-400" style={{ width }} />;
        })}
      </div>
      <dl className="space-y-2">
        {panel.values.map((value) => (
          <div key={value.id} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white/55 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950/35">
            <dt className="text-xs text-zinc-700 dark:text-zinc-300">{placeLabel(value)}</dt>
            <dd className="text-xs font-bold tabular-nums text-zinc-900 dark:text-white">{displayValue(value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ProviderModelsPanel({ panel, t }: { panel: SignalPanel; t: Translator }) {
  return (
    <div className="space-y-3">
      {panel.values.map((provider) => {
        const meta = metaOf(provider);
        const rawModels = [meta.models, meta.topModels, meta.entries].find(Array.isArray) as ModelMeta[] | undefined;
        const models = rawModels ?? [];
        const max = Math.max(...models.map((model) => numeric(model.value ?? model.downloads ?? model.count) ?? 0), 1);

        return (
          <div key={provider.id} className="rounded-2xl border border-zinc-200 bg-white/60 p-4 dark:border-zinc-800 dark:bg-zinc-950/35">
            <div className="mb-3 flex items-start justify-between gap-3">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">{provider.label}</h4>
              <span className="shrink-0 text-sm font-bold tabular-nums text-violet-600 dark:text-violet-300">{displayValue(provider)}</span>
            </div>
            {models.length > 0 ? (
              <ol className="space-y-2" aria-label={t("adoptionSignalsProviderModelsAria", { provider: provider.label })}>
                {models.slice(0, 5).map((model, index) => {
                  const modelValue = numeric(model.value ?? model.downloads ?? model.count) ?? 0;
                  const label = model.label ?? model.name ?? model.modelId ?? model.id ?? `${t("adoptionSignalsModelLabel")} ${index + 1}`;
                  const formatted = model.formattedValue ?? String(modelValue);
                  return (
                    <li key={`${provider.id}-${label}`} className="space-y-1">
                      <div className="flex justify-between gap-2 text-[11px]">
                        <span className="truncate text-zinc-600 dark:text-zinc-400">{label}</span>
                        <span className="shrink-0 font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">{formatted}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800" aria-hidden="true">
                        <div className="h-full rounded-full bg-cyan-400" style={{ width: `${Math.max(4, Math.min(100, (modelValue / max) * 100))}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="text-xs text-zinc-500">{provider.period}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function RepoKpisPanel({ panel, t }: { panel: SignalPanel; t: Translator }) {
  return (
    <div className="space-y-3">
      {panel.values.map((repo) => {
        const meta = metaOf(repo);
        const stars = numeric(meta.stars);
        const forks = numeric(meta.forks);
        const openIssues = numeric(meta.openIssues);
        const updated = typeof meta.updatedAt === "string" ? meta.updatedAt : repo.period;
        const kpis = [
          { key: "stars", label: t("adoptionSignalsStars"), value: typeof meta.formattedStars === "string" ? meta.formattedStars : stars?.toLocaleString() },
          { key: "forks", label: t("adoptionSignalsForks"), value: typeof meta.formattedForks === "string" ? meta.formattedForks : forks?.toLocaleString() },
          {
            key: "openIssues",
            label: t("adoptionSignalsOpenIssues"),
            value: typeof meta.formattedOpenIssues === "string" ? meta.formattedOpenIssues : openIssues?.toLocaleString(),
          },
          { key: "updated", label: t("adoptionSignalsUpdated"), value: updated ? String(updated).slice(0, 10) : undefined },
        ].filter((kpi) => kpi.value);

        return (
          <div key={repo.id} className="rounded-2xl border border-zinc-200 bg-white/60 p-4 dark:border-zinc-800 dark:bg-zinc-950/35">
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">{repo.label}</h4>
            {kpis.length > 0 ? (
              <dl className="mt-3 grid grid-cols-2 gap-2">
                {kpis.map((kpi) => (
                  <div key={kpi.key} className="rounded-xl bg-zinc-100/70 px-3 py-2 dark:bg-zinc-900/70">
                    <dt className="text-[10px] uppercase tracking-widest text-zinc-500">{kpi.label}</dt>
                    <dd className="mt-0.5 text-sm font-bold tabular-nums text-zinc-900 dark:text-white">{kpi.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-2 text-2xl font-extrabold text-gradient tabular-nums">{displayValue(repo)}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FutureSourcesPanel({ panel, t }: { panel: SignalPanel; t: Translator }) {
  return (
    <div className="rounded-2xl border border-dashed border-cyan-400/35 bg-cyan-500/10 p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-cyan-700 dark:text-cyan-300">
        {t("adoptionSignalsFutureSources")}
      </p>
      <details className="mt-3 group" open>
        <summary className="cursor-pointer rounded-lg text-sm font-semibold text-zinc-800 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 dark:text-zinc-100">
          {t("adoptionSignalsFutureSourcesSummary", { count: panel.values.length })}
        </summary>
        <ul className="mt-3 flex flex-wrap gap-2">
          {panel.values.map((source) => (
            <li key={source.id}>
              <span className="inline-flex rounded-full border border-zinc-200 bg-white/70 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/45 dark:text-zinc-300">
                {source.label}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function PanelBody({ panel, t }: { panel: SignalPanel; t: Translator }) {
  switch (panel.kind) {
    case "bar-list":
      return <BarListPanel panel={panel} t={t} />;
    case "kpi-grid":
      return <KpiGridPanel panel={panel} />;
    case "stacked-share":
      return <StackedSharePanel panel={panel} t={t} />;
    case "provider-models":
      return <ProviderModelsPanel panel={panel} t={t} />;
    case "repo-kpis":
      return <RepoKpisPanel panel={panel} t={t} />;
    case "future-sources":
      return <FutureSourcesPanel panel={panel} t={t} />;
    default:
      return <BarListPanel panel={panel} t={t} />;
  }
}

export default function AIAdoptionSignals({ dataset }: { dataset: AdoptionSignalsDataset }) {
  const t = useT("global");
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="space-y-6">
      <div className="glass p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-500 dark:text-violet-300">
              {t("adoptionSignalsEyebrow")}
            </p>
            <h2 id={headingId} className="mt-1 text-2xl font-extrabold tracking-tight text-gradient sm:text-3xl">
              {t("adoptionSignalsTitle")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {t("adoptionSignalsSubtitle")}
            </p>
            <p className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              <span className="font-semibold text-amber-700 dark:text-amber-300">{t("adoptionSignalsCaveatLabel")}</span>{" "}
              {dataset.caveat}
            </p>
          </div>

          <dl className="grid min-w-0 gap-3 sm:grid-cols-3 lg:w-[28rem] lg:grid-cols-1">
            <div className="rounded-2xl border border-zinc-200 bg-white/55 p-4 dark:border-zinc-800 dark:bg-zinc-950/35">
              <dt className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{t("adoptionSignalsCollectedFamilies")}</dt>
              <dd className="mt-1 text-2xl font-extrabold text-gradient tabular-nums">{dataset.coverage.collectedFamilies.length}</dd>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white/55 p-4 dark:border-zinc-800 dark:bg-zinc-950/35">
              <dt className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{t("adoptionSignalsVisualizedFamilies")}</dt>
              <dd className="mt-1 text-2xl font-extrabold text-gradient tabular-nums">{dataset.coverage.visualizedFamilies.length}</dd>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white/55 p-4 dark:border-zinc-800 dark:bg-zinc-950/35">
              <dt className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{t("adoptionSignalsFutureCatalogCount")}</dt>
              <dd className="mt-1 text-2xl font-extrabold text-gradient tabular-nums">{dataset.coverage.futureCatalogCount}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {dataset.panels.map((panel) => (
          <PanelShell key={panel.id} panel={panel} t={t}>
            <PanelBody panel={panel} t={t} />
          </PanelShell>
        ))}
      </div>
    </section>
  );
}
