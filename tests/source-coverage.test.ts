import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

interface ProvenanceEntry {
  id: string;
  file: string;
  source: unknown;
}

const ROOT = process.cwd();
const read = (rel: string) => JSON.parse(readFileSync(path.join(ROOT, rel), "utf8"));

const DYNAMIC_OR_REGISTRY_EXEMPTIONS = new Map([
  ["ai-usage-proxies", "Composite dataset represented by individual upstream proxy source entries."],
  ["country-exposure", "Composite dataset represented by Anthropic country exposure and World Bank source entries."],
  ["ai-frontier", "Injected dynamically on /sources from ai-frontier.json source metadata."],
  ["provenance", "Self-generated provenance registry."],
  ["sources", "Self-generated source registry."],
  ["world-countries.geo", "Composite geometry represented by Natural Earth and ISO crosswalk source entries."],
]);

function sourceLabel(source: unknown): string {
  if (
    typeof source === "object" &&
    source !== null &&
    "name" in source &&
    typeof source.name === "string"
  ) {
    return source.name;
  }
  return String(source ?? "");
}

describe("source and compliance coverage", () => {
  it("represents every provenance dataset in sources.json or an explicit exemption", () => {
    const provenance = read("data/provenance.json") as { datasets: ProvenanceEntry[] };
    const sources = read("data/sources.json") as { sources: Array<{ usedFor: string; name: string }> };
    const sourceRegistryText = JSON.stringify(sources.sources).toLowerCase();

    const missing = provenance.datasets
      .filter((entry) => !DYNAMIC_OR_REGISTRY_EXEMPTIONS.has(entry.id))
      .filter((entry) => {
        const filename = path.basename(entry.file).toLowerCase();
        const label = sourceLabel(entry.source).toLowerCase();
        return !sourceRegistryText.includes(filename) && !sourceRegistryText.includes(label);
      })
      .map((entry) => entry.id);

    expect(missing).toEqual([]);
  });

  it("keeps mined OpenRouter and AI stock datasets explicitly caveated", () => {
    const sources = read("data/sources.json") as { sources: Array<{ usedFor: string; license: string }> };
    const compliance = readFileSync(path.join(ROOT, "data/COMPLIANCE.md"), "utf8");

    const openRouterSource = sources.sources.find((source) =>
      source.usedFor.includes("openrouter-models.json"),
    );
    const stockSource = sources.sources.find((source) =>
      source.usedFor.includes("ai-company-stocks.json"),
    );

    expect(openRouterSource?.usedFor).toMatch(/catalog.*proxy|proxy.*catalog/i);
    expect(stockSource?.usedFor).toMatch(/descriptive market history/i);
    expect(stockSource?.license).toMatch(/Yahoo|Alpha Vantage/i);
    expect(compliance).toMatch(/data\/openrouter-models\.json/);
    expect(compliance).toMatch(/data\/ai-company-stocks\.json/);
    expect(compliance).toMatch(/not investment advice|not redistribution-cleared/i);
  });
});
