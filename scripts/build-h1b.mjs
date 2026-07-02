#!/usr/bin/env node
/**
 * build-h1b.mjs
 *
 * Builds data/h1b-trends.json — a small aggregated snapshot of U.S. DOL OFLC
 * H-1B / LCA disclosure data for the "work-visa job trends" feature.
 *
 * Source files: for FY2020+ these are the four PER-QUARTER LCA disclosure
 * workbooks (LCA_Disclosure_Data_FY{YYYY}_Q1..Q4.xlsx). The quarterly files are
 * per-quarter (NON-cumulative), so the full fiscal year is the UNION of DISTINCT
 * CASE_NUMBERs across all four quarters. For FY2016–FY2019 there is a single
 * annual H-1B_Disclosure_Data_FY{YYYY}.xlsx workbook. dol.gov's Akamai edge
 * returns 403 to non-browser clients, so we fetch the raw archived bytes from
 * the Internet Archive Wayback Machine using the `id_` (identity) suffix.
 *
 * The workbooks are large (~55–92 MB), so we STREAM-parse them with ExcelJS's
 * WorkbookReader — never loading a whole workbook into memory — and map columns
 * by header NAME (case-insensitive) so the code tolerates schema drift between
 * the old and new disclosure formats.
 *
 * Run:  node scripts/build-h1b.mjs
 * Env:  H1B_YEARS=2020-2025   (range or comma list; default = full target set)
 *
 * Cache: raw workbooks are cached (once) under .cache/h1b/ (gitignored). Re-runs
 * are incremental — a cached, valid xlsx is reused instead of re-downloaded.
 *
 * NOTE: Certified LCAs are Labor Condition Applications (a filing step in the
 * H-1B process), NOT visa approvals. This is stamped in the output provenance.
 */

import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import { Readable } from "stream";
import path from "path";
import { fileURLToPath } from "url";
import nextEnv from "@next/env";
import ExcelJS from "exceljs";
import { validateH1bTrends } from "./lib/validate.mjs";
import { buildMeta } from "./lib/meta.mjs";
import { buildSocCrosswalk } from "./lib/soc-crosswalk.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
nextEnv.loadEnvConfig(ROOT);

const DATA_DIR = path.join(ROOT, "data");
const CACHE_DIR = path.join(ROOT, ".cache", "h1b");
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) FutureGrid H-1B/LCA trends builder (+https://www.dol.gov/agencies/eta/foreign-labor/performance)";

// ─── Target fiscal years ──────────────────────────────────────────────────────
// FY2020–FY2025 use the clean modern LCA schema; FY2016–FY2019 use the older
// H-1B disclosure schema (mapped below). Full target set is FY2016–FY2025.
const FULL_TARGET = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];

function parseYears(spec) {
  if (!spec) return FULL_TARGET.slice();
  const out = new Set();
  for (const part of String(spec).split(",")) {
    const t = part.trim();
    const m = t.match(/^(\d{4})\s*-\s*(\d{4})$/);
    if (m) {
      const a = Number(m[1]);
      const b = Number(m[2]);
      for (let y = Math.min(a, b); y <= Math.max(a, b); y++) out.add(y);
    } else if (/^\d{4}$/.test(t)) {
      out.add(Number(t));
    }
  }
  return [...out].sort((a, b) => a - b);
}

const TARGET_YEARS = parseYears(process.env.H1B_YEARS || process.argv[2]);

// ─── Wayback download plumbing ──────────────────────────────────────────────

// Known-good Wayback timestamps for the modern LCA per-quarter files, keyed
// "{year}_{quarter}". Used as a fast path when the CDX/available APIs are slow
// or unavailable. FY2024 has verified timestamps for all four quarters; other
// years seed only Q4 (already cached) and resolve the rest dynamically.
const KNOWN_Q_TS = {
  "2020_4": "20210318052100",
  "2021_4": "20220406032428",
  "2022_4": "20221120070923",
  "2023_4": "20240603235014",
  "2024_1": "20241218150744",
  "2024_2": "20240604035020",
  "2024_3": "20240913184126",
  "2024_4": "20241218150859",
  "2025_4": "20251224075020",
};

// Original (pre-archive) source URL for a single modern per-quarter LCA file.
function quarterOrigUrl(year, q) {
  return `https://www.dol.gov/sites/dolgov/files/ETA/oflc/pdfs/LCA_Disclosure_Data_FY${year}_Q${q}.xlsx`;
}

