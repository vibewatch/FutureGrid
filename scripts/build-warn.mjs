#!/usr/bin/env node
/**
 * build-warn.mjs
 * Multi-state WARN Act notices: live adapters plus all-state coverage metadata.
 * Emits data/warn-notices.json with normalized records and aggregate summary.
 * Run: node scripts/build-warn.mjs  (or: npm run build:warn)
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import nextEnv from "@next/env";
import ExcelJS from "exceljs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
nextEnv.loadEnvConfig(ROOT);

const DATA_DIR = path.join(ROOT, "data");
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const MAX_NOTICES_PER_STATE = 2500;
// Keep only the latest 10 years of notices (drop older historical rows).
const MIN_NOTICE_YEAR = new Date().getUTCFullYear() - 10;
const MIN_NOTICE_DATE = `${MIN_NOTICE_YEAR}-01-01`;
const MIN_PLAUSIBLE_WARN_DATE = "2010-01-01";

// ─── Generic HTTP fetch with retry + exponential backoff ────────────────────

async function fetchBuffer(url, maxAttempts = 3) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const buf = Buffer.from(await res.arrayBuffer());
      console.log(`  [fetch] ${url.slice(0, 80)} → ${(buf.length / 1024).toFixed(1)} KB`);
      return buf;
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) {
        const delay = attempt * 2000;
        console.warn(`  [retry ${attempt}/${maxAttempts}] ${err.message} — waiting ${delay}ms…`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
}

async function fetchText(url, maxAttempts = 3) {
  return (await fetchBuffer(url, maxAttempts)).toString("utf-8");
}

// ─── Cell / header helpers ───────────────────────────────────────────────────

function normalizeHeader(val) {
  if (val == null) return "";
  let text =
    typeof val === "object" && val.richText
      ? val.richText.map((r) => r.text ?? "").join("")
      : String(val);
  return text.replace(/\s+/g, " ").replace(/\s*\/\s*/g, "/").trim().toLowerCase();
}

function cellStr(cell) {
  if (cell == null || cell.value == null) return null;
  const v = cell.value;
  if (v instanceof Date) return null;
  if (typeof v === "object" && v.richText)
    return v.richText.map((r) => r.text).join("").trim() || null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function parseDate(val) {
  if (val == null) return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    let y = val.getUTCFullYear();
    // ExcelJS may return 2-digit year (e.g. 26 instead of 2026) for short-format cells
    if (y < 100) y = y <= 50 ? 2000 + y : 1900 + y;
    return fmtDate(y, val.getUTCMonth() + 1, val.getUTCDate());
  }
  if (typeof val === "number" && val > 1000 && val < 100000) {
    const d = new Date(new Date(Date.UTC(1899, 11, 30)).getTime() + val * 86400000);
    if (isNaN(d.getTime())) return null;
    return fmtDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  if (typeof val === "string") {
    let s = val.trim();
    if (!s) return null;
    // Strip known prefixes like "Updated"
    s = s.replace(/^[A-Za-z]+(?=\d)/, "").trim();
    // Collapse internal whitespace inside number sequences (e.g. "201 7" → "2017")
    s = s.replace(/(\d)\s+(\d)/g, "$1$2");
    // Strip date ranges ("4/10/26 - 11/26/26", "1/3/2023 to 2/28/2023") — keep first date
    const rangeIdx = s.search(/ [-–] | to /);
    if (rangeIdx !== -1) s = s.slice(0, rangeIdx).trim();
    // ISO: YYYY-MM-DD
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    // Compact: YYYYMMDD (e.g. WI NoticeRcvd "20200102")
    const compact = s.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (compact) return fmtDate(+compact[1], +compact[2], +compact[3]);
    // M/D/YYYY, M/D/YY, or extra-digit like "02018" — unified handler
    const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d+)/);
    if (mdy) {
      let yr = mdy[3];
      if (yr.length > 4) yr = yr.slice(-4);            // "02018" → "2018"
      else if (yr.length === 2) yr = String(+yr <= 50 ? 2000 + +yr : 1900 + +yr); // "26" → "2026"
      else if (yr.length !== 4) return null;            // 1 or 3 digits → unparseable
      return fmtDate(+yr, +mdy[1], +mdy[2]);
    }
    if (/^\d{4}$/.test(s)) return null;
    if (/^[1-4]\d{4}$/.test(s)) return null;
    if (/^q[1-4]\s*\d{4}$/i.test(s)) return null;
    if (/^\d{1,2}\/\d{4}$/.test(s)) return null;
    const d = new Date(s);
    if (!isNaN(d.getTime()) && d.getUTCFullYear() > 1900) return d.toISOString().slice(0, 10);
  }
  return null;
}

function parsePlausibleWarnDate(val, minDate = MIN_PLAUSIBLE_WARN_DATE) {
  const date = parseDate(val);
  return date && date >= minDate ? date : null;
}

function scrubImplausibleEffectiveDates(records, state) {
  let scrubbed = 0;
  for (const record of records) {
    if (record.effectiveDate && record.effectiveDate < MIN_PLAUSIBLE_WARN_DATE) {
      record.effectiveDate = null;
      scrubbed++;
    }
  }
  if (scrubbed > 0) console.warn(`  ${state}: nulled ${scrubbed} implausible pre-2010 effective date(s)`);
  return records;
}

function fmtDate(y, m, d) {
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    !Number.isInteger(y) ||
    !Number.isInteger(m) ||
    !Number.isInteger(d) ||
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() + 1 !== m ||
    date.getUTCDate() !== d
  ) {
    return null;
  }
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function normalizeLayoffType(t) {
  if (!t) return null;
  const s = t.trim().toLowerCase();
  if (/^(cl|closure)$/i.test(t.trim())) return "Closure";
  if (/^(lo|layoff)$/i.test(t.trim())) return "Layoff";
  if (/plant.clos|closure.perm|perm.*clos|clos.*perm/.test(s)) return "Closure";
  if (/layoff.perm|perm.*layoff/.test(s)) return "Layoff Permanent";
  if (/layoff.temp|temp.*layoff/.test(s)) return "Layoff Temporary";
  return t.trim();
}

function extractCityCA(address) {
  if (!address) return null;
  const m = address.match(/,\s*([^,]+),\s*CA\b/i) ?? address.match(/,\s*([^,]+)\s+CA\s+\d{5}/i);
  return m ? m[1].trim() : null;
}

// ─── RFC-4180 CSV parser (handles quoted fields with embedded commas/newlines) ─

function parseCSV(text) {
  const rows = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    if (text[i] === "\r" || text[i] === "\n") {
      if (text[i] === "\r") i++;
      if (i < n && text[i] === "\n") i++;
      continue;
    }
    const row = [];
    while (true) {
      if (i < n && text[i] === '"') {
        i++;
        let field = "";
        while (i < n) {
          if (text[i] === '"') {
            if (i + 1 < n && text[i + 1] === '"') { field += '"'; i += 2; }
            else { i++; break; }
          } else {
            field += text[i++];
          }
        }
        row.push(field);
      } else {
        let field = "";
        while (i < n && text[i] !== "," && text[i] !== "\n" && text[i] !== "\r")
          field += text[i++];
        row.push(field);
      }
      if (i < n && text[i] === ",") { i++; } else { break; }
    }
    if (i < n && text[i] === "\r") i++;
    if (i < n && text[i] === "\n") i++;
    if (row.length > 0) rows.push(row);
  }
  return rows;
}

// ─── Lightweight HTML helpers for official static tables/accordions ──────────

