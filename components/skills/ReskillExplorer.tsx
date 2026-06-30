"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { getHighExposureOccupations, getReskillingPaths } from "@/lib/data";
import { colorForRisk, formatCurrency } from "@/lib/utils";
import Reveal from "@/components/ui/Reveal";

const PREFERRED_DEFAULTS = ["Data Entry", "Customer Service", "Telemarket"];

const OUTLOOK_STYLES: Record<string, string> = {
  Growing:  "bg-emerald-900/40 text-emerald-300 border border-emerald-700/40",
  Stable:   "bg-blue-900/40 text-blue-300 border border-blue-700/40",
  Declining:"bg-red-900/40 text-red-300 border border-red-700/40",
};

export default function ReskillExplorer() {
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
    () => (fromCode ? getReskillingPaths(fromCode, 6) : []),
    [fromCode],
  );

  return (
    <section className="space-y-6" aria-labelledby="reskill-heading">
      {/* Section header */}
      <div>
        <h2 id="reskill-heading" className="text-2xl font-bold tracking-tight text-gradient">
          Reskilling Pathways
        </h2>
        <p className="text-zinc-400 mt-1 text-sm max-w-2xl">
          Roles with lower AI exposure that build on skills you already have (O*NET skill
          overlap). Not financial advice.{" "}
          <Link
            href="/sources"
            className="text-violet-400 underline underline-offset-2 hover:text-violet-300 transition-colors"
          >
            View sources
          </Link>
          .
        </p>
      </div>

      {/* From picker */}
      <div className="space-y-2">
        <label
          htmlFor="reskill-from-btn"
          className="text-xs font-semibold uppercase tracking-wider text-zinc-500"
        >
          Your current role (high AI exposure)
        </label>

        <div ref={containerRef} className="relative w-full max-w-md">
          <button
            id="reskill-from-btn"
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls="reskill-listbox"
            className="w-full flex items-center justify-between gap-2 glass bg-zinc-900/60 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white hover:border-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
          >
            <span className="truncate">
              {selected ? selected.occupationName : "Select an occupation…"}
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
              className="absolute z-50 top-full mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden"
            >
              {/* Search input */}
              <div className="p-2 border-b border-zinc-800">
                <input
                  type="search"
                  placeholder="Search occupations…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  autoFocus
                />
              </div>

              <ul className="max-h-64 overflow-y-auto divide-y divide-zinc-800/40">
                {filtered.map((o) => (
                  <li key={o.occupationCode} role="option" aria-selected={o.occupationCode === fromCode}>
                    <button
                      type="button"
                      onClick={() => {
                        setFromCode(o.occupationCode);
                        setOpen(false);
                        setSearch("");
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-zinc-800 focus:bg-zinc-800 focus:outline-none transition-colors ${
                        o.occupationCode === fromCode
                          ? "text-violet-300 font-medium"
                          : "text-zinc-200"
                      }`}
                    >
                      <span className="block">{o.occupationName}</span>
                      <span className="text-xs text-zinc-500">
                        {o.sectorName} · AI exposure {(o.aiExposure * 100).toFixed(0)}%
                      </span>
                    </button>
                  </li>
                ))}
                {filtered.length === 0 && (
                  <li className="px-4 py-3 text-sm text-zinc-500">No occupations found.</li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Target cards */}
      {targets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {targets.map((t, i) => {
            const riskColor    = colorForRisk(t.automationRisk);
            const outlookClass = OUTLOOK_STYLES[t.outlook] ?? "bg-zinc-800/40 text-zinc-300 border border-zinc-700/40";
            return (
              <Reveal key={t.occupationCode} delay={i * 60}>
                <Link
                  href={`/careers/${t.occupationCode}`}
                  className="block glass glass-hover bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 group focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all h-full"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 pr-2">
                      <h3 className="font-semibold text-white text-sm leading-snug group-hover:text-cyan-300 transition-colors">
                        {t.occupationName}
                      </h3>
                      <p className="text-xs text-zinc-500 mt-0.5">{t.sectorName}</p>
                    </div>
                    <span
                      className="shrink-0 px-2 py-0.5 rounded text-xs font-semibold"
                      style={{ backgroundColor: `${riskColor}22`, color: riskColor }}
                    >
                      {t.automationRisk}
                    </span>
                  </div>

                  {/* Salary + outlook + AI exposure row */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="text-xs text-zinc-300 font-medium">
                      {formatCurrency(t.medianSalary)}
                      <span className="text-zinc-600">/yr</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${outlookClass}`}>
                      {t.outlook}
                    </span>
                    <span className="ml-auto text-xs text-zinc-500">
                      AI{" "}
                      <span className="text-zinc-300 font-medium">
                        {(t.aiExposure * 100).toFixed(0)}%
                      </span>
                    </span>
                  </div>

                  {/* Shared skills */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-zinc-500">
                      <span className="text-emerald-400 font-semibold">{t.sharedCount}</span>{" "}
                      shared skill{t.sharedCount !== 1 ? "s" : ""}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {t.sharedSkills.slice(0, 6).map((s) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 rounded bg-emerald-900/25 border border-emerald-700/30 text-emerald-300 text-xs"
                        >
                          {s}
                        </span>
                      ))}
                      {t.sharedSkills.length > 6 && (
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-500 text-xs">
                          +{t.sharedSkills.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      ) : fromCode ? (
        <div className="glass bg-zinc-900/40 border border-zinc-800 rounded-xl py-10 flex items-center justify-center">
          <p className="text-zinc-500 text-sm">No reskilling paths found for this occupation.</p>
        </div>
      ) : null}
    </section>
  );
}
