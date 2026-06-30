#!/usr/bin/env node
/**
 * build-world-geo.mjs
 * Fetches world-atlas TopoJSON + ISO crosswalk, converts to an annotated GeoJSON
 * FeatureCollection (numeric ISO id → alpha-3), and writes data/world-countries.geo.json.
 *
 * Run: node scripts/build-world-geo.mjs
 * Raw downloads are cached in .data-cache/ (gitignored); only the processed geojson is committed.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import https from "https";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { feature as topoFeature } from "topojson-client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const PUBLIC_DIR = path.join(ROOT, "public");
const CACHE_DIR = path.join(ROOT, ".data-cache");

[DATA_DIR, PUBLIC_DIR, CACHE_DIR].forEach((d) => { if (!existsSync(d)) mkdirSync(d, { recursive: true }); });

const UA = "FutureGrid-data-bot/1.0 (https://github.com/huangyingting/FutureGrid)";
const WORLD_ATLAS_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const ISO_CROSSWALK_URL = "https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.json";

function resolveUrl(base, location) {
  if (!location) return base;
  if (location.startsWith("http://") || location.startsWith("https://")) return location;
  try { return new URL(location, base).href; } catch { return new URL(base).origin + location; }
}

function fetchText(url, cacheFile) {
  if (existsSync(cacheFile)) {
    console.log(`  [cache] ${cacheFile}`);
    return Promise.resolve(readFileSync(cacheFile, "utf8"));
  }
  console.log(`  [fetch] ${url}`);
  return new Promise((resolve, reject) => {
    const options = { headers: { "User-Agent": UA } };
    function doRequest(u) {
      const proto = u.startsWith("https") ? https : http;
      proto.get(u, options, (res) => {
        if ([301, 302, 307, 308].includes(res.statusCode)) {
          return doRequest(resolveUrl(u, res.headers.location));
        }
        if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode} for ${u}`)); return; }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const buf = Buffer.concat(chunks);
          writeFileSync(cacheFile, buf);
          resolve(buf.toString("utf8"));
        });
        res.on("error", reject);
      }).on("error", reject);
    }
    doRequest(url);
  });
}

async function main() {
  console.log("=== FutureGrid world geometry builder ===");

  const topoText = await fetchText(WORLD_ATLAS_URL, path.join(CACHE_DIR, "countries-110m.json"));
  const isoText = await fetchText(ISO_CROSSWALK_URL, path.join(CACHE_DIR, "iso-crosswalk.json"));

  const topo = JSON.parse(topoText);
  const isoData = JSON.parse(isoText);

  // Build numeric ISO code (integer) → alpha-3 lookup
  const numToIso3 = new Map();
  for (const entry of isoData) {
    const num = parseInt(entry["country-code"], 10);
    if (!isNaN(num) && entry["alpha-3"]) numToIso3.set(num, entry["alpha-3"]);
  }
  console.log(`  Crosswalk: ${numToIso3.size} numeric → alpha-3 entries`);

  const geojson = topoFeature(topo, topo.objects.countries);
  console.log(`  TopoJSON decoded: ${geojson.features.length} raw features`);

  const features = [];
  for (const f of geojson.features) {
    const numId = typeof f.id === "number" ? f.id : parseInt(String(f.id), 10);
    const iso3 = numToIso3.get(numId);
    if (!iso3 || iso3 === "ATA") continue; // drop Antarctica + unmapped
    features.push({
      type: "Feature",
      id: iso3,
      properties: { name: (f.properties && f.properties.name) || "" },
      geometry: f.geometry,
    });
  }

  const out = { type: "FeatureCollection", features };
  const outJson = JSON.stringify(out);
  writeFileSync(path.join(DATA_DIR, "world-countries.geo.json"), outJson);
  writeFileSync(path.join(PUBLIC_DIR, "world-countries.geo.json"), outJson);
  console.log(`\n✓ Written data/world-countries.geo.json and public/world-countries.geo.json (${features.length} features)`);

  // Spot-check required countries
  const required = ["CHN", "USA", "IND", "BRA"];
  for (const iso of required) {
    const found = features.find((f) => f.id === iso);
    console.log(`  ${iso}: ${found ? `✓ (${found.properties.name})` : "✗ MISSING"}`);
  }

  if (features.length < 170) {
    throw new Error(`Expected ≥170 features, got ${features.length}`);
  }
  if (required.some((iso) => !features.find((f) => f.id === iso))) {
    throw new Error("One or more required country ids missing");
  }
  console.log("\n=== Done ===");
}

main().catch((err) => { console.error("FATAL:", err); process.exit(1); });
