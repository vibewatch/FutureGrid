#!/usr/bin/env node
/**
 * build-onet-enrichment.mjs
 * Fetches O*NET Web Services enrichment and writes data/onet-enrichment.json.
 * Run: ONET_ENRICH_LIMIT=120 npm run build:onet
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import https from "https";
import path from "path";
import { fileURLToPath } from "url";
import nextEnv from "@next/env";
import occupationSnapshot from "../data/occupation-snapshot.json" with { type: "json" };
import { deriveMeta } from "./lib/meta.mjs";
import { validateOnetEnrichment } from "./lib/validate.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
nextEnv.loadEnvConfig(ROOT);

const DATA_DIR = path.join(ROOT, "data");
const CACHE_DIR = path.join(ROOT, ".data-cache", "onet-api-v2");
const OUTPUT_FILE = path.join(DATA_DIR, "onet-enrichment.json");
const BASE_URL = "https://api-v2.onetcenter.org";
const UA = "FutureGrid-data-bot/1.0 (https://github.com/vibewatch/FutureGrid)";

mkdirSync(CACHE_DIR, { recursive: true });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeCacheName(endpoint) {
  return endpoint.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") + ".json";
}

function normalizeSoc(code) {
  const match = String(code ?? "").match(/^(\d{2}-\d{4})/);
  return match ? match[1] : String(code ?? "");
}

async function fetchOnet(endpoint, label) {
  const key = process.env.ONET_API_KEY;
  if (!key) throw new Error("ONET_API_KEY is not configured");

  const cacheFile = path.join(CACHE_DIR, safeCacheName(endpoint));
  if (existsSync(cacheFile)) {
    return JSON.parse(readFileSync(cacheFile, "utf8"));
  }

  const url = `${BASE_URL}/${endpoint}`;
  console.log(`  [fetch] ${label}`);
  let text;
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": UA,
        "X-API-Key": key,
      },
      signal: AbortSignal.timeout(45_000),
    });

    if (!response.ok) {
      throw new Error(`${label}: O*NET HTTP ${response.status} ${response.statusText}`);
    }

    text = await response.text();
  } catch (error) {
    console.warn(`  ⚠ ${label} fetch fallback: ${error.message}`);
    text = await fetchOnetWithHttps(url, label, key);
  }

  const json = JSON.parse(text);
  writeFileSync(cacheFile, JSON.stringify(json, null, 2));
  await sleep(120);
  return json;
}

function fetchOnetWithHttps(url, label, key) {
  console.log(`  [fetch] ${label} via node:https`);
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      family: 4,
      timeout: 45_000,
      headers: {
        Accept: "application/json",
        "User-Agent": UA,
        "X-API-Key": key,
      },
    }, (response) => {
      let text = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { text += chunk; });
      response.on("end", () => {
        if (response.statusCode !== 200) {
          reject(new Error(`${label}: O*NET HTTP ${response.statusCode}`));
          return;
        }
        resolve(text);
      });
    });
    request.on("timeout", () => request.destroy(new Error(`${label}: request timed out`)));
    request.on("error", reject);
  });
}

async function fetchAllOccupations() {
  const first = await fetchOnet("online/occupations/?start=1&end=1000", "O*NET occupation browse 1-1000");
  const total = first.total ?? first.occupation?.length ?? 0;
  const occupations = [...(first.occupation ?? [])];

  for (let start = 1001; start <= total; start += 1000) {
    const end = Math.min(start + 999, total);
    const page = await fetchOnet(`online/occupations/?start=${start}&end=${end}`, `O*NET occupation browse ${start}-${end}`);
    occupations.push(...(page.occupation ?? []));
  }

  return occupations;
}

function buildOnetCodeMap(onetOccupations) {
  const bySoc = new Map();
  for (const occupation of onetOccupations) {
    const soc = normalizeSoc(occupation.code);
    if (!soc) continue;
    const entries = bySoc.get(soc) ?? [];
    entries.push(occupation);
    bySoc.set(soc, entries);
  }

  const result = new Map();
  for (const [soc, entries] of bySoc.entries()) {
    entries.sort((a, b) => {
      const aBase = a.code.endsWith(".00") ? 0 : 1;
      const bBase = b.code.endsWith(".00") ? 0 : 1;
      const aData = a.datalevel === false ? 1 : 0;
      const bData = b.datalevel === false ? 1 : 0;
      return aBase - bBase || aData - bData || a.code.localeCompare(b.code);
    });
    result.set(soc, entries[0]);
  }
  return result;
}

function choosePriorityOccupations(snapshot, limit) {
  const byCode = new Map(snapshot.map((occupation) => [occupation.socCode, occupation]));
  const orderedCodes = [];
  const add = (items) => {
    for (const item of items) {
      if (!orderedCodes.includes(item.socCode)) orderedCodes.push(item.socCode);
      if (limit > 0 && orderedCodes.length >= limit) return;
    }
  };

  add([...snapshot].sort((a, b) => b.aiExposure - a.aiExposure).slice(0, 80));
  add([...snapshot].sort((a, b) => (b.employment ?? 0) - (a.employment ?? 0)).slice(0, 80));
  add([...snapshot].sort((a, b) => (b.projectedOpenings ?? 0) - (a.projectedOpenings ?? 0)).slice(0, 80));
  add([...snapshot].sort((a, b) => (b.medianSalary ?? 0) - (a.medianSalary ?? 0)).slice(0, 60));
  add(snapshot);

  const selectedCodes = limit > 0 ? orderedCodes.slice(0, limit) : orderedCodes;
  return selectedCodes.map((code) => byCode.get(code)).filter(Boolean);
}

function topElements(response, key, mapItem, limit = 6) {
  const items = response?.[key] ?? [];
  return items.slice(0, limit).map(mapItem).filter(Boolean);
}

function flattenTechnology(response, limit = 12) {
  const categories = response?.category ?? [];
  const examples = [];
  for (const category of categories) {
    for (const example of category.example ?? []) {
      examples.push({
        name: example.title ?? example.name,
        category: category.title,
        hot: Boolean(example.hot_technology),
        inDemand: Boolean(example.in_demand),
      });
    }
  }
  examples.sort((a, b) => Number(b.hot) - Number(a.hot) || Number(b.inDemand) - Number(a.inDemand) || a.name.localeCompare(b.name));
  return examples.slice(0, limit);
}

async function buildOccupationEnrichment(snapshotRow, onetOccupation) {
  const onetCode = onetOccupation.code;
  const overview = await fetchOnet(`online/occupations/${encodeURIComponent(onetCode)}/`, `${onetCode} overview`);
  const [tasks, activities, skills, technologies, related] = await Promise.all([
    fetchOnet(`online/occupations/${encodeURIComponent(onetCode)}/summary/tasks`, `${onetCode} tasks`),
    fetchOnet(`online/occupations/${encodeURIComponent(onetCode)}/summary/detailed_work_activities`, `${onetCode} detailed work activities`),
    fetchOnet(`online/occupations/${encodeURIComponent(onetCode)}/summary/skills`, `${onetCode} skills`),
    fetchOnet(`online/occupations/${encodeURIComponent(onetCode)}/summary/technology_skills`, `${onetCode} technology skills`),
    fetchOnet(`online/occupations/${encodeURIComponent(onetCode)}/summary/related_occupations`, `${onetCode} related occupations`),
  ]);

  return {
    occupationCode: snapshotRow.socCode,
    onetCode,
    title: overview.title ?? onetOccupation.title ?? snapshotRow.title,
    description: overview.description ?? "",
    sampleTitles: overview.sample_of_reported_titles ?? [],
    jobZone: onetOccupation.zone ?? null,
    tasks: topElements(tasks, "task", (task) => ({ id: task.id, title: task.title }), 8),
    detailedWorkActivities: topElements(activities, "activity", (activity) => ({ id: activity.id, title: activity.title }), 8),
    skills: topElements(skills, "element", (skill) => ({ id: skill.id, name: skill.name, description: skill.description }), 8),
    technologySkills: flattenTechnology(technologies, 12),
    relatedOccupations: topElements(related, "occupation", (occupation) => ({
      code: normalizeSoc(occupation.code),
      onetCode: occupation.code,
      title: occupation.title,
      brightOutlook: Boolean(occupation.tags?.bright_outlook),
    }), 8),
  };
}

async function main() {
  console.log("=== FutureGrid O*NET enrichment pipeline ===");
  const limit = Number(process.env.ONET_ENRICH_LIMIT ?? "120");
  const snapshot = occupationSnapshot.data ?? occupationSnapshot;
  const onetOccupations = await fetchAllOccupations();
  const onetCodeMap = buildOnetCodeMap(onetOccupations);
  const selected = choosePriorityOccupations(snapshot, Number.isFinite(limit) ? limit : 120);

  console.log(`  Snapshot occupations: ${snapshot.length}`);
  console.log(`  O*NET occupations: ${onetOccupations.length}`);
  console.log(`  Enrichment limit: ${limit === 0 ? "all" : selected.length}`);

  const occupations = {};
  const missing = [];
  for (let index = 0; index < selected.length; index++) {
    const occupation = selected[index];
    const onetOccupation = onetCodeMap.get(occupation.socCode);
    if (!onetOccupation) {
      missing.push(occupation.socCode);
      continue;
    }
    console.log(`  [${index + 1}/${selected.length}] ${occupation.socCode} ${occupation.title}`);
    try {
      occupations[occupation.socCode] = await buildOccupationEnrichment(occupation, onetOccupation);
    } catch (error) {
      console.warn(`  ⚠ ${occupation.socCode} skipped: ${error.message}`);
      missing.push(occupation.socCode);
    }
  }

  const output = {
    generatedAt: new Date().toISOString(),
    source: {
      name: "O*NET Web Services API v2",
      url: "https://services.onetcenter.org/reference/",
      license: "CC BY 4.0",
    },
    coverage: {
      requested: selected.length,
      enriched: Object.keys(occupations).length,
      missing,
    },
    occupations,
  };

  output.meta = deriveMeta(output);
  validateOnetEnrichment(output);
  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2) + "\n");
  console.log(`✓ Written ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error("FATAL:", error);
  process.exit(1);
});