// Original (pre-archive) source URLs for the older single-annual-file fiscal
// years (FY2016–FY2019). These lived on foreignlaborcert.doleta.gov under
// per-year PerformanceData folders and use the older H-1B disclosure schema.
function originalUrls(year) {
  const yy = String(year).slice(2);
  const base = "https://www.foreignlaborcert.doleta.gov/pdf/PerformanceData";
  // FY2016 (and earlier) lived under a different `docs/Performance_Data/Disclosure/`
  // tree with 2-digit fiscal-year filenames (e.g. FY15-FY16/H-1B_Disclosure_Data_FY16.xlsx).
  const dbase =
    "https://www.foreignlaborcert.doleta.gov/docs/Performance_Data/Disclosure";
  return [
    `${base}/${year}/H-1B_Disclosure_Data_FY${year}.xlsx`,
    `${base}/${year}/H-1B_Disclosure_Data_FY${year}_EOY.xlsx`,
    `${base}/${year}/H-1B_Disclosure_Data_FY${yy}.xlsx`,
    `${base}/${year}/H-1B_Disclosure_Data_FY${yy}_Q4.xlsx`,
    `${base}/${year}/H-1B_Disclosure_Data_FY${yy}_upload.xlsx`,
    `${dbase}/FY${Number(yy) - 1}-FY${yy}/H-1B_Disclosure_Data_FY${yy}.xlsx`,
    `${dbase}/FY${yy}/H-1B_Disclosure_Data_FY${yy}.xlsx`,
    `https://www.dol.gov/sites/dolgov/files/ETA/oflc/pdfs/H-1B_Disclosure_Data_FY${year}.xlsx`,
  ];
}

async function fetchWithTimeout(url, opts = {}, ms = 60000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

// Resolve up to a few 200-status Wayback snapshot timestamps for `origUrl`.
// Primary: the lightweight `wayback/available` API (reliable). Fallback: CDX
// (returns several candidate snapshots so a flaky/one-off capture can be retried).
async function resolveTimestamps(origUrl) {
  const bare = origUrl.replace(/^https?:\/\//, "");
  const out = [];
  // 1) wayback/available
  try {
    const res = await fetchWithTimeout(
      `https://archive.org/wayback/available?url=${encodeURIComponent(bare)}`,
      { headers: { "User-Agent": UA } },
      45000
    );
    if (res.ok) {
      const j = await res.json();
      const snap = j?.archived_snapshots?.closest;
      if (snap && snap.available && snap.status === "200" && snap.timestamp) {
        out.push(snap.timestamp);
      }
    }
  } catch {
    /* fall through to CDX */
  }
  // 2) CDX (best-effort; can be slow/unavailable) — collect a few captures.
  try {
    const cdx =
      "https://web.archive.org/cdx/search/cdx?url=" +
      encodeURIComponent(bare) +
      "&output=json&filter=statuscode:200&collapse=digest&limit=10";
    const res = await fetchWithTimeout(cdx, { headers: { "User-Agent": UA } }, 45000);
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length >= 2) {
        const tsIdx = rows[0].indexOf("timestamp");
        // Prefer the most recent captures first.
        for (const row of rows.slice(1).reverse()) {
          const ts = tsIdx >= 0 ? row[tsIdx] : row[1];
          if (ts) out.push(ts);
        }
      }
    }
  } catch {
    /* ignore */
  }
  // De-dup, cap at a few candidates.
  return [...new Set(out)].slice(0, 4);
}

function waybackUrl(ts, origUrl) {
  return `https://web.archive.org/web/${ts}id_/${origUrl}`;
}

function isValidXlsx(file, minBytes = 1_000_000) {
  try {
    const st = statSync(file);
    if (st.size < minBytes) return false;
    const fd = readFileSync(file, { flag: "r" });
    return fd[0] === 0x50 && fd[1] === 0x4b; // "PK"
  } catch {
    return false;
  }
}

async function streamToFile(res, dest) {
  await new Promise((resolve, reject) => {
    const ws = createWriteStream(dest);
    const nodeStream = Readable.fromWeb(res.body);
    nodeStream.on("error", reject);
    ws.on("error", reject);
    ws.on("finish", resolve);
    nodeStream.pipe(ws);
  });
}

// One-time reachability probe for the Wayback *content* host (web.archive.org).
// Its metadata API (archive.org) can be up while the content host is overloaded,
// so probe the content host directly and skip downloads fast when it is down.
let _archiveReachable = null;
async function archiveReachable() {
  if (_archiveReachable !== null) return _archiveReachable;
  const probe = waybackUrl(
    KNOWN_Q_TS["2024_4"],
    quarterOrigUrl(2024, 4)
  );
  try {
    const res = await fetchWithTimeout(
      probe,
      { headers: { "User-Agent": UA, Range: "bytes=0-3" } },
      25000
    );
    _archiveReachable = res.ok || res.status === 206;
  } catch {
    _archiveReachable = false;
  }
  if (!_archiveReachable) {
    console.warn(
      "  [archive] web.archive.org content host is unreachable — " +
        "only cached workbooks will be used this run."
    );
  }
  return _archiveReachable;
}

