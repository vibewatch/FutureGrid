import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { globalEn } from "@/lib/i18n/messages/en/global";
import { globalZh } from "@/lib/i18n/messages/zh/global";

const DATA_PATH = path.join(process.cwd(), "data/ai-usage-proxies.json");
const HELPER_PATH = path.join(process.cwd(), "lib/adoption-signals.ts");

const FUTURE_FAMILY = "sourceCatalogForFutureCollection";
const SCORE_KEY_PATTERN = /(?:composite|merged|aggregate|overall).*score|score.*(?:composite|merged|aggregate|overall)|(?:adoption|usage)Score/i;

type UnknownRecord = Record<string, unknown>;
type SignalValue = UnknownRecord & {
  value?: unknown;
  unit?: unknown;
  source?: { name?: unknown };
  period?: unknown;
};
type SignalPanel = UnknownRecord & {
  id?: unknown;
  titleKey?: unknown;
  family?: unknown;
  kind?: unknown;
  caveat?: unknown;
  sourceSummary?: unknown;
  periodSummary?: unknown;
  values?: SignalValue[];
};
type AdoptionSignalsDataset = UnknownRecord & {
  panels?: SignalPanel[];
  coverage?: AdoptionSignalCoverage;
};
type AdoptionSignalCoverage = UnknownRecord & {
  collectedFamilies?: string[];
  visualizedFamilies?: string[];
  futureCatalogCount?: number;
};
type AdoptionSignalsModule = {
  getAdoptionSignals?: (options?: { topN?: number }) => AdoptionSignalsDataset;
  getAdoptionSignalCoverage?: () => AdoptionSignalCoverage;
  formatSignalValue?: (value: number, unit: string) => string;
};

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readRawDataset(): UnknownRecord {
  expect(existsSync(DATA_PATH), "Expected data/ai-usage-proxies.json to exist").toBe(true);
  return JSON.parse(readFileSync(DATA_PATH, "utf8")) as UnknownRecord;
}

function collectedArrayFamilies(raw = readRawDataset()): string[] {
  return Object.entries(raw)
    .filter(([, value]) => Array.isArray(value))
    .map(([key]) => key)
    .sort();
}

async function importAdoptionSignals(): Promise<Required<AdoptionSignalsModule>> {
  expect(
    existsSync(HELPER_PATH),
    "Expected lib/adoption-signals.ts to export getAdoptionSignals(), getAdoptionSignalCoverage(), and formatSignalValue()",
  ).toBe(true);

  const importedModule = (await import(/* @vite-ignore */ pathToFileURL(HELPER_PATH).href)) as AdoptionSignalsModule;
  expect(typeof importedModule.getAdoptionSignals, "getAdoptionSignals should be exported").toBe("function");
  expect(typeof importedModule.getAdoptionSignalCoverage, "getAdoptionSignalCoverage should be exported").toBe("function");
  expect(typeof importedModule.formatSignalValue, "formatSignalValue should be exported").toBe("function");
  return importedModule as Required<AdoptionSignalsModule>;
}

function panelsFrom(dataset: AdoptionSignalsDataset): SignalPanel[] {
  expect(Array.isArray(dataset.panels), "Adoption signals dataset should expose panels[]").toBe(true);
  return dataset.panels ?? [];
}

function nonEmptyString(value: unknown, label: string): string {
  expect(typeof value, `${label} should be a string`).toBe("string");
  const text = value as string;
  expect(text.trim().length, `${label} should not be empty`).toBeGreaterThan(0);
  return text;
}

function numericValue(value: SignalValue): number | null {
  return typeof value.value === "number" && Number.isFinite(value.value) ? value.value : null;
}

function collectKeys(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) return value.flatMap((item) => collectKeys(item, prefix));
  if (!isRecord(value)) return [];

  return Object.entries(value).flatMap(([key, nested]) => {
    const qualifiedKey = prefix ? `${prefix}.${key}` : key;
    return [qualifiedKey, ...collectKeys(nested, qualifiedKey)];
  });
}

