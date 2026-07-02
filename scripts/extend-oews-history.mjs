#!/usr/bin/env node
/**
 * extend-oews-history.mjs
 *
 * Surgical merge: adds 2016/2017/2018 OEWS employment+wage history into
 * data/occupation-snapshot.json WITHOUT re-running the full build-data-snapshot.
 *
 * Usage:  node scripts/extend-oews-history.mjs
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createWriteStream } from "node:fs";
import path from "node:path";
import https from "node:https";
import http from "node:http";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ── Config ────────────────────────────────────────────────────────────────────

const SNAPSHOT_PATH = path.join(ROOT, "data", "occupation-snapshot.json");
const WORK_DIR      = path.join(ROOT, ".data-cache", "oews_extend_2016_2018");

const YEARS_TO_ADD = [
  { year: "2016", yr: "16", ts: "20260613002610" },
  { year: "2017", yr: "17", ts: "20260613002711" },
  { year: "2018", yr: "18", ts: "20260613002703" },
];

const UA = "Mozilla/5.0 (compatible; FutureGrid/1.0; +https://github.com/huangyingting/FutureGrid)";

// ── Python parser — robust to both pre-2019 and post-2019 column layouts ────

const PARSE_OEWS_PY = `import json, openpyxl, sys
wb = openpyxl.load_workbook(sys.argv[1], read_only=True)
ws = wb.active
it = ws.iter_rows(values_only=True)
headers = [str(h).lower().strip() if h is not None else '' for h in next(it)]
def ci(name): return headers.index(name) if name in headers else -1
i_naics=ci('naics'); i_own=ci('own_code')
i_og=ci('o_group') if ci('o_group')>=0 else ci('occ_group')
i_code=ci('occ_code'); i_emp=ci('tot_emp'); i_wage=ci('a_median')
def toint(v):
    if v is None: return None
    s=str(v).strip().replace(',','')
    if s in ('None','','*','**','#','-'): return None
    try: return int(float(s))
    except: return None
result={}
for row in it:
    code=str(row[i_code]).strip() if i_code>=0 else ''
    if not code or code=='None': continue
    og=str(row[i_og]).strip().lower() if i_og>=0 else ''
    if og!='detailed': continue
    if i_naics>=0 and str(row[i_naics]).strip()!='000000': continue
    if i_own>=0 and str(row[i_own]).strip()!='1235': continue
    emp=toint(row[i_emp] if i_emp>=0 else None)
    wage=toint(row[i_wage] if i_wage>=0 else None)
    if emp is not None or wage is not None:
        result[code]={'emp':emp,'wage':wage}
wb.close()
print(json.dumps(result))
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fetchBinary(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(destPath);
    function doGet(u, redirects) {
      if (redirects > 10) { file.close(); return reject(new Error("Too many redirects")); }
      // Force HTTP for web.archive.org (port 443/HTTPS is blocked in this env)
      const effectiveUrl = u.replace(/^https:\/\/(web\.archive\.org)\//, "http://$1/");
      const mod = effectiveUrl.startsWith("https://") ? https : http;
      const req = mod.get(effectiveUrl, {
        headers: {
          "User-Agent": UA,
          "Accept": "*/*",
        },
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const loc = res.headers.location;
          const next = loc.startsWith("http") ? loc : new URL(loc, u).toString();
          res.resume();
          doGet(next, redirects + 1);
          return;
        }
        if (res.statusCode !== 200) {
          file.close();
          return reject(new Error(`HTTP ${res.statusCode} for ${u}`));
        }
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
        file.on("error", reject);
      });
      req.on("error", reject);
    }
    doGet(url, 0);
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== extend-oews-history: adding 2016, 2017, 2018 ===\n");

  // Setup work dir
  if (!existsSync(WORK_DIR)) mkdirSync(WORK_DIR, { recursive: true });

  // Write parser
  const parserPath = path.join(WORK_DIR, "parse_oews.py");
  writeFileSync(parserPath, PARSE_OEWS_PY);

  // Load snapshot (supports the { meta, data } wrapper; issue #52)
  const snapshotRaw = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8"));
  const snapshot = Array.isArray(snapshotRaw) ? snapshotRaw : snapshotRaw.data;
  console.log(`Loaded snapshot: ${snapshot.length} occupations\n`);

  const summaryLines = [];

  for (const { year, yr, ts } of YEARS_TO_ADD) {
    const zipPath  = path.join(WORK_DIR, `oesm${yr}nat.zip`);
    const unzipDir = path.join(WORK_DIR, year);

    // ── Download ──────────────────────────────────────────────────────────────
    if (existsSync(zipPath)) {
      const ft = execSync(`file "${zipPath}"`).toString();
      if (!ft.includes("Zip archive")) {
        execSync(`rm -f "${zipPath}"`);
      }
    }

    if (!existsSync(zipPath)) {
      const wbUrl = `https://web.archive.org/web/${ts}/https://www.bls.gov/oes/special.requests/oesm${yr}nat.zip`;
      process.stdout.write(`[${year}] Downloading ${wbUrl} … `);
      try {
        await fetchBinary(wbUrl, zipPath);
        const ft2 = execSync(`file "${zipPath}"`).toString();
        if (!ft2.includes("Zip archive")) {
          process.stdout.write("NOT a ZIP — skipping\n");
          execSync(`rm -f "${zipPath}"`);
          summaryLines.push(`  ${year}: SKIPPED (download not a ZIP)`);
          continue;
        }
        process.stdout.write("ok\n");
      } catch (e) {
        process.stdout.write(`FAILED: ${e.message.split("\n")[0]}\n`);
        summaryLines.push(`  ${year}: FAILED download`);
        continue;
      }
    } else {
      console.log(`[${year}] Using cached zip`);
    }

    // ── Unzip ─────────────────────────────────────────────────────────────────
    if (!existsSync(unzipDir)) {
      mkdirSync(unzipDir, { recursive: true });
      try {
        execSync(`unzip -q "${zipPath}" -d "${unzipDir}"`, { stdio: "ignore" });
      } catch { /* tolerate warnings */ }
    }

    // ── Find xlsx — prefer national_M*_dl.xlsx over auxiliary files ──────────
    const allXlsx = execSync(`find "${unzipDir}" -name "*.xlsx" 2>/dev/null`)
      .toString().trim().split("\n").filter(Boolean);
    if (!allXlsx.length) {
      console.warn(`[${year}] No xlsx found in ZIP — skipping`);
      summaryLines.push(`  ${year}: SKIPPED (no xlsx in zip)`);
      continue;
    }
    const xlsxFiles = allXlsx.sort((a, b) => {
      const aMain = /national_M\d+_dl\.xlsx$/i.test(a) ? 0 : 1;
      const bMain = /national_M\d+_dl\.xlsx$/i.test(b) ? 0 : 1;
      return aMain - bMain;
    });

    // ── Parse ─────────────────────────────────────────────────────────────────
    process.stdout.write(`[${year}] Parsing ${path.basename(xlsxFiles[0])} … `);
    let parsedData;
    try {
      const out = execSync(`python3 "${parserPath}" "${xlsxFiles[0]}"`, { maxBuffer: 32 * 1024 * 1024 }).toString();
      parsedData = JSON.parse(out);
    } catch (e) {
      process.stdout.write(`PARSE FAILED: ${e.message.split("\n")[0]}\n`);
      summaryLines.push(`  ${year}: FAILED parse`);
      continue;
    }
    process.stdout.write(`${Object.keys(parsedData).length} occ parsed\n`);

    // ── Merge ─────────────────────────────────────────────────────────────────
    let empAdded = 0, wageAdded = 0;
    for (const occ of snapshot) {
      const row = parsedData[occ.socCode];
      if (!row) continue;
      if (row.emp !== null && row.emp !== undefined && row.emp > 0) {
        if (!occ.employmentHistory) occ.employmentHistory = {};
        if (!(year in occ.employmentHistory)) {
          occ.employmentHistory[year] = row.emp;
          empAdded++;
        }
      }
      if (row.wage !== null && row.wage !== undefined && row.wage > 0) {
        if (!occ.wageHistory) occ.wageHistory = {};
        if (!(year in occ.wageHistory)) {
          occ.wageHistory[year] = row.wage;
          wageAdded++;
        }
      }
    }
    console.log(`[${year}] Merged: ${empAdded} employment values, ${wageAdded} wage values`);
    summaryLines.push(`  ${year}: +${empAdded} employment, +${wageAdded} wage`);
  }

  // ── Sort history keys chronologically for each occupation ─────────────────
  for (const occ of snapshot) {
    if (occ.employmentHistory) {
      const sorted = Object.keys(occ.employmentHistory).sort();
      const obj = {};
      for (const k of sorted) obj[k] = occ.employmentHistory[k];
      occ.employmentHistory = obj;
    }
    if (occ.wageHistory) {
      const sorted = Object.keys(occ.wageHistory).sort();
      const obj = {};
      for (const k of sorted) obj[k] = occ.wageHistory[k];
      occ.wageHistory = obj;
    }
  }

  // ── Write snapshot (preserve the { meta, data } wrapper) ──────────────────
  let output;
  if (Array.isArray(snapshotRaw)) {
    output = snapshot;
  } else {
    output = snapshotRaw;
    output.data = snapshot;
    if (output.meta && typeof output.meta === "object") {
      output.meta.generatedAt = new Date().toISOString();
    }
  }
  writeFileSync(SNAPSHOT_PATH, JSON.stringify(output, null, 2) + "\n", "utf8");
  console.log(`\nWrote ${SNAPSHOT_PATH}`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\nPer-year merge counts:");
  for (const line of summaryLines) console.log(line);

  // ── Spot-check ───────────────────────────────────────────────────────────
  const check = snapshot.find(o => o.socCode === "41-9041") || snapshot.find(o => o.socCode === "15-1252");
  if (check) {
    console.log(`\nSpot-check ${check.socCode} (${check.title}):`);
    console.log("  employmentHistory:", JSON.stringify(check.employmentHistory));
  }

  // Count occupations that now have a 2016 employment value
  const with2016 = snapshot.filter(o => o.employmentHistory && "2016" in o.employmentHistory).length;
  console.log(`\nOccupations with 2016 employment: ${with2016} / ${snapshot.length}`);
}

main().catch(e => { console.error(e); process.exit(1); });