// Download a single archived workbook to `file`, trying each Wayback snapshot in
// `timestamps` (resolved for `orig`) until one validates. Returns true on
// success, false if every candidate snapshot failed.
async function downloadArchived(orig, timestamps, file, label, dlTimeoutMs) {
  for (const ts of timestamps) {
    const url = waybackUrl(ts, orig);
    const tmp = file + ".part";
    try {
      console.log(`  [dl] ${label} ← ${url.slice(0, 100)}…`);
      const res = await fetchWithTimeout(url, { headers: { "User-Agent": UA } }, dlTimeoutMs);
      if (!res.ok || !res.body) {
        console.warn(`    HTTP ${res.status} — trying next snapshot`);
        continue;
      }
      await streamToFile(res, tmp);
      if (isValidXlsx(tmp)) {
        renameSync(tmp, file);
        console.log(`  [dl] ${label} done — ${(statSync(file).size / 1e6).toFixed(1)} MB`);
        return true;
      }
      console.warn(`    downloaded file failed xlsx validation — trying next snapshot`);
    } catch (err) {
      console.warn(`    download error: ${err.message} — trying next snapshot`);
    }
    try {
      unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
  return false;
}

// Ensure a single modern per-quarter LCA workbook (FY2020+) is cached locally.
// Returns the cached file path, or null if it could not be obtained.
async function ensureQuarterFile(year, q) {
  const file = path.join(CACHE_DIR, `LCA_Disclosure_Data_FY${year}_Q${q}.xlsx`);
  if (isValidXlsx(file)) {
    console.log(
      `  [cache] FY${year} Q${q} hit — ${(statSync(file).size / 1e6).toFixed(1)} MB`
    );
    return file;
  }
  if (!(await archiveReachable())) return null;

  const orig = quarterOrigUrl(year, q);
  // Prefer a known-good timestamp; otherwise resolve via the archive APIs
  // (which may return several captures so a bad/partial grab can be retried).
  let timestamps = KNOWN_Q_TS[`${year}_${q}`] ? [KNOWN_Q_TS[`${year}_${q}`]] : [];
  if (!timestamps.length) timestamps = await resolveTimestamps(orig);
  if (!timestamps.length) {
    console.warn(`    FY${year} Q${q}: no archived snapshot resolved`);
    return null;
  }
  const ok = await downloadArchived(orig, timestamps, file, `FY${year} Q${q}`, 900_000);
  return ok ? file : null;
}

// Ensure the older single-annual-file workbook (FY2016–FY2019) is cached.
async function ensureAnnualFile(year) {
  const file = path.join(CACHE_DIR, `H-1B_Disclosure_Data_FY${year}.xlsx`);
  if (isValidXlsx(file)) {
    console.log(`  [cache] FY${year} hit — ${(statSync(file).size / 1e6).toFixed(1)} MB`);
    return file;
  }
  if (!(await archiveReachable())) return null;

  for (const orig of originalUrls(year)) {
    const timestamps = await resolveTimestamps(orig);
    if (!timestamps.length) continue;
    const ok = await downloadArchived(orig, timestamps, file, `FY${year}`, 180_000);
    if (ok) return file;
  }
  return null;
}

// Ensure all source workbooks for `year` are cached. For FY2020+ this is the
// UNION of the four per-quarter LCA files (Q1–Q4); the quarterly disclosure
// files are per-quarter (non-cumulative), so the full fiscal year is the
// distinct-CASE_NUMBER union across all four. For FY2016–FY2019 it is the single
// annual H-1B disclosure workbook. Returns { files, expectedQuarters,
// landedQuarters, missingQuarters } or null if nothing could be obtained.
async function ensureCached(year) {
  if (year < 2020) {
    const file = await ensureAnnualFile(year);
    if (!file) return null;
    return { files: [file], expectedQuarters: 1, landedQuarters: 1, missingQuarters: [] };
  }

  const files = [];
  const missingQuarters = [];
  for (const q of [1, 2, 3, 4]) {
    const file = await ensureQuarterFile(year, q);
    if (file) files.push(file);
    else missingQuarters.push(q);
  }
  if (files.length === 0) return null;
  return {
    files,
    expectedQuarters: 4,
    landedQuarters: files.length,
    missingQuarters,
  };
}

// ─── Column mapping (tolerant of old vs new schema) ──────────────────────────

function normHeader(v) {
  return String(v == null ? "" : v)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// Logical field → ordered list of accepted header aliases (already normalized).
const COL_ALIASES = {
  caseNumber: ["CASE_NUMBER", "LCA_CASE_NUMBER", "LCA_CASE_NO"],
  caseStatus: ["CASE_STATUS", "STATUS", "APPROVAL_STATUS"],
  visaClass: ["VISA_CLASS", "PROGRAM_DESIGNATION"],
  jobTitle: ["JOB_TITLE", "LCA_CASE_JOB_TITLE"],
  socCode: ["SOC_CODE", "LCA_CASE_SOC_CODE", "OCCUPATIONAL_CODE"],
  socTitle: ["SOC_TITLE", "SOC_NAME", "LCA_CASE_SOC_NAME", "OCCUPATIONAL_TITLE"],
  wageFrom: [
    "WAGE_RATE_OF_PAY_FROM",
    "WAGE_RATE_OF_PAY",
    "WAGE_RATE_OF_PAY_FROM_1",
    "LCA_CASE_WAGE_RATE_FROM",
    "WAGE_RATE_FROM",
  ],
  wageTo: [
    "WAGE_RATE_OF_PAY_TO",
    "WAGE_RATE_OF_PAY_TO_1",
    "LCA_CASE_WAGE_RATE_TO",
    "WAGE_RATE_TO",
  ],
  wageUnit: [
    "WAGE_UNIT_OF_PAY",
    "WAGE_RATE_OF_PAY_UNIT",
    "WAGE_UNIT_OF_PAY_1",
    "LCA_CASE_WAGE_RATE_UNIT",
    "WAGE_RATE_UNIT",
  ],
  prevailingWage: [
    "PREVAILING_WAGE",
    "PW_WAGE",
    "PW_WAGE_1",
    "PREVAILING_WAGE_1",
    "LCA_CASE_PREVAILING_WAGE",
    "PW_1",
  ],
  pwUnit: ["PW_UNIT_OF_PAY", "PW_UNIT_OF_PAY_1", "PW_UNIT_1", "PW_WAGE_UNIT"],
  employerName: ["EMPLOYER_NAME", "LCA_CASE_EMPLOYER_NAME"],
  worksiteState: [
    "WORKSITE_STATE",
    "WORKSITE_STATE_1",
    "WORKLOC1_STATE",
    "LCA_CASE_WORKLOC1_STATE",
    "STATE_1",
    "STATE",
    "EMPLOYER_STATE",
  ],
  fullTime: ["FULL_TIME_POSITION", "FULL_TIME_POS", "LCA_CASE_FULL_TIME_POSITION"],
  totalWorkers: [
    "TOTAL_WORKER_POSITIONS",
    "TOTAL_WORKERS",
    "TOTAL_WORKERS_POSITION",
    "NBR_IMMIGRANTS",
  ],
};

// Build logicalField → 1-based column index from a header row's normalized names.
function buildColIndex(normNames) {
  const idx = {};
  for (const [field, aliases] of Object.entries(COL_ALIASES)) {
    for (const alias of aliases) {
      const at = normNames.indexOf(alias);
      if (at > 0) {
        idx[field] = at; // normNames is 1-based (index 0 is the empty slot)
        break;
      }
    }
  }
  return idx;
}

// ─── Value parsing / normalization ───────────────────────────────────────────

function cellText(v) {
  if (v == null) return "";
  if (typeof v === "object") {
    if (v.text != null) return String(v.text);
    if (v.result != null) return String(v.result);
    if (Array.isArray(v.richText)) return v.richText.map((r) => r.text).join("");
    if (v.hyperlink && v.text) return String(v.text);
  }
  return String(v);
}

function parseMoney(v) {
  if (v == null) return NaN;
  if (typeof v === "number") return v;
  let s = cellText(v).trim();
  if (!s) return NaN;
  // Old schema sometimes stores a range like "60000 - 70000"; take the first.
  s = s.split(/[-–]/)[0];
  s = s.replace(/[$,\s]/g, "");
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

const UNIT_MULT = {
  YEAR: 1,
  YR: 1,
  Y: 1,
  ANNUAL: 1,
  HOUR: 2080,
  HR: 2080,
  H: 2080,
  HOURLY: 2080,
  WEEK: 52,
  WK: 52,
  WEEKLY: 52,
  BIWEEKLY: 26,
  BI_WEEKLY: 26,
  "BI-WEEKLY": 26,
  MONTH: 12,
  MTH: 12,
  MONTHLY: 12,
};

function annualize(amount, unitRaw) {
  if (!Number.isFinite(amount) || amount <= 0) return NaN;
  const u = normHeader(unitRaw);
  const mult = UNIT_MULT[u] ?? (u ? NaN : 1);
  if (!Number.isFinite(mult)) return amount; // unknown unit → assume already annual
  return amount * mult;
}

// Plausible annual-wage window used to exclude junk from medians.
const WAGE_MIN = 10_000;
const WAGE_MAX = 5_000_000;

function normSocCode(v) {
  const s = cellText(v);
  const m = s.match(/(\d{2})\s*-?\s*(\d{4})/);
  return m ? `${m[1]}-${m[2]}` : "";
}

const STATE_CODES = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID",
  "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO",
  "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA",
  "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "PR",
]);

const STATE_NAME_TO_CODE = {
  ALABAMA: "AL", ALASKA: "AK", ARIZONA: "AZ", ARKANSAS: "AR", CALIFORNIA: "CA",
  COLORADO: "CO", CONNECTICUT: "CT", DELAWARE: "DE",
  "DISTRICT OF COLUMBIA": "DC", FLORIDA: "FL", GEORGIA: "GA", HAWAII: "HI",
  IDAHO: "ID", ILLINOIS: "IL", INDIANA: "IN", IOWA: "IA", KANSAS: "KS",
  KENTUCKY: "KY", LOUISIANA: "LA", MAINE: "ME", MARYLAND: "MD",
  MASSACHUSETTS: "MA", MICHIGAN: "MI", MINNESOTA: "MN", MISSISSIPPI: "MS",
  MISSOURI: "MO", MONTANA: "MT", NEBRASKA: "NE", NEVADA: "NV",
  "NEW HAMPSHIRE": "NH", "NEW JERSEY": "NJ", "NEW MEXICO": "NM",
  "NEW YORK": "NY", "NORTH CAROLINA": "NC", "NORTH DAKOTA": "ND", OHIO: "OH",
  OKLAHOMA: "OK", OREGON: "OR", PENNSYLVANIA: "PA", "RHODE ISLAND": "RI",
  "SOUTH CAROLINA": "SC", "SOUTH DAKOTA": "SD", TENNESSEE: "TN", TEXAS: "TX",
  UTAH: "UT", VERMONT: "VT", VIRGINIA: "VA", WASHINGTON: "WA",
  "WEST VIRGINIA": "WV", WISCONSIN: "WI", WYOMING: "WY", "PUERTO RICO": "PR",
};

function normState(v) {
  const s = cellText(v).trim().toUpperCase();
  if (!s) return "";
  if (s.length === 2 && STATE_CODES.has(s)) return s;
  const mapped = STATE_NAME_TO_CODE[s];
  return mapped || "";
}

function median(sortedOrArr) {
  const a = sortedOrArr;
  if (!a.length) return null;
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : Math.round((a[mid - 1] + a[mid]) / 2);
}

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return Math.round(sorted[lo]);
  const frac = rank - lo;
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * frac);
}

