"use client";

import { useState, useMemo } from "react";
import { useTheme } from "next-themes";
import {
  getWarnData,
  getWarnNotices,
  getWarnCoverage,
  getWarnSources,
  getWarnByState,
} from "@/lib/warn";
import type { WarnNotice } from "@/lib/warn";
import WarnTrendChart from "./WarnTrendChart";
import { useT } from "@/lib/i18n/useT";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000)    return `${(n / 1_000).toFixed(0)}K`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch {
    return iso;
  }
}

function fmtDateShort(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "short", year: "numeric",
  });
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;
const TOP_TYPES = 6;

type SortKey = "date" | "employees";

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">{label}</p>
      <p
        className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LayoffsView() {
  const t = useT("layoffs");
  const { resolvedTheme } = useTheme();
  const isDark = (resolvedTheme ?? "dark") !== "light";

  const { generatedAt, summary } = getWarnData();
  const coverage  = getWarnCoverage();
  const sources   = getWarnSources();
  const byState   = getWarnByState();
  const allNotices = useMemo(() => getWarnNotices(), []);

  const [query,       setQuery]       = useState("");
  const [sortKey,     setSortKey]     = useState<SortKey>("date");
  const [stateFilter, setStateFilter] = useState("");
  const [shown,       setShown]       = useState(PAGE_SIZE);

  // ── Filtered + sorted notices ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list: WarnNotice[] = allNotices;

    if (stateFilter) {
      list = list.filter((n) => n.state === stateFilter);
    }
    if (q) {
      list = list.filter(
        (n) =>
          (n.company?.toLowerCase().includes(q)) ||
          (n.county?.toLowerCase().includes(q)) ||
          (n.stateName?.toLowerCase().includes(q)),
      );
    }
    if (sortKey === "employees") {
      list = [...list].sort((a, b) => b.employees - a.employees);
    }
    // "date" order: getWarnNotices() is already most-recent-first
    return list;
  }, [allNotices, query, stateFilter, sortKey]);

  const visibleNotices = filtered.slice(0, shown);

  // ── Derived summary values ───────────────────────────────────────────────────
  const maxEmpByEmp  = summary.topEmployers[0]?.employees ?? 1;
  const topTypes     = summary.byType.slice(0, TOP_TYPES);
  const maxTypeByEmp = topTypes[0]?.employees ?? 1;
  const maxStateEmp  = byState[0]?.employees ?? 1;

  const dateRangeLabel =
    summary.dateRange.earliest && summary.dateRange.latest
      ? `${fmtDateShort(summary.dateRange.earliest)} – ${fmtDateShort(summary.dateRange.latest)}`
      : "—";

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-10">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="animate-fade-up">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-400/30">
            {t("coverageBadge")}
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-gradient">
          {t("heroTitle")}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1.5 max-w-2xl">
          {t("heroSubhead")}
        </p>
        <p className="text-xs text-zinc-500 mt-2">
          {t("generatedAt")}{" "}
          <span className="text-zinc-700 dark:text-zinc-300">
            {new Date(generatedAt).toLocaleString("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
          {" · "}
          <span className="text-zinc-600 dark:text-zinc-400">{coverage}</span>
        </p>
        <p className="text-xs text-zinc-500 mt-1">
          {sources.map((src, i) => (
            <span key={src.state}>
              {i > 0 && <span className="mx-1 text-zinc-400">·</span>}
              <a
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-500 hover:text-violet-400 underline underline-offset-2 transition-colors"
              >
                {src.stateName}
              </a>
            </span>
          ))}
        </p>
      </div>

      {/* ── Stat cards ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label={t("statTotalNotices")}
          value={summary.total.toLocaleString()}
          sub={t("coverageNote")}
        />
        <StatCard
          label={t("statTotalEmployees")}
          value={fmtNum(summary.totalEmployees)}
          sub={dateRangeLabel}
        />
        <StatCard
          label={t("statesCovered")}
          value={String(byState.length)}
          sub={byState.map((s) => s.state).join(" · ")}
        />
        <StatCard
          label={t("statDateRange")}
          value={
            summary.dateRange.earliest && summary.dateRange.latest
              ? `${summary.dateRange.earliest.slice(0, 4)}–${summary.dateRange.latest.slice(0, 4)}`
              : "—"
          }
          sub={`${summary.total.toLocaleString()} ${t("notices")}`}
        />
      </div>

      {/* ── By State ─────────────────────────────────────────────────────────── */}
      <section aria-labelledby="wtc-bystate-heading">
        <div className="mb-4">
          <h2 id="wtc-bystate-heading" className="text-xl font-semibold text-zinc-900 dark:text-white">
            {t("byStateHeading")}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{t("byStateDesc")}</p>
        </div>
        <div
          className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-5"
          role="img"
          aria-label={t("srByStateLabel")}
        >
          {byState.map((st) => {
            const dr =
              st.dateRange.earliest && st.dateRange.latest
                ? `${fmtDateShort(st.dateRange.earliest)} – ${fmtDateShort(st.dateRange.latest)}`
                : "—";
            const isHistorical = ["NY", "TX", "OH"].includes(st.state);
            return (
              <div key={st.state}>
                <div className="flex justify-between items-baseline gap-2 mb-1.5">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                      {st.stateName}
                    </span>
                    {isHistorical && (
                      <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-200/80 dark:bg-zinc-700/60 text-zinc-500 dark:text-zinc-400">
                        historical
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-zinc-500 shrink-0 tabular-nums">
                    {fmtNum(st.employees)} {t("employees")} · {st.notices.toLocaleString()} {t("notices")}
                  </span>
                </div>
                <div
                  className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden"
                  aria-hidden="true"
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(st.employees / maxStateEmp) * 100}%`,
                      background: isHistorical
                        ? isDark ? "#6366f1" : "#818cf8"
                        : isDark ? "#7c3aed" : "#8b5cf6",
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>
                <p className="text-[10px] text-zinc-400 mt-0.5">{dr}</p>
              </div>
            );
          })}
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            {t("historicalNote")}
          </p>
          {/* SR-only full list */}
          <ul className="sr-only">
            {byState.map((st) => (
              <li key={st.state}>
                {st.stateName}: {st.employees.toLocaleString()} {t("employees")},{" "}
                {st.notices.toLocaleString()} {t("notices")}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Monthly Trend Chart ───────────────────────────────────────────────── */}
      <section aria-labelledby="wtc-trend-heading">
        <div className="mb-4">
          <h2 id="wtc-trend-heading" className="text-xl font-semibold text-zinc-900 dark:text-white">
            {t("sectionTrend")}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{t("sectionTrendDesc")}</p>
        </div>
        <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
          <WarnTrendChart />
        </div>
      </section>

      {/* ── Two-column: Top Employers + By Type ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top Employers */}
        <section aria-labelledby="wtc-employers-heading">
          <div className="mb-4">
            <h2
              id="wtc-employers-heading"
              className="text-xl font-semibold text-zinc-900 dark:text-white"
            >
              {t("sectionTopEmployers")}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              {t("sectionTopEmployersDesc")}
            </p>
          </div>
          <div
            className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-3.5"
            role="img"
            aria-label={t("srTopEmployersLabel")}
          >
            {summary.topEmployers.slice(0, 12).map((emp) => (
              <div key={`${emp.company}-${emp.state}`}>
                <div className="flex justify-between items-baseline gap-2 mb-1.5">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm font-medium text-zinc-900 dark:text-white truncate max-w-[55%]">
                      {emp.company}
                    </span>
                    <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-400/20 shrink-0">
                      {emp.state}
                    </span>
                  </span>
                  <span className="text-xs text-zinc-500 shrink-0 tabular-nums">
                    {emp.employees.toLocaleString()}
                  </span>
                </div>
                <div
                  className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden"
                  aria-hidden="true"
                >
                  <div
                    className="h-full bg-violet-500 rounded-full"
                    style={{
                      width: `${(emp.employees / maxEmpByEmp) * 100}%`,
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  {emp.notices} {t("notices")}
                </p>
              </div>
            ))}

            {/* SR-only full list */}
            <ul className="sr-only">
              {summary.topEmployers.slice(0, 12).map((emp) => (
                <li key={`${emp.company}-${emp.state}`}>
                  {emp.company} ({emp.state}): {emp.employees.toLocaleString()} {t("employees")},{" "}
                  {emp.notices} {t("notices")}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* By Type */}
        <section aria-labelledby="wtc-bytype-heading">
          <div className="mb-4">
            <h2
              id="wtc-bytype-heading"
              className="text-xl font-semibold text-zinc-900 dark:text-white"
            >
              {t("sectionByType")}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              {t("sectionByTypeDesc")}
            </p>
          </div>
          <div
            className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4"
            role="img"
            aria-label={t("srByTypeLabel")}
          >
            {topTypes.map((tp) => (
              <div key={tp.type}>
                <div className="flex justify-between items-baseline gap-2 mb-1.5">
                  <span className="text-sm font-medium text-zinc-900 dark:text-white truncate max-w-[65%]">
                    {tp.type}
                  </span>
                  <span className="text-xs text-zinc-500 shrink-0 tabular-nums">
                    {fmtNum(tp.employees)}
                  </span>
                </div>
                <div
                  className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden"
                  aria-hidden="true"
                >
                  <div
                    className="h-full bg-cyan-500 rounded-full"
                    style={{
                      width: `${(tp.employees / maxTypeByEmp) * 100}%`,
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  {tp.notices} {t("notices")}
                </p>
              </div>
            ))}

            {/* SR-only full list */}
            <ul className="sr-only">
              {topTypes.map((tp) => (
                <li key={tp.type}>
                  {tp.type}: {tp.employees.toLocaleString()} {t("employees")},{" "}
                  {tp.notices} {t("notices")}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      {/* ── Notices Table ─────────────────────────────────────────────────────── */}
      <section aria-labelledby="wtc-table-heading">
        <div className="mb-4">
          <h2 id="wtc-table-heading" className="text-xl font-semibold text-zinc-900 dark:text-white">
            {t("sectionTable")}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{t("sectionTableDesc")}</p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <input
            type="search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShown(PAGE_SIZE); }}
            placeholder={t("searchPlaceholder")}
            className="flex-1 min-w-48 max-w-sm h-9 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm px-3 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
            aria-label={t("searchPlaceholder")}
          />

          {/* State filter */}
          <select
            value={stateFilter}
            onChange={(e) => { setStateFilter(e.target.value); setShown(PAGE_SIZE); }}
            className="h-9 px-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
            aria-label={t("stateColumn")}
          >
            <option value="">{t("stateFilterAll")}</option>
            {sources.map((src) => (
              <option key={src.state} value={src.state}>
                {src.stateName} ({src.state})
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {t("sortLabel")}:
            </span>
            {(["date", "employees"] as SortKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => { setSortKey(key); setShown(PAGE_SIZE); }}
                aria-pressed={sortKey === key}
                className={`h-8 px-3 rounded-lg text-xs font-medium border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                  sortKey === key
                    ? "bg-violet-600 border-violet-600 text-white"
                    : "bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400"
                }`}
              >
                {key === "date" ? t("sortDateDesc") : t("sortEmployeesDesc")}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-zinc-500 mb-3">
          {t("showingLabel", {
            count: String(visibleNotices.length),
            total: String(filtered.length),
          })}
        </p>

        {/* Table */}
        <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-sm">
              {t("noResults")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[740px]">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/60">
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
                    >
                      {t("tableCompany")}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
                    >
                      {t("stateColumn")}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
                    >
                      {t("tableCounty")}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
                    >
                      {t("tableEmployees")}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
                    >
                      {t("tableNoticeDate")}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
                    >
                      {t("tableType")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {visibleNotices.map((notice: WarnNotice, i: number) => (
                    <tr
                      key={`${notice.company}-${notice.state}-${notice.noticeDate ?? "null"}-${i}`}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white max-w-xs">
                        <span className="block truncate" title={notice.company}>
                          {notice.company}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                          {notice.state}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                        {notice.county ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-zinc-900 dark:text-white">
                        {notice.employees.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                        {fmtDate(notice.noticeDate)}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {notice.layoffType ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Note about table scope */}
        <p className="text-[11px] text-zinc-400 mt-2">
          {t("tableNoteRecentPerState")}
        </p>

        {/* Show more / less */}
        {filtered.length > PAGE_SIZE && (
          <div className="mt-4 flex gap-3">
            {shown < filtered.length && (
              <button
                type="button"
                onClick={() => setShown((s) => s + PAGE_SIZE)}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                {t("showMore")}
              </button>
            )}
            {shown > PAGE_SIZE && (
              <button
                type="button"
                onClick={() => setShown(PAGE_SIZE)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                {t("showLess")}
              </button>
            )}
          </div>
        )}
      </section>

      {/* ── Sources / WARN Act footnote ───────────────────────────────────────── */}
      <section aria-labelledby="wtc-source-heading">
        <div className="glass bg-white/70 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-4">
          <h2
            id="wtc-source-heading"
            className="text-base font-semibold text-zinc-900 dark:text-white"
          >
            {t("warnActLabel")}
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {coverage}
          </p>
          <div className="space-y-3">
            {sources.map((src) => (
              <div key={src.state} className="flex flex-wrap items-start gap-x-3 gap-y-0.5 text-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 w-6 shrink-0 mt-0.5">
                  {src.state}
                </span>
                <div className="flex-1 min-w-0">
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-500 hover:text-violet-400 underline underline-offset-2 transition-colors"
                  >
                    {src.name}
                  </a>
                  <span className="text-zinc-500 ml-2">({src.publisher})</span>
                  {src.license && (
                    <span className="text-zinc-400 text-xs ml-2">· {src.license}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
