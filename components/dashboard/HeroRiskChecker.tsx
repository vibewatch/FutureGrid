"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import RiskGauge from "@/components/ui/RiskGauge";
import { searchInsights, computeResiliencyScore } from "@/lib/data";
import { colorForRisk, formatCurrency } from "@/lib/utils";
import type { CareerInsight } from "@/lib/data";

// ── Sub-component ─────────────────────────────────────────────────────────────

function StatBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="glass rounded-lg px-3 py-2">
      <p className="text-[10px] text-zinc-500 uppercase tracking-widest leading-none">{label}</p>
      <p className="font-semibold text-sm mt-1 leading-tight" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function HeroRiskChecker() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CareerInsight[]>([]);
  const [selected, setSelected] = useState<CareerInsight | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef     = useRef<HTMLInputElement>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cancel blur timer on unmount
  useEffect(() => {
    return () => {
      if (blurTimerRef.current !== null) clearTimeout(blurTimerRef.current);
    };
  }, []);

  // Preload a well-known example — deferred to satisfy react-hooks/set-state-in-effect
  useEffect(() => {
    const id = setTimeout(() => {
      const defaults = searchInsights("software", 1);
      if (defaults.length > 0) setSelected(defaults[0]);
    }, 0);
    return () => clearTimeout(id);
  }, []); // stable on mount

  // Live search — runs in the onChange handler, no effect needed
  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    if (!value.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    const found = searchInsights(value, 6);
    setResults(found);
    setShowDropdown(found.length > 0);
    setActiveIndex(-1);
  }, []);

  const pick = useCallback((insight: CareerInsight) => {
    setSelected(insight);
    setQuery("");
    setShowDropdown(false);
    setActiveIndex(-1);
  }, []);

  const riskValue = selected ? Math.round(selected.automationProbability * 100) : 0;
  const resiliency = selected ? computeResiliencyScore(selected.automationProbability) : 0;
  const riskColor = selected ? colorForRisk(selected.automationRisk) : "#6b7280";

  const truncateName = (name: string, max = 22) =>
    name.length > max ? name.slice(0, max) + "…" : name;

  return (
    <div className="glass rounded-2xl p-6 sm:p-8 max-w-3xl">
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
        AI Exposure Checker
      </p>

      {/* ── Search input ─────────────────────────────────────────────────── */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (!showDropdown || results.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIndex((i) => Math.min(i + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && activeIndex >= 0) {
              e.preventDefault();
              pick(results[activeIndex]);
            } else if (e.key === "Escape") {
              setShowDropdown(false);
            }
          }}
          onFocus={() => {
            if (query.trim() && results.length > 0) setShowDropdown(true);
          }}
          onBlur={() => {
            if (blurTimerRef.current !== null) clearTimeout(blurTimerRef.current);
            blurTimerRef.current = setTimeout(() => setShowDropdown(false), 160);
          }}
          placeholder="Search an occupation to see its AI exposure…"
          role="combobox"
          aria-label="Search occupations to check AI exposure"
          aria-haspopup="listbox"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          aria-controls="rc-listbox"
          aria-activedescendant={activeIndex >= 0 ? `rc-opt-${activeIndex}` : undefined}
          className="w-full bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-700/50 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 rounded-xl px-4 py-3 pr-10 text-sm outline-none transition-all"
        />
        <span
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 select-none pointer-events-none text-lg"
          aria-hidden="true"
        >
          ⌕
        </span>

        {showDropdown && (
          <ul
            id="rc-listbox"
            role="listbox"
            aria-label="Matching occupations"
            className="absolute z-50 left-0 right-0 top-full mt-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-950 backdrop-blur-xl overflow-hidden shadow-xl"
          >
            {results.map((r, i) => (
              <li
                key={r.occupationCode}
                id={`rc-opt-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                onMouseDown={() => pick(r)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex items-center justify-between px-4 py-2.5 cursor-pointer text-sm select-none transition-colors ${
                  i === activeIndex
                    ? "bg-violet-100 dark:bg-violet-600/20 text-zinc-900 dark:text-white"
                    : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                }`}
              >
                <span className="truncate font-medium">{r.occupationName}</span>
                <span className="shrink-0 ml-3 flex items-center gap-2 text-xs">
                  <span className="text-zinc-500 hidden sm:inline truncate max-w-[120px]">
                    {r.sectorName}
                  </span>
                  <span
                    className="px-1.5 py-0.5 rounded font-semibold text-[11px]"
                    style={{
                      color: colorForRisk(r.automationRisk),
                      background: colorForRisk(r.automationRisk) + "22",
                    }}
                  >
                    {Math.round(r.automationProbability * 100)}%
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Result panel ─────────────────────────────────────────────────── */}
      {selected && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-6 items-start animate-fade-in">
          <div className="flex justify-center sm:justify-start">
            <RiskGauge
              value={riskValue}
              size={160}
              label={truncateName(selected.occupationName)}
              sublabel={selected.sectorName}
            />
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="text-zinc-900 dark:text-white font-semibold text-base leading-tight">
                {selected.occupationName}
              </h3>
              <p className="text-zinc-500 text-sm mt-0.5">{selected.sectorName}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <StatBadge label="Exposure band" value={selected.automationRisk} color={riskColor} />
              <StatBadge label="Resiliency" value={`${resiliency}/100`} color="#8b5cf6" />
              <StatBadge
                label="Outlook"
                value={selected.outlook === "Bright" ? "Bright ↗" : "Average"}
                color={selected.outlook === "Bright" ? "#22c55e" : "#6b7280"}
              />
              <StatBadge
                label="Median salary"
                value={formatCurrency(selected.medianSalary)}
                color="#f59e0b"
              />
            </div>
            {selected.projectedOpenings != null && (
              <p className="text-xs text-zinc-500 mt-1">
                Projected annual openings:{" "}
                <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                  {selected.projectedOpenings.toLocaleString()}
                </span>
              </p>
            )}

            <p className="text-[11px] text-zinc-500 leading-snug">
              Estimated automation exposure for this occupation — not a personal forecast.
            </p>

            <Link
              href={`/careers/${selected.occupationCode}`}
              className="inline-flex items-center gap-1.5 text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
            >
              View full profile <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