function decodeHtmlEntities(value) {
  const named = {
    amp: "&",
    apos: "'",
    bull: "•",
    gt: ">",
    ldquo: "“",
    lsquo: "‘",
    lt: "<",
    nbsp: " ",
    ndash: "–",
    quot: '"',
    rdquo: "”",
    rsquo: "’",
  };
  return String(value ?? "").replace(/&(#x[\da-f]+|#\d+|[a-z][\da-z]+);/gi, (match, entity) => {
    const key = entity.toLowerCase();
    if (key.startsWith("#x")) {
      const code = Number.parseInt(key.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    if (key.startsWith("#")) {
      const code = Number.parseInt(key.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return named[key] ?? match;
  });
}

function htmlToText(fragment) {
  return decodeHtmlEntities(fragment)
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:div|h[1-6]|li|p|td|th|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t\f\v\u00a0]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function htmlCellText(fragment) {
  return htmlToText(fragment).replace(/\s+/g, " ").trim();
}

function extractHtmlTables(html) {
  const tables = [];
  for (const tableMatch of html.matchAll(/<table\b[\s\S]*?<\/table>/gi)) {
    const rows = [];
    for (const rowMatch of tableMatch[0].matchAll(/<tr\b[\s\S]*?<\/tr>/gi)) {
      const cells = [];
      for (const cellMatch of rowMatch[0].matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)) {
        cells.push(htmlCellText(cellMatch[1]));
      }
      if (cells.some(Boolean)) rows.push(cells);
    }
    if (rows.length) tables.push(rows);
  }
  return tables;
}

function findHtmlTable(html, requiredHeaderTests) {
  for (const rows of extractHtmlTables(html)) {
    const headerRow = rows.findIndex((row) => {
      const headers = row.map(normalizeHeader);
      return requiredHeaderTests.every((test) => headers.some(test));
    });
    if (headerRow !== -1) {
      return { rows, headerRow, headers: rows[headerRow].map(normalizeHeader) };
    }
  }
  return null;
}

function findHeaderIndex(headers, tests) {
  for (let index = 0; index < headers.length; index++) {
    const header = headers[index];
    if (tests.some((test) => test(header))) return index;
  }
  return null;
}

function parseEmployees(value) {
  if (value == null) return NaN;
  const match = String(value).replace(/\u00a0/g, " ").match(/\d[\d,]*/);
  if (!match) return NaN;
  return Number(match[0].replace(/,/g, ""));
}

function cleanOptionalText(value) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text || /^(?:n\/?a|none|null)$/i.test(text)) return null;
  return text;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractCityFromLocation(value, stateCode, stateName = stateCode) {
  const raw = cleanOptionalText(value);
  if (!raw || /^(?:statewide|various|remote)(?:\b|$)/i.test(raw)) return null;

  const statePattern = [stateCode, stateName].filter(Boolean).map(escapeRegExp).join("|");
  const beforeState =
    raw.match(new RegExp(`(.+?)\\s*,?\\s*(?:${statePattern})\\s*(?:\\d{5}(?:-\\d{4})?)?\\b`, "i"))?.[1] ??
    raw;
  const withoutNotes = beforeState.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  const commaParts = withoutNotes.split(",").map((part) => part.trim()).filter(Boolean);
  let candidate = commaParts.length > 1 ? commaParts.at(-1) : withoutNotes;

  const streetMatch = candidate.match(
    /\b(?:airport|avenue|ave|blvd|boulevard|center|centre|cir|circle|court|ct|drive|dr|highway|hwy|lane|ln|mall|parkway|pkwy|place|pl|pike|road|rd|square|sq|street|st|suite|trail|trl|way)\.?\s+([A-Z][A-Za-z .'-]+)$/i,
  );
  if (streetMatch) candidate = streetMatch[1].trim();

  candidate = candidate.replace(/\b(?:VA|MD|NC|PA)\b$/i, "").replace(/\s+/g, " ").trim();
  if (!candidate || /^(?:statewide|various|remote|headquarters)$/i.test(candidate)) return null;
  if (/\d/.test(candidate) || candidate.length > 80) return null;
  return candidate;
}

function extractLinks(html, baseUrl) {
  const links = [];
  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = match[1].match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    try {
      links.push({
        url: new URL(decodeHtmlEntities(href), baseUrl).toString(),
        text: htmlCellText(match[2]),
      });
    } catch {
      // Ignore malformed or non-HTTP links.
    }
  }
  return links;
}

// ─── exceljs row → normalized record helper ──────────────────────────────────

function parseXlsxRow(row, colIndex, state, stateName) {
  const getVal = (key) => (colIndex[key] != null ? row.getCell(colIndex[key]).value : null);
  const getStr = (key) => (colIndex[key] != null ? cellStr(row.getCell(colIndex[key])) : null);

  const company = getStr("company")?.trim() ?? null;
  if (!company || /^\s*(total|grand total|subtotal)\s*$/i.test(company)) return null;

  const empRaw = getVal("employees");
  let employees =
    typeof empRaw === "number"
      ? empRaw
      : typeof empRaw === "string"
      ? Number(empRaw.replace(/,/g, "").trim())
      : NaN;
  if (!isFinite(employees) || employees <= 0) return null;

  return {
    company,
    county: getStr("county")?.trim() || null,
    city: getStr("city")?.trim() || null,
    employees: Math.round(employees),
    noticeDate: parseDate(getVal("noticeDate")),
    effectiveDate: parseDate(getVal("effectiveDate")),
    layoffType: normalizeLayoffType(getStr("layoffType")?.trim()),
    state,
    stateName,
  };
}

// ─── State fetch functions ────────────────────────────────────────────────────

async function fetchCA() {
  const urls = [
    "https://edd.ca.gov/siteassets/files/jobs_and_training/warn/warn_report1.xlsx",
    "https://edd.ca.gov/siteassets/files/jobs_and_training/warn/warn_report.xlsx",
    "https://edd.ca.gov/siteassets/files/jobs_and_training/warn/warn-report.xlsx",
  ];

  let buffer = null;
  for (const url of urls) {
    try { buffer = await fetchBuffer(url); break; }
    catch (err) { console.warn(`  CA: failed ${url}: ${err.message}`); }
  }
  if (!buffer) throw new Error("All CA WARN xlsx URLs failed");

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  let worksheet = null;
  for (const ws of workbook.worksheets) {
    if (/detailed.*warn/i.test(ws.name)) { worksheet = ws; break; }
  }
  if (!worksheet) {
    let best = null, bestCount = 0;
    for (const ws of workbook.worksheets) {
      let count = 0;
      ws.eachRow((row) => {
        const v = row.values;
        if (v && v.length > 3 && typeof v[2] === "string" && typeof v[4] === "number") count++;
      });
      if (count > bestCount) { bestCount = count; best = ws; }
    }
    worksheet = best;
  }
  if (!worksheet) throw new Error("CA: no suitable worksheet found");

  const COL_KEYS = {
    company:       ["company"],
    county:        ["county/parish", "county"],
    layoffType:    ["layoff/closure", "layoff closure", "layoff type", "type"],
    employees:     ["no. of employees", "no of employees", "employees", "# employees", "number of employees"],
    address:       ["address"],
    noticeDate:    ["notice date"],
    effectiveDate: ["effective date"],
  };

  let headerRow = -1;
  const colIndex = {};
  worksheet.eachRow((row, rowNumber) => {
    if (headerRow !== -1) return;
    const cells = row.values;
    if (!cells) return;
    const norm = cells.map((v) => (v == null ? "" : normalizeHeader(v)));
    if (!norm.some((h) => h.includes("company")) || !norm.some((h) => h.includes("employees"))) return;
    headerRow = rowNumber;
    for (const [key, aliases] of Object.entries(COL_KEYS)) {
      for (let i = 1; i < norm.length; i++) {
        const h = norm[i];
        if (aliases.some((a) => h === a || h.startsWith(a)) && !(key in colIndex)) colIndex[key] = i;
      }
    }
  });
  if (headerRow === -1) throw new Error("CA: header row not found");
  console.log(`  CA header=${headerRow} cols=${JSON.stringify(colIndex)}`);

  const records = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRow) return;
    const getVal = (key) => (colIndex[key] ? row.getCell(colIndex[key]).value : null);
    const getStr = (key) => (colIndex[key] ? cellStr(row.getCell(colIndex[key])) : null);

    const company = getStr("company")?.trim() ?? null;
    if (!company || /^\s*(total|grand total|subtotal)\s*$/i.test(company)) return;

    const empRaw = getVal("employees");
    let employees =
      typeof empRaw === "number" ? empRaw
      : typeof empRaw === "string" ? Number(empRaw.replace(/,/g, "").trim())
      : NaN;
    if (!isFinite(employees) || employees <= 0) return;

    const city = extractCityCA(getStr("address") ?? "");
    records.push({
      company,
      county: getStr("county")?.trim() || null,
      city,
      employees: Math.round(employees),
      noticeDate: parseDate(getVal("noticeDate")),
      effectiveDate: parseDate(getVal("effectiveDate")),
      layoffType: normalizeLayoffType(getStr("layoffType")?.trim()),
      state: "CA",
      stateName: "California",
    });
  });
  return records;
}

async function fetchNJ() {
  const url = "https://www.nj.gov/labor/assets/PDFs/WARN/WARN_Notice_Archive.xlsx";
  const buffer = await fetchBuffer(url);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const MONTH_NUM = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  };

  const records = [];
  let sheetsOk = 0;

  for (const ws of workbook.worksheets) {
    // Derive year from sheet name "YYYY WARN Notices"
    const yearMatch = ws.name.match(/(\d{4})/);
    if (!yearMatch) continue;
    const sheetYear = +yearMatch[1];

    // Detect header row
    let headerRow = -1;
    const colIndex = {};
    ws.eachRow((row, rowNumber) => {
      if (headerRow !== -1) return;
      const cells = row.values;
      if (!cells) return;
      const norm = cells.map((v) => (v == null ? "" : normalizeHeader(v)));
      if (!norm.some((h) => h.includes("company") || h.includes("employer"))) return;
      headerRow = rowNumber;
      for (let i = 1; i < norm.length; i++) {
        const h = norm[i];
        if (!h) continue;
        if ((h.includes("company") || h.includes("employer")) && colIndex.company == null) colIndex.company = i;
        else if (h.includes("city") && colIndex.city == null) colIndex.city = i;
        else if (h.includes("county") && colIndex.county == null) colIndex.county = i;
        else if ((h === "month posted" || h === "month") && colIndex.monthPosted == null) colIndex.monthPosted = i;
        else if ((h.includes("worker") || h.includes("employee") || h.includes("affected")) && colIndex.employees == null) colIndex.employees = i;
        else if ((h.includes("effective") || h.includes("layoff date")) && colIndex.effectiveDate == null) colIndex.effectiveDate = i;
        else if ((h.includes("type") || h.includes("reason")) && colIndex.layoffType == null) colIndex.layoffType = i;
      }
    });
    if (headerRow === -1) continue;
    sheetsOk++;

    ws.eachRow((row, rowNumber) => {
      if (rowNumber <= headerRow) return;
      const getVal = (key) => (colIndex[key] != null ? row.getCell(colIndex[key]).value : null);
      const getStr = (key) => (colIndex[key] != null ? cellStr(row.getCell(colIndex[key])) : null);

      const company = getStr("company")?.trim() ?? null;
      if (!company || /^\s*(total|grand total|subtotal)\s*$/i.test(company)) return;

      const empRaw = getVal("employees");
      let employees =
        typeof empRaw === "number" ? empRaw
        : typeof empRaw === "string" ? Number(empRaw.replace(/,/g, "").trim())
        : NaN;
      if (!isFinite(employees) || employees <= 0) return;

      // Construct noticeDate from "Month Posted" month name + sheet year
      let noticeDate = null;
      const monthName = getStr("monthPosted")?.trim().toLowerCase() ?? null;
      const monthNum = monthName ? MONTH_NUM[monthName] : null;
      if (monthNum && sheetYear) noticeDate = fmtDate(sheetYear, monthNum, 1);

      records.push({
        company,
        county: getStr("county")?.trim() || null,
        city: getStr("city")?.trim() || null,
        employees: Math.round(employees),
        noticeDate,
        effectiveDate: parseDate(getVal("effectiveDate")),
        layoffType: normalizeLayoffType(getStr("layoffType")?.trim()),
        state: "NJ",
        stateName: "New Jersey",
      });
    });
  }

  console.log(`  NJ: processed ${sheetsOk} sheets`);
  if (records.length === 0) throw new Error("NJ: no valid records after processing all sheets");
  return records;
}

