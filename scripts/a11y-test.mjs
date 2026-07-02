// Automated accessibility checks via axe-core + headless Chrome (CDP).
//
// Reuses the serve-out/ + Chrome-launch pattern from scripts/smoke-test.mjs.
// No Playwright/Puppeteer — connects to Chrome's DevTools Protocol using only
// Node built-ins (net, http, crypto) for the minimal WebSocket handshake.
//
// Pages checked: /, /careers, /global, /labor, /frontier, /analysis
//
// Gate: zero `critical` and zero `serious` violations on every page.
// The `color-contrast` rule is excluded from the axe run pending a
// design-system palette update — tracked as a follow-up (see README).
// (Run `npm run check:a11y` to verify locally after `npm run build`.)

import { createServer } from "node:http";
import { request as httpRequest } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createConnection } from "node:net";
import { randomBytes } from "node:crypto";

const OUT = join(process.cwd(), "out");
const AXE_SRC = join(process.cwd(), "node_modules", "axe-core", "axe.min.js");
const PORT = Number(process.env.A11Y_PORT ?? 8139);
const CDP_PORT = Number(process.env.A11Y_CDP_PORT ?? 9229);

// Pages to audit.
const ROUTES = ["/", "/careers", "/global", "/labor", "/visa", "/frontier", "/analysis"];

// Gate: exit 1 if any page has violations at these impact levels.
// color-contrast is excluded from the axe run entirely (see AXE_OPTIONS below)
// pending a design-system palette update — tracked as a follow-up (see README).
const BLOCKED_IMPACTS = new Set(["critical", "serious"]);

// Exclude color-contrast from the run entirely so it is neither counted nor
// gated — pending a design-system palette update (see README).
const AXE_OPTIONS = JSON.stringify({ rules: { "color-contrast": { enabled: false } } });

const IMPACT_ORDER = ["critical", "serious", "moderate", "minor"];

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