// ─── Aggregation state (accumulated across years) ────────────────────────────

const byYear = new Map(); // year → { certified, certifiedWithdrawn, totalWorker, employers:Set, wages:[] }
const occ = new Map(); // socCode → { titleByYear, countByYear, totalCount, medianWageByYear, wageCountByYear }
// Employers are UNBOUNDED (~1M distinct), so we NEVER collect per-employer wage
// arrays. Instead each employer carries a running (sum,count) accumulator so the
// mean offered wage stays memory-bounded regardless of how many employers exist.
const emp = new Map(); // employer → { totalCount, countByYear, wageSum, wageN }
const stateAgg = new Map(); // state → { totalCount, countByYear, medianWageByYear }
// Per-state occupation counts for byState[].topOccupations. Bounded: 52 states ×
// ~800 SOCs ≈ 40K entries total (accumulated across all years) — safe to keep.
const stateOcc = new Map(); // state → Map(socCode → count)

// SOC 2010→2018 crosswalk (loaded once in main). When present, every SOC code is
// normalized to the 2018 vintage before aggregating so an occupation that OFLC
// split across SOC vintages mid-window (e.g. 15-1132 → 15-1252) forms ONE trend.
let SOC_CROSSWALK = null;

// Normalize a raw ##-#### SOC code to the 2018 vintage (identity if no crosswalk
// or no mapping — 2018-native codes and unmapped codes pass through unchanged).
function toSoc2018(soc) {
  if (!soc || !SOC_CROSSWALK) return soc;
  return SOC_CROSSWALK.map.get(soc) ?? soc;
}

