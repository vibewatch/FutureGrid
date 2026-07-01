#!/usr/bin/env node
/**
 * build-warn.mjs
 * Multi-state WARN Act notices: CA, GA, KY, NJ, NY, OH, OR, TN, TX, WI
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
    const d = new Date(s);
    if (!isNaN(d.getTime()) && d.getUTCFullYear() > 1900) return d.toISOString().slice(0, 10);
  }
  return null;
}

function fmtDate(y, m, d) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function normalizeLayoffType(t) {
  if (!t) return null;
  const s = t.trim().toLowerCase();
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
  const url =
    "https://sheets.googleapis.com/v4/spreadsheets/1cyZiHZcepBI7ShB3dMcRprUFRG24lbwEnEDRBMhAqsA/values/Originals?key=AIzaSyBF5bsJ9oCetBmqXL5LQII4G639YaKritw";
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
  const url = "https://storage.googleapis.com/bln-data-public/warn-layoffs/or_historical.xlsx";
  const buffer = await fetchBuffer(url);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  let worksheet = workbook.worksheets[0];
  for (const ws of workbook.worksheets) {
    if (ws.actualRowCount > 0) { worksheet = ws; break; }
  }

  // Header row is NOT row 1 — locate by finding the row containing "Company Name"
  let headerRow = -1;
  const colIndex = {};
  worksheet.eachRow((row, rowNumber) => {
    if (headerRow !== -1) return;
    const cells = row.values;
    if (!cells) return;
    const norm = cells.map((v) => (v == null ? "" : normalizeHeader(v)));
    if (!norm.some((h) => h === "company name") || !norm.some((h) => h === "laid off" || h === "received date")) return;
    headerRow = rowNumber;
    console.log(`  OR sheet="${worksheet.name}" header=${rowNumber} raw: ${norm.filter(Boolean).join(" | ")}`);
    for (let i = 1; i < norm.length; i++) {
      const h = norm[i];
      if (!h) continue;
      if (h === "company name" && colIndex.company == null) colIndex.company = i;
      else if ((h === "location" || h === "city") && colIndex.city == null) colIndex.city = i;
      else if ((h === "layoff date" || (h.includes("layoff") && h.includes("date"))) && colIndex.effectiveDate == null) colIndex.effectiveDate = i;
      else if ((h === "laid off" || (h.includes("laid") && h.includes("off"))) && colIndex.employees == null) colIndex.employees = i;
      else if ((h === "layoff type" || h === "type") && colIndex.layoffType == null) colIndex.layoffType = i;
      else if ((h === "received date" || (h.includes("received") && h.includes("date"))) && colIndex.noticeDate == null) colIndex.noticeDate = i;
    }
  });
  if (headerRow === -1) throw new Error("OR: header row not found");
  console.log(`  OR colIndex: ${JSON.stringify(colIndex)}`);

  const records = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRow) return;
    const rec = parseXlsxRow(row, colIndex, "OR", "Oregon");
    if (rec) records.push(rec);
  });
  return records;
}

// ─── State config ─────────────────────────────────────────────────────────────

const STATE_CONFIG = [
  {
    state: "CA", stateName: "California",
    name: "California WARN Act Notices",
    publisher: "California Employment Development Department (EDD)",
    url: "https://edd.ca.gov/en/jobs_and_training/layoff_services_warn/",
    fetch: fetchCA,
  },
  {
    state: "NJ", stateName: "New Jersey",
    name: "New Jersey WARN Notice Archive",
    publisher: "New Jersey Department of Labor and Workforce Development",
    url: "https://www.nj.gov/labor/assets/PDFs/WARN/WARN_Notice_Archive.xlsx",
    fetch: fetchNJ,
  },
  {
    state: "TX", stateName: "Texas",
    name: "Texas WARN Act Historical Notices",
    publisher: "BLN Data (Texas Workforce Commission)",
    url: "https://storage.googleapis.com/bln-data-public/warn-layoffs/tx_historical.xlsx",
    fetch: fetchTX,
  },
  {
    state: "NY", stateName: "New York",
    name: "New York WARN Act Historical Notices",
    publisher: "BLN Data (New York State Department of Labor)",
    url: "https://storage.googleapis.com/bln-data-public/warn-layoffs/ny_historical.xlsx",
    fetch: fetchNY,
  },
  {
    state: "OH", stateName: "Ohio",
    name: "Ohio WARN Act Historical Notices",
    publisher: "BLN Data (Ohio Department of Job and Family Services)",
    url: "https://storage.googleapis.com/bln-data-public/warn-layoffs/oh_historical.csv",
    fetch: fetchOH,
  },
  {
    state: "WI", stateName: "Wisconsin",
    name: "Wisconsin WARN Act Notices",
    publisher: "Wisconsin Department of Workforce Development",
    url: "https://sheets.googleapis.com/v4/spreadsheets/1cyZiHZcepBI7ShB3dMcRprUFRG24lbwEnEDRBMhAqsA/values/Originals",
    fetch: fetchWI,
  },
  {
    state: "GA", stateName: "Georgia",
    name: "Georgia WARN Act Historical Notices",
    publisher: "BLN Data (Georgia Department of Labor)",
    url: "https://storage.googleapis.com/bln-data-public/warn-layoffs/ga_historical.csv",
    fetch: fetchGA,
  },
  {
    state: "TN", stateName: "Tennessee",
    name: "Tennessee WARN Act Historical Notices",
    publisher: "BLN Data (Tennessee Department of Labor and Workforce Development)",
    url: "https://storage.googleapis.com/bln-data-public/warn-layoffs/tn_historical.csv",
    fetch: fetchTN,
  },
  {
    state: "KY", stateName: "Kentucky",
    name: "Kentucky WARN Act Historical Notices",
    publisher: "BLN Data (Kentucky Career Center)",
    url: "https://storage.googleapis.com/bln-data-public/warn-layoffs/ky-historical-normalized.csv",
    fetch: fetchKY,
  },
  {
    state: "OR", stateName: "Oregon",
    name: "Oregon WARN Act Historical Notices",
    publisher: "BLN Data (Oregon Employment Department)",
    url: "https://storage.googleapis.com/bln-data-public/warn-layoffs/or_historical.xlsx",
    fetch: fetchOR,
  },
];

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
      perStateResults.push({ state: cfg.state, stateName: cfg.stateName, status: "skipped", notices: 0 });
      continue;
    }

    const dates = records.map((r) => r.noticeDate).filter(Boolean).sort();
    console.log(`  ✓ ${cfg.state}: ${records.length} valid notices`);
    perStateResults.push({
      state: cfg.state, stateName: cfg.stateName, status: "ok", notices: records.length,
      dateRange: { earliest: dates[0] ?? null, latest: dates[dates.length - 1] ?? null },
    });

    fullRecordsPerState.push({ cfg, records });
    includedSources.push({
      state: cfg.state, stateName: cfg.stateName,
      name: cfg.name, publisher: cfg.publisher, url: cfg.url,
      license: "Public Domain (state public record)",
    });
  }

  // Keep only the latest 10 years (drop pre-MIN_NOTICE_YEAR historical rows).
  for (const entry of fullRecordsPerState) {
    entry.records = entry.records.filter(
      (r) => !r.noticeDate || r.noticeDate >= MIN_NOTICE_DATE,
    );
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

  const output = {
    generatedAt: new Date().toISOString(),
    coverage:
      "10 U.S. states (CA, GA, KY, NJ, NY, OH, OR, TN, TX, WI) — official state WARN Act filings, aggregated, latest 10 years. Some states are historical backfills; see per-state date ranges.",
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
