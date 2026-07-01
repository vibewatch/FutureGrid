"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/useT";

export interface EnrichedCountry {
  iso3: string;
  name: string;
  usageIndex: number | null;
  usagePct: number | null;
  usageCount: number | null;
  hasClaudeData: boolean;
  proxyNote: string | null;
  diffusionPct: number | null;
  /** All three AIEI survey periods; null when incomplete. */
  diffusionTrend: { h1_2025: number; h2_2025: number; q1_2026: number } | null;
  /** pp gain H1 2025 → Q1 2026; null when incomplete. */
  diffusionDelta: number | null;
  aiReadiness: number | null;
  /** IMF AIPI sub-index scores (0–1). null if data unavailable. */
  readinessSubIndices: {
    digitalInfrastructure: number | null;
    humanCapital: number | null;
    innovation: number | null;
    regulationEthics: number | null;
  } | null;
  /** Oxford Insights Government AI Readiness Index 2023, composite 0–100. */
  governmentReadiness: number | null;
  gdpPerWorkingAgeCapita: number | null;
}

// ISO 3166-1 alpha-3 → alpha-2 mapping (all 195 countries in dataset)
const ISO3_TO_ISO2: Record<string, string> = {
  ABW: "AW", AGO: "AO", ALB: "AL", AND: "AD", ARE: "AE", ARG: "AR", ARM: "AM",
  ASM: "AS", ATG: "AG", AUS: "AU", AUT: "AT", AZE: "AZ", BDI: "BI", BEL: "BE",
  BEN: "BJ", BFA: "BF", BGD: "BD", BGR: "BG", BHR: "BH", BHS: "BS", BIH: "BA",
  BLR: "BY", BLZ: "BZ", BMU: "BM", BOL: "BO", BRA: "BR", BRB: "BB", BRN: "BN",
  BTN: "BT", BWA: "BW", CAF: "CF", CAN: "CA", CHE: "CH", CHL: "CL", CHN: "CN",
  CIV: "CI", CMR: "CM", COD: "CD", COG: "CG", COL: "CO", COM: "KM", CPV: "CV",
  CRI: "CR", CUB: "CU", CUW: "CW", CYM: "KY", CYP: "CY", CZE: "CZ", DEU: "DE",
  DJI: "DJ", DMA: "DM", DNK: "DK", DOM: "DO", DZA: "DZ", ECU: "EC", EGY: "EG",
  ERI: "ER", ESP: "ES", EST: "EE", ETH: "ET", FIN: "FI", FJI: "FJ", FRA: "FR",
  FRO: "FO", FSM: "FM", GAB: "GA", GBR: "GB", GEO: "GE", GHA: "GH", GIB: "GI",
  GIN: "GN", GMB: "GM", GNB: "GW", GNQ: "GQ", GRC: "GR", GRD: "GD", GRL: "GL",
  GTM: "GT", GUM: "GU", GUY: "GY", HND: "HN", HRV: "HR", HTI: "HT", HUN: "HU",
  IDN: "ID", IMN: "IM", IND: "IN", IRL: "IE", IRN: "IR", IRQ: "IQ", ISL: "IS",
  ISR: "IL", ITA: "IT", JAM: "JM", JOR: "JO", JPN: "JP", KAZ: "KZ", KEN: "KE",
  KGZ: "KG", KHM: "KH", KIR: "KI", KNA: "KN", KOR: "KR", KWT: "KW", LAO: "LA",
  LBN: "LB", LBR: "LR", LBY: "LY", LCA: "LC", LIE: "LI", LKA: "LK", LSO: "LS",
  LTU: "LT", LUX: "LU", LVA: "LV", MAF: "MF", MAR: "MA", MCO: "MC", MDA: "MD",
  MDG: "MG", MDV: "MV", MEX: "MX", MHL: "MH", MKD: "MK", MLI: "ML", MLT: "MT",
  MMR: "MM", MNE: "ME", MNG: "MN", MNP: "MP", MOZ: "MZ", MRT: "MR", MUS: "MU",
  MWI: "MW", MYS: "MY", NAM: "NA", NCL: "NC", NER: "NE", NGA: "NG", NIC: "NI",
  NLD: "NL", NOR: "NO", NPL: "NP", NRU: "NR", NZL: "NZ", OMN: "OM", PAK: "PK",
  PAN: "PA", PER: "PE", PHL: "PH", PLW: "PW", PNG: "PG", POL: "PL", PRI: "PR",
  PRT: "PT", PRY: "PY", PSE: "PS", PYF: "PF", QAT: "QA", ROU: "RO", RUS: "RU",
  RWA: "RW", SAU: "SA", SDN: "SD", SEN: "SN", SGP: "SG", SLB: "SB", SLE: "SL",
  SLV: "SV", SMR: "SM", SOM: "SO", SRB: "RS", SSD: "SS", STP: "ST", SUR: "SR",
  SVK: "SK", SVN: "SI", SWE: "SE", SWZ: "SZ", SXM: "SX", SYC: "SC", SYR: "SY",
  TCA: "TC", TCD: "TD", TGO: "TG", THA: "TH", TJK: "TJ", TKM: "TM", TLS: "TL",
  TON: "TO", TTO: "TT", TUN: "TN", TUR: "TR", TUV: "TV", TWN: "TW", TZA: "TZ",
  UGA: "UG", UKR: "UA", URY: "UY", USA: "US", UZB: "UZ", VCT: "VC", VEN: "VE",
  VGB: "VG", VIR: "VI", VNM: "VN", VUT: "VU", WSM: "WS", XKX: "XK", YEM: "YE",
  ZAF: "ZA", ZMB: "ZM", ZWE: "ZW",
};

