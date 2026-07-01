// Real-browser route smoke test.
//
// Why this exists: the unit tests run in jsdom, which mocks ResizeObserver to a
// no-op. d3 charts that compute their layout behind a ResizeObserver never run
// in jsdom, so a chart can throw in a real browser while `build` + `test` stay
// green. That is exactly how a d3-sankey "missing: 0" crash shipped to
// production and took down /skills and /report.
//
// This script serves the static export in `out/`, loads every route in headless
// Google Chrome, and fails if any route renders the app error boundary or comes
// back suspiciously empty. No Playwright/Puppeteer dependency — it drives the
// Chrome that GitHub's ubuntu runner already ships (override with CHROME_BIN).

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname } from "node:path";
import { spawn, spawnSync } from "node:child_process";

const OUT = join(process.cwd(), "out");
const PORT = Number(process.env.SMOKE_PORT ?? 8137);
const BUDGET_MS = Number(process.env.SMOKE_BUDGET_MS ?? 10000);

// Representative routes (dynamic [code]/[id] pages share their list page's shell).
const ROUTES = [
  "/", "/careers", "/sectors", "/skills", "/explore",
  "/global", "/heatmap", "/sources", "/report",
  "/pulse", "/layoffs",
];

// Strings the app's error boundary renders when a page crashes at runtime.
const ERROR_MARKERS = [/Something went wrong/i, /unexpected error disrupted/i];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json",
  ".xml": "application/xml",
};

function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    "google-chrome",
    "google-chrome-stable",
    "chromium",
    "chromium-browser",
  ].filter(Boolean);
  for (const bin of candidates) {
    try {
      const r = spawnSync(bin, ["--version"], { encoding: "utf8" });
      if (r.status === 0) return bin;
    } catch {
      // try next candidate
    }
  }
  return null;
}

// Resolve a request URL to a file in out/ for a trailingSlash:false export
// (e.g. "/skills" -> out/skills.html, "/" -> out/index.html).
function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]);
  if (clean === "/") return join(OUT, "index.html");
  const direct = join(OUT, clean);
  if (existsSync(direct) && extname(direct)) return direct;
  if (existsSync(`${direct}.html`)) return `${direct}.html`;
  const asIndex = join(direct, "index.html");
  if (existsSync(asIndex)) return asIndex;
  if (existsSync(direct)) return direct;
  return null;
}

function startServer() {
  const server = createServer(async (req, res) => {
    const file = resolveFile(req.url ?? "/");
    if (!file || !existsSync(file)) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    try {
      const body = await readFile(file);
      res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(500);
      res.end("read error");
    }
  });
  return new Promise((resolve) => server.listen(PORT, () => resolve(server)));
}

// Load a route in headless Chrome and capture the post-hydration DOM.
// Uses async spawn (NOT spawnSync): the static server runs in this same
// process, so a blocking spawnSync would deadlock — Chrome's requests could
// never be served while the event loop was parked.
function loadRoute(chrome, url) {
  return new Promise((resolve) => {
    const child = spawn(
      chrome,
      [
        "--headless=new",
        "--no-sandbox",
        "--no-zygote",
        "--no-first-run",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--window-size=1280,900",
        `--virtual-time-budget=${BUDGET_MS}`,
        "--run-all-compositor-stages-before-draw",
        "--dump-dom",
        url,
      ],
      { stdio: ["ignore", "pipe", "pipe"], detached: true },
    );
    let dom = "";
    let err = "";
    // Reap the whole Chrome process group (renderer/gpu/utility helpers don't
    // always exit when the main --dump-dom process does, leaking processes).
    const reap = () => {
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {
        // group already gone
      }
    };
    child.stdout.on("data", (d) => (dom += d));
    child.stderr.on("data", (d) => (err += d));
    const killer = setTimeout(reap, BUDGET_MS + 20000);
    child.on("close", (status) => {
      clearTimeout(killer);
      reap();
      resolve({ status, dom, err });
    });
    child.on("error", (e) => {
      clearTimeout(killer);
      reap();
      resolve({ status: -1, dom: "", err: String(e) });
    });
  });
}

async function main() {
  if (!existsSync(OUT)) {
    console.error("✗ out/ not found — run `npm run build` first.");
    process.exit(1);
  }

  const chrome = findChrome();
  if (!chrome) {
    console.warn("⚠ No Chrome binary found (set CHROME_BIN). Skipping browser smoke test.");
    process.exit(0);
  }
  console.log(`Browser smoke test — using ${chrome}, virtual-time budget ${BUDGET_MS}ms`);

  const server = await startServer();
  const base = `http://localhost:${PORT}`;
  const failures = [];

  for (const route of ROUTES) {
    const { status, dom } = await loadRoute(chrome, base + route);
    if (!dom) {
      failures.push(`${route} — Chrome produced no output (exit ${status})`);
      console.log(`  ✗ ${route} — no DOM (chrome exit ${status})`);
      continue;
    }
    const crashed = ERROR_MARKERS.some((re) => re.test(dom));
    if (crashed) {
      failures.push(`${route} — error boundary rendered (runtime crash)`);
      console.log(`  ✗ ${route} — CRASH (error boundary)`);
    } else if (dom.length < 2000) {
      failures.push(`${route} — suspiciously empty DOM (${dom.length} bytes)`);
      console.log(`  ✗ ${route} — empty DOM (${dom.length} bytes)`);
    } else {
      console.log(`  ✓ ${route}`);
    }
  }

  await new Promise((resolve) => server.close(resolve));

  if (failures.length) {
    console.error(`\n✗ Smoke test FAILED — ${failures.length} route(s):`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log(`\n✓ Smoke test passed — ${ROUTES.length} routes render without the error boundary.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