async function fetchTX() {
  const url = "https://storage.googleapis.com/bln-data-public/warn-layoffs/tx_historical.xlsx";
  const buffer = await fetchBuffer(url);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  // Known headers (normalized): job_site_name, city_name, county_name,
  //   total_layoff_number, notice_date, layoff_date, layoff_reason_description
  let worksheet = workbook.worksheets[0], headerRow = 1, colIndex = {};

  for (const ws of workbook.worksheets) {
    let found = false;
    ws.eachRow((row, rowNumber) => {
      if (found) return;
      const cells = row.values;
      if (!cells) return;
      const norm = cells.map((v) => (v == null ? "" : normalizeHeader(v)));
      if (norm.some((h) => h.includes("job_site") || h.includes("job site") || h === "company") &&
          norm.some((h) => h.includes("total_layoff") || h.includes("layoff_number") || h.includes("layoff number"))) {
        worksheet = ws; headerRow = rowNumber;
        console.log(`  TX sheet="${ws.name}" header=${rowNumber} raw: ${norm.filter(Boolean).join(" | ")}`);
        for (let i = 1; i < norm.length; i++) {
          const h = norm[i];
          if (!h) continue;
          if ((h === "job_site_name" || h.includes("job_site") || h.includes("job site") || (h === "company" && colIndex.company == null)) && colIndex.company == null) colIndex.company = i;
          else if ((h === "city_name" || h === "city") && colIndex.city == null) colIndex.city = i;
          else if ((h === "county_name" || h === "county") && colIndex.county == null) colIndex.county = i;
          else if ((h === "total_layoff_number" || h.includes("total_layoff") || h.includes("layoff_number")) && colIndex.employees == null) colIndex.employees = i;
          else if ((h === "notice_date" || h === "notice date") && colIndex.noticeDate == null) colIndex.noticeDate = i;
          else if ((h === "layoff_date" || (h.includes("layoff") && h.includes("date") && h !== "notice_date")) && colIndex.effectiveDate == null) colIndex.effectiveDate = i;
          else if ((h === "layoff_reason_description" || h.includes("reason")) && colIndex.layoffType == null) colIndex.layoffType = i;
        }
        found = true;
      }
    });
    if (found) break;
  }
  console.log(`  TX colIndex: ${JSON.stringify(colIndex)}`);

  const records = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRow) return;
    const rec = parseXlsxRow(row, colIndex, "TX", "Texas");
    if (rec) records.push(rec);
  });
  return records;
}

async function fetchNY() {
  const url = "https://storage.googleapis.com/bln-data-public/warn-layoffs/ny_historical.xlsx";
  const buffer = await fetchBuffer(url);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  // Expected normalized headers: company, notice date, number affected, region, plant closing/layoff/closure, effective date
  let worksheet = workbook.worksheets[0], headerRow = 1, colIndex = {};

  for (const ws of workbook.worksheets) {
    let found = false;
    ws.eachRow((row, rowNumber) => {
      if (found) return;
      const cells = row.values;
      if (!cells) return;
      const norm = cells.map((v) => (v == null ? "" : normalizeHeader(v)));
      if (
        norm.some((h) => h === "company" || h.includes("employer")) &&
        norm.some((h) => h.includes("affected") || h.includes("employee") || h.includes("worker") || h.includes("number"))
      ) {
        worksheet = ws; headerRow = rowNumber;
        console.log(`  NY sheet="${ws.name}" header=${rowNumber} raw: ${norm.filter(Boolean).join(" | ")}`);
        for (let i = 1; i < norm.length; i++) {
          const h = norm[i];
          if (!h) continue;
          if ((h === "company" || h.includes("employer")) && colIndex.company == null) colIndex.company = i;
          else if (h === "notice date" && colIndex.noticeDate == null) colIndex.noticeDate = i;
          else if ((h.includes("affected") || h === "number affected") && colIndex.employees == null) colIndex.employees = i;
          else if ((h === "region" || h.includes("county") || h.includes("district")) && colIndex.county == null) colIndex.county = i;
          else if ((h.includes("city") || h.includes("address") || h.includes("location") || h.includes("municipality")) && colIndex.city == null) colIndex.city = i;
          else if ((h.includes("plant clos") || h.includes("layoff/closure") || h.includes("type") || h.includes("reason") || h.includes("action")) && colIndex.layoffType == null) colIndex.layoffType = i;
          else if ((h.includes("effective") || (h.includes("layoff") && h.includes("date"))) && colIndex.effectiveDate == null) colIndex.effectiveDate = i;
        }
        found = true;
      }
    });
    if (found) break;
  }
  console.log(`  NY colIndex: ${JSON.stringify(colIndex)}`);

  const records = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRow) return;
    const rec = parseXlsxRow(row, colIndex, "NY", "New York");
    if (rec) records.push(rec);
  });
  return records;
}

async function fetchOH() {
  const url = "https://storage.googleapis.com/bln-data-public/warn-layoffs/oh_historical.csv";
  const buffer = await fetchBuffer(url);
  const rows = parseCSV(buffer.toString("utf-8"));
  if (rows.length < 2) throw new Error("OH: CSV has too few rows");

  const headers = rows[0].map(normalizeHeader);
  console.log(`  OH headers: ${headers.join(" | ")}`);

  // Expected: datereceived, company, city/county, potential numberaffected, layoffdate(s)
  const colIndex = {};
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (!h) continue;
    if ((h === "datereceived" || (h.includes("date") && h.includes("received")) || h.includes("notice date")) && colIndex.noticeDate == null) colIndex.noticeDate = i;
    else if ((h === "company" || h.startsWith("company")) && colIndex.company == null) colIndex.company = i;
    else if ((h.includes("city") || (h.includes("county") && colIndex.city == null)) && colIndex.city == null) colIndex.city = i;
    else if ((h.includes("potential") || h.includes("numberaffected") || h.includes("number affected") || h.includes("affected")) && colIndex.employees == null) colIndex.employees = i;
    else if ((h.includes("layoffdate") || (h.includes("layoff") && h.includes("date"))) && colIndex.effectiveDate == null) colIndex.effectiveDate = i;
  }
  console.log(`  OH colIndex: ${JSON.stringify(colIndex)}`);

  const records = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const get = (key) => (colIndex[key] != null ? (row[colIndex[key]] ?? "").trim() : "");
    const company = get("company");
    if (!company || /^\s*(total|grand total|subtotal)\s*$/i.test(company)) continue;
    const emp = Number(get("employees").replace(/,/g, ""));
    if (!isFinite(emp) || emp <= 0) continue;
    records.push({
      company,
      county: null,
      city: get("city") || null,
      employees: Math.round(emp),
      noticeDate: parseDate(get("noticeDate") || null),
      effectiveDate: parseDate(get("effectiveDate") || null),
      layoffType: null,
      state: "OH",
      stateName: "Ohio",
    });
  }
  return records;
}

