"use client";

import { useState } from "react";
import {
  generateAllCareerInsights,
  getCountryMapData,
  getDataSources,
} from "@/lib/data";
import type { CareerInsight, CountryMapDatum, DataSource } from "@/lib/data";
import { useT } from "@/lib/i18n/useT";
import GuardrailBadge, { type GuardrailBadgeKind } from "@/components/ui/GuardrailBadge";

// ─── Types ────────────────────────────────────────────────────────────────────

type DatasetKey = "occupations" | "countries" | "sources";
type Format = "json" | "csv";

// ─── CSV helpers ──────────────────────────────────────────────────────────────

function csvEscape(val: unknown): string {
  const s = val == null ? "" : String(val);
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => csvEscape(row[h])).join(",")),
  ].join("\n");
}

// ─── Download trigger — must only run inside a user event handler ─────────────

function triggerDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Data builders ────────────────────────────────────────────────────────────

const EXPORT_YEAR = 2025;

function buildJson(key: DatasetKey): string {
  switch (key) {
    case "occupations":
      return JSON.stringify(generateAllCareerInsights(), null, 2);
    case "countries":
      return JSON.stringify(getCountryMapData(), null, 2);
    case "sources":
      return JSON.stringify(getDataSources(), null, 2);
  }
}

function buildCsv(key: DatasetKey): string {
  switch (key) {
    case "occupations": {
      const rows = generateAllCareerInsights().map((o: CareerInsight) => ({
        occupationCode: o.occupationCode,
        occupationName: o.occupationName,
        automationRisk: o.automationRisk,
        automationProbability: o.automationProbability,
        growthRate: o.growthRate,
        medianSalary: o.medianSalary,
        totalEmployment: o.totalEmployment,
        projectedOpenings: o.projectedOpenings,
        outlook: o.outlook,
        sectorName: o.sectorName,
      }));
      return toCsv(rows as Record<string, unknown>[]);
    }
    case "countries": {
      const rows = getCountryMapData().map((c: CountryMapDatum) => ({
        iso3: c.iso3,
        name: c.name,
        usageIndex: c.usageIndex,
        usagePct: c.usagePct,
        hasClaudeData: c.hasClaudeData,
        proxyNote: c.proxyNote,
        diffusionPct: c.diffusionPct,
        diffusionDelta: c.diffusionDelta,
        aiReadiness: c.aiReadiness,
        governmentReadiness: c.governmentReadiness,
      }));
      return toCsv(rows as Record<string, unknown>[]);
    }
    case "sources": {
      const { sources } = getDataSources();
      const rows = sources.map((s: DataSource) => ({
        name: s.name,
        publisher: s.publisher,
        year: s.year,
        url: s.url,
        license: s.license,
        usedFor: s.usedFor,
      }));
      return toCsv(rows as Record<string, unknown>[]);
    }
  }
}

// ─── DatasetRow sub-component ─────────────────────────────────────────────────

interface DatasetRowProps {
  label: string;
  description: string;
  guardrailKind: GuardrailBadgeKind;
  dataKey: DatasetKey;
  downloading: string | null;
  onDownload: (key: DatasetKey, fmt: Format) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

function DatasetRow({
  label,
  description,
  guardrailKind,
  dataKey,
  downloading,
  onDownload,
  t,
}: DatasetRowProps) {
  const csvId = `${dataKey}-csv`;
  const jsonId = `${dataKey}-json`;
  const isCsvBusy = downloading === csvId;
  const isJsonBusy = downloading === jsonId;
  const isAnyBusy = isCsvBusy || isJsonBusy;

  const btnBase =
    "h-7 px-3 rounded-md text-xs font-medium border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 " +
    "bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 " +
    "text-zinc-700 dark:text-zinc-300 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 " +
    "disabled:opacity-40 disabled:cursor-wait";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 border-t border-zinc-200 dark:border-zinc-800 first:border-t-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
          {label}
        </p>
        <div className="mt-1">
          <GuardrailBadge kind={guardrailKind} />
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
          {description}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onDownload(dataKey, "csv")}
          disabled={isAnyBusy}
          aria-label={t("ariaDownload", { dataset: label, format: "CSV" })}
          aria-busy={isCsvBusy}
          className={btnBase}
        >
          {isCsvBusy ? t("btnDownloading") : t("btnCsv")}
        </button>
        <button
          type="button"
          onClick={() => onDownload(dataKey, "json")}
          disabled={isAnyBusy}
          aria-label={t("ariaDownload", { dataset: label, format: "JSON" })}
          aria-busy={isJsonBusy}
          className={btnBase}
        >
          {isJsonBusy ? t("btnDownloading") : t("btnJson")}
        </button>
      </div>
    </div>
  );
}

// ─── Main export component ────────────────────────────────────────────────────

const DATASETS: {
  key: DatasetKey;
  labelKey: string;
  descKey: string;
  guardrailKind: GuardrailBadgeKind;
}[] = [
  {
    key: "occupations",
    labelKey: "datasetOccupations",
    descKey: "datasetOccupationsDesc",
    guardrailKind: "descriptive",
  },
  {
    key: "countries",
    labelKey: "datasetCountries",
    descKey: "datasetCountriesDesc",
    guardrailKind: "proxy",
  },
  {
    key: "sources",
    labelKey: "datasetSources",
    descKey: "datasetSourcesDesc",
    guardrailKind: "observed",
  },
];

export default function DataExport() {
  const t = useT("dataexport");

  const [downloading, setDownloading] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  function handleDownload(key: DatasetKey, fmt: Format) {
    const id = `${key}-${fmt}`;
    setDownloading(id);

    const ext = fmt === "json" ? "json" : "csv";
    const mime =
      fmt === "json" ? "application/json" : "text/csv;charset=utf-8";
    const filename = `futuregrid-${key}-${EXPORT_YEAR}.${ext}`;
    const content = fmt === "json" ? buildJson(key) : buildCsv(key);

    triggerDownload(content, filename, mime);
    setAnnouncement(
      t("srAnnounce", { dataset: key, format: fmt.toUpperCase() }),
    );

    setTimeout(() => {
      setDownloading(null);
      setAnnouncement("");
    }, 1000);
  }

  return (
    <section
      aria-labelledby="data-export-heading"
      className="glass p-6 rounded-xl"
    >
      {/* Polite live region for screen-reader download announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <div className="mb-4">
        <h2
          id="data-export-heading"
          className="text-lg font-semibold text-zinc-900 dark:text-white"
        >
          {t("panelTitle")}
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          {t("panelDesc")}
        </p>
      </div>

      <div>
        {DATASETS.map(({ key, labelKey, descKey, guardrailKind }) => (
          <DatasetRow
            key={key}
            label={t(labelKey)}
            description={t(descKey)}
            guardrailKind={guardrailKind}
            dataKey={key}
            downloading={downloading}
            onDownload={handleDownload}
            t={t}
          />
        ))}
      </div>

      <p className="mt-4 text-[11px] text-zinc-400 dark:text-zinc-500 leading-snug">
        {t("footerNote")}
      </p>
    </section>
  );
}
