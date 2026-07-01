"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { getHighExposureOccupations, getReskillingPaths, type ReskillSort } from "@/lib/data";
import { colorForRisk, formatCurrency } from "@/lib/utils";
import Reveal from "@/components/ui/Reveal";
import { useT } from "@/lib/i18n/useT";

const PREFERRED_DEFAULTS = ["Data Entry", "Customer Service", "Telemarket"];

const OUTLOOK_STYLES: Record<string, string> = {
  Growing:  "bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/40",
  Stable:   "bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700/40",
  Declining:"bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700/40",
};

export default function ReskillExplorer() {
  const t = useT("skills");
  const highExposure = useMemo(() => getHighExposureOccupations(30), []);

  const defaultCode = useMemo(() => {
    for (const fragment of PREFERRED_DEFAULTS) {
      const found = highExposure.find((o) =>
        o.occupationName.toLowerCase().includes(fragment.toLowerCase()),
      );
      if (found) return found.occupationCode;
    }
    return highExposure[0]?.occupationCode ?? "";
  }, [highExposure]);

  const [fromCode, setFromCode] = useState<string>(defaultCode);
  const [search, setSearch]     = useState("");
  const [open, setOpen]         = useState(false);
  const containerRef            = useRef<HTMLDivElement>(null);
  const [sort, setSort]         = useState<ReskillSort>("score");

  // Close dropdown on outside click / Escape
  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouse);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouse);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return highExposure;
    return highExposure.filter(
      (o) =>
        o.occupationName.toLowerCase().includes(q) ||
        o.sectorName.toLowerCase().includes(q),
    );
  }, [highExposure, search]);

  const selected = highExposure.find((o) => o.occupationCode === fromCode);
  const targets  = useMemo(
    () => (fromCode ? getReskillingPaths(fromCode, 6, sort) : []),
    [fromCode, sort],
  );

  function scoreTone(s: number): string {
    return s >= 70
      ? "text-emerald-600 dark:text-emerald-400"
      : s >= 50
      ? "text-amber-600 dark:text-amber-400"
      : "text-zinc-500 dark:text-zinc-400";
  }
  function fmtDelta(d: number): string {
    const sign = d > 0 ? "+" : d < 0 ? "−" : "";
    const abs = Math.abs(d);
    return `${sign}${abs >= 1000 ? `$${Math.round(abs / 1000)}k` : `$${abs}`}`;
  }

  return (
    <section className="space-y-6" aria-labelledby="reskill-heading">
      {/* Section header */}
      <div>
        <h2 id="reskill-heading" className="text-2xl font-bold tracking-tight text-gradient">
          {t("reskillingPathways")}
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1 text-sm max-w-2xl">
          {t("reskillingSubhead")}{" "}
          <Link
            href="/sources"
            className="text-violet-400 underline underline-offset-2 hover:text-violet-300 transition-colors"
          >
            {t("viewSources")}
          </Link>
          .
        </p>
        <p className="text-zinc-500 dark:text-zinc-500 mt-1.5 text-xs max-w-2xl">
          {t("reskillingSubhead2")}
        </p>
      </div>

      {/* From picker */}
      <div className="space-y-2">
        <label
          htmlFor="reskill-from-btn"
          className="text-xs font-semibold uppercase tracking-wider text-zinc-500"
        >
          {t("yourCurrentRole")}
        </label>

        <div ref={containerRef} className="relative w-full max-w-md">
          <button
            id="reskill-from-btn"
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls="reskill-listbox"
            className="w-full flex items-center justify-between gap-2 glass bg-white/70 dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white hover:border-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
          >
            <span className="truncate">
              {selected ? selected.occupationName : t("selectOccupation")}
            </span>
            <svg
              className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {open && (
            <div
              id="reskill-listbox"
              role="listbox"
              aria-label="Select occupation"
              className="absolute z-50 top-full mt-1 w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl shadow-2xl overflow-hidden"
            >
              {/* Search input */}
              <div className="p-2 border-b border-zinc-200 dark:border-zinc-800">
                <input
                  type="search"
                  placeholder={t("searchOccupations")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  autoFocus
                />
              </div>

              <ul className="max-h-64 overflow-y-auto divide-y divide-zinc-200 dark:divide-zinc-800/40">
                {filtered.map((o) => (
                  <li key={o.occupationCode} role="option" aria-selected={o.occupationCode === fromCode}>
                    <button
                      type="button"
                      onClick={() => {
                        setFromCode(o.occupationCode);
                        setOpen(false);
                        setSearch("");
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:bg-zinc-100 dark:focus:bg-zinc-800 focus:outline-none transition-colors ${
                        o.occupationCode === fromCode
                          ? "text-violet-300 font-medium"
                          : "text-zinc-700 dark:text-zinc-200"
                      }`}
                    >
                      <span className="block">{o.occupationName}</span>
                      <span className="text-xs text-zinc-500">
                        {o.sectorName} · {t("aiExposureDropdownLabel", { pct: (o.aiExposure * 100).toFixed(0) })}
                      </span>
                    </button>
                  </li>
                ))}
                {filtered.length === 0 && (
                  <li className="px-4 py-3 text-sm text-zinc-500">{t("noOccupationsFoundDropdown")}</li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Sort control */}
      {targets.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-500 mr-1">{t("sortLabel")}</span>
          {(
            [
              ["score", t("sortScore")],
              ["safety", t("sortSafety")],
              ["pay", t("sortPay")],
              ["growth", t("sortGrowth")],
            ] as [ReskillSort, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSort(key)}
              aria-pressed={sort === key}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 ${
                sort === key
                  ? "bg-violet-600 text-white"
                  : "glass bg-white/60 dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Target cards */}
      {targets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {targets.map((path, i) => {
            const riskColor    = colorForRisk(path.automationRisk);
            const outlookClass = OUTLOOK_STYLES[path.outlook] ?? "bg-zinc-100 dark:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/40";
            const retrain =
              path.jobZoneDelta <= 0
                ? { label: t("retrainSimilar"), tone: "text-emerald-600 dark:text-emerald-400" }
                : path.jobZoneDelta === 1
                ? { label: t("retrainOneLevel"), tone: "text-amber-600 dark:text-amber-400" }
                : { label: t("retrainMore", { n: String(path.jobZoneDelta) }), tone: "text-red-500 dark:text-red-400" };
            return (
              <Reveal key={path.occupationCode} delay={i * 60}>
                <Link
                  href={`/careers/${path.occupationCode}`}
                  className="block glass glass-hover bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 group focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all h-full"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 pr-2">
                      <h3 className="font-semibold text-zinc-900 dark:text-white text-sm leading-snug group-hover:text-cyan-300 transition-colors">
                        {path.occupationName}
                      </h3>
                      <p className="text-xs text-zinc-500 mt-0.5">{path.sectorName}</p>
                    </div>
                    <span
                      className="shrink-0 px-2 py-0.5 rounded text-xs font-semibold"
                      style={{ backgroundColor: `${riskColor}22`, color: riskColor }}
                    >
                      {path.automationRisk}
                    </span>
                  </div>

                  {/* Transition metrics */}
                  <div className="grid grid-cols-4 gap-1 mb-3">
                    <div className="text-center">
                      <div className={`text-sm font-bold tabular-nums ${scoreTone(path.transitionScore)}`}>
                        {path.transitionScore}
                      </div>
                      <div className="text-[9px] uppercase tracking-wide text-zinc-500">{t("scoreLabel")}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                        −{path.exposureDropPts.toFixed(0)}
                      </div>
                      <div className="text-[9px] uppercase tracking-wide text-zinc-500">{t("metricExposure")}</div>
                    </div>
                    <div className="text-center">
                      <div
                        className={`text-sm font-bold tabular-nums ${
                          path.salaryDelta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
                        }`}
                      >
                        {fmtDelta(path.salaryDelta)}
                      </div>
                      <div className="text-[9px] uppercase tracking-wide text-zinc-500">{t("metricPay")}</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-[11px] font-semibold leading-tight ${retrain.tone}`}>{retrain.label}</div>
                      <div className="text-[9px] uppercase tracking-wide text-zinc-500">{t("metricRetrain")}</div>
                    </div>
                  </div>

                  {/* Salary + outlook + growth + AI exposure row */}
                  <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
                    <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                      {formatCurrency(path.medianSalary)}
                      <span className="text-zinc-600">{t("perYear")}</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded font-medium ${outlookClass}`}>{path.outlook}</span>
                    {path.growthRate != null && (
                      <span
                        className={`font-medium ${
                          path.growthRate >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
                        }`}
                      >
                        {path.growthRate >= 0 ? "+" : ""}
                        {path.growthRate}%/yr
                      </span>
                    )}
                    <span className="ml-auto text-zinc-500">
                      AI <span className="text-zinc-700 dark:text-zinc-300 font-medium">{(path.aiExposure * 100).toFixed(0)}%</span>
                    </span>
                  </div>

                  {/* Skills that transfer */}
                  <div className="space-y-1 mb-2">
                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      {t("skillsTransfer")} · {path.sharedCount}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {path.sharedSkills.slice(0, 5).map((s) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/25 border border-emerald-200 dark:border-emerald-700/30 text-emerald-700 dark:text-emerald-300 text-xs"
                        >
                          {s}
                        </span>
                      ))}
                      {path.sharedSkills.length > 5 && (
                        <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-xs">
                          {t("moreSkillsLabel", { n: String(path.sharedSkills.length - 5) })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Skills to build */}
                  {path.missingSkills.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-amber-600 dark:text-amber-400">{t("skillsToBuild")}</p>
                      <div className="flex flex-wrap gap-1">
                        {path.missingSkills.slice(0, 4).map((s) => (
                          <span
                            key={s}
                            className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 text-amber-700 dark:text-amber-300 text-xs"
                          >
                            {s}
                          </span>
                        ))}
                        {path.missingSkills.length > 4 && (
                          <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-xs">
                            {t("moreSkillsLabel", { n: String(path.missingSkills.length - 4) })}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </Link>
              </Reveal>
            );
          })}
        </div>
      ) : fromCode ? (
        <div className="glass bg-white/70 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl py-10 flex items-center justify-center">
          <p className="text-zinc-500 text-sm">{t("noReskillingPaths")}</p>
        </div>
      ) : null}
    </section>
  );
}