describe("AI adoption signal loader", () => {
  it("assigns every collected family to at least one panel or the future-sources footer", async () => {
    const rawFamilies = collectedArrayFamilies();
    const { getAdoptionSignals, getAdoptionSignalCoverage } = await importAdoptionSignals();
    const dataset = getAdoptionSignals();
    const coverage = getAdoptionSignalCoverage();
    const panels = panelsFrom(dataset);

    expect([...(coverage.collectedFamilies ?? [])].sort(), "coverage.collectedFamilies should mirror JSON array families").toEqual(
      rawFamilies,
    );
    expect(dataset.coverage?.futureCatalogCount ?? coverage.futureCatalogCount).toBe(
      (readRawDataset()[FUTURE_FAMILY] as unknown[]).length,
    );

    const assignmentCounts = new Map(rawFamilies.map((family) => [family, 0]));
    for (const panel of panels) {
      if (typeof panel.family === "string" && assignmentCounts.has(panel.family)) {
        assignmentCounts.set(panel.family, (assignmentCounts.get(panel.family) ?? 0) + 1);
      }
    }

    const missing = [...assignmentCounts].filter(([, count]) => count === 0).map(([family]) => family);
    expect(missing, "No collected family should be unassigned").toEqual([]);
    expect([...(coverage.visualizedFamilies ?? [])].sort(), "coverage.visualizedFamilies should match unique panel families, including the future footer when rendered").toEqual(
      panels
        .map((panel) => panel.family)
        .filter((family): family is string => typeof family === "string")
        .filter((family, index, families) => families.indexOf(family) === index)
        .sort(),
    );
  });

  it("populates panel metadata, values, value provenance, and sorted bar lists", async () => {
    const raw = readRawDataset();
    const { getAdoptionSignals } = await importAdoptionSignals();
    const panels = panelsFrom(getAdoptionSignals({ topN: 8 }));

    for (const panel of panels) {
      const family = nonEmptyString(panel.family, "panel.family");
      nonEmptyString(panel.sourceSummary, `${family} sourceSummary`);
      nonEmptyString(panel.periodSummary, `${family} periodSummary`);
      nonEmptyString(panel.caveat, `${family} caveat`);

      const rawRows = Array.isArray(raw[family]) ? (raw[family] as unknown[]) : [];
      if (family !== FUTURE_FAMILY && rawRows.length > 0) {
        expect(Array.isArray(panel.values), `${family} panel should expose values[]`).toBe(true);
        expect(panel.values?.length ?? 0, `${family} panel should have non-empty values[]`).toBeGreaterThan(0);
      }

      for (const [index, value] of (panel.values ?? []).entries()) {
        nonEmptyString(value.source?.name, `${family} values[${index}].source.name`);
        nonEmptyString(value.period, `${family} values[${index}].period`);
      }

      if (panel.kind === "bar-list") {
        const numbers = (panel.values ?? []).map(numericValue).filter((value): value is number => value !== null);
        const units = (panel.values ?? []).map((value) => value.unit).filter((unit): unit is string => typeof unit === "string");
        expect(numbers, `${family} bar-list should expose numeric values`).toHaveLength(panel.values?.length ?? 0);
        expect(new Set(units).size, `${family} bar-list should not mix unit types`).toBeLessThanOrEqual(1);

        const values = panel.values ?? [];
        const sortGroups = panel.id === "developerSurveyOverall"
          ? values.reduce<Record<string, SignalValue[]>>((groups, value) => {
            const groupKey = typeof value.label === "string" ? value.label.split(":")[0] : "";
            if (!groups[groupKey]) {
              groups[groupKey] = [];
            }
            groups[groupKey].push(value);
            return groups;
          }, {})
          : { [String(panel.id)]: values };

        for (const values of Object.values(sortGroups)) {
          const groupNumbers = (values ?? []).map(numericValue).filter((value): value is number => value !== null);
          expect(groupNumbers, `${family} bar-list values should be sorted descending`).toEqual(
            [...groupNumbers].sort((a, b) => b - a),
          );
        }
      }
    }
  });

  it("formats representative signal units with unit-appropriate scaling", async () => {
    const { formatSignalValue } = await importAdoptionSignals();

    expect(formatSignalValue(27, "percent_of_population")).toMatch(/^27(?:\.0)?%$/);
    expect(formatSignalValue(515_000_000, "users")).toMatch(/515(?:\.0)?\s*M/i);
    expect(formatSignalValue(27_628_947, "downloads")).toMatch(/(?:27\.6|28)\s*M/i);
    expect(formatSignalValue(162_049, "stars")).toMatch(/162(?:\.0)?\s*K/i);
    expect(formatSignalValue(33_669, "forks")).toMatch(/33\.7\s*K|34\s*K/i);
    expect(formatSignalValue(12_345, "publications_count")).toMatch(/12,345|12345/);
  });

  it("does not expose a composite or merged score field", async () => {
    const { getAdoptionSignals } = await importAdoptionSignals();
    const suspectRawKeys = collectKeys(readRawDataset()).filter((key) => SCORE_KEY_PATTERN.test(key.split(".").at(-1) ?? key));
    const suspectPanelKeys = collectKeys(getAdoptionSignals()).filter((key) => SCORE_KEY_PATTERN.test(key.split(".").at(-1) ?? key));

    expect(suspectRawKeys, "Raw proxy JSON should not define a composite/merged adoption score").toEqual([]);
    expect(suspectPanelKeys, "Adoption signals panels should not define a composite/merged adoption score").toEqual([]);
  });
});

describe("global i18n parity", () => {
  it("keeps adoption signal message keys in English and Chinese", () => {
    const adoptionEnKeys = Object.keys(globalEn).filter((key) => /^adopt/i.test(key)).sort();
    const adoptionZhKeys = Object.keys(globalZh).filter((key) => /^adopt/i.test(key)).sort();

    expect(adoptionEnKeys, "Expected English global messages to include adoption signal keys").not.toEqual([]);
    expect(adoptionZhKeys).toEqual(adoptionEnKeys);
  });
});