function bump(map, key, year) {
  let rec = map.get(key);
  if (!rec) {
    rec = { totalCount: 0, countByYear: {}, medianWageByYear: {} };
    map.set(key, rec);
  }
  rec.totalCount++;
  rec.countByYear[year] = (rec.countByYear[year] || 0) + 1;
  return rec;
}

// ─── Per-year stream parse ────────────────────────────────────────────────────

// Stream-parse a single workbook `file`, folding its rows into the shared
// aggregation state via `ctx`. `ctx.seenCases` (when non-null) de-duplicates by
// CASE_NUMBER so the UNION of the four quarterly files yields the full-year
// distinct case set exactly once — robust whether the quarterly files turn out
// to be cumulative or non-cumulative. Returns { rowsSeen, dupSkipped }.
async function parseFile(year, file, ctx) {
  const { yKey, yearRec, socWages, stateWages, seenCases } = ctx;

  const wbr = new ExcelJS.stream.xlsx.WorkbookReader(file, {
    entries: "emit",
    sharedStrings: "cache",
    worksheets: "emit",
    styles: "ignore",
    hyperlinks: "ignore",
  });

  let colIndex = null;
  let rowsSeen = 0;
  let dupSkipped = 0;
  let usedSheet = false;

  for await (const worksheet of wbr) {
    if (usedSheet) break; // disclosure data lives in the first worksheet
    for await (const row of worksheet) {
      const values = row.values; // 1-based array
      if (!colIndex) {
        const normNames = values.map((v) => normHeader(cellText(v)));
        const candidate = buildColIndex(normNames);
        // Only accept as header row if we found the essentials.
        if (candidate.caseStatus && candidate.socCode) {
          colIndex = candidate;
          usedSheet = true;
        }
        continue;
      }

      const get = (field) =>
        colIndex[field] != null ? values[colIndex[field]] : null;

      const status = normHeader(cellText(get("caseStatus")));
      // Blank CASE_STATUS ⇒ padding row (there are ~445K per quarterly file);
      // skip cheaply before any further work.
      if (status !== "CERTIFIED" && status !== "CERTIFIED_WITHDRAWN") continue;

      rowsSeen++;

      // De-dupe by CASE_NUMBER across the quarterly files of a fiscal year so a
      // case that appears in more than one quarter (or in cumulative files) is
      // counted exactly once. First occurrence wins.
      if (seenCases) {
        const caseNo = cellText(get("caseNumber")).trim().toUpperCase();
        if (caseNo) {
          if (seenCases.has(caseNo)) {
            dupSkipped++;
            continue;
          }
          seenCases.add(caseNo);
        }
      }

      // Keep only the H-1B visa family (the LCA file also holds H-1B1 & E-3).
      if (colIndex.visaClass != null) {
        const vc = normHeader(cellText(get("visaClass")));
        if (!vc.startsWith("H_1B")) continue;
      }

      if (status === "CERTIFIED_WITHDRAWN") {
        yearRec.certifiedWithdrawn++;
        continue;
      }

      // ── CERTIFIED row ──
      yearRec.certified++;

      let workers = parseMoney(get("totalWorkers"));
      if (!Number.isFinite(workers) || workers <= 0) workers = 1;
      yearRec.totalWorker += workers;

      const employer = cellText(get("employerName")).trim().replace(/\s+/g, " ").toUpperCase();
      let empRec = null;
      if (employer) {
        yearRec.employers.add(employer);
        empRec = bump(emp, employer, yKey);
      }

      const rawSoc = normSocCode(get("socCode"));
      const soc = toSoc2018(rawSoc);
      if (soc) {
        let socRec = occ.get(soc);
        if (!socRec) {
          socRec = {
            titleByYear: {},
            countByYear: {},
            totalCount: 0,
            medianWageByYear: {},
            wageCountByYear: {},
          };
          occ.set(soc, socRec);
        }
        socRec.totalCount++;
        socRec.countByYear[yKey] = (socRec.countByYear[yKey] || 0) + 1;
        const title = cellText(get("socTitle")).trim();
        if (title && !socRec.titleByYear[yKey]) socRec.titleByYear[yKey] = title;
      }

      const st = normState(get("worksiteState"));
      if (st) bump(stateAgg, st, yKey);

      // Per-state occupation counts (bounded: 52 states × ~800 SOCs).
      if (st && soc) {
        let socCounts = stateOcc.get(st);
        if (!socCounts) stateOcc.set(st, (socCounts = new Map()));
        socCounts.set(soc, (socCounts.get(soc) || 0) + 1);
      }

      const wage = annualize(parseMoney(get("wageFrom")), get("wageUnit"));
      if (Number.isFinite(wage) && wage >= WAGE_MIN && wage <= WAGE_MAX) {
        yearRec.wages.push(wage);
        // Running per-employer mean accumulator (NO arrays — employers are ~1M).
        if (empRec) {
          empRec.wageSum = (empRec.wageSum || 0) + wage;
          empRec.wageN = (empRec.wageN || 0) + 1;
        }
        if (soc) {
          let arr = socWages.get(soc);
          if (!arr) socWages.set(soc, (arr = []));
          arr.push(wage);
        }
        if (st) {
          let arr = stateWages.get(st);
          if (!arr) stateWages.set(st, (arr = []));
          arr.push(wage);
        }
      }
    }
    if (usedSheet) break;
  }

  if (!colIndex) {
    throw new Error(
      `FY${year}: could not locate a header row with CASE_STATUS + SOC_CODE columns in ${path.basename(file)}`
    );
  }

  return { rowsSeen, dupSkipped };
}

