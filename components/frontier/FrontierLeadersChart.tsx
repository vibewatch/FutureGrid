"use client";

import { useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import Link from "next/link";
import { useTheme } from "next-themes";
import { getOrgLeaderboard, getCountryLeaderboard, formatFlop } from "@/lib/ai-frontier";
import { useT } from "@/lib/i18n/useT";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type Tab = "orgs" | "countries";

export default function FrontierLeadersChart() {
  const t = useT("frontier");
  const { resolvedTheme } = useTheme();
  const isDark = (resolvedTheme ?? "dark") !== "light";
  const [activeTab, setActiveTab] = useState<Tab>("orgs");

  const orgs = useMemo(() => getOrgLeaderboard(12), []);
  const countries = useMemo(() => getCountryLeaderboard().slice(0, 10), []);

  const axisText = isDark ? "#71717a" : "#52525b";
  const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
  const borderColor = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";
  const ttBg = isDark ? "rgba(9,9,11,0.92)" : "rgba(255,255,255,0.95)";
  const ttTitle = isDark ? "#e4e4e7" : "#18181b";
  const ttBody = isDark ? "#a1a1aa" : "#52525b";
  const ttBorder = isDark ? "rgba(139,92,246,0.30)" : "rgba(139,92,246,0.25)";

  const orgLabels = orgs.map((o) => o.organization);
  const orgModelCounts = orgs.map((o) => o.modelCount);
  const orgFrontierCounts = orgs.map((o) => o.frontierCount);

  const countryLabels = countries.map((c) => c.countryShort);
  const countryModelCounts = countries.map((c) => c.modelCount);
  const countryFrontierCounts = countries.map((c) => c.frontierCount);

  const commonOptions = useMemo(
    () => ({
      indexAxis: "y" as const,
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500, easing: "easeOutQuart" as const },
      plugins: {
        legend: {
          position: "top" as const,
          labels: {
            color: axisText,
            usePointStyle: true,
            pointStyleWidth: 10,
            padding: 14,
            font: { size: 11 },
          },
        },
        tooltip: {
          backgroundColor: ttBg,
          titleColor: ttTitle,
          bodyColor: ttBody,
          borderColor: ttBorder,
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
        },
      },
      scales: {
        x: {
          ticks: { color: axisText, font: { size: 10 } },
          grid: { color: gridColor },
          border: { color: borderColor },
        },
        y: {
          ticks: { color: axisText, font: { size: 10 } },
          grid: { display: false },
          border: { color: borderColor },
        },
      },
    }),
    [axisText, gridColor, borderColor, ttBg, ttTitle, ttBody, ttBorder],
  );

  const orgChartData = useMemo(
    () => ({
      labels: orgLabels,
      datasets: [
        {
          label: t("leadersBarModels"),
          data: orgModelCounts,
          backgroundColor: isDark
            ? "rgba(139,92,246,0.55)"
            : "rgba(124,58,237,0.55)",
          borderColor: isDark
            ? "rgba(139,92,246,0.80)"
            : "rgba(124,58,237,0.80)",
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: t("leadersBarFrontier"),
          data: orgFrontierCounts,
          backgroundColor: isDark
            ? "rgba(245,158,11,0.65)"
            : "rgba(217,119,6,0.65)",
          borderColor: isDark
            ? "rgba(245,158,11,0.90)"
            : "rgba(217,119,6,0.90)",
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    }),
    [orgLabels, orgModelCounts, orgFrontierCounts, isDark, t],
  );

  const countryChartData = useMemo(
    () => ({
      labels: countryLabels,
      datasets: [
        {
          label: t("leadersBarModels"),
          data: countryModelCounts,
          backgroundColor: isDark
            ? "rgba(139,92,246,0.55)"
            : "rgba(124,58,237,0.55)",
          borderColor: isDark
            ? "rgba(139,92,246,0.80)"
            : "rgba(124,58,237,0.80)",
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: t("leadersBarFrontier"),
          data: countryFrontierCounts,
          backgroundColor: isDark
            ? "rgba(245,158,11,0.65)"
            : "rgba(217,119,6,0.65)",
          borderColor: isDark
            ? "rgba(245,158,11,0.90)"
            : "rgba(217,119,6,0.90)",
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    }),
    [countryLabels, countryModelCounts, countryFrontierCounts, isDark, t],
  );

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1 flex gap-1 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("orgs")}
          aria-pressed={activeTab === "orgs"}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
            activeTab === "orgs"
              ? "bg-violet-600 text-white shadow"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50"
          }`}
        >
          {t("leadersTabOrgs")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("countries")}
          aria-pressed={activeTab === "countries"}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
            activeTab === "countries"
              ? "bg-violet-600 text-white shadow"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50"
          }`}
        >
          {t("leadersTabCountries")}
        </button>
      </div>

      {/* Charts */}
      {activeTab === "orgs" && (
        <div className="space-y-3">
          <div style={{ height: Math.max(280, orgs.length * 34 + 60) }}>
            <Bar options={commonOptions} data={orgChartData} />
          </div>
          {/* Supplemental table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-1.5 pr-3 font-semibold text-zinc-500 dark:text-zinc-400">
                    {t("leadersColName")}
                  </th>
                  <th className="py-1.5 pr-3 font-semibold text-zinc-500 dark:text-zinc-400 text-right">
                    {t("leadersColModels")}
                  </th>
                  <th className="py-1.5 pr-3 font-semibold text-zinc-500 dark:text-zinc-400 text-right">
                    {t("leadersColFrontier")}
                  </th>
                  <th className="py-1.5 font-semibold text-zinc-500 dark:text-zinc-400 text-right">
                    {t("leadersColMaxCompute")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((org) => (
                  <tr
                    key={org.organization}
                    className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="py-1.5 pr-3 font-medium text-zinc-900 dark:text-zinc-100">
                      {org.organization}
                    </td>
                    <td className="py-1.5 pr-3 text-right text-zinc-600 dark:text-zinc-400">
                      {org.modelCount}
                    </td>
                    <td className="py-1.5 pr-3 text-right">
                      {org.frontierCount > 0 ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-400/20">
                          {org.frontierCount}
                        </span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="py-1.5 text-right font-mono text-violet-600 dark:text-violet-400 text-[11px]">
                      {formatFlop(org.maxComputeFlop)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "countries" && (
        <div className="space-y-3">
          <div style={{ height: Math.max(240, countries.length * 34 + 60) }}>
            <Bar options={commonOptions} data={countryChartData} />
          </div>
          {/* Supplemental table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-1.5 pr-3 font-semibold text-zinc-500 dark:text-zinc-400">
                    {t("leadersColName")}
                  </th>
                  <th className="py-1.5 pr-3 font-semibold text-zinc-500 dark:text-zinc-400 text-right">
                    {t("leadersColModels")}
                  </th>
                  <th className="py-1.5 pr-3 font-semibold text-zinc-500 dark:text-zinc-400 text-right">
                    {t("leadersColFrontier")}
                  </th>
                  <th className="py-1.5 font-semibold text-zinc-500 dark:text-zinc-400 text-right">
                    {t("leadersColMaxCompute")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {countries.map((c) => (
                  <tr
                    key={c.country}
                    className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="py-1.5 pr-3 font-medium text-zinc-900 dark:text-zinc-100">
                      {c.countryShort}
                    </td>
                    <td className="py-1.5 pr-3 text-right text-zinc-600 dark:text-zinc-400">
                      {c.modelCount}
                    </td>
                    <td className="py-1.5 pr-3 text-right">
                      {c.frontierCount > 0 ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-400/20">
                          {c.frontierCount}
                        </span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="py-1.5 text-right font-mono text-violet-600 dark:text-violet-400 text-[11px]">
                      {formatFlop(c.maxComputeFlop)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Geopolitics note */}
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {t("leadersGeopoliticsNote")}{" "}
            <Link
              href="/global"
              className="text-violet-600 dark:text-violet-400 hover:underline font-medium"
            >
              {t("leadersGeopoliticsLink")} →
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