async function fetchWI() {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GOOGLE_SHEETS_API_KEY is not set — required to fetch the Wisconsin WARN sheet. " +
        "Set it as a build/CI secret (do not commit)."
    );
  }
  const WI_SPREADSHEET_ID = "1cyZiHZcepBI7ShB3dMcRprUFRG24lbwEnEDRBMhAqsA";
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${WI_SPREADSHEET_ID}/values/Originals?key=${encodeURIComponent(apiKey)}`;
  const buffer = await fetchBuffer(url);
  const data = JSON.parse(buffer.toString("utf-8"));
  const rows = data.values;
  if (!rows || rows.length < 2) throw new Error("WI: no data in Sheets response");

  const headers = rows[0].map(normalizeHeader);
  console.log(`  WI headers: ${headers.join(" | ")}`);

  // Expected: company, city, affectedworkers, noticercvd, noticetype, layoffbegindate, county
  const colIndex = {};
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (!h) continue;
    if ((h === "company" || h.startsWith("company")) && colIndex.company == null) colIndex.company = i;
    else if (h === "city" && colIndex.city == null) colIndex.city = i;
    else if ((h.includes("affected") || h.includes("worker") || h === "affectedworkers") && colIndex.employees == null) colIndex.employees = i;
    else if ((h === "noticercvd" || (h.includes("notice") && (h.includes("rcvd") || h.includes("received") || (h.includes("date") && !h.includes("begin"))))) && colIndex.noticeDate == null) colIndex.noticeDate = i;
    else if ((h === "noticetype" || (h === "type" && colIndex.layoffType == null)) && colIndex.layoffType == null) colIndex.layoffType = i;
    else if ((h === "layoffbegindate" || (h.includes("layoff") && h.includes("begin"))) && colIndex.effectiveDate == null) colIndex.effectiveDate = i;
    else if ((h === "county" || h.startsWith("county")) && colIndex.county == null) colIndex.county = i;
  }
  console.log(`  WI colIndex: ${JSON.stringify(colIndex)}`);

  const records = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const get = (key) => (colIndex[key] != null ? (row[colIndex[key]] ?? "").trim() : "");
    const company = get("company");
    if (!company || /^\s*(total|grand total|subtotal)\s*$/i.test(company)) continue;
    const emp = Number(get("employees").replace(/,/g, ""));
    if (!isFinite(emp) || emp <= 0) continue;
    records.push({
      company,
      county: get("county") || null,
      city: get("city") || null,
      employees: Math.round(emp),
      noticeDate: parseDate(get("noticeDate") || null),
      effectiveDate: parseDate(get("effectiveDate") || null),
      layoffType: normalizeLayoffType(get("layoffType") || null),
      state: "WI",
      stateName: "Wisconsin",
    });
  }
  return records;
}

// ─── New states (GA, TN, KY, OR) — BLN GCS standardised historical files ─────

async function fetchGA() {
  const url = "https://storage.googleapis.com/bln-data-public/warn-layoffs/ga_historical.csv";
  const buffer = await fetchBuffer(url);
  const rows = parseCSV(buffer.toString("utf-8"));
  if (rows.length < 2) throw new Error("GA: CSV has too few rows");

  const headers = rows[0].map(normalizeHeader);
  console.log(`  GA headers: ${headers.join(" | ")}`);

  // GA columns: id, company name, city, zip, county, est. impact, lwda, separation date
  const colIndex = {};
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (!h) continue;
    if ((h === "company name" || h === "company") && colIndex.company == null) colIndex.company = i;
    else if (h === "city" && colIndex.city == null) colIndex.city = i;
    else if (h === "county" && colIndex.county == null) colIndex.county = i;
    else if ((h === "est. impact" || h.includes("impact")) && colIndex.employees == null) colIndex.employees = i;
    else if ((h === "separation date" || h.includes("separation")) && colIndex.separationDate == null) colIndex.separationDate = i;
  }
  console.log(`  GA colIndex: ${JSON.stringify(colIndex)}`);

  const records = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const get = (key) => (colIndex[key] != null ? (row[colIndex[key]] ?? "").trim() : "");
    const company = get("company");
    if (!company || /^\s*(total|grand total|subtotal)\s*$/i.test(company)) continue;
    const emp = Number(get("employees").replace(/,/g, ""));
    if (!isFinite(emp) || emp <= 0) continue;
    const separationDate = parseDate(get("separationDate") || null);
    records.push({
      company,
      county: get("county") || null,
      city: get("city") || null,
      employees: Math.round(emp),
      noticeDate: separationDate,
      effectiveDate: separationDate,
      layoffType: null,
      state: "GA",
      stateName: "Georgia",
    });
  }
  return records;
}

async function fetchTN() {
  const url = "https://storage.googleapis.com/bln-data-public/warn-layoffs/tn_historical.csv";
  const buffer = await fetchBuffer(url);
  const rows = parseCSV(buffer.toString("utf-8"));
  if (rows.length < 2) throw new Error("TN: CSV has too few rows");

  const headers = rows[0].map(normalizeHeader);
  console.log(`  TN headers: ${headers.join(" | ")}`);

  // TN columns: notice date, effective date, received date, company, city, county,
  //             no. of employees, layoff/closure, notice id
  const colIndex = {};
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (!h) continue;
    if ((h === "company" || h.startsWith("company")) && colIndex.company == null) colIndex.company = i;
    else if (h === "city" && colIndex.city == null) colIndex.city = i;
    else if (h === "county" && colIndex.county == null) colIndex.county = i;
    else if ((h === "no. of employees" || h.includes("employee") || h.includes("worker")) && colIndex.employees == null) colIndex.employees = i;
    else if ((h === "notice date" || (h.includes("notice") && h.includes("date"))) && colIndex.noticeDate == null) colIndex.noticeDate = i;
    else if ((h === "effective date" || h.includes("effective")) && colIndex.effectiveDate == null) colIndex.effectiveDate = i;
    else if ((h === "layoff/closure" || h === "layoff closure" || h.includes("layoff") || h.includes("closure")) && colIndex.layoffType == null) colIndex.layoffType = i;
  }
  console.log(`  TN colIndex: ${JSON.stringify(colIndex)}`);

  const records = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const get = (key) => (colIndex[key] != null ? (row[colIndex[key]] ?? "").trim() : "");
    const company = get("company");
    if (!company || /^\s*(total|grand total|subtotal)\s*$/i.test(company)) continue;
    const emp = Number(get("employees").replace(/,/g, ""));
    if (!isFinite(emp) || emp <= 0) continue;
    records.push({
      company,
      county: get("county") || null,
      city: get("city") || null,
      employees: Math.round(emp),
      noticeDate: parseDate(get("noticeDate") || null),
      effectiveDate: parseDate(get("effectiveDate") || null),
      layoffType: normalizeLayoffType(get("layoffType") || null),
      state: "TN",
      stateName: "Tennessee",
    });
  }
  return records;
}

async function fetchKY() {
  const url = "https://storage.googleapis.com/bln-data-public/warn-layoffs/ky-historical-normalized.csv";
  const buffer = await fetchBuffer(url);
  const rows = parseCSV(buffer.toString("utf-8"));
  if (rows.length < 2) throw new Error("KY: CSV has too few rows");

  const headers = rows[0].map(normalizeHeader);
  console.log(`  KY headers: ${headers.join(" | ")}`);

  // KY columns: date received, region, county, company name, naics code, employees,
  //             closure or layoff?, projected date, ...
  const colIndex = {};
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (!h) continue;
    if ((h === "company name" || h === "company") && colIndex.company == null) colIndex.company = i;
    else if (h === "county" && colIndex.county == null) colIndex.county = i;
    else if ((h === "employees" || h.includes("employee") || h.includes("worker")) && colIndex.employees == null) colIndex.employees = i;
    else if ((h === "date received" || (h.includes("date") && h.includes("received"))) && colIndex.noticeDate == null) colIndex.noticeDate = i;
    else if ((h === "projected date" || h.includes("projected")) && colIndex.effectiveDate == null) colIndex.effectiveDate = i;
    else if ((h === "closure or layoff?" || h.includes("closure") || h.includes("layoff")) && colIndex.layoffType == null) colIndex.layoffType = i;
  }
  console.log(`  KY colIndex: ${JSON.stringify(colIndex)}`);

  const records = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const get = (key) => (colIndex[key] != null ? (row[colIndex[key]] ?? "").trim() : "");
    const company = get("company");
    if (!company || /^\s*(total|grand total|subtotal)\s*$/i.test(company)) continue;
    const emp = Number(get("employees").replace(/,/g, ""));
    if (!isFinite(emp) || emp <= 0) continue;
    records.push({
      company,
      county: get("county") || null,
      city: null,
      employees: Math.round(emp),
      noticeDate: parseDate(get("noticeDate") || null),
      effectiveDate: parseDate(get("effectiveDate") || null),
      layoffType: normalizeLayoffType(get("layoffType") || null),
      state: "KY",
      stateName: "Kentucky",
    });
  }
  return records;
}

async function fetchOR() {
  const url = "https://data.oregon.gov/resource/ijbz-jpx8.json?$limit=50000";
  const buffer = await fetchBuffer(url);
  const rows = JSON.parse(buffer.toString("utf-8"));
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("OR: no rows in Socrata response");

  const records = [];
  for (const row of rows) {
    const company = String(row.company_name ?? "").trim();
    if (!company || /^\s*(total|grand total|subtotal)\s*$/i.test(company)) continue;
    const employees = Number(String(row.laid_off ?? "").replace(/,/g, "").trim());
    if (!isFinite(employees) || employees <= 0) continue;
    records.push({
      company,
      county: null,
      city: String(row.city ?? "").trim() || null,
      employees: Math.round(employees),
      noticeDate: parseDate(row.received_date ?? null),
      effectiveDate: parseDate(row.layoff_date ?? null),
      layoffType: normalizeLayoffType(String(row.layoff_type ?? "").trim() || null),
      state: "OR",
      stateName: "Oregon",
    });
  }
  return records;
}

async function fetchIA() {
  const url = "https://workforce.iowa.gov/media/1190/download?inline";
  const buffer = await fetchBuffer(url);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const records = [];
  let sheetsOk = 0;

  for (const ws of workbook.worksheets) {
    let headerRow = -1;
    const colIndex = {};
    ws.eachRow((row, rowNumber) => {
      if (headerRow !== -1) return;
      const cells = row.values;
      if (!cells) return;
      const norm = cells.map((v) => (v == null ? "" : normalizeHeader(v)));
      if (!norm.some((h) => h === "company") || !norm.some((h) => h === "emp #" || h.includes("employee"))) return;
      headerRow = rowNumber;
      console.log(`  IA sheet="${ws.name}" header=${rowNumber} raw: ${norm.filter(Boolean).join(" | ")}`);
      for (let i = 1; i < norm.length; i++) {
        const h = norm[i];
        if (!h) continue;
        if (h === "company" && colIndex.company == null) colIndex.company = i;
        else if (h === "city" && colIndex.city == null) colIndex.city = i;
        else if (h === "county" && colIndex.county == null) colIndex.county = i;
        else if ((h === "emp #" || h.includes("employee") || h.includes("worker")) && colIndex.employees == null) colIndex.employees = i;
        else if ((h === "notice date" || (h.includes("notice") && h.includes("date"))) && colIndex.noticeDate == null) colIndex.noticeDate = i;
        else if ((h === "layoff date" || h.includes("effective")) && colIndex.effectiveDate == null) colIndex.effectiveDate = i;
        else if ((h === "notice type" || h === "type") && colIndex.layoffType == null) colIndex.layoffType = i;
      }
    });
    if (headerRow === -1) continue;
    sheetsOk++;

    ws.eachRow((row, rowNumber) => {
      if (rowNumber <= headerRow) return;
      const rec = parseXlsxRow(row, colIndex, "IA", "Iowa");
      if (rec) records.push(rec);
    });
  }

  console.log(`  IA: processed ${sheetsOk} sheets`);
  if (records.length === 0) throw new Error("IA: no valid records after processing workbook");
  return records;
}

async function fetchIN() {
  const url = "https://www.in.gov/dwd/warn-notices/current-warn-notices/";
  const html = await fetchText(url);
  const table = findHtmlTable(html, [
    (h) => h.includes("company"),
    (h) => h.includes("affected") || h.includes("worker"),
    (h) => h.includes("notice") && h.includes("date"),
  ]);
  if (!table) throw new Error("IN: current WARN table not found");

  const colIndex = {
    company: findHeaderIndex(table.headers, [(h) => h.includes("company")]),
    city: findHeaderIndex(table.headers, [(h) => h === "city" || h.includes("city")]),
    employees: findHeaderIndex(table.headers, [(h) => h.includes("affected") || h.includes("worker")]),
    noticeDate: findHeaderIndex(table.headers, [(h) => h.includes("notice") && h.includes("date")]),
    effectiveDate: findHeaderIndex(table.headers, [(h) => h.includes("lo/cl") && h.includes("date")]),
    layoffType: findHeaderIndex(table.headers, [
      (h) => h === "notice type" || h === "type" || h === "lo/cl" || (h.includes("lo/cl") && !h.includes("date")),
    ]),
  };
  console.log(`  IN colIndex: ${JSON.stringify(colIndex)}`);

  const records = [];
  for (const row of table.rows.slice(table.headerRow + 1)) {
    const get = (key) => (colIndex[key] != null ? row[colIndex[key]] : "");
    const company = cleanOptionalText(get("company"));
    if (!company || /^\s*(total|grand total|subtotal)\s*$/i.test(company)) continue;
    const employees = parseEmployees(get("employees"));
    if (!isFinite(employees) || employees <= 0) continue;

    records.push({
      company,
      county: null,
      city: cleanOptionalText(get("city")),
      employees: Math.round(employees),
      noticeDate: parseDate(get("noticeDate") || null),
      effectiveDate: parseDate(get("effectiveDate") || null),
      layoffType: normalizeLayoffType(cleanOptionalText(get("layoffType"))),
      state: "IN",
      stateName: "Indiana",
    });
  }

  if (records.length === 0) throw new Error("IN: no valid records in current WARN table");
  return records;
}

const MD_WARN_URLS = [
  "https://www.dllr.state.md.us/employment/warn.shtml",
  ...Array.from(
    { length: Math.max(0, new Date().getUTCFullYear() - MIN_NOTICE_YEAR) },
    (_, index) => `https://www.dllr.state.md.us/employment/warn${new Date().getUTCFullYear() - 1 - index}.shtml`,
  ),
];

