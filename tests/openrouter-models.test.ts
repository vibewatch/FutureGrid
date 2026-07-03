import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateOpenRouterModels } from "../scripts/lib/validate.mjs";

const DATA_PATH = path.join(process.cwd(), "data/openrouter-models.json");

function readDataset() {
  return JSON.parse(readFileSync(DATA_PATH, "utf8"));
}

function collectKeys(value: unknown, keys = new Set<string>()) {
  if (!value || typeof value !== "object") return keys;
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys);
    return keys;
  }
  for (const [key, child] of Object.entries(value)) {
    keys.add(key);
    collectKeys(child, keys);
  }
  return keys;
}

describe("OpenRouter model catalog data", () => {
  it("passes the shared OpenRouter validation gate", () => {
    expect(() => validateOpenRouterModels(readDataset())).not.toThrow();
  });

  it("captures prediction-useful catalog and endpoint fields", () => {
    const data = readDataset();
    expect(data.meta.source.url).toBe("https://openrouter.ai/api/v1/models");
    expect(data.models.length).toBeGreaterThanOrEqual(200);
    expect(data.coverage.endpointDetails.fetched).toBeGreaterThanOrEqual(
      Math.floor(data.models.length * 0.75)
    );

    const gpt55 = data.models.find((model: { id: string }) => model.id === "openai/gpt-5.5");
    expect(gpt55, "openai/gpt-5.5 should be present in the committed snapshot").toBeTruthy();
    expect(gpt55.provider.slug).toBe("openai");
    expect(gpt55.family.slug).toBe("gpt");
    expect(gpt55.contextLength).toBeGreaterThan(0);
    expect(gpt55.architecture.inputModalities.length).toBeGreaterThan(0);
    expect(gpt55.pricing.prompt).toBeGreaterThanOrEqual(0);
    expect(gpt55.endpoints.endpointCount).toBeGreaterThan(0);
    expect(gpt55.endpoints.providerCount).toBeGreaterThan(0);
    expect(gpt55.supportedParameters.length).toBeGreaterThan(0);
    expect(typeof gpt55.description).toBe("string");
  });

  it("does not persist scraped activity or account analytics fields", () => {
    const keys = collectKeys(readDataset());
    for (const forbidden of [
      "activity",
      "uptime_last_30m",
      "uptime_last_5m",
      "uptime_last_1d",
      "latency_last_30m",
      "throughput_last_30m",
      "management_key",
      "api_key",
    ]) {
      expect(keys.has(forbidden), `${forbidden} should not be persisted`).toBe(false);
    }
  });
});
