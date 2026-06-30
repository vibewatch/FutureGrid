#!/usr/bin/env node
/**
 * build-og-image.mjs
 * Renders an on-brand Open Graph social share image (1200×630 px) to public/og.png.
 *
 * Run: node scripts/build-og-image.mjs  (or: npm run build:og)
 *
 * Design tokens
 *   Background : #07080d  (same dark base as the app)
 *   Gradient   : violet #7c3aed → cyan #06b6d4
 *   Grid motif : subtle 40 px grid lines in rgba(255,255,255,0.04)
 */

import { writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Resvg } from "@resvg/resvg-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "../public/og.png");

/* ── SVG template (1200 × 630) ─────────────────────────────────────── */
const svgSrc = `<svg
  xmlns="http://www.w3.org/2000/svg"
  width="1200" height="630"
  viewBox="0 0 1200 630"
>
  <defs>
    <!-- Background gradient (subtle radial glow) -->
    <radialGradient id="bg-glow" cx="30%" cy="40%" r="70%">
      <stop offset="0%"  stop-color="#1a0b2e"/>
      <stop offset="100%" stop-color="#07080d"/>
    </radialGradient>

    <!-- Wordmark gradient: violet → cyan -->
    <linearGradient id="brand-grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>

    <!-- Accent line gradient -->
    <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#7c3aed" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.9"/>
    </linearGradient>

    <!-- Subtle grid pattern -->
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none"
            stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
    </pattern>
  </defs>

  <!-- Base background -->
  <rect width="1200" height="630" fill="url(#bg-glow)"/>

  <!-- Grid overlay -->
  <rect width="1200" height="630" fill="url(#grid)"/>

  <!-- Decorative glow blob (top-left) -->
  <ellipse cx="160" cy="180" rx="260" ry="200"
           fill="#7c3aed" fill-opacity="0.08"/>

  <!-- Decorative glow blob (bottom-right) -->
  <ellipse cx="1060" cy="480" rx="240" ry="180"
           fill="#06b6d4" fill-opacity="0.07"/>

  <!-- Accent rule above wordmark -->
  <rect x="80" y="185" width="220" height="3" rx="2" fill="url(#line-grad)"/>

  <!-- "FutureGrid" wordmark -->
  <text
    x="80" y="310"
    font-family="'Inter','Helvetica Neue',Arial,sans-serif"
    font-size="96" font-weight="800" letter-spacing="-3"
    fill="url(#brand-grad)"
  >FutureGrid</text>

  <!-- Tagline (line 1) -->
  <text
    x="80" y="374"
    font-family="'Inter','Helvetica Neue',Arial,sans-serif"
    font-size="26" font-weight="400" letter-spacing="0.2"
    fill="rgba(228,228,231,0.85)"
  >How AI is reshaping the workforce — real data from</text>

  <!-- Tagline (line 2 — data sources) -->
  <text
    x="80" y="412"
    font-family="'Inter','Helvetica Neue',Arial,sans-serif"
    font-size="22" font-weight="500" letter-spacing="0.5"
    fill="rgba(161,161,170,0.9)"
  >Anthropic Economic Index · BLS · O*NET · IMF</text>

  <!-- Bottom accent rule -->
  <rect x="80" y="468" width="1040" height="1" fill="rgba(255,255,255,0.06)"/>

  <!-- Domain badge (bottom-right) -->
  <text
    x="1120" y="510"
    font-family="'Inter','Helvetica Neue',Arial,sans-serif"
    font-size="18" font-weight="500" text-anchor="end"
    fill="rgba(161,161,170,0.6)"
  >futuregrid.genisisiq.com</text>

  <!-- Small decorative dots -->
  <circle cx="80"  cy="510" r="3" fill="#7c3aed" fill-opacity="0.7"/>
  <circle cx="96"  cy="510" r="3" fill="#9d5cf5" fill-opacity="0.5"/>
  <circle cx="112" cy="510" r="3" fill="#06b6d4" fill-opacity="0.4"/>
</svg>`;

/* ── Rasterise → PNG ────────────────────────────────────────────────── */
const resvg = new Resvg(svgSrc, {
  fitTo: { mode: "width", value: 1200 },
  font: { loadSystemFonts: false },
});

const pngData = resvg.render();
const pngBuffer = pngData.asPng();

writeFileSync(OUT, pngBuffer);
console.log(`✓  public/og.png written (${pngBuffer.length} bytes, ${pngData.width}×${pngData.height}px)`);