function flagEmoji(iso3: string): string {
  const iso2 = ISO3_TO_ISO2[iso3];
  if (!iso2 || iso2.length !== 2) return "🌐";
  const base = 0x1f1e6;
  const A = 0x41;
  return (
    String.fromCodePoint(base + iso2.charCodeAt(0) - A) +
    String.fromCodePoint(base + iso2.charCodeAt(1) - A)
  );
}

// ─── Tiny 3-point sparkline (pure SVG, no animation, reduced-motion safe) ─────

function Sparkline3({ h1, h2, q1 }: { h1: number; h2: number; q1: number }) {
  const W = 52, H = 22;
  const vals = [h1, h2, q1];
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const span = maxV - minV || 0.1;
  const px = (i: number) => (((i / 2) * (W - 8)) + 4).toFixed(1);
  const py = (v: number) => (H - 4 - ((v - minV) / span) * (H - 8)).toFixed(1);
  const pts = `${px(0)},${py(vals[0])} ${px(1)},${py(vals[1])} ${px(2)},${py(vals[2])}`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" className="shrink-0">
      <polyline
        points={pts}
        fill="none"
        stroke="rgb(139,92,246)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={px(0)} cy={py(vals[0])} r="2" fill="rgb(139,92,246)" opacity="0.5" />
      <circle cx={px(1)} cy={py(vals[1])} r="2" fill="rgb(139,92,246)" opacity="0.5" />
      <circle cx={px(2)} cy={py(vals[2])} r="2.5" fill="rgb(139,92,246)" />
    </svg>
  );
}

// ─── IMF AIPI sub-index mini-bar ─────────────────────────────────────────────

