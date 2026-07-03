#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildMeta } from "./lib/meta.mjs";
import { validateOpenRouterModels } from "./lib/validate.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const OUTPUT_FILE = path.join(DATA_DIR, "openrouter-models.json");
const API_ORIGIN = "https://openrouter.ai";
const MODELS_URL = `${API_ORIGIN}/api/v1/models`;
const USER_AGENT = "FutureGrid/1.0 OpenRouter model data build (+https://github.com)";
const DETAILS_CONCURRENCY = Number(process.env.OPENROUTER_DETAILS_CONCURRENCY || 4);
const REQUEST_TIMEOUT_MS = Number(process.env.OPENROUTER_REQUEST_TIMEOUT_MS || 30000);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function stringOrNull(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberOrNull(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function booleanOrNull(value) {
  return typeof value === "boolean" ? value : null;
}

function arrayOfStrings(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim()).sort()
    : [];
}

function sortedRecord(value) {
  const obj = asObject(value);
  if (!obj) return null;
  const out = {};
  for (const key of Object.keys(obj).sort()) {
    const v = obj[key];
    if (
      v === null ||
      typeof v === "string" ||
      typeof v === "number" ||
      typeof v === "boolean"
    ) {
      out[key] = typeof v === "string" && v !== "" && Number.isFinite(Number(v)) ? Number(v) : v;
    }
  }
  return Object.keys(out).length ? out : null;
}

function unixSecondsToIso(value) {
  const n = numberOrNull(value);
  if (n === null) return null;
  const d = new Date(n * 1000);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function absoluteUrl(pathOrUrl) {
  const s = stringOrNull(pathOrUrl);
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  return new URL(s, API_ORIGIN).toString();
}

function detailsUrlForModelId(modelId) {
  const id = stringOrNull(modelId);
  if (!id) return null;
  const encoded = id.split("/").map((part) => encodeURIComponent(part)).join("/");
  return `${API_ORIGIN}/api/v1/models/${encoded}/endpoints`;
}

function inferProvider(model) {
  const id = stringOrNull(model.id) || "";
  const idPrefix = id.includes("/") ? id.split("/")[0] : null;
  const namePrefix =
    typeof model.name === "string" && model.name.includes(":")
      ? model.name.split(":")[0].trim()
      : null;
  const slug = idPrefix || (namePrefix ? namePrefix.toLowerCase().replace(/[^a-z0-9]+/g, "-") : null);
  return {
    slug,
    name: namePrefix || (slug ? slug.split("-").map((p) => p[0]?.toUpperCase() + p.slice(1)).join(" ") : null),
  };
}

function inferFamily(model) {
  const id = stringOrNull(model.id) || stringOrNull(model.canonical_slug) || "";
  const slugPart = (id.includes("/") ? id.split("/").slice(1).join("/") : id)
    .replace(/:free$/, "")
    .replace(/-\d{8}$/, "");
  const lower = slugPart.toLowerCase();
  let familySlug = lower.split(/[/:]/)[0].split(/[.-]/)[0] || null;
  if (lower.startsWith("gpt-")) familySlug = "gpt";
  else if (/^o\d/.test(lower)) familySlug = "o-series";
  else if (lower.startsWith("chatgpt-")) familySlug = "chatgpt";
  else if (lower.startsWith("claude-")) familySlug = "claude";
  else if (lower.startsWith("gemini-")) familySlug = "gemini";
  else if (lower.startsWith("llama-") || lower.startsWith("meta-llama")) familySlug = "llama";
  else if (lower.startsWith("mistral-")) familySlug = "mistral";
  return {
    slug: familySlug,
    name: familySlug ? familySlug.split("-").map((p) => p[0].toUpperCase() + p.slice(1)).join(" ") : null,
    inferredFrom: id || null,
  };
}

async function fetchJson(url, attempt = 1) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text();
      if (attempt < 3 && (res.status === 429 || res.status >= 500)) {
        await sleep(750 * attempt);
        return fetchJson(url, attempt + 1);
      }
      throw new Error(`${res.status} ${res.statusText}: ${body.slice(0, 200)}`);
    }
    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let index = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await mapper(items[current], current);
    }
  });
  await Promise.all(workers);
  return results;
}

