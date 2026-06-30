"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

export interface EnrichedCountry {
  iso3: string;
  name: string;
  usageIndex: number | null;
  usagePct: number | null;
  usageCount: number | null;
  hasClaudeData: boolean;
  proxyNote: string | null;
  diffusionPct: number | null;
  aiReadiness: number | null;
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
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-700/40 sticky top-0 bg-zinc-950/95 backdrop-blur-sm rounded-t-2xl sm:rounded-t-2xl">
          <span aria-hidden="true" className="text-2xl leading-none">
            {flag}
          </span>
          <h2
            id="country-detail-title"
            className="text-lg font-bold text-white flex-1 leading-tight"
          >
            {country.name}
          </h2>
          <button
            ref={closeRef}
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-violet-500/60"
            aria-label="Close country detail"
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
          <div className="rounded-xl bg-zinc-900/50 border border-zinc-700/40 px-4 py-3">
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2">
              Claude.ai Usage · Anthropic Economic Index Aug 2025
            </p>
            {country.hasClaudeData ? (
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-2xl font-extrabold text-gradient tabular-nums">
                  {(country.usageIndex ?? 0).toFixed(3)}
                </span>
                <span className="text-sm text-zinc-400">usage index</span>
                <span className="ml-auto text-sm font-medium text-zinc-300 tabular-nums">
                  {country.usagePct !== null
                    ? `${(country.usagePct * 100).toFixed(2)}% global share`
                    : "—"}
                </span>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-zinc-400">
                  No Claude.ai data
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
            <div className="rounded-xl bg-zinc-900/50 border border-violet-500/20 px-4 py-3">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">
                GenAI Diffusion
              </p>
              <p className="text-xl font-extrabold text-violet-300 tabular-nums">
                {country.diffusionPct !== null
                  ? `${country.diffusionPct.toFixed(1)}%`
                  : "—"}
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                Microsoft AIEI Q1 2026
              </p>
            </div>

            {/* AI readiness */}
            <div className="rounded-xl bg-zinc-900/50 border border-cyan-500/20 px-4 py-3">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">
                AI Readiness
              </p>
              <p className="text-xl font-extrabold text-cyan-300 tabular-nums">
                {country.aiReadiness !== null
                  ? country.aiReadiness.toFixed(2)
                  : "—"}
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                IMF AI Preparedness Index
              </p>
            </div>

            {/* GDP */}
            <div className="rounded-xl bg-zinc-900/50 border border-emerald-500/20 px-4 py-3 col-span-2">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">
                GDP per Working-Age Capita
              </p>
              <p className="text-xl font-extrabold text-emerald-300 tabular-nums">
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

          {/* China native ecosystem context */}
          {isChina && (
            <div
              className="rounded-xl bg-zinc-900/50 border px-4 py-3 space-y-3"
              style={{ borderColor: "rgba(245,158,11,0.2)" }}
            >
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                Native Ecosystem Context · Claude layer: grey
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-[10px] text-zinc-500 leading-tight">
                    CNNIC · Jun 2025
                  </p>
                  <p className="text-base font-bold text-amber-300 tabular-nums">
                    {cnnicUsers}
                  </p>
                  <p className="text-[10px] text-zinc-500">GenAI users</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 leading-tight">
                    QuestMobile · H1 2025
                  </p>
                  <p className="text-base font-bold text-amber-300 tabular-nums">
                    {questMau}
                  </p>
                  <p className="text-[10px] text-zinc-500">Mobile-AI MAU</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 leading-tight">
                    Doubao · Dec 2025
                  </p>
                  <p className="text-base font-bold text-amber-300 tabular-nums">
                    {doubaoMau}
                  </p>
                  <p className="text-[10px] text-zinc-500">App MAU</p>
                </div>
              </div>
              <p className="text-[10px] text-zinc-500 leading-relaxed">
                These proxies use different measurement methods and cannot be
                summed or compared directly. Claude.ai is unavailable in mainland
                China — it appears grey on the Claude.ai usage layer.
              </p>
            </div>
          )}

          {/* Source link */}
          <p className="text-xs text-zinc-600">
            Full provenance:{" "}
            <Link
              href="/sources"
              className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors"
            >
              Data &amp; Sources
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
  const [selected, setSelected] = useState<EnrichedCountry | null>(null);

  const openDetail = useCallback((c: EnrichedCountry) => setSelected(c), []);
  const closeDetail = useCallback(() => setSelected(null), []);

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
          Top Countries by AI Adoption
        </h2>
        <p className="text-xs text-zinc-500 mb-4">
          Ranked by usage index (per-capita Claude.ai usage, normalised).
          Countries with zero recorded usage or unreported Claude.ai metrics are
          excluded.{" "}
          <span className="text-zinc-400">
            Click any row or use the selector to view the full metric set.
          </span>
        </p>
        <hr className="divider-glow mb-5" />

        {/* Country selector */}
        <div className="mb-5 flex items-center gap-3">
          <label
            htmlFor="country-selector"
            className="text-xs text-zinc-500 uppercase tracking-widest shrink-0"
          >
            Any country:
          </label>
          <select
            id="country-selector"
            onChange={handleSelectorChange}
            defaultValue=""
            className="flex-1 max-w-xs bg-zinc-900/80 border border-zinc-700/60 rounded-xl px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/60 cursor-pointer"
            aria-label="Select any country to view details"
          >
            <option value="" disabled>
              🔍 Select a country…
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
          aria-label="Top countries by AI adoption"
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
                aria-label={`Rank ${i + 1}: ${country.name} — usage index ${(country.usageIndex ?? 0).toFixed(3)}. Activate to view full details.`}
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
                    <span className="font-semibold text-white text-sm">
                      {country.name}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-400 font-mono tabular-nums">
                    {(country.usageIndex ?? 0).toFixed(3)}
                  </span>
                </div>

                {/* Progress bar */}
                <div
                  className="h-1.5 rounded-full bg-zinc-800 overflow-hidden"
                  role="progressbar"
                  aria-valuenow={Math.round(barWidth)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${country.name} relative usage`}
                >
                  <div
                    className="h-full rounded-full brand-grad"
                    style={{ width: `${barWidth.toFixed(1)}%` }}
                  />
                </div>

                {/* Secondary stats */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-zinc-500">
                  <span>
                    Share:{" "}
                    <span className="text-zinc-300">{pct}</span>
                  </span>
                  {country.usageCount !== null && (
                    <span>
                      Interactions:{" "}
                      <span className="text-zinc-300">
                        {country.usageCount.toLocaleString()}
                      </span>
                    </span>
                  )}
                  <span className="ml-auto text-zinc-600 text-[10px]">
                    details →
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
