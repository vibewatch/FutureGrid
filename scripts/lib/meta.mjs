/**
 * scripts/lib/meta.mjs
 *
 * Standard provenance metadata shared by every data/*.json dataset (issue #52).
 *
 * The canonical `meta` shape is:
 *
 *   meta: {
 *     generatedAt: string,                    // ISO-8601 timestamp the file was produced
 *     asOf: string,                           // period the data describes ("as of")
 *     source: { name, publisher, url } | string,
 *     version: string,                        // schema version of the meta contract
 *   }
 *
 * `buildMeta` is used by producers that know their source explicitly (e.g. the
 * bare-array datasets that are wrapped into `{ meta, data }`). `deriveMeta`
 * infers the block from an object's own existing top-level provenance fields
 * (`generatedAt`, `source`/`sources`/`attribution`, `asOf`) so object datasets
 * can be annotated additively without restating their source.
 */

export const META_VERSION = "1.0.0";

/**
 * Normalize an arbitrary source descriptor into `{ name, publisher, url }` or a
 * plain string. Arrays collapse to their first (primary) entry.
 * @param {unknown} source
 * @returns {{ name?: string, publisher?: string, url?: string } | string | null}
 */
export function normalizeSource(source) {
  if (source == null) return null;
  if (typeof source === "string") return source.trim() || null;
  if (Array.isArray(source)) {
    return source.length ? normalizeSource(source[0]) : null;
  }
  if (typeof source === "object") {
    const { name, publisher, url } = source;
    const out = {};
    if (name) out.name = name;
    if (publisher) out.publisher = publisher;
    if (url) out.url = url;
    return Object.keys(out).length ? out : null;
  }
  return null;
}

/**
 * Build a normalized `meta` block from explicit inputs.
 * @param {{ generatedAt?: string, asOf?: string, source?: unknown, version?: string }} [input]
 * @returns {{ generatedAt: string, asOf: string, source: object|string|null, version: string }}
 */
export function buildMeta({ generatedAt, asOf, source, version } = {}) {
  const gen = generatedAt || new Date().toISOString();
  return {
    generatedAt: gen,
    asOf: asOf || gen.slice(0, 10),
    source: normalizeSource(source),
    version: version || META_VERSION,
  };
}

/**
 * Derive a normalized `meta` block from an object dataset's own existing
 * top-level provenance fields. Falls back to the supplied defaults (typically a
 * file mtime) when a field is absent.
 * @param {Record<string, unknown>} obj
 * @param {{ generatedAt?: string, asOf?: string, source?: unknown, version?: string }} [fallback]
 * @returns {{ generatedAt: string, asOf: string, source: object|string|null, version: string }}
 */
export function deriveMeta(obj, fallback = {}) {
  const existing = obj && typeof obj === "object" ? obj : {};
  const existingMeta =
    existing.meta && typeof existing.meta === "object" ? existing.meta : {};
  const generatedAt =
    existing.generatedAt ||
    existingMeta.generatedAt ||
    fallback.generatedAt ||
    new Date().toISOString();
  const source =
    normalizeSource(existing.source) ??
    normalizeSource(existing.sources) ??
    normalizeSource(existing.attribution) ??
    normalizeSource(existingMeta.source) ??
    normalizeSource(fallback.source);
  const asOf =
    existing.asOf ||
    existingMeta.asOf ||
    fallback.asOf ||
    String(generatedAt).slice(0, 10);
  const version = existingMeta.version || fallback.version || META_VERSION;
  return { generatedAt, asOf, source, version };
}

/**
 * Return the primary record count for a dataset value, or null when the dataset
 * is not row-oriented.
 * @param {unknown} value  parsed JSON (array, `{ meta, data }`, or object)
 * @returns {number | null}
 */
export function countRows(value) {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object") {
    if (Array.isArray(value.data)) return value.data.length;
    // Fall back to the largest top-level array property (e.g. notices, states).
    let max = null;
    for (const v of Object.values(value)) {
      if (Array.isArray(v)) max = Math.max(max ?? 0, v.length);
    }
    return max;
  }
  return null;
}