async function fetchEndpointDetails(model) {
  const urls = [
    detailsUrlForModelId(model.id),
    absoluteUrl(model.links?.details),
  ].filter((url, index, arr) => url && arr.indexOf(url) === index);

  let lastError = null;
  for (const url of urls) {
    try {
      const json = await fetchJson(url);
      if (json && asObject(json.data)) {
        return { fetched: true, url, data: json.data };
      }
    } catch (err) {
      lastError = err;
    }
  }
  return {
    fetched: false,
    url: urls[0] || null,
    error: lastError ? lastError.message : "No endpoint details URL available",
  };
}

function addMax(current, candidate) {
  const n = numberOrNull(candidate);
  return n === null ? current : Math.max(current ?? n, n);
}

function addPricingRange(ranges, pricing) {
  const obj = asObject(pricing);
  if (!obj) return;
  for (const key of ["prompt", "completion", "request", "image", "web_search"]) {
    const n = numberOrNull(obj[key]);
    if (n === null) continue;
    if (!ranges[key]) ranges[key] = { min: n, max: n };
    ranges[key].min = Math.min(ranges[key].min, n);
    ranges[key].max = Math.max(ranges[key].max, n);
  }
}

function summarizeEndpointDetails(result) {
  if (!result?.fetched) return null;
  const data = result.data;
  const endpoints = Array.isArray(data.endpoints) ? data.endpoints : [];
  const providers = new Map();
  const supportedParameters = new Set();
  const pricingRanges = {};
  let maxContextLength = null;
  let maxCompletionTokens = null;

  for (const endpoint of endpoints) {
    const providerName = stringOrNull(endpoint.provider_name) || "Unknown";
    if (!providers.has(providerName)) {
      providers.set(providerName, {
        name: providerName,
        endpointCount: 0,
        tags: new Set(),
        quantizations: new Set(),
        maxContextLength: null,
        maxCompletionTokens: null,
        supportedParameters: new Set(),
      });
    }
    const provider = providers.get(providerName);
    provider.endpointCount += 1;
    const tag = stringOrNull(endpoint.tag);
    if (tag) provider.tags.add(tag);
    const quantization = stringOrNull(endpoint.quantization);
    if (quantization) provider.quantizations.add(quantization);
    provider.maxContextLength = addMax(provider.maxContextLength, endpoint.context_length);
    provider.maxCompletionTokens = addMax(provider.maxCompletionTokens, endpoint.max_completion_tokens);
    maxContextLength = addMax(maxContextLength, endpoint.context_length);
    maxCompletionTokens = addMax(maxCompletionTokens, endpoint.max_completion_tokens);
    for (const param of arrayOfStrings(endpoint.supported_parameters)) {
      supportedParameters.add(param);
      provider.supportedParameters.add(param);
    }
    addPricingRange(pricingRanges, endpoint.pricing);
  }

  return {
    detailsUrl: result.url,
    detailsModelId: stringOrNull(data.id),
    detailsName: stringOrNull(data.name),
    endpointCount: endpoints.length,
    providerCount: providers.size,
    maxContextLength,
    maxCompletionTokens,
    supportedParameters: Array.from(supportedParameters).sort(),
    pricingRange: Object.keys(pricingRanges).length
      ? Object.fromEntries(Object.entries(pricingRanges).sort(([a], [b]) => a.localeCompare(b)))
      : null,
    providers: Array.from(providers.values())
      .map((provider) => ({
        name: provider.name,
        endpointCount: provider.endpointCount,
        tags: Array.from(provider.tags).sort(),
        quantizations: Array.from(provider.quantizations).sort(),
        maxContextLength: provider.maxContextLength,
        maxCompletionTokens: provider.maxCompletionTokens,
        supportedParameters: Array.from(provider.supportedParameters).sort(),
      }))
      .sort((a, b) => b.endpointCount - a.endpointCount || a.name.localeCompare(b.name)),
  };
}

function normalizeTopProvider(value) {
  const obj = asObject(value);
  return {
    contextLength: numberOrNull(obj?.context_length),
    maxCompletionTokens: numberOrNull(obj?.max_completion_tokens),
    isModerated: booleanOrNull(obj?.is_moderated),
  };
}

function normalizeArchitecture(value) {
  const obj = asObject(value);
  return {
    modality: stringOrNull(obj?.modality),
    inputModalities: arrayOfStrings(obj?.input_modalities),
    outputModalities: arrayOfStrings(obj?.output_modalities),
    tokenizer: stringOrNull(obj?.tokenizer),
    instructType: stringOrNull(obj?.instruct_type),
  };
}

