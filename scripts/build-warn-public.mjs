// Copies data/warn-notices.json to public/warn-notices.json so the Recent-
// Layoffs client views can fetch it at runtime instead of bundling it into a
// client JS chunk. Mirrors the world-countries.geo.json pattern.
//
// Run: node scripts/build-warn-public.mjs  (also wired into build:warn)

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const src = join(root, "data", "warn-notices.json");
const dest = join(root, "public", "warn-notices.json");

const raw = readFileSync(src, "utf8");
// Re-serialize (drops any incidental formatting) and validate it parses.
const parsed = JSON.parse(raw);
writeFileSync(dest, JSON.stringify(parsed));

console.log(
  `[build-warn-public] wrote ${parsed.notices?.length ?? 0} notices -> ${dest} (${(
    JSON.stringify(parsed).length / 1048576
  ).toFixed(2)} MB)`,
);