async function fetchMD() {
  const records = [];
  let pagesOk = 0;

  for (const url of MD_WARN_URLS) {
    const html = await fetchText(url);
    const table = findHtmlTable(html, [
      (h) => h.includes("notice") && h.includes("date"),
      (h) => h.includes("company"),
      (h) => h.includes("employee"),
    ]);
    if (!table) {
      console.warn(`  MD: no WARN table found at ${url}`);
      continue;
    }
    pagesOk++;

    const colIndex = {
      noticeDate: findHeaderIndex(table.headers, [(h) => h.includes("notice") && h.includes("date")]),
      company: findHeaderIndex(table.headers, [(h) => h.includes("company")]),
      location: findHeaderIndex(table.headers, [(h) => h.includes("location")]),
      county: findHeaderIndex(table.headers, [(h) => h.includes("local") || h.includes("county")]),
      employees: findHeaderIndex(table.headers, [(h) => h.includes("employee")]),
      effectiveDate: findHeaderIndex(table.headers, [(h) => h.includes("effective") && h.includes("date")]),
      layoffType: findHeaderIndex(table.headers, [(h) => h === "type" || h.includes("closure") || h.includes("layoff")]),
    };

    for (const row of table.rows.slice(table.headerRow + 1)) {
      const get = (key) => (colIndex[key] != null ? row[colIndex[key]] : "");
      const company = cleanOptionalText(get("company"));
      if (!company || /^\s*(total|grand total|subtotal)\s*$/i.test(company)) continue;
      const employees = parseEmployees(get("employees"));
      if (!isFinite(employees) || employees <= 0) continue;

      records.push({
        company,
        county: cleanOptionalText(get("county")),
        city: extractCityFromLocation(get("location"), "MD", "Maryland"),
        employees: Math.round(employees),
        noticeDate: parseDate(get("noticeDate") || null),
        effectiveDate: parseDate(get("effectiveDate") || null),
        layoffType: normalizeLayoffType(cleanOptionalText(get("layoffType"))),
        state: "MD",
        stateName: "Maryland",
      });
    }
  }

  console.log(`  MD: processed ${pagesOk} yearly HTML tables`);
  if (records.length === 0) throw new Error("MD: no valid records across WARN tables");
  return records;
}