function normalizeModel(model, endpointResult) {
  const createdAt = unixSecondsToIso(model.created);
  const endpoints = summarizeEndpointDetails(endpointResult);
  return {
    id: stringOrNull(model.id),
    name: stringOrNull(model.name),
    canonicalSlug: stringOrNull(model.canonical_slug),
    huggingFaceId: stringOrNull(model.hugging_face_id),
    provider: inferProvider(model),
    family: inferFamily(model),
    createdAt,
    createdDate: createdAt ? createdAt.slice(0, 10) : null,
    contextLength: numberOrNull(model.context_length),
    maxOutputTokens: numberOrNull(model.top_provider?.max_completion_tokens),
    architecture: normalizeArchitecture(model.architecture),
    pricing: sortedRecord(model.pricing),
    topProvider: normalizeTopProvider(model.top_provider),
    endpoints,
    supportedParameters: arrayOfStrings(model.supported_parameters),
    defaultParameters: sortedRecord(model.default_parameters),
    reasoning: sortedRecord(model.reasoning),
    knowledgeCutoff: stringOrNull(model.knowledge_cutoff),
    expirationDate: stringOrNull(model.expiration_date),
    description: stringOrNull(model.description),
  };
}

function summarizeCoverage(models, endpointResults) {
  const fetched = endpointResults.filter((result) => result?.fetched).length;
  const endpointSummaries = models.map((model) => model.endpoints).filter(Boolean);
  const providerNames = new Set();
  let endpointCount = 0;
  for (const summary of endpointSummaries) {
    endpointCount += summary.endpointCount;
    for (const provider of summary.providers) providerNames.add(provider.name);
  }
  const createdDates = models.map((model) => model.createdDate).filter(Boolean).sort();
  return {
    modelCount: models.length,
    endpointDetails: {
      attempted: endpointResults.length,
      fetched,
      failed: endpointResults.length - fetched,
      modelCountWithEndpoints: endpointSummaries.filter((summary) => summary.endpointCount > 0).length,
      endpointCount,
      providerCount: providerNames.size,
      providerNames: Array.from(providerNames).sort(),
    },
    createdDateRange: {
      earliest: createdDates[0] || null,
      latest: createdDates[createdDates.length - 1] || null,
    },
  };
}

async function main() {
  console.log("=== Building OpenRouter model catalog data ===");
  const generatedAt = new Date().toISOString();
  const modelsJson = await fetchJson(MODELS_URL);
  const sourceModels = Array.isArray(modelsJson.data) ? modelsJson.data : [];
  if (sourceModels.length === 0) {
    throw new Error("[build-openrouter-models] OpenRouter /models returned no data rows");
  }

  console.log(`[build-openrouter-models] fetched ${sourceModels.length} model rows`);
  const endpointResults = await mapLimit(sourceModels, DETAILS_CONCURRENCY, fetchEndpointDetails);
  const failed = endpointResults.filter((result) => !result?.fetched);
  if (failed.length > 0) {
    console.warn(
      `[build-openrouter-models] endpoint details failed for ${failed.length}/${endpointResults.length} models`
    );
  }

  const models = sourceModels
    .map((model, index) => normalizeModel(model, endpointResults[index]))
    .sort((a, b) => a.id.localeCompare(b.id));

  const output = {
    meta: buildMeta({
      generatedAt,
      asOf: generatedAt.slice(0, 10),
      source: {
        name: "OpenRouter public model catalog API",
        publisher: "OpenRouter",
        url: MODELS_URL,
      },
    }),
    coverage: summarizeCoverage(models, endpointResults),
    methodology: {
      source:
        "Official OpenRouter public APIs only: /api/v1/models plus /api/v1/models/{modelId}/endpoints.",
      endpointDetails:
        "Endpoint/provider counts and endpoint-level maxima are aggregated from public model endpoint details when available.",
      inferredFields:
        "provider is inferred from the model id prefix and display name; family is a heuristic grouping inferred from the model id/canonical slug.",
      exclusions:
        "No #activity page scraping, no account usage/activity APIs, no management keys, and no private analytics endpoints are used.",
      caveats:
        "Catalog, pricing, availability, and endpoint routing fields describe OpenRouter's public API response at build time; no stable public global activity time-series was identified.",
    },
    models,
  };

  validateOpenRouterModels(output);
  writeFileSync(OUTPUT_FILE, `${JSON.stringify(output, null, 2)}\n`);
  console.log(
    `[build-openrouter-models] wrote ${models.length} models, ` +
      `${output.coverage.endpointDetails.endpointCount} endpoints -> ${OUTPUT_FILE}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