async function parseYear(year, files) {
  const yKey = String(year);
  const yearRec = {
    certified: 0,
    certifiedWithdrawn: 0,
    totalWorker: 0,
    employers: new Set(),
    wages: [],
  };
  byYear.set(year, yearRec);

  // Per-year transient wage buckets for SOC / state medians (freed after year).
  const socWages = new Map(); // soc → number[]
  const stateWages = new Map(); // state → number[]
  // De-dupe by CASE_NUMBER only for the multi-quarter modern years (FY2020+);
  // FY2016–FY2019 are single annual files and are left byte-for-byte unchanged.
  const seenCases = year >= 2020 ? new Set() : null;

  const ctx = { yKey, yearRec, socWages, stateWages, seenCases };

  let totalRows = 0;
  let totalDup = 0;
  for (const file of files) {
    const { rowsSeen, dupSkipped } = await parseFile(year, file, ctx);
    totalRows += rowsSeen;
    totalDup += dupSkipped;
    console.log(
      `  [parse] FY${year} ${path.basename(file)}: dataRows=${rowsSeen} dupSkipped=${dupSkipped}`
    );
  }

  // Finalize per-year percentiles.
  yearRec.wages.sort((a, b) => a - b);
  for (const [soc, arr] of socWages) {
    arr.sort((a, b) => a - b);
    const socRec = occ.get(soc);
    socRec.medianWageByYear[yKey] = median(arr);
    socRec.wageCountByYear[yKey] = arr.length;
  }
  for (const [st, arr] of stateWages) {
    arr.sort((a, b) => a - b);
    stateAgg.get(st).medianWageByYear[yKey] = median(arr);
  }

  console.log(
    `  [parse] FY${year} TOTAL: files=${files.length} dataRows=${totalRows} ` +
      `dupSkipped=${totalDup} certified=${yearRec.certified} ` +
      `certWithdrawn=${yearRec.certifiedWithdrawn} employers=${yearRec.employers.size} ` +
      `medianWage=${median(yearRec.wages)}`
  );
  return yearRec;
}

// ─── CAGR helper ─────────────────────────────────────────────────────────────

function cagr(countByYear, yearsPresent) {
  const ys = yearsPresent.filter((y) => countByYear[y] > 0);
  if (ys.length < 2) return null;
  const first = ys[0];
  const last = ys[ys.length - 1];
  const span = Number(last) - Number(first);
  if (span <= 0) return null;
  const c0 = countByYear[first];
  const c1 = countByYear[last];
  if (!c0 || !c1) return null;
  const r = Math.pow(c1 / c0, 1 / span) - 1;
  return Math.round(r * 10000) / 10000;
}

// ─── Occupation title resolution ─────────────────────────────────────────────

