/**
 * Shared SEO constants used across sitemap, robots, and page metadata.
 * Keep BASE_URL server-side only; BASE_PATH is also exposed to the client via
 * NEXT_PUBLIC_BASE_PATH so both values are safe here.
 */
export const BASE_URL = "https://futuregrid.genisisiq.com";

// basePath from next.config.ts (e.g. "/FutureGrid" on GitHub Pages, "" otherwise).
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Absolute origin + optional subpath — use this as the root for all generated URLs. */
export const SITE_URL = `${BASE_URL}${BASE_PATH}`;

export const SITE_NAME = "FutureGrid";
export const SITE_DESCRIPTION =
  "Explore how artificial intelligence is reshaping careers — see AI exposure levels, Bright Outlook occupations, and salary data across 22 industry sectors.";