async function fetchNC() {
  const mainUrl = "https://www.commerce.nc.gov/data-tools-reports/labor-market-data-tools/workforce-warn-reports";
  const currentYear = new Date().getUTCFullYear();
  const fallbackReportUrl = `${mainUrl}/report-workforce-warn-summary-list-${currentYear}`;
  const mainHtml = await fetchText(mainUrl);
  const reportUrl =
    extractLinks(mainHtml, mainUrl).find((link) => link.url.includes(`warn-summary-list-${currentYear}`))?.url ??
    fallbackReportUrl;
  const reportHtml = await fetchText(reportUrl);
  const csvUrls = [
    ...new Set(
      extractLinks(reportHtml, reportUrl)
        .filter((link) => /\.csv(?:[?#]|$)/i.test(link.url) || /export table data/i.test(link.text))
        .map((link) => link.url),
    ),
  ];

  if (csvUrls.length === 0) throw new Error("NC: current WARN report CSV export not found");

  const records = [];
  for (const csvUrl of csvUrls) {
    const rows = parseCSV(await fetchText(csvUrl));
    if (rows.length < 2) continue;
    const headers = rows[0].map(normalizeHeader);
    console.log(`  NC headers: ${headers.join(" | ")}`);
    const colIndex = {
      county: findHeaderIndex(headers, [(h) => h === "county" || h.includes("county")]),
      noticeDate: findHeaderIndex(headers, [(h) => h === "date of notice" || (h.includes("date") && h.includes("notice"))]),
      effectiveDate: findHeaderIndex(headers, [(h) => h.includes("effective") && h.includes("date")]),
      company: findHeaderIndex(headers, [(h) => h.includes("warn notice name") || h === "company"]),
      noticeType: findHeaderIndex(headers, [(h) => h === "warn notice type" || h === "notice type"]),
      layoffType: findHeaderIndex(headers, [(h) => h.includes("layoff") || h.includes("closure")]),
      employees: findHeaderIndex(headers, [(h) => h.includes("number affected") || h.includes("employees")]),
      city: findHeaderIndex(headers, [(h) => h === "city"]),
    };
    console.log(`  NC colIndex: ${JSON.stringify(colIndex)}`);

    for (const row of rows.slice(1)) {
      const get = (key) => (colIndex[key] != null ? (row[colIndex[key]] ?? "").trim() : "");
      const company = cleanOptionalText(get("company"));
      if (!company || /^\s*(total|grand total|subtotal)\s*$/i.test(company)) continue;
      const employees = parseEmployees(get("employees"));
      if (!isFinite(employees) || employees <= 0) continue;
      const noticeType = cleanOptionalText(get("noticeType"));
      const layoffDetail = cleanOptionalText(get("layoffType"));
      const layoffType = normalizeLayoffType([noticeType, layoffDetail].filter(Boolean).join(" ") || null);

      records.push({
        company,
        county: cleanOptionalText(get("county")),
        city: cleanOptionalText(get("city")),
        employees: Math.round(employees),
        noticeDate: parseDate(get("noticeDate") || null),
        effectiveDate: parseDate(get("effectiveDate") || null),
        layoffType,
        state: "NC",
        stateName: "North Carolina",
      });
    }
  }

  if (records.length === 0) throw new Error("NC: no valid records in current WARN CSV export");
  return records;
}

async function fetchPA() {
  const url =
    "https://www.pa.gov/agencies/dli/programs-services/workforce-development-home/warn-requirements/warn-notices";
  const html = await fetchText(url);
  const records = [];

  for (const match of html.matchAll(/<div class="cmp-accordion__item"[\s\S]*?(?=<div class="cmp-accordion__item"|$)/gi)) {
    const item = match[0];
    const company = cleanOptionalText(
      htmlCellText(item.match(/<span\b[^>]*class="[^"]*\bcmp-accordion__title\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i)?.[1] ?? ""),
    );
    if (!company || /^\s*(total|grand total|subtotal)\s*$/i.test(company)) continue;

    const lines = htmlToText(item)
      .split("\n")
      .map((line) => line.replace(/\u200b/g, "").trim())
      .filter(Boolean);
    const valueFor = (pattern) => cleanOptionalText(lines.find((line) => pattern.test(line))?.replace(pattern, ""));
    const affectedText = valueFor(/^#\s*affected\s*:\s*/i);
    const employees = parseEmployees(affectedText);
    if (!isFinite(employees) || employees <= 0) continue;

    records.push({
      company,
      county: valueFor(/^county\s*:\s*/i),
      city: extractCityFromLocation(lines.join(" "), "PA", "Pennsylvania"),
      employees: Math.round(employees),
      noticeDate: null,
      effectiveDate: parseDate(valueFor(/^effective\s+date\s*:\s*/i)),
      layoffType: normalizeLayoffType(valueFor(/^closure\s+or\s+layoff\s*:\s*/i)),
      state: "PA",
      stateName: "Pennsylvania",
    });
  }

  if (records.length === 0) throw new Error("PA: no valid records in WARN accordion");
  return records;
}

async function fetchVA() {
  const pageUrl = "https://virginiaworks.gov/im-an-employer/retain-and-grow/warn-notices/";
  const pageHtml = await fetchText(pageUrl);
  const csvUrl = extractLinks(pageHtml, pageUrl).find(
    (link) => /\.csv(?:[?#]|$)/i.test(link.url) || /download filtered list/i.test(link.text),
  )?.url;
  if (!csvUrl) throw new Error("VA: CSV export link not found on WARN page");
  const rows = parseCSV(await fetchText(csvUrl));
  if (rows.length < 2) throw new Error("VA: CSV has too few rows");

  const headers = rows[0].map(normalizeHeader);
  console.log(`  VA headers: ${headers.join(" | ")}`);
  const colIndex = {
    company: findHeaderIndex(headers, [(h) => h === "company" || h.includes("company")]),
    noticeDate: findHeaderIndex(headers, [(h) => h.includes("notice") && h.includes("date")]),
    effectiveDate: findHeaderIndex(headers, [(h) => h.includes("impact") && h.includes("date")]),
    employees: findHeaderIndex(headers, [(h) => h.includes("employee") && h.includes("affected")]),
    location: findHeaderIndex(headers, [(h) => h.includes("location")]),
    layoffType: findHeaderIndex(headers, [(h) => h.includes("notice type") || h === "type"]),
  };
  console.log(`  VA colIndex: ${JSON.stringify(colIndex)}`);

  const records = [];
  for (const row of rows.slice(1)) {
    const get = (key) => (colIndex[key] != null ? (row[colIndex[key]] ?? "").trim() : "");
    const company = cleanOptionalText(get("company"));
    if (!company || /^\s*(total|grand total|subtotal)\s*$/i.test(company)) continue;
    const employees = parseEmployees(get("employees"));
    if (!isFinite(employees) || employees <= 0) continue;

    records.push({
      company,
      county: null,
      city: extractCityFromLocation(get("location"), "VA", "Virginia"),
      employees: Math.round(employees),
      noticeDate: parsePlausibleWarnDate(get("noticeDate") || null),
      effectiveDate: parsePlausibleWarnDate(get("effectiveDate") || null),
      layoffType: normalizeLayoffType(cleanOptionalText(get("layoffType"))),
      state: "VA",
      stateName: "Virginia",
    });
  }

  if (records.length === 0) throw new Error("VA: no valid records in WARN CSV");
  records.sourceUrls = normalizeSourceUrls(pageUrl);
  return records;
}

// ─── State config ─────────────────────────────────────────────────────────────

const SOURCE_STATUS = Object.freeze({
  LIVE: "live",
  MANUAL: "manual-only",
  UNAVAILABLE: "unavailable",
});

const STATE_CONFIG = [
  {
    state: "CA", stateName: "California",
    name: "California WARN Act Notices",
    publisher: "California Employment Development Department (EDD)",
    url: "https://edd.ca.gov/en/jobs_and_training/layoff_services_warn/",
    sourceStatus: SOURCE_STATUS.LIVE,
    sourceType: "xlsx",
    sourceUrls: [
      "https://edd.ca.gov/en/jobs_and_training/layoff_services_warn/",
      "https://edd.ca.gov/siteassets/files/jobs_and_training/warn/warn_report1.xlsx",
    ],
    fetch: fetchCA,
  },
  {
    state: "NJ", stateName: "New Jersey",
    name: "New Jersey WARN Notice Archive",
    publisher: "New Jersey Department of Labor and Workforce Development",
    url: "https://www.nj.gov/labor/assets/PDFs/WARN/WARN_Notice_Archive.xlsx",
    sourceStatus: SOURCE_STATUS.LIVE,
    sourceType: "xlsx",
    sourceUrls: ["https://www.nj.gov/labor/assets/PDFs/WARN/WARN_Notice_Archive.xlsx"],
    fetch: fetchNJ,
  },
  {
    state: "TX", stateName: "Texas",
    name: "Texas WARN Act Historical Notices",
    publisher: "BLN Data (Texas Workforce Commission)",
    url: "https://storage.googleapis.com/bln-data-public/warn-layoffs/tx_historical.xlsx",
    sourceStatus: SOURCE_STATUS.LIVE,
    sourceType: "xlsx",
    sourceUrls: ["https://storage.googleapis.com/bln-data-public/warn-layoffs/tx_historical.xlsx"],
    fetch: fetchTX,
  },
  {
    state: "NY", stateName: "New York",
    name: "New York WARN Act Historical Notices",
    publisher: "BLN Data (New York State Department of Labor)",
    url: "https://storage.googleapis.com/bln-data-public/warn-layoffs/ny_historical.xlsx",
    sourceStatus: SOURCE_STATUS.LIVE,
    sourceType: "xlsx",
    sourceUrls: ["https://storage.googleapis.com/bln-data-public/warn-layoffs/ny_historical.xlsx"],
    fetch: fetchNY,
  },
  {
    state: "OH", stateName: "Ohio",
    name: "Ohio WARN Act Historical Notices",
    publisher: "BLN Data (Ohio Department of Job and Family Services)",
    url: "https://storage.googleapis.com/bln-data-public/warn-layoffs/oh_historical.csv",
    sourceStatus: SOURCE_STATUS.LIVE,
    sourceType: "csv",
    sourceUrls: ["https://storage.googleapis.com/bln-data-public/warn-layoffs/oh_historical.csv"],
    fetch: fetchOH,
  },
  {
    state: "WI", stateName: "Wisconsin",
    name: "Wisconsin WARN Act Notices",
    publisher: "Wisconsin Department of Workforce Development",
    url: "https://sheets.googleapis.com/v4/spreadsheets/1cyZiHZcepBI7ShB3dMcRprUFRG24lbwEnEDRBMhAqsA/values/Originals",
    sourceStatus: SOURCE_STATUS.LIVE,
    sourceType: "json",
    sourceUrls: [
      "https://sheets.googleapis.com/v4/spreadsheets/1cyZiHZcepBI7ShB3dMcRprUFRG24lbwEnEDRBMhAqsA/values/Originals",
    ],
    fetch: fetchWI,
  },
  {
    state: "GA", stateName: "Georgia",
    name: "Georgia WARN Act Historical Notices",
    publisher: "BLN Data (Georgia Department of Labor)",
    url: "https://storage.googleapis.com/bln-data-public/warn-layoffs/ga_historical.csv",
    sourceStatus: SOURCE_STATUS.LIVE,
    sourceType: "csv",
    sourceUrls: ["https://storage.googleapis.com/bln-data-public/warn-layoffs/ga_historical.csv"],
    fetch: fetchGA,
  },
  {
    state: "TN", stateName: "Tennessee",
    name: "Tennessee WARN Act Historical Notices",
    publisher: "BLN Data (Tennessee Department of Labor and Workforce Development)",
    url: "https://storage.googleapis.com/bln-data-public/warn-layoffs/tn_historical.csv",
    sourceStatus: SOURCE_STATUS.LIVE,
    sourceType: "csv",
    sourceUrls: ["https://storage.googleapis.com/bln-data-public/warn-layoffs/tn_historical.csv"],
    fetch: fetchTN,
  },
  {
    state: "KY", stateName: "Kentucky",
    name: "Kentucky WARN Act Historical Notices",
    publisher: "BLN Data (Kentucky Career Center)",
    url: "https://storage.googleapis.com/bln-data-public/warn-layoffs/ky-historical-normalized.csv",
    sourceStatus: SOURCE_STATUS.LIVE,
    sourceType: "csv",
    sourceUrls: ["https://storage.googleapis.com/bln-data-public/warn-layoffs/ky-historical-normalized.csv"],
    fetch: fetchKY,
  },
  {
    state: "OR", stateName: "Oregon",
    name: "Oregon WARN Act Notices",
    publisher: "Oregon Employment Department",
    url: "https://data.oregon.gov/Business/WARN/ijbz-jpx8/about_data",
    sourceStatus: SOURCE_STATUS.LIVE,
    sourceType: "json",
    sourceUrls: [
      "https://data.oregon.gov/Business/WARN/ijbz-jpx8/about_data",
      "https://data.oregon.gov/resource/ijbz-jpx8.json",
    ],
    fetch: fetchOR,
  },
  {
    state: "IA", stateName: "Iowa",
    name: "Iowa WARN Log",
    publisher: "Iowa Workforce Development",
    url: "https://workforce.iowa.gov/employers/resources/warn",
    sourceStatus: SOURCE_STATUS.LIVE,
    sourceType: "xlsx",
    sourceUrls: [
      "https://workforce.iowa.gov/employers/resources/warn",
      "https://workforce.iowa.gov/media/1190/download?inline",
    ],
    fetch: fetchIA,
  },
  {
    state: "IN", stateName: "Indiana",
    name: "Indiana Current WARN Notices",
    publisher: "Indiana Department of Workforce Development",
    url: "https://www.in.gov/dwd/warn-notices/current-warn-notices/",
    sourceStatus: SOURCE_STATUS.LIVE,
    sourceType: "html",
    sourceUrls: [
      "https://www.in.gov/dwd/warn-notices/",
      "https://www.in.gov/dwd/warn-notices/current-warn-notices/",
    ],
    parserConfidence: 0.95,
    notes: "Official static HTML table with company, city, affected workers, notice date, LO/CL date, and LO/CL action.",
    fetch: fetchIN,
  },
  {
    state: "MD", stateName: "Maryland",
    name: "Maryland WARN / ESA / Other Dislocations Log",
    publisher: "Maryland Department of Labor",
    url: "https://www.dllr.state.md.us/employment/warn.shtml",
    sourceStatus: SOURCE_STATUS.LIVE,
    sourceType: "html",
    sourceUrls: MD_WARN_URLS,
    parserConfidence: 0.95,
    notes: "Official yearly HTML tables are parsed; PDF downloads are not used.",
    fetch: fetchMD,
  },
  {
    state: "NC", stateName: "North Carolina",
    name: "North Carolina Workforce WARN Summary Report",
    publisher: "North Carolina Department of Commerce",
    url: "https://www.commerce.nc.gov/data-tools-reports/labor-market-data-tools/workforce-warn-reports",
    sourceStatus: SOURCE_STATUS.LIVE,
    sourceType: "csv",
    sourceUrls: [
      "https://www.commerce.nc.gov/data-tools-reports/labor-market-data-tools/workforce-warn-reports",
      `https://www.commerce.nc.gov/data-tools-reports/labor-market-data-tools/workforce-warn-reports/report-workforce-warn-summary-list-${new Date().getUTCFullYear()}`,
    ],
    parserConfidence: 0.95,
    notes: "Official current-year report CSV export is discovered from the state report page; archived PDFs remain manual-only.",
    fetch: fetchNC,
  },
  {
    state: "PA", stateName: "Pennsylvania",
    name: "Pennsylvania WARN Notices",
    publisher: "Pennsylvania Department of Labor & Industry",
    url: "https://www.pa.gov/agencies/dli/programs-services/workforce-development-home/warn-requirements/warn-notices",
    sourceStatus: SOURCE_STATUS.LIVE,
    sourceType: "html",
    sourceUrls: [
      "https://www.pa.gov/agencies/dli/programs-services/workforce-development-home/warn-requirements/warn-notices",
    ],
    parserConfidence: 0.8,
    notes: "Official accordion entries are parsed for company, county, affected workers, effective date, and action; noticeDate is null because the page does not expose an explicit notice/received date, so effectiveDate is not used for pressure-ranking provenance.",
    fetch: fetchPA,
  },
  {
    state: "VA", stateName: "Virginia",
    name: "Virginia WARN Notices",
    publisher: "Virginia Works",
    url: "https://virginiaworks.gov/im-an-employer/retain-and-grow/warn-notices/",
    sourceStatus: SOURCE_STATUS.LIVE,
    sourceType: "csv",
    sourceUrls: [
      "https://virginiaworks.gov/im-an-employer/retain-and-grow/warn-notices/",
    ],
    parserConfidence: 0.95,
    notes: "Official page exposes a Download Filtered List CSV with notice date, impact date, affected employees, location, and notice type; the timestamped CSV export URL is discovered at build time.",
    fetch: fetchVA,
  },
];

const ALL_STATES_AND_DC = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"],
  ["CA", "California"], ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"],
  ["DC", "District of Columbia"], ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"],
  ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"],
  ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"],
  ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"],
  ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"],
  ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"],
  ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"],
  ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"],
  ["SC", "South Carolina"], ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"],
  ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"],
  ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
];

const MANUAL_ONLY_NOTE =
  "Official notices are available for manual/PDF/HTML review, but no stable CSV/XLSX/JSON adapter is registered.";
const UNAVAILABLE_NOTE =
  "No reliable public statewide WARN notice listing or machine-readable feed is registered in this pipeline yet.";
const ACCESS_BLOCKED_NOTE =
  "Official page exists but returned access/bot-protection errors to deterministic server-side fetches during adapter evaluation; keep manual-only until a stable public export is available.";
const JS_ONLY_NOTE =
  "Official page rendered no static WARN table or export in fetched HTML during adapter evaluation; keep manual-only until a deterministic endpoint is identified.";

const MANUAL_SOURCE_METADATA = {
  AL: {
    name: "Alabama WARN Notices",
    publisher: "Alabama Department of Labor",
    sourceStatus: SOURCE_STATUS.MANUAL,
    sourceType: "html",
    sourceUrls: ["https://www.labor.alabama.gov/warn/"],
    notes: ACCESS_BLOCKED_NOTE,
  },
  CO: {
    name: "Colorado WARN Notices",
    publisher: "Colorado Department of Labor and Employment",
    sourceStatus: SOURCE_STATUS.MANUAL,
    sourceType: "html",
    sourceUrls: ["https://cdle.colorado.gov/employers/layoff-separations/warn-notices"],
    notes: ACCESS_BLOCKED_NOTE,
  },
  CT: {
    name: "Connecticut WARN Notices",
    publisher: "Connecticut Department of Labor",
    sourceStatus: SOURCE_STATUS.MANUAL,
    sourceType: "html",
    sourceUrls: ["https://portal.ct.gov/dol/divisions/warn/warn-notices"],
    notes: ACCESS_BLOCKED_NOTE,
  },
  FL: {
    name: "Florida WARN Notices",
    publisher: "FloridaCommerce",
    sourceStatus: SOURCE_STATUS.MANUAL,
    sourceType: "html",
    sourceUrls: [
      "https://www.floridajobs.org/reemployment-assistance-service-center/reemployment-assistance/for-employers/warn-notices",
    ],
    notes: "Registered FloridaCommerce WARN URL returned 404 during adapter evaluation; keep manual-only until the current official listing URL or export is confirmed.",
  },
  IL: {
    name: "Illinois WARN Activities and Layoff Data",
    publisher: "Illinois Department of Commerce and Economic Opportunity",
    sourceStatus: SOURCE_STATUS.MANUAL,
    sourceType: "html",
    sourceUrls: ["https://www.illinoisworknet.com/LayoffRecovery/Pages/IllinoisWARNData.aspx"],
    notes: JS_ONLY_NOTE,
  },
  IN: {
    name: "Indiana WARN Notices",
    publisher: "Indiana Department of Workforce Development",
    sourceStatus: SOURCE_STATUS.MANUAL,
    sourceType: "html",
    sourceUrls: ["https://www.in.gov/dwd/warn-notices/"],
    notes: MANUAL_ONLY_NOTE,
  },
  KS: {
    name: "Kansas WARN Notices",
    publisher: "KANSASWORKS",
    sourceStatus: SOURCE_STATUS.MANUAL,
    sourceType: "html",
    sourceUrls: ["https://www.kansasworks.com/ada/r/warn"],
    notes: MANUAL_ONLY_NOTE,
  },
  MD: {
    name: "Maryland WARN Notices",
    publisher: "Maryland Department of Labor",
    sourceStatus: SOURCE_STATUS.MANUAL,
    sourceType: "html",
    sourceUrls: ["https://www.dllr.state.md.us/employment/warn.shtml"],
    notes: MANUAL_ONLY_NOTE,
  },
  MA: {
    name: "Massachusetts WARN Weekly Report",
    publisher: "Massachusetts Executive Office of Labor and Workforce Development",
    sourceStatus: SOURCE_STATUS.MANUAL,
    sourceType: "html",
    sourceUrls: ["https://www.mass.gov/info-details/worker-adjustment-and-retraining-act-warn-weekly-report"],
    notes: ACCESS_BLOCKED_NOTE,
  },
  MI: {
    name: "Michigan WARN Notices",
    publisher: "Michigan Department of Labor and Economic Opportunity",
    sourceStatus: SOURCE_STATUS.MANUAL,
    sourceType: "html",
    sourceUrls: ["https://www.michigan.gov/leo/bureaus-agencies/wd/programs-services/warn-notices"],
    notes: ACCESS_BLOCKED_NOTE,
  },
  MN: {
    name: "Minnesota WARN Notices",
    publisher: "Minnesota Department of Employment and Economic Development",
    sourceStatus: SOURCE_STATUS.MANUAL,
    sourceType: "html",
    sourceUrls: ["https://mn.gov/deed/programs-services/dislocated-worker/employers/warn/"],
    notes: "Official Minnesota WARN URL led to a bot-manager CAPTCHA during adapter evaluation; keep manual-only until a deterministic public export is available.",
  },
  MO: {
    name: "Missouri WARN Notices",
    publisher: "Missouri Office of Workforce Development",
    sourceStatus: SOURCE_STATUS.MANUAL,
    sourceType: "html",
    sourceUrls: ["https://jobs.mo.gov/warn"],
    notes: ACCESS_BLOCKED_NOTE,
  },
  NV: {
    name: "Nevada WARN Notices",
    publisher: "Nevada Department of Employment, Training and Rehabilitation",
    sourceStatus: SOURCE_STATUS.MANUAL,
    sourceType: "html",
    sourceUrls: ["https://detr.nv.gov/Page/WARN"],
    notes: MANUAL_ONLY_NOTE,
  },
  NC: {
    name: "North Carolina Workforce WARN Reports",
    publisher: "North Carolina Department of Commerce",
    sourceStatus: SOURCE_STATUS.MANUAL,
    sourceType: "html",
    sourceUrls: ["https://www.commerce.nc.gov/data-tools-reports/labor-market-data-tools/workforce-warn-reports"],
    notes: MANUAL_ONLY_NOTE,
  },
  PA: {
    name: "Pennsylvania WARN Notices",
    publisher: "Pennsylvania Department of Labor & Industry",
    sourceStatus: SOURCE_STATUS.MANUAL,
    sourceType: "html",
    sourceUrls: [
      "https://www.pa.gov/agencies/dli/programs-services/workforce-development-home/warn-requirements/warn-notices",
    ],
    notes: MANUAL_ONLY_NOTE,
  },
  SC: {
    name: "South Carolina Layoff Notification Reports",
    publisher: "SC Works / South Carolina Department of Employment and Workforce",
    sourceStatus: SOURCE_STATUS.MANUAL,
    sourceType: "pdf",
    sourceUrls: ["https://scworks.org/employer/employer-programs/risk-closing/layoff-notification-reports"],
    notes: MANUAL_ONLY_NOTE,
  },
  VA: {
    name: "Virginia WARN Notices",
    publisher: "Virginia Works",
    sourceStatus: SOURCE_STATUS.MANUAL,
    sourceType: "html",
    sourceUrls: ["https://virginiaworks.gov/im-an-employer/retain-and-grow/warn-notices/"],
    notes: MANUAL_ONLY_NOTE,
  },
  WA: {
    name: "Washington WARN Layoff and Closure Database",
    publisher: "Washington Employment Security Department",
    sourceStatus: SOURCE_STATUS.MANUAL,
    sourceType: "html",
    sourceUrls: [
      "https://esd.wa.gov/employer-requirements/layoffs-and-employee-notifications/worker-adjustment-and-retraining-notification-warn-layoff-and-closure-database",
    ],
    notes: ACCESS_BLOCKED_NOTE,
  },
};

function normalizeSourceUrls(...groups) {
  const urls = groups.flat().filter((url) => typeof url === "string" && url.trim());
  return [...new Set(urls)];
}

function buildCoverageStates(perStateResults) {
  const resultByState = new Map(perStateResults.map((r) => [r.state, r]));
  const liveByState = new Map(STATE_CONFIG.map((cfg) => [cfg.state, cfg]));

  return ALL_STATES_AND_DC.map(([state, fallbackName]) => {
    const cfg = liveByState.get(state);
    const manual = MANUAL_SOURCE_METADATA[state] ?? {};
    const result = resultByState.get(state);
    const stateName = cfg?.stateName ?? fallbackName;
    const sourceStatus = cfg?.sourceStatus ?? manual.sourceStatus ?? SOURCE_STATUS.UNAVAILABLE;
    const sourceType = cfg?.sourceType ?? manual.sourceType ?? "none";
    const sourceUrls = normalizeSourceUrls(
      result?.sourceUrls ?? [],
      cfg?.sourceUrls ?? [],
      cfg?.url ?? [],
      manual.sourceUrls ?? [],
      manual.url ?? [],
    );

    return {
      state,
      stateName,
      sourceStatus,
      sourceType,
      recordsIncluded: result?.status === "ok",
      notices: result?.notices ?? 0,
      dateRange: result?.dateRange ?? null,
      buildStatus: result?.status ?? (cfg ? "not-run" : "metadata-only"),
      adapter: cfg?.fetch?.name ?? null,
      name: cfg?.name ?? manual.name ?? `${stateName} WARN Notices`,
      publisher: cfg?.publisher ?? manual.publisher ?? null,
      url: sourceUrls[0] ?? null,
      parserConfidence: cfg?.parserConfidence ?? manual.parserConfidence ?? null,
      parserNotes: cfg?.parserNotes ?? null,
      sourceUrls,
      notes: cfg?.notes ?? manual.notes ?? (cfg ? "Machine-readable public source is fetched by this pipeline." : UNAVAILABLE_NOTE),
      error: result?.error ?? null,
    };
  });
}

function buildCoverageSummary(coverageStates) {
  const countStatus = (status) => coverageStates.filter((s) => s.sourceStatus === status).length;
  return {
    totalStates: coverageStates.length,
    liveStates: countStatus(SOURCE_STATUS.LIVE),
    manualOnlyStates: countStatus(SOURCE_STATUS.MANUAL),
    unavailableStates: countStatus(SOURCE_STATUS.UNAVAILABLE),
    statesWithRecords: coverageStates.filter((s) => s.recordsIncluded).length,
  };
}

// ─── Summary helpers ──────────────────────────────────────────────────────────

function buildSummary(allNotices) {
  const total = allNotices.length;
  const totalEmployees = allNotices.reduce((s, n) => s + n.employees, 0);
  const validDates = allNotices.map((n) => n.noticeDate).filter(Boolean).sort();
  const earliest = validDates[0] ?? null;
  const latest = validDates[validDates.length - 1] ?? null;

  // byState — desc by employees
  const stateMap = new Map();
  for (const n of allNotices) {
    let s = stateMap.get(n.state);
    if (!s) { s = { state: n.state, stateName: n.stateName, notices: 0, employees: 0, dates: [] }; stateMap.set(n.state, s); }
    s.notices++; s.employees += n.employees;
    if (n.noticeDate) s.dates.push(n.noticeDate);
  }
  const byState = Array.from(stateMap.values())
    .map(({ dates, ...rest }) => {
      dates.sort();
      return { ...rest, dateRange: { earliest: dates[0] ?? null, latest: dates[dates.length - 1] ?? null } };
    })
    .sort((a, b) => b.employees - a.employees);

  // byMonth — ascending
  const monthMap = new Map();
  for (const n of allNotices) {
    if (!n.noticeDate) continue;
    const month = n.noticeDate.slice(0, 7);
    const cur = monthMap.get(month) ?? { notices: 0, employees: 0 };
    cur.notices++; cur.employees += n.employees;
    monthMap.set(month, cur);
  }
  const byMonth = Array.from(monthMap.entries())
    .map(([month, v]) => ({ month, ...v }))
    .sort((a, b) => (a.month < b.month ? -1 : 1));

  // byType — desc by employees
  const typeMap = new Map();
  for (const n of allNotices) {
    const t = n.layoffType ?? "Unknown";
    const cur = typeMap.get(t) ?? { notices: 0, employees: 0 };
    cur.notices++; cur.employees += n.employees;
    typeMap.set(t, cur);
  }
  const byType = Array.from(typeMap.entries())
    .map(([type, v]) => ({ type, ...v }))
    .sort((a, b) => b.employees - a.employees);

  // topEmployers — top 20 by employees, keyed by (company, state)
  const empMap = new Map();
  for (const n of allNotices) {
    const key = `${n.state}||${n.company}`;
    const cur = empMap.get(key) ?? { company: n.company, employees: 0, notices: 0, state: n.state };
    cur.employees += n.employees; cur.notices++;
    empMap.set(key, cur);
  }
  const topEmployers = Array.from(empMap.values())
    .sort((a, b) => b.employees - a.employees)
    .slice(0, 20);

  return { total, totalEmployees, dateRange: { earliest, latest }, byState, byMonth, byType, topEmployers };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Building Multi-State WARN Act data snapshot ===");
  console.log(`States: ${STATE_CONFIG.map((s) => s.state).join(", ")}\n`);

  const perStateResults = [];     // for print table
  const includedSources = [];
  const fullRecordsPerState = []; // full (untrimmed) per-state records for summary

  for (const cfg of STATE_CONFIG) {
    console.log(`\n--- ${cfg.stateName} (${cfg.state}) ---`);
    let records = null;
    let error = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        records = await cfg.fetch();
        break;
      } catch (err) {
        error = err;
        if (attempt < 3) {
          const delay = attempt * 3000;
          console.warn(`  [state-retry ${attempt}/3] ${err.message} — waiting ${delay}ms`);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    if (!records) {
      console.warn(`  ⚠️  SKIPPING ${cfg.state}: ${error?.message}`);
      perStateResults.push({
        state: cfg.state,
        stateName: cfg.stateName,
        status: "skipped",
        notices: 0,
        error: error?.message ?? null,
      });
      continue;
    }
    records = scrubImplausibleEffectiveDates(records, cfg.state);

    const sourceUrls = normalizeSourceUrls(records.sourceUrls ?? [], cfg.sourceUrls ?? [], cfg.url ?? []);
    const dates = records.map((r) => r.noticeDate).filter(Boolean).sort();
    console.log(`  ✓ ${cfg.state}: ${records.length} valid notices`);
    perStateResults.push({
      state: cfg.state, stateName: cfg.stateName, status: "ok", notices: records.length,
      dateRange: { earliest: dates[0] ?? null, latest: dates[dates.length - 1] ?? null },
      sourceUrls,
    });

    fullRecordsPerState.push({ cfg, records });
    includedSources.push({
      state: cfg.state, stateName: cfg.stateName,
      name: cfg.name, publisher: cfg.publisher, url: cfg.url,
      sourceStatus: cfg.sourceStatus,
      sourceType: cfg.sourceType,
      sourceUrls,
      adapter: cfg.fetch.name,
      parserConfidence: cfg.parserConfidence ?? null,
      parserNotes: cfg.parserNotes ?? null,
      notes: cfg.notes ?? null,
      license: "Public Domain (state public record)",
    });
  }

  // Keep only the latest 10 years (drop pre-MIN_NOTICE_YEAR historical rows).
  for (const entry of fullRecordsPerState) {
    entry.records = entry.records.filter(
      (r) => !r.noticeDate || r.noticeDate >= MIN_NOTICE_DATE,
    );
    const result = perStateResults.find((r) => r.state === entry.cfg.state);
    if (result) {
      const dates = entry.records.map((r) => r.noticeDate).filter(Boolean).sort();
      result.notices = entry.records.length;
      result.dateRange = { earliest: dates[0] ?? null, latest: dates[dates.length - 1] ?? null };
    }
  }

  // Compute summary over FULL (untrimmed) set
  const allFull = fullRecordsPerState.flatMap(({ records }) => records);
  const summary = buildSummary(allFull);

  // Trim per-state to most-recent MAX_NOTICES_PER_STATE, then assemble final notices
  const trimmedNotices = [];
  for (const { records } of fullRecordsPerState) {
    const sorted = [...records].sort((a, b) => {
      if (!a.noticeDate && !b.noticeDate) return 0;
      if (!a.noticeDate) return 1; if (!b.noticeDate) return -1;
      return b.noticeDate < a.noticeDate ? -1 : b.noticeDate > a.noticeDate ? 1 : 0;
    });
    if (sorted.length > MAX_NOTICES_PER_STATE) {
      const state = sorted[0]?.state ?? "?";
      console.log(`  Trimming ${state}: ${sorted.length} → ${MAX_NOTICES_PER_STATE} (keeping most recent)`);
    }
    trimmedNotices.push(...sorted.slice(0, MAX_NOTICES_PER_STATE));
  }

  // Sort combined notices by noticeDate DESC (nulls last)
  trimmedNotices.sort((a, b) => {
    if (!a.noticeDate && !b.noticeDate) return 0;
    if (!a.noticeDate) return 1; if (!b.noticeDate) return -1;
    return b.noticeDate < a.noticeDate ? -1 : b.noticeDate > a.noticeDate ? 1 : 0;
  });

  const coverageStates = buildCoverageStates(perStateResults);
  const coverageSummary = buildCoverageSummary(coverageStates);
  const liveStateCodes = coverageStates
    .filter((s) => s.sourceStatus === SOURCE_STATUS.LIVE)
    .map((s) => s.state)
    .join(", ");

  const output = {
    generatedAt: new Date().toISOString(),
    coverage:
      `${coverageSummary.liveStates} live WARN adapters (${liveStateCodes}) plus all-state coverage metadata for ${coverageSummary.totalStates} jurisdictions; notices are normalized to the latest 10 years where available.`,
    coverageSummary,
    coverageStates,
    sources: includedSources,
    notices: trimmedNotices,
    summary,
  };

  const jsonStr = JSON.stringify(output, null, 2) + "\n";
  const outPath = path.join(DATA_DIR, "warn-notices.json");
  writeFileSync(outPath, jsonStr);

  // ─── Validation output ────────────────────────────────────────────────────

  console.log("\n=== Per-State Results ===");
  console.log("State | StateName       | Notices | DateRange                          | Status");
  console.log("------+-----------------+---------+------------------------------------+--------");
  for (const r of perStateResults) {
    const dr = r.dateRange
      ? `${r.dateRange.earliest ?? "?"} → ${r.dateRange.latest ?? "?"}`
      : "N/A";
    console.log(
      `${r.state.padEnd(5)} | ${r.stateName.padEnd(15)} | ${String(r.notices).padStart(7)} | ${dr.padEnd(34)} | ${r.status}`
    );
  }

  console.log(`\n✅  Written data/warn-notices.json`);
  console.log(`   notices (trimmed) : ${trimmedNotices.length.toLocaleString()}`);
  console.log(`   total (full set)  : ${summary.total.toLocaleString()}`);
  console.log(`   total employees   : ${summary.totalEmployees.toLocaleString()}`);
  console.log(`   date range        : ${summary.dateRange.earliest} → ${summary.dateRange.latest}`);
  console.log(`   file size         : ${(jsonStr.length / 1024).toFixed(1)} KB`);
  console.log(`   states included   : ${includedSources.map((s) => s.state).join(", ")}`);
  console.log(
    `   coverage states   : ${coverageSummary.totalStates} (${coverageSummary.liveStates} live, ${coverageSummary.manualOnlyStates} manual/PDF-only, ${coverageSummary.unavailableStates} unavailable)`
  );
  console.log(`   byState entries   : ${summary.byState.length}`);

  console.log("\n   byState (desc by employees):");
  for (const s of summary.byState) {
    console.log(
      `     ${s.state} (${s.stateName}): ${s.notices.toLocaleString()} notices, ${s.employees.toLocaleString()} employees, ${s.dateRange.earliest} → ${s.dateRange.latest}`
    );
  }

  console.log("\n   Top 5 employers:");
  for (const e of output.summary.topEmployers.slice(0, 5)) {
    console.log(`     [${e.state}] ${e.company}: ${e.employees.toLocaleString()} (${e.notices} notices)`);
  }
}

main().catch((err) => {
  console.error("\nFATAL:", err.message);
  process.exit(1);
});