// Prefer the canonical 2018 SOC title from the crosswalk; otherwise fall back to
// the title from the most recent fiscal year that carried one for this code.
function resolveOccTitle(socCode, rec) {
  const canonical = SOC_CROSSWALK?.soc2018Title.get(socCode);
  if (canonical) return canonical;
  const titleByYear = rec && rec.titleByYear ? rec.titleByYear : {};
  const years = Object.keys(titleByYear).sort((a, b) => Number(b) - Number(a));
  for (const y of years) {
    if (titleByYear[y]) return titleByYear[y];
  }
  return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`H-1B/LCA trends builder — target FY: ${TARGET_YEARS.join(", ")}`);

  // Load the SOC 2010→2018 crosswalk up front so occupations are consolidated to
  // the 2018 vintage during aggregation. Graceful: if the archive fetch fails we
  // log a warning and fall back to raw SOC codes rather than crashing.
  try {
    SOC_CROSSWALK = await buildSocCrosswalk({ log: (msg) => console.log(msg) });
    console.log(
      `  [crosswalk] applied — ${SOC_CROSSWALK.map.size} 2010→2018 mappings, ` +
        `${SOC_CROSSWALK.soc2018Title.size} canonical titles`
    );
  } catch (err) {
    SOC_CROSSWALK = null;
    console.warn(
      `  [crosswalk] unavailable — falling back to raw SOC codes: ${err.message}`
    );
  }

  const landed = [];
  const skipped = [];
  const timings = [];
  const incompleteYears = []; // FY2020+ years missing one or more quarters

  for (const year of TARGET_YEARS) {
    const t0 = Date.now();
    let cached;
    try {
      cached = await ensureCached(year);
    } catch (err) {
      console.warn(`  FY${year}: download failed — ${err.message}`);
      cached = null;
    }
    const tDl = Date.now();
    if (!cached) {
      skipped.push({ year, reason: "download/archive unavailable" });
      console.warn(`  ⏭  FY${year} skipped (no cached workbook)`);
      continue;
    }
    if (cached.missingQuarters && cached.missingQuarters.length) {
      incompleteYears.push({
        year,
        landedQuarters: cached.landedQuarters,
        missingQuarters: cached.missingQuarters,
      });
      console.warn(
        `  ⚠  FY${year} INCOMPLETE — only ${cached.landedQuarters}/4 quarters ` +
          `(missing Q${cached.missingQuarters.join(", Q")}); counts will be an undercount`
      );
    }
    try {
      await parseYear(year, cached.files);
      landed.push(year);
    } catch (err) {
      byYear.delete(year);
      skipped.push({ year, reason: `parse error: ${err.message}` });
      console.warn(`  ⏭  FY${year} skipped — ${err.message}`);
      continue;
    }
    const tParse = Date.now();
    timings.push({
      year,
      downloadSec: Math.round((tDl - t0) / 100) / 10,
      parseSec: Math.round((tParse - tDl) / 100) / 10,
    });
  }

  if (landed.length === 0) {
    console.error("ERROR: no fiscal years parsed — refusing to write output.");
    process.exit(1);
  }

  landed.sort((a, b) => a - b);
  const latestYear = String(landed[landed.length - 1]);
  const yearKeys = landed.map(String);

  // ── byYear ──
  const byYearOut = landed.map((y) => {
    const r = byYear.get(y);
    return {
      fiscalYear: y,
      certifiedLcas: r.certified,
      certifiedWithdrawnLcas: r.certifiedWithdrawn,
      totalWorkerPositions: r.totalWorker,
      distinctEmployers: r.employers.size,
      medianWageAnnual: median(r.wages),
      p25WageAnnual: percentile(r.wages, 25),
      p75WageAnnual: percentile(r.wages, 75),
    };
  });

  // ── occupations (ALL SOCs with data), consolidated to the 2018 SOC vintage ──
  // wageByYear (median annual offered wage per fiscal year) is emitted ONLY for
  // high-volume occupations (totalCount >= WAGE_TRACK_MIN_TOTAL); smaller ones
  // have noisy medians and omit the field. Within a tracked occupation, a year
  // with too few wage samples (< MIN_WAGE_SAMPLES_PER_YEAR) is set to null.
  const WAGE_TRACK_MIN_TOTAL = 5000;
  const MIN_WAGE_SAMPLES_PER_YEAR = 50;
  const occupations = [...occ.entries()]
    .map(([socCode, r]) => {
      const base = {
        socCode,
        socTitle: resolveOccTitle(socCode, r),
        countByYear: r.countByYear,
        totalCount: r.totalCount,
        medianWageAnnualLatest: r.medianWageByYear[latestYear] ?? null,
        cagr: cagr(r.countByYear, yearKeys),
      };
      if (r.totalCount >= WAGE_TRACK_MIN_TOTAL) {
        const wageByYear = {};
        for (const y of yearKeys) {
          if (!(r.countByYear[y] > 0)) continue;
          const samples = r.wageCountByYear[y] ?? 0;
          wageByYear[y] =
            samples >= MIN_WAGE_SAMPLES_PER_YEAR ? r.medianWageByYear[y] ?? null : null;
        }
        base.wageByYear = wageByYear;
        base.medianWageByYear = wageByYear;
      }
      return base;
    })
    .sort((a, b) => b.totalCount - a.totalCount);

  // ── topEmployers (top 50 by total) ──
  // meanWageAnnual is a running per-employer mean of the offered wage, computed
  // from a bounded (sum,count) accumulator — no per-employer wage arrays are
  // ever collected, so memory stays flat across the ~1M distinct employers.
  const topEmployers = [...emp.entries()]
    .map(([employer, r]) => ({
      employer,
      totalCount: r.totalCount,
      countByYear: r.countByYear,
      meanWageAnnual: r.wageN > 0 ? Math.round(r.wageSum / r.wageN) : null,
    }))
    .sort((a, b) => b.totalCount - a.totalCount)
    .slice(0, 50);

  // ── byState (50 + DC + territories with data) ──
  // Each state gains wageByYear (median annual wage per fiscal year) and
  // topOccupations (top 5 SOCs by filing count within the state).
  const byState = [...stateAgg.entries()]
    .map(([state, r]) => {
      const wageByYear = {};
      for (const y of yearKeys) {
        if (!(r.countByYear[y] > 0)) continue;
        wageByYear[y] = r.medianWageByYear[y] ?? null;
      }
      const socCounts = stateOcc.get(state);
      const topOccupations = socCounts
        ? [...socCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([socCode, count]) => ({
              socCode,
              socTitle: resolveOccTitle(socCode, occ.get(socCode) ?? {}),
              count,
            }))
        : [];
      return {
        state,
        totalCount: r.totalCount,
        countByYear: r.countByYear,
        medianWageAnnualLatest: r.medianWageByYear[latestYear] ?? null,
        wageByYear,
        topOccupations,
      };
    })
    .sort((a, b) => b.totalCount - a.totalCount);

  const generatedAt = new Date().toISOString();
  const output = {
    meta: buildMeta({
      generatedAt,
      asOf: `FY${latestYear}`,
      source: {
        name: "DOL OFLC LCA Disclosure Data",
        publisher: "U.S. DOL OFLC",
        url: "https://www.dol.gov/agencies/eta/foreign-labor/performance",
      },
      version: "1.0.0",
    }),
    coverage: {
      fiscalYears: landed,
      skippedFiscalYears: skipped.map((s) => ({ fiscalYear: s.year, reason: s.reason })),
      incompleteFiscalYears: incompleteYears.map((i) => ({
        fiscalYear: i.year,
        quartersUsed: i.landedQuarters,
        missingQuarters: i.missingQuarters,
        note: `only ${i.landedQuarters}/4 quarterly files available — full-year count is an undercount`,
      })),
      source:
        "Wayback Machine archive of OFLC LCA disclosure files: per-quarter " +
        "(Q1–Q4) files summed by distinct CASE_NUMBER for FY2020+; single " +
        "annual H-1B disclosure files for FY2016–FY2019",
      aggregation:
        "FY2020+ full-year figures are the UNION of DISTINCT CASE_NUMBERs across " +
        "all four per-quarter LCA files (the quarterly files are per-quarter, " +
        "not cumulative). FY2016–FY2019 use the annual disclosure workbook.",
      socVintage: SOC_CROSSWALK ? "2018" : "mixed",
      socCrosswalkApplied: Boolean(SOC_CROSSWALK),
    },
    byYear: byYearOut,
    occupations,
    topEmployers,
    byState,
  };
  // Provenance note distinguishing filings from approvals.
  output.meta.note =
    "Per-quarter LCA files (Q1–Q4) summed by distinct CASE_NUMBER for FY2020+; " +
    "annual disclosure files for FY2016–FY2019. Certified H-1B LCAs are filings " +
    "(Labor Condition Applications), NOT visa approvals; wages annualized.";

  validateH1bTrends(output);

  const outPath = path.join(DATA_DIR, "h1b-trends.json");
  const jsonStr = JSON.stringify(output, null, 2) + "\n";
  writeFileSync(outPath, jsonStr);

  // ── Summary ──
  console.log("\n✅  Written data/h1b-trends.json");
  console.log(`   fiscal years landed : ${landed.join(", ")}`);
  console.log(`   occupations (SOCs)  : ${occupations.length}`);
  console.log(`   topEmployers        : ${topEmployers.length}`);
  console.log(`   byState             : ${byState.length}`);
  console.log(`   file size           : ${(jsonStr.length / 1024).toFixed(1)} KB`);
  for (const b of byYearOut) {
    console.log(
      `   FY${b.fiscalYear}: certified=${b.certifiedLcas} positions=${b.totalWorkerPositions} ` +
        `employers=${b.distinctEmployers} median=$${b.medianWageAnnual}`
    );
  }
  if (skipped.length) {
    console.log(
      `   skipped: ${skipped.map((s) => `FY${s.year} (${s.reason})`).join("; ")}`
    );
  }
  const top5 = occupations
    .map((o) => ({ soc: o.socCode, title: o.socTitle, latest: o.countByYear[latestYear] || 0 }))
    .sort((a, b) => b.latest - a.latest)
    .slice(0, 5);
  console.log(`   top 5 occupations by FY${latestYear} volume:`);
  for (const o of top5) console.log(`     ${o.soc} ${o.title ?? ""} — ${o.latest}`);
  for (const t of timings) {
    console.log(`   timing FY${t.year}: download=${t.downloadSec}s parse=${t.parseSec}s`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
