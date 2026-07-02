/**
 * scripts/lib/soc-crosswalk.mjs
 *
 * Shared SOC 2010 → 2018 crosswalk loader. The U.S. BLS switched the Standard
 * Occupational Classification (SOC) vintage from 2010 to 2018 partway through
 * several federal datasets (OFLC LCA disclosure files, OEWS, etc.), which splits
 * the SAME occupation across two different SOC codes over time. This module
 * fetches the authoritative BLS `soc_2010_to_2018_crosswalk.xlsx` (via the
 * Wayback Machine `…/2id_/…` identity mirror, since bls.gov's edge 403s
 * non-browser clients) and builds a 2010→2018 mapping so callers can normalize
 * every row to the 2018 vintage before aggregating.
 *
 * The workbook is cached (once) under `.cache/soc-crosswalk/` (gitignored) so
 * re-runs and multiple builders don't re-download it.
 *
 * Exported: buildSocCrosswalk(options) → {
 *   map:          Map<soc2010, soc2018>        (primary/first 2018 target)
 *   multi:        Map<soc2010, Set<soc2018>>   (all 2018 targets — splits)
 *   soc2018Title: Map<soc2018, string>         (canonical 2018 SOC titles)
 * }
 */

import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
} from "fs";
import { Readable } from "stream";
import path from "path";
import { fileURLToPath } from "url";
import ExcelJS from "exceljs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");

// BLS SOC 2010→2018 crosswalk, served through the Wayback identity mirror.
export const CROSSWALK_URL =
  "https://web.archive.org/web/2id_/https://www.bls.gov/soc/2018/soc_2010_to_2018_crosswalk.xlsx";