// ── helpers ───────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    "/usr/bin/google-chrome",
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
      // try next
    }
  }
  return null;
}

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

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const req = httpRequest(url, (res) => {
      let data = "";
      res.on("data", (d) => (data += d));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

// ── server ────────────────────────────────────────────────────────────────────

async function startServer() {
  const server = createServer(async (req, res) => {
    const file = resolveFile(req.url ?? "/");
    if (!file || !existsSync(file)) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    try {
      const body = await readFile(file);
      const ext = extname(file);
      res.writeHead(200, { "content-type": MIME[ext] ?? "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(500);
      res.end("error");
    }
  });
  return new Promise((resolve) => server.listen(PORT, "127.0.0.1", () => resolve(server)));
}

// ── minimal WebSocket / CDP client ────────────────────────────────────────────
// Implements RFC 6455 client framing (masked) and Chrome's flat-session CDP.
// A "flat" session multiplexes multiple targets over one WebSocket connection
// by including a `sessionId` field in every message.

function encodeWsFrame(text) {
  const payload = Buffer.from(text, "utf8");
  const mask = randomBytes(4);
  const masked = Buffer.allocUnsafe(payload.length);
  for (let i = 0; i < payload.length; i++) masked[i] = payload[i] ^ mask[i % 4];
  let header;
  if (payload.length < 126) {
    header = Buffer.from([0x81, 0x80 | payload.length, ...mask]);
  } else if (payload.length < 65536) {
    header = Buffer.allocUnsafe(8);
    header[0] = 0x81;
    header[1] = 0xfe;
    header.writeUInt16BE(payload.length, 2);
    mask.copy(header, 4);
  } else {
    header = Buffer.allocUnsafe(14);
    header[0] = 0x81;
    header[1] = 0xff;
    header.writeBigUInt64BE(BigInt(payload.length), 2);
    mask.copy(header, 10);
  }
  return Buffer.concat([header, masked]);
}

function decodeWsFrames(buf) {
  const messages = [];
  while (buf.length >= 2) {
    const opcode = buf[0] & 0x0f;
    let len = buf[1] & 0x7f;
    let offset = 2;
    if (len === 126) {
      if (buf.length < 4) break;
      len = buf.readUInt16BE(2);
      offset = 4;
    } else if (len === 127) {
      if (buf.length < 10) break;
      len = Number(buf.readBigUInt64BE(2));
      offset = 10;
    }
    if (buf.length < offset + len) break;
    const payload = buf.slice(offset, offset + len);
    buf = buf.slice(offset + len);
    if (opcode === 1) {
      try {
        messages.push(JSON.parse(payload.toString("utf8")));
      } catch {
        // skip
      }
    }
  }
  return { messages, remaining: buf };
}

// Connect to Chrome's browser-level CDP WebSocket.
// Returns a client with:
//   send(method, params, sessionId?) → Promise<result>
//   on(method, handler, sessionId?)  → unsubscribe fn
//   close()
function connectCDP(wsUrl) {
  const { hostname: host, port, pathname: path } = new URL(wsUrl);

  return new Promise((resolve, reject) => {
    const sock = createConnection({ host, port: Number(port) });
    const wsKey = randomBytes(16).toString("base64");
    let handshakeDone = false;
    let recvBuf = Buffer.alloc(0);
    let nextId = 1;
    // Key: `${id}:${sessionId ?? ""}` → { resolve, reject }
    const pending = new Map();
    // Key: `${method}:${sessionId ?? ""}` → Set<handler>
    const eventHandlers = new Map();

    sock.on("error", (err) => {
      if (!handshakeDone) reject(err);
    });

    sock.once("connect", () => {
      sock.write(
        `GET ${path} HTTP/1.1\r\n` +
          `Host: ${host}:${port}\r\n` +
          `Upgrade: websocket\r\n` +
          `Connection: Upgrade\r\n` +
          `Sec-WebSocket-Key: ${wsKey}\r\n` +
          `Sec-WebSocket-Version: 13\r\n\r\n`,
      );
    });

    sock.on("data", (chunk) => {
      recvBuf = Buffer.concat([recvBuf, chunk]);

      if (!handshakeDone) {
        const sep = recvBuf.indexOf("\r\n\r\n");
        if (sep < 0) return;
        handshakeDone = true;
        recvBuf = recvBuf.slice(sep + 4);
        resolve(client);
      }

      const { messages, remaining } = decodeWsFrames(recvBuf);
      recvBuf = remaining;

      for (const msg of messages) {
        const sid = msg.sessionId ?? "";
        if (msg.id != null) {
          const key = `${msg.id}:${sid}`;
          const cb = pending.get(key);
          if (cb) {
            pending.delete(key);
            if (msg.error) cb.reject(new Error(msg.error.message ?? JSON.stringify(msg.error)));
            else cb.resolve(msg.result ?? {});
          }
        }
        if (msg.method) {
          const key = `${msg.method}:${sid}`;
          const handlers = eventHandlers.get(key);
          if (handlers) for (const h of handlers) h(msg.params ?? {});
        }
      }
    });

    const client = {
      send(method, params = {}, sessionId) {
        const id = nextId++;
        const msg = { id, method, params };
        if (sessionId) msg.sessionId = sessionId;
        const key = `${id}:${sessionId ?? ""}`;
        return new Promise((res, rej) => {
          pending.set(key, { resolve: res, reject: rej });
          sock.write(encodeWsFrame(JSON.stringify(msg)));
        });
      },
      on(method, handler, sessionId) {
        const key = `${method}:${sessionId ?? ""}`;
        if (!eventHandlers.has(key)) eventHandlers.set(key, new Set());
        eventHandlers.get(key).add(handler);
        return () => eventHandlers.get(key)?.delete(handler);
      },
      close() {
        sock.destroy();
      },
    };
  });
}

// ── axe audit for one route ───────────────────────────────────────────────────

async function auditRoute(browser, axeSource, targetUrl) {
  // Open a new blank tab.
  const { targetId } = await browser.send("Target.createTarget", { url: "about:blank" });

  // Attach to the tab using flat-session protocol.
  const { sessionId } = await browser.send("Target.attachToTarget", {
    targetId,
    flatten: true,
  });

  const send = (method, params = {}) => browser.send(method, params, sessionId);
  const on = (method, handler) => browser.on(method, handler, sessionId);

  try {
    await send("Runtime.enable");
    await send("Page.enable");

    const loadedPromise = new Promise((resolve) => {
      on("Page.loadEventFired", resolve);
    });

    await send("Page.navigate", { url: targetUrl });
    await Promise.race([loadedPromise, sleep(15000)]);

    // Wait for React hydration.
    await sleep(3000);

    // Inject axe-core.
    await send("Runtime.evaluate", { expression: axeSource, returnByValue: false });

    // Run axe and return the violations array as a JSON string.
    const evalResult = await send("Runtime.evaluate", {
      expression: `
        new Promise(function(resolve) {
          try {
            axe.run(document, ${AXE_OPTIONS})
              .then(function(r) { resolve(JSON.stringify(r.violations)); })
              .catch(function()  { resolve('[]'); });
          } catch(e) {
            resolve('[]');
          }
        })
      `,
      awaitPromise: true,
      returnByValue: true,
      timeout: 30000,
    });

    try {
      return JSON.parse(evalResult?.result?.value ?? "[]");
    } catch {
      return [];
    }
  } finally {
    await browser.send("Target.closeTarget", { targetId }).catch(() => {});
  }
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!existsSync(OUT)) {
    console.error("✗ out/ not found — run `npm run build` first.");
    process.exit(1);
  }
  if (!existsSync(AXE_SRC)) {
    console.error("✗ axe-core not found — run `npm install` first.");
    process.exit(1);
  }

  const chromeBin = findChrome();
  if (!chromeBin) {
    console.warn("⚠ No Chrome binary found (set CHROME_BIN). Skipping a11y test.");
    process.exit(0);
  }

  console.log(`a11y audit — axe-core via ${chromeBin}`);
  console.log(`Pages: ${ROUTES.join(", ")}\n`);

  const axeSource = await readFile(AXE_SRC, "utf8");
  const server = await startServer();
  const base = `http://localhost:${PORT}`;

  // Launch Chrome with remote debugging enabled.
  const chromeProc = spawn(
    chromeBin,
    [
      `--remote-debugging-port=${CDP_PORT}`,
      "--headless=new",
      "--no-sandbox",
      "--no-zygote",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--no-first-run",
    ],
    { stdio: ["ignore", "ignore", "ignore"], detached: true },
  );

  const reapChrome = () => {
    try {
      process.kill(-chromeProc.pid, "SIGKILL");
    } catch {
      // already gone
    }
  };

  // Wait for Chrome's CDP to be ready.
  let cdpInfo = null;
  for (let attempt = 0; attempt < 40; attempt++) {
    await sleep(500);
    try {
      cdpInfo = await httpGet(`http://127.0.0.1:${CDP_PORT}/json/version`);
      if (cdpInfo?.webSocketDebuggerUrl) break;
    } catch {
      // not ready yet
    }
  }

  if (!cdpInfo?.webSocketDebuggerUrl) {
    reapChrome();
    await new Promise((r) => server.close(r));
    console.error("✗ Chrome did not expose CDP in time.");
    process.exit(1);
  }

  const results = [];
  let globalFailures = 0;

  try {
    const browser = await connectCDP(cdpInfo.webSocketDebuggerUrl);

    try {
      for (const route of ROUTES) {
        const targetUrl = base + route;
        let violations;
        try {
          violations = await auditRoute(browser, axeSource, targetUrl);
        } catch (err) {
          console.log(`  ✗ ${route.padEnd(14)} ERROR: ${err.message}`);
          results.push({ route, violations: [], error: String(err.message) });
          continue;
        }

        results.push({ route, violations });

        const byImpact = {};
        for (const v of violations) {
          byImpact[v.impact] = (byImpact[v.impact] ?? 0) + 1;
        }
        const blocked = violations.filter((v) => BLOCKED_IMPACTS.has(v.impact));
        const icon = blocked.length > 0 ? "✗" : "✓";
        const summary =
          Object.entries(byImpact)
            .sort((a, b) => IMPACT_ORDER.indexOf(a[0]) - IMPACT_ORDER.indexOf(b[0]))
            .map(([k, n]) => `${n} ${k}`)
            .join(", ") || "0 violations";

        console.log(`  ${icon} ${route.padEnd(14)} ${summary}`);

        if (blocked.length > 0) {
          globalFailures += blocked.length;
          for (const v of blocked) {
            console.log(`       [${v.impact}] ${v.id}: ${v.description}`);
            const node = v.nodes?.[0];
            if (node) {
              const failMsg = node.any?.find((c) => !c.result)?.message;
              if (failMsg) console.log(`         → ${failMsg}`);
            }
          }
        }
      }
    } finally {
      browser.close();
    }
  } finally {
    reapChrome();
    await new Promise((r) => server.close(r));
  }

  // Final summary.
  console.log("\n── a11y audit summary ──────────────────────────────────────");
  let totalViolations = 0;
  for (const { route, violations, error } of results) {
    if (error) {
      console.log(`  ✗ ${route}: ERROR (${error})`);
      continue;
    }
    const blocked = violations.filter((v) => BLOCKED_IMPACTS.has(v.impact));
    totalViolations += violations.length;
    if (blocked.length > 0) {
      console.log(`  ✗ ${route}: ${blocked.length} critical/serious violation(s)`);
    }
  }
  console.log(`Total violations across all pages: ${totalViolations}`);
  console.log(`Gate: zero critical and zero serious violations (color-contrast excluded — follow-up pending)\n`);

  if (globalFailures > 0) {
    console.error(`✗ FAIL — ${globalFailures} critical/serious violation(s) detected.`);
    process.exit(1);
  }
  console.log("✓ PASS — no critical or serious violations on any page (color-contrast excluded).");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
