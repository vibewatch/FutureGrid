#!/usr/bin/env node
/**
 * build-warn.mjs
 * Fetches California EDD WARN Act notices (.xlsx) and emits a committed
 * JSON snapshot to data/warn-notices.json.
 * Run: node scripts/build-warn.mjs
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

// Primary and fallback URLs for the WARN xlsx
const XLSX_URLS = [
  "https://edd.ca.gov/siteassets/files/jobs_and_training/warn/warn_report1.xlsx",
  "https://edd.ca.gov/siteassets/files/jobs_and_training/warn/warn_report.xlsx",
  "https://edd.ca.gov/siteassets/files/jobs_and_training/warn/warn-report.xlsx",
];

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Download with retries and exponential backoff; tries each URL in order
async function downloadXlsx(maxAttempts = 3) {
  for (const url of XLSX_URLS) {
    console.log(`\nTrying: ${url}`);
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": UA },
          redirect: "follow",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
        const arrayBuf = await res.arrayBuffer();
        const buf = Buffer.from(arrayBuf);
        console.log(`  Downloaded ${(buf.length / 1024).toFixed(1)} KB`);
        return buf;
      } catch (err) {
        if (attempt < maxAttempts) {
          const delay = attempt * 2000;
          console.warn(`  Attempt ${attempt} failed (${err.message}). Retrying in ${delay}ms...`);
          await new Promise((r) => setTimeout(r, delay));
        } else {
          console.warn(`  All ${maxAttempts} attempts failed for ${url}: ${err.message}`);
        }
      }
    }
  }
  throw new Error("All WARN xlsx URLs failed after retries.");
}

// Normalize header text: handle rich text objects, collapse whitespace, trim
function normalizeHeader(val) {
  if (val == null) return "";
  let text = "";
  if (typeof val === "object" && val.richText) {
    text = val.richText.map((r) => r.text ?? "").join("");
  } else {
    text = String(val);
  }
  // collapse whitespace and normalize slashes (e.g. "Layoff/ Closure" → "layoff/closure")
  return text.replace(/\s+/g, " ").replace(/\s*\/\s*/g, "/").trim().toLowerCase();
}

// Convert an exceljs cell value to a string, trimmed
function cellStr(cell) {
  if (cell == null || cell.value == null) return null;
  const v = cell.value;
  if (v instanceof Date) return null; // dates handled separately
  if (typeof v === "object" && v.richText) {
    // rich text
    return v.richText.map((r) => r.text).join("").trim() || null;
  }
  const s = String(v).trim();
  return s === "" ? null : s;
}