const DEFAULT_CACHE_DIR = path.join(ROOT, ".cache", "soc-crosswalk");
const CACHE_FILENAME = "soc_2010_to_2018_crosswalk.xlsx";

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) FutureGrid SOC crosswalk loader (+https://www.bls.gov/soc/2018/)";

// ─── Small parsing helpers (kept local so the module is self-contained) ──────

function cellText(value) {
  if (value == null) return "";
  if (typeof value === "object") {
    if (value.richText) return value.richText.map((r) => r.text ?? "").join("");
    if (value.text) return String(value.text);
    if (value.result != null) return String(value.result);
  }
  return String(value);
}

function normHeader(value) {
  return cellText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function validSoc(code) {
  const m = String(code ?? "").match(/\b(\d{2}-\d{4})(?:\.\d{2})?\b/);
  return m?.[1] ?? null;
}

// Strip BLS footnote markers like " (##)" or " (1)" from a SOC title.
function cleanTitle(value) {
  return cellText(value)
    .replace(/\s*\((?:#+|\d+)\)\s*$/, "")
    .trim();
}

// Locate the header row containing all required predicates; returns the row
// number plus a { key → 1-based column } map. `headers` is the normalized row.
function findHeader(ws, predicates, maxRows = 30) {
  for (let rowNumber = 1; rowNumber <= Math.min(maxRows, ws.rowCount); rowNumber += 1) {
    const row = ws.getRow(rowNumber);
    const headers = [];
    for (let col = 1; col <= ws.columnCount; col += 1) {
      headers.push(normHeader(row.getCell(col).value));
    }
    const found = Object.fromEntries(
      Object.entries(predicates).map(([key, predicate]) => [
        key,
        headers.findIndex(predicate) + 1,
      ])
    );
    if (Object.values(found).every((col) => col > 0)) {
      return { rowNumber, columns: found, headers };
    }
  }
  return null;
}

// ─── Cache-aware download ────────────────────────────────────────────────────

function isValidXlsx(file, minBytes = 10_000) {
  try {
    const st = statSync(file);
    if (st.size < minBytes) return false;
    const head = readFileSync(file, { flag: "r" });
    return head[0] === 0x50 && head[1] === 0x4b; // "PK"
  } catch {
    return false;
  }
}

async function fetchWithTimeout(url, opts, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
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

// Ensure the crosswalk workbook is cached; returns the local file path.
async function ensureCachedWorkbook({ cacheDir, timeoutMs, retries, log }) {
  const file = path.join(cacheDir, CACHE_FILENAME);
  if (isValidXlsx(file)) {
    log(`  [crosswalk] cache hit — ${(statSync(file).size / 1e3).toFixed(0)} KB`);
    return file;
  }
  if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });

  let lastErr = null;
  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    const tmp = `${file}.part`;
    try {
      log(`  [crosswalk] downloading (attempt ${attempt}/${retries + 1})…`);
      const res = await fetchWithTimeout(
        CROSSWALK_URL,
        { headers: { "User-Agent": UA }, redirect: "follow" },
        timeoutMs
      );
      if (!res.ok || !res.body) {
        lastErr = new Error(`HTTP ${res.status}`);
        continue;
      }
      await streamToFile(res, tmp);
      if (isValidXlsx(tmp)) {
        renameSync(tmp, file);
        log(`  [crosswalk] downloaded — ${(statSync(file).size / 1e3).toFixed(0)} KB`);
        return file;
      }
      lastErr = new Error("downloaded file failed xlsx validation");
      try {
        unlinkSync(tmp);
      } catch {
        /* ignore */
      }
    } catch (err) {
      lastErr = err;
      try {
        unlinkSync(tmp);
      } catch {
        /* ignore */
      }
    }
  }
  throw new Error(
    `could not fetch SOC crosswalk: ${lastErr ? lastErr.message : "unknown error"}`
  );
}

/**
 * Build the SOC 2010 → 2018 crosswalk.
 *
 * @param {{
 *   cacheDir?: string,
 *   timeoutMs?: number,
 *   retries?: number,
 *   log?: (msg: string) => void,
 * }} [options]
 * @returns {Promise<{
 *   map: Map<string, string>,
 *   multi: Map<string, Set<string>>,
 *   soc2018Title: Map<string, string>,
 * }>}
 */
export async function buildSocCrosswalk(options = {}) {
  const cacheDir = options.cacheDir ?? DEFAULT_CACHE_DIR;
  const timeoutMs = options.timeoutMs ?? 90_000;
  const retries = options.retries ?? 2;
  const log = options.log ?? (() => {});

  const file = await ensureCachedWorkbook({ cacheDir, timeoutMs, retries, log });

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(readFileSync(file));
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("SOC crosswalk workbook has no worksheets");

  const header = findHeader(
    ws,
    {
      soc2010: (h) => h.includes("2010 soc code"),
      soc2018: (h) => h.includes("2018 soc code"),
    },
    30
  );
  if (!header) throw new Error("could not find SOC crosswalk headers");

  // Optional 2018 title column (present in the BLS workbook).
  const titleCol = header.headers.findIndex((h) => h.includes("2018 soc title")) + 1;

  const map = new Map(); // soc2010 → soc2018 (first target wins)
  const multi = new Map(); // soc2010 → Set<soc2018>
  const soc2018Title = new Map(); // soc2018 → canonical title

  for (let rowNumber = header.rowNumber + 1; rowNumber <= ws.rowCount; rowNumber += 1) {
    const row = ws.getRow(rowNumber);
    const from = validSoc(row.getCell(header.columns.soc2010).value);
    const to = validSoc(row.getCell(header.columns.soc2018).value);
    if (titleCol > 0 && to) {
      const title = cleanTitle(row.getCell(titleCol).value);
      if (title && !soc2018Title.has(to)) soc2018Title.set(to, title);
    }
    if (!from || !to) continue;
    if (!map.has(from)) map.set(from, to);
    const set = multi.get(from) ?? new Set();
    set.add(to);
    multi.set(from, set);
  }

  log(
    `  [crosswalk] ${map.size} SOC-2010 codes → 2018 (${soc2018Title.size} titles)`
  );
  return { map, multi, soc2018Title };
}