function SubIndexBar({ label, value, noDataLabel }: { label: string; value: number | null; noDataLabel: string }) {
  const pct = value !== null ? (value * 100).toFixed(1) : null;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-tight">{label}</span>
        <span className="text-[11px] font-bold text-cyan-300 tabular-nums ml-2 shrink-0">
          {value !== null ? value.toFixed(2) : "—"}
        </span>
      </div>
      <div
        className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden"
        role="progressbar"
        aria-valuenow={value !== null ? Math.round(value * 100) : 0}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${pct !== null ? `${pct}%` : noDataLabel}`}
      >
        {value !== null && (
          <div
            className="h-full rounded-full bg-cyan-500/60"
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Country detail modal ─────────────────────────────────────────────────────

function CountryModal({
  country,
  onClose,
  cnnicUsers,
  questMau,
  doubaoMau,
}: {
  country: EnrichedCountry;
  onClose: () => void;
  cnnicUsers: string;
  questMau: string;
  doubaoMau: string;
}) {
  const t = useT("global");
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    // Defer focus to avoid paint flicker
    const focusId = setTimeout(() => closeRef.current?.focus(), 0);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced && dialogRef.current) {
      dialogRef.current.style.animation = "none"; // ensure no stale animation
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);

      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";

    return () => {
      clearTimeout(focusId);
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
      previousFocus?.focus();
    };
  }, [onClose]);

  const flag = flagEmoji(country.iso3);
  const isChina = country.iso3 === "CHN";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="country-detail-title"
        className="relative z-10 w-full max-w-lg mx-4 mb-0 sm:mb-auto glass rounded-t-2xl sm:rounded-2xl overflow-y-auto"
        style={{ maxHeight: "90dvh" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-300 dark:border-zinc-700/40 sticky top-0 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm rounded-t-2xl sm:rounded-t-2xl">
          <span aria-hidden="true" className="text-2xl leading-none">
            {flag}
          </span>
          <h2
            id="country-detail-title"
            className="text-lg font-bold text-zinc-900 dark:text-white flex-1 leading-tight"
          >
            {country.name}
          </h2>
          <button
            ref={closeRef}
            onClick={onClose}
            className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-violet-500/60"
            aria-label={t("countryCloseAria")}
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          {/* Claude.ai usage block */}
          <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700/40 px-4 py-3">
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2">
              {t("countryClaudeUsageHeading")}
            </p>
            {country.hasClaudeData ? (
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-2xl font-extrabold text-gradient tabular-nums">
                  {(country.usageIndex ?? 0).toFixed(3)}
                </span>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">{t("countryUsageIndexLabel")}</span>
                <span className="ml-auto text-sm font-medium text-zinc-700 dark:text-zinc-300 tabular-nums">
                  {country.usagePct !== null
                    ? `${(country.usagePct * 100).toFixed(2)}% ${t("countryGlobalShareLabel")}`
                    : "—"}
                </span>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-zinc-400">
                  {t("countryNoClaudeData")}
                </p>
                {country.proxyNote && (
                  <p className="text-xs text-amber-300/80 mt-1.5 leading-relaxed">
                    {country.proxyNote}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* GenAI diffusion */}
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-violet-200 dark:border-violet-500/20 px-4 py-3">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">
                {t("countryGenAiDiffusion")}
              </p>
              {country.diffusionTrend ? (
                <>
                  <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 tabular-nums leading-snug">
                    {country.diffusionTrend.h1_2025.toFixed(1)}%{" "}
                    <span className="text-zinc-500">→</span>{" "}
                    {country.diffusionTrend.h2_2025.toFixed(1)}%{" "}
                    <span className="text-zinc-500">→</span>{" "}
                    <span className="text-violet-300 font-bold">
                      {country.diffusionTrend.q1_2026.toFixed(1)}%
                    </span>
                  </p>
                  {country.diffusionDelta !== null && (
                    <span
                      className={`inline-block text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded-full border mt-1 ${
                        country.diffusionDelta >= 0
                          ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                          : "text-red-400 bg-red-500/10 border-red-500/20"
                      }`}
                    >
                      {country.diffusionDelta >= 0 ? "+" : ""}
                      {country.diffusionDelta.toFixed(1)}pp
                    </span>
                  )}
                  <div className="mt-2">
                    <Sparkline3
                      h1={country.diffusionTrend.h1_2025}
                      h2={country.diffusionTrend.h2_2025}
                      q1={country.diffusionTrend.q1_2026}
                    />
                  </div>
                </>
              ) : (
                <p className="text-xl font-extrabold text-violet-300 tabular-nums">
                  {country.diffusionPct !== null
                    ? `${country.diffusionPct.toFixed(1)}%`
                    : "—"}
                </p>
              )}
              <p className="text-[10px] text-zinc-500 mt-1">
                Microsoft AIEI · H1&nbsp;2025→Q1&nbsp;2026 ·{" "}
                <Link
                  href="/sources"
                  className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors"
                >
                  {t("countrySourcesLink")}
                </Link>
              </p>
            </div>

            {/* AI readiness */}
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-cyan-200 dark:border-cyan-500/20 px-4 py-3">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">
                {t("countryAiReadiness")}
              </p>
              <p className="text-xl font-extrabold text-cyan-700 dark:text-cyan-300 tabular-nums">
                {country.aiReadiness !== null
                  ? country.aiReadiness.toFixed(2)
                  : "—"}
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                IMF AI Preparedness Index
              </p>
            </div>

            {/* Government AI readiness (Oxford 2023) */}
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-indigo-200 dark:border-indigo-500/20 px-4 py-3 col-span-2">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">
                {t("countryGovernmentReadiness")}
              </p>
              <p className="text-xl font-extrabold text-indigo-700 dark:text-indigo-300 tabular-nums">
                {country.governmentReadiness !== null
                  ? `${country.governmentReadiness.toFixed(1)} / 100`
                  : "—"}
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                Oxford Insights GAIRI 2023 ·{" "}
                <Link
                  href="/sources"
                  className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors"
                >
                  {t("countrySourcesLink")}
                </Link>
              </p>
            </div>

            {/* GDP */}
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-emerald-200 dark:border-emerald-500/20 px-4 py-3 col-span-2">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">
                {t("countryGdpPerWorkingAge")}
              </p>
              <p className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300 tabular-nums">
                {country.gdpPerWorkingAgeCapita !== null
                  ? `$${country.gdpPerWorkingAgeCapita.toLocaleString("en-US", {
                      maximumFractionDigits: 0,
                    })}`
                  : "—"}
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                World Bank / IMF (Anthropic dataset)
              </p>
            </div>
          </div>

          {/* IMF AIPI sub-indices */}
          {country.readinessSubIndices && (
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-cyan-200 dark:border-cyan-500/20 px-4 py-3 space-y-2.5">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                {t("countryImfSubIndices")} ·{" "}
                <Link
                  href="/sources"
                  className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors"
                >
                  IMF AIPI
                </Link>
              </p>
              <SubIndexBar
                label={t("countryDigitalInfrastructure")}
                value={country.readinessSubIndices.digitalInfrastructure}
                noDataLabel={t("countryNoData")}
              />
              <SubIndexBar
                label={t("countryHumanCapital")}
                value={country.readinessSubIndices.humanCapital}
                noDataLabel={t("countryNoData")}
              />
              <SubIndexBar
                label={t("countryInnovation")}
                value={country.readinessSubIndices.innovation}
                noDataLabel={t("countryNoData")}
              />
              <SubIndexBar
                label={t("countryRegulationEthics")}
                value={country.readinessSubIndices.regulationEthics}
                noDataLabel={t("countryNoData")}
              />
              <p className="text-[10px] text-zinc-600 leading-relaxed pt-0.5">
                {t("countrySubPillarNote")} {" "}
                <Link
                  href="/sources"
                  className="text-zinc-500 hover:text-zinc-400 underline underline-offset-2 transition-colors"
                >
                  {t("countryDataSourcesLink")}
                </Link>
              </p>
            </div>
          )}

          {/* China native ecosystem context */}
          {isChina && (
            <div
              className="rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border px-4 py-3 space-y-3"
              style={{ borderColor: "rgba(245,158,11,0.2)" }}
            >
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                {t("countryNativeEcosystemHeading")}
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-[10px] text-zinc-500 leading-tight">
                    CNNIC · Jun 2025
                  </p>
                  <p className="text-base font-bold text-amber-300 tabular-nums">
                    {cnnicUsers}
                  </p>
                  <p className="text-[10px] text-zinc-500">{t("countryGenAiUsers")}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 leading-tight">
                    QuestMobile · H1 2025
                  </p>
                  <p className="text-base font-bold text-amber-300 tabular-nums">
                    {questMau}
                  </p>
                  <p className="text-[10px] text-zinc-500">{t("countryMobileAiMau")}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 leading-tight">
                    Doubao · Dec 2025
                  </p>
                  <p className="text-base font-bold text-amber-300 tabular-nums">
                    {doubaoMau}
                  </p>
                  <p className="text-[10px] text-zinc-500">{t("countryAppMau")}</p>
                </div>
              </div>
              <p className="text-[10px] text-zinc-500 leading-relaxed">
                {t("countryChinaProxyNote")}
              </p>
            </div>
          )}

          {/* Source link */}
          <p className="text-xs text-zinc-600">
            {t("countryFullProvenance")} {" "}
            <Link
              href="/sources"
              className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors"
            >
              {t("countryDataSourcesLink")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main panel (rankings + selector + modal) ─────────────────────────────────

interface Props {
  countries: EnrichedCountry[];
  top12: EnrichedCountry[];
  maxIndex: number;
  cnnicUsers: string;
  questMau: string;
  doubaoMau: string;
}

export default function CountryDetailPanel({
  countries,
  top12,
  maxIndex,
  cnnicUsers,
  questMau,
  doubaoMau,
}: Props) {
  const t = useT("global");
  const [selected, setSelected] = useState<EnrichedCountry | null>(null);

  const openDetail = useCallback((c: EnrichedCountry) => setSelected(c), []);
  const closeDetail = useCallback(() => setSelected(null), []);

  // Handle map-click opens modal via window event from WorldChoroplethInteractive
  useEffect(() => {
    function handleMapOpen(e: Event) {
      const iso3 = (e as CustomEvent<string>).detail;
      const country = countries.find((c) => c.iso3 === iso3) ?? null;
      if (country) setSelected(country);
    }
    window.addEventListener("fg:openCountry", handleMapOpen);
    return () => window.removeEventListener("fg:openCountry", handleMapOpen);
  }, [countries]);

  const handleSelectorChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const iso3 = e.target.value;
      if (!iso3) return;
      const country = countries.find((c) => c.iso3 === iso3) ?? null;
      if (country) setSelected(country);
      // Reset so the same country can be re-selected
      e.target.value = "";
    },
    [countries],
  );

  const sortedCountries = [...countries].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const safeMax = maxIndex > 0 ? maxIndex : 1;

  return (
    <>
      <div>
        <h2 className="text-xl font-bold text-gradient mb-2">
          {t("countryTopHeading")}
        </h2>
        <p className="text-xs text-zinc-500 mb-4">
          {t("countryTopDesc1")} {" "}
          <span className="text-zinc-600 dark:text-zinc-400">
            {t("countryTopDesc2")}
          </span>
        </p>
        <hr className="divider-glow mb-5" />

        {/* Country selector */}
        <div className="mb-5 flex items-center gap-3">
          <label
            htmlFor="country-selector"
            className="text-xs text-zinc-500 uppercase tracking-widest shrink-0"
          >
            {t("countrySelectorLabel")}
          </label>
          <select
            id="country-selector"
            onChange={handleSelectorChange}
            defaultValue=""
            className="flex-1 max-w-xs bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700/60 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/60 cursor-pointer"
            aria-label={t("countrySelectorAria")}
          >
            <option value="" disabled>
              {t("countrySelectorPlaceholder")}
            </option>
            {sortedCountries.map((c) => (
              <option key={c.iso3} value={c.iso3}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Rankings grid */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          role="list"
          aria-label={t("countryRankingAria")}
        >
          {top12.map((country, i) => {
            const barWidth =
              ((country.usageIndex ?? 0) / safeMax) * 100;
            const pct =
              country.usagePct !== null
                ? `${(country.usagePct * 100).toFixed(2)}%`
                : "—";

            return (
              <button
                key={country.iso3}
                role="listitem"
                onClick={() => openDetail(country)}
                className="glass glass-hover p-4 rounded-xl relative overflow-hidden text-left w-full focus:outline-none focus:ring-2 focus:ring-violet-500/60"
                aria-label={t("countryRankAria", { rank: i + 1, name: country.name, index: (country.usageIndex ?? 0).toFixed(3) })}
              >
                {/* Rank + name */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span
                      className="text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background:
                          i === 0
                            ? "linear-gradient(135deg,#8b5cf6,#22d3ee)"
                            : "rgba(255,255,255,0.06)",
                        color: i === 0 ? "#fff" : "#a1a1aa",
                      }}
                      aria-hidden="true"
                    >
                      {i + 1}
                    </span>
                    <span className="font-semibold text-zinc-900 dark:text-white text-sm">
                      {country.name}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-600 dark:text-zinc-400 font-mono tabular-nums">
                    {(country.usageIndex ?? 0).toFixed(3)}
                  </span>
                </div>

                {/* Progress bar */}
                <div
                  className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden"
                  role="progressbar"
                  aria-valuenow={Math.round(barWidth)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={t("countryRelativeUsageAria", { name: country.name })}
                >
                  <div
                    className="h-full rounded-full brand-grad"
                    style={{ width: `${barWidth.toFixed(1)}%` }}
                  />
                </div>

                {/* Secondary stats */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-zinc-500">
                  <span>
                    {t("countryShareLabel")} {" "}
                    <span className="text-zinc-700 dark:text-zinc-300">{pct}</span>
                  </span>
                  {country.usageCount !== null && (
                    <span>
                      {t("countryInteractionsLabel")} {" "}
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {country.usageCount.toLocaleString()}
                      </span>
                    </span>
                  )}
                  <span className="ml-auto text-zinc-600 text-[10px]">
                    {t("countryDetailsLink")}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Modal portal — rendered outside the flow */}
      {selected !== null && (
        <CountryModal
          country={selected}
          onClose={closeDetail}
          cnnicUsers={cnnicUsers}
          questMau={questMau}
          doubaoMau={doubaoMau}
        />
      )}
    </>
  );
}