// Parse a date value from an exceljs cell into "YYYY-MM-DD" or null
function parseDate(val) {
  if (val == null) return null;

  // Already a JS Date
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    const y = val.getUTCFullYear();
    const m = String(val.getUTCMonth() + 1).padStart(2, "0");
    const d = String(val.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // Excel serial number (number, not a Date object in some versions)
  if (typeof val === "number" && val > 1000 && val < 100000) {
    // Excel date serial: days since 1899-12-30 (accounting for Lotus 1900 bug)
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const ms = epoch.getTime() + val * 86400000;
    const d = new Date(ms);
    if (isNaN(d.getTime())) return null;
    const y = d.getUTCFullYear();
    const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dy = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${mo}-${dy}`;
  }

  // String: try common formats
  if (typeof val === "string") {
    const s = val.trim();
    if (!s) return null;
    // ISO
    const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    // M/D/YYYY or MM/DD/YYYY
    const mdyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (mdyMatch) {
      return `${mdyMatch[3]}-${mdyMatch[1].padStart(2, "0")}-${mdyMatch[2].padStart(2, "0")}`;
    }
    // Try native Date parsing as last resort
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  }

  return null;
}

// Best-effort city extraction from an address string
function extractCity(address) {
  if (!address) return null;
  // Common CA pattern: "123 Main St, City, CA 12345" or "City, CA"
  const match = address.match(/,\s*([^,]+),\s*CA\b/i);
  if (match) return match[1].trim();
  // "City CA 12345"
  const match2 = address.match(/,\s*([^,]+)\s+CA\s+\d{5}/i);
  if (match2) return match2[1].trim();
  return null;
}

async function main() {
  console.log("=== Building CA WARN Act data snapshot ===");

  // 1. Download xlsx
  const buffer = await downloadXlsx(3);

  // 2. Load workbook
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  // 3. Find the target worksheet
  let worksheet = null;
  for (const ws of workbook.worksheets) {
    if (/detailed.*warn/i.test(ws.name)) {
      worksheet = ws;
      console.log(`\nUsing worksheet: "${ws.name}"`);
      break;
    }
  }
  // Fallback: sheet with most rows that have a Company + numeric employees
  if (!worksheet) {
    let bestSheet = null;
    let bestCount = 0;
    for (const ws of workbook.worksheets) {
      let count = 0;
      ws.eachRow((row) => {
        const vals = row.values;
        if (vals && vals.length > 3 && typeof vals[2] === "string" && typeof vals[4] === "number") {
          count++;
        }
      });
      if (count > bestCount) {
        bestCount = count;
        bestSheet = ws;
      }
    }
    worksheet = bestSheet;
    if (worksheet) console.log(`\nFallback worksheet: "${worksheet.name}"`);
  }

  if (!worksheet) {
    throw new Error("Could not find a suitable WARN data worksheet.");
  }

  // 4. Locate header row and map columns
  const COL_KEYS = {
    company: ["company"],
    county: ["county/parish", "county"],
    layoffType: ["layoff/closure", "layoff closure", "layoff type", "type"],
    employees: ["no. of employees", "no of employees", "employees", "# employees", "number of employees"],
    address: ["address"],
    noticeDate: ["notice date"],
    effectiveDate: ["effective date"],
    processedDate: ["processed date"],
  };

  let headerRowNumber = -1;
  const colIndex = {}; // key → 1-based column index

  worksheet.eachRow((row, rowNumber) => {
    if (headerRowNumber !== -1) return; // already found
    const cells = row.values; // 1-based array (index 0 is undefined)
    if (!cells) return;

    // Check if this row contains "Company" and "Employees"
    const normalized = cells.map((v) => (v == null ? "" : normalizeHeader(v)));
    const hasCompany = normalized.some((h) => h.includes("company"));
    const hasEmployees = normalized.some((h) => h.includes("employees"));
    if (!hasCompany || !hasEmployees) return;

    // Map each field
    headerRowNumber = rowNumber;
    for (const [key, aliases] of Object.entries(COL_KEYS)) {
      for (let i = 1; i < normalized.length; i++) {
        const h = normalized[i];
        if (aliases.some((alias) => h === alias || h.startsWith(alias))) {
          if (!(key in colIndex)) colIndex[key] = i;
        }
      }
    }
  });

  if (headerRowNumber === -1) {
    throw new Error("Could not find header row with 'Company' and 'Employees' columns.");
  }
  console.log(`  Header row: ${headerRowNumber}`);
  console.log(`  Column map: ${JSON.stringify(colIndex)}`);

  // 5. Parse data rows
  const notices = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRowNumber) return;

    const get = (key) => row.getCell(colIndex[key] ?? 0);
    const getVal = (key) => (colIndex[key] ? row.getCell(colIndex[key]).value : null);

    const companyRaw = cellStr(get("company"));
    if (!companyRaw) return; // skip blank rows

    // Skip totals/summary rows
    if (/^\s*(total|grand total|subtotal)\s*$/i.test(companyRaw)) return;

    const employeesRaw = getVal("employees");
    let employees = null;
    if (typeof employeesRaw === "number") {
      employees = employeesRaw;
    } else if (typeof employeesRaw === "string") {
      const n = Number(employeesRaw.replace(/,/g, "").trim());
      if (!isNaN(n)) employees = n;
    }
    if (employees == null || employees <= 0) return; // skip non-numeric / zero

    const addressRaw = cellStr(get("address")) ?? "";
    const city = extractCity(addressRaw);

    const noticeDate = parseDate(getVal("noticeDate"));
    const effectiveDate = parseDate(getVal("effectiveDate"));

    notices.push({
      company: companyRaw.trim(),
      county: cellStr(get("county"))?.trim() ?? null,
      city,
      address: addressRaw || null,
      employees: Math.round(employees),
      noticeDate,
      effectiveDate,
      layoffType: cellStr(get("layoffType"))?.trim() ?? null,
      state: "CA",
    });
  });

  console.log(`  Parsed ${notices.length} valid notices`);

  if (notices.length === 0) {
    throw new Error("No valid notices parsed — check column mapping.");
  }

  // 6. Sort by noticeDate descending
  notices.sort((a, b) => {
    const da = a.noticeDate ?? "";
    const db = b.noticeDate ?? "";
    return db < da ? -1 : db > da ? 1 : 0;
  });

  // 7. Build summary
  const validDates = notices.map((n) => n.noticeDate).filter(Boolean).sort();
  const earliest = validDates[0] ?? null;
  const latest = validDates[validDates.length - 1] ?? null;

  const totalEmployees = notices.reduce((s, n) => s + n.employees, 0);

  // byMonth
  const monthMap = new Map();
  for (const n of notices) {
    if (!n.noticeDate) continue;
    const month = n.noticeDate.slice(0, 7);
    const cur = monthMap.get(month) ?? { notices: 0, employees: 0 };
    cur.notices++;
    cur.employees += n.employees;
    monthMap.set(month, cur);
  }
  const byMonth = Array.from(monthMap.entries())
    .map(([month, v]) => ({ month, ...v }))
    .sort((a, b) => (a.month < b.month ? -1 : 1));

  // byType
  const typeMap = new Map();
  for (const n of notices) {
    const t = n.layoffType ?? "Unknown";
    const cur = typeMap.get(t) ?? { notices: 0, employees: 0 };
    cur.notices++;
    cur.employees += n.employees;
    typeMap.set(t, cur);
  }
  const byType = Array.from(typeMap.entries())
    .map(([type, v]) => ({ type, ...v }))
    .sort((a, b) => b.employees - a.employees);

  // topEmployers (top 15 by employees)
  const employerMap = new Map();
  for (const n of notices) {
    const key = n.company;
    const cur = employerMap.get(key) ?? { employees: 0, notices: 0 };
    cur.employees += n.employees;
    cur.notices++;
    employerMap.set(key, cur);
  }
  const topEmployers = Array.from(employerMap.entries())
    .map(([company, v]) => ({ company, ...v }))
    .sort((a, b) => b.employees - a.employees)
    .slice(0, 15);

  // 8. Assemble output
  const output = {
    generatedAt: new Date().toISOString(),
    source: {
      name: "California WARN Act Notices",
      publisher: "California Employment Development Department (EDD)",
      url: "https://edd.ca.gov/en/jobs_and_training/layoff_services_warn/",
      license: "Public Domain (California public record)",
      coverage: "California — the largest U.S. state, official EDD WARN filings",
      note: "WARN = Worker Adjustment and Retraining Notification Act; employers must file for mass layoffs/closures. Coverage is California only; schema is state-extensible.",
    },
    notices,
    summary: {
      total: notices.length,
      totalEmployees,
      dateRange: { earliest, latest },
      byMonth,
      byType,
      topEmployers,
    },
  };

  const jsonStr = JSON.stringify(output, null, 2) + "\n";
  const outPath = path.join(DATA_DIR, "warn-notices.json");
  writeFileSync(outPath, jsonStr);

  // 9. Print validation summary
  console.log("\n✅  Written data/warn-notices.json");
  console.log(`   notices count    : ${output.summary.total}`);
  console.log(`   total employees  : ${output.summary.totalEmployees.toLocaleString()}`);
  console.log(`   date range       : ${earliest} → ${latest}`);
  console.log(`   file size        : ${(jsonStr.length / 1024).toFixed(1)} KB`);
  console.log("\n   Top 3 employers:");
  for (const e of topEmployers.slice(0, 3)) {
    console.log(`     ${e.company}: ${e.employees.toLocaleString()} employees (${e.notices} notices)`);
  }
}

main().catch((err) => {
  console.error("\nFATAL:", err.message);
  process.exit(1);
});
