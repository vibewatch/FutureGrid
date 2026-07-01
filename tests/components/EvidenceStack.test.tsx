// @vitest-environment jsdom

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { ComponentType } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { analysisEn } from "@/lib/i18n/messages/en/analysis";
import { analysisZh } from "@/lib/i18n/messages/zh/analysis";

const HELPER_PATH = path.join(process.cwd(), "lib/evidence.ts");
const COMPONENT_PATH = path.join(process.cwd(), "components/insights/EvidenceStack.tsx");
const INSIGHTS_VIEW_PATH = path.join(process.cwd(), "components/insights/InsightsView.tsx");
const ANALYSIS_PAGE_PATH = path.join(process.cwd(), "app/analysis/page.tsx");

const CONCLUSION_KEYS = ["conclusion", "title", "claim", "summary", "headline"];
const SOURCE_FAMILY_KEYS = ["sourceFamilies", "sourceFamily", "families", "sources", "sourceChips"];
const CONFIDENCE_KEYS = ["confidence", "confidenceLabel", "confidenceScore", "confidenceLevel"];
const STATUS_KEYS = ["status", "signalStatus", "agreement", "coverageStatus"];
const CAVEAT_KEYS = ["caveat", "caveatText", "coverageNote", "limitation", "note"];
const LINK_KEYS = [
  "viewLinks",
  "relevantViews",
  "views",
  "routes",
  "links",
  "recommendedViewHref",
  "recommendedHref",
  "href",
];
const RELEVANT_VIEW_PATTERN = /^\/(analysis|careers|sectors|labor|skills|explore|global|sources|report)(?:\/|#|$)/;
const ANALYSIS_COMPONENT_MARKERS = [
  "<AISignalScatter",
  "<ExposureLensComparison",
  "<MarketSignalLens",
  "<EmploymentForecastChart",
  "<AIForcesTimeline",
  "<DisruptionLeaderboard",
];

const BANNED_WORDING = [
  { label: "proves", pattern: /\bproves?\b/i },
  { label: "causes", pattern: /\bcauses?\b/i },
  { label: "caused by", pattern: /\bcaused\s+by\b/i },
  { label: "predicts layoffs", pattern: /\bpredicts?\s+layoffs?\b/i },
  { label: "guaranteed", pattern: /\bguaranteed\b/i },
  { label: "financial advice", pattern: /\bfinancial\s+advice\b/i },
  { label: "investment advice", pattern: /\binvestment\s+advice\b/i },
];

type UnknownRecord = Record<string, unknown>;
type EvidenceModule = {
  getEvidenceStack?: () => unknown;
};
type EvidenceLink = {
  href: string;
  label?: string;
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "dark" }),
}));

function record(value: unknown, label: string): UnknownRecord {
  expect(value, `${label} should be an object`).toBeTruthy();
  expect(typeof value, `${label} should be an object`).toBe("object");
  expect(Array.isArray(value), `${label} should not be an array`).toBe(false);
  return value as UnknownRecord;
}

function firstDefined(row: UnknownRecord, keys: string[]): unknown {
  return keys.map((key) => row[key]).find((value) => value != null);
}

function nonEmptyString(value: unknown, label: string): string {
  expect(typeof value, `${label} should be a string`).toBe("string");
  const text = (value as string).trim();
  expect(text.length, `${label} should not be empty`).toBeGreaterThan(0);
  return text;
}

function stringFrom(row: UnknownRecord, keys: string[], label: string): string {
  const value = firstDefined(row, keys);
  if (typeof value === "string") return nonEmptyString(value, label);
  throw new Error(`${label} should expose one of: ${keys.join(", ")}`);
}

function entriesFromStack(stack: unknown): UnknownRecord[] {
  if (Array.isArray(stack)) {
    return stack.map((item, index) => record(item, `getEvidenceStack()[${index}]`));
  }

  const data = record(stack, "getEvidenceStack()");
  const entries = firstDefined(data, ["conclusions", "rows", "items", "stack", "evidence"]);
  expect(Array.isArray(entries), "getEvidenceStack() should expose a conclusions array").toBe(true);
  return (entries as unknown[]).map((item, index) => record(item, `getEvidenceStack().conclusions[${index}]`));
}

async function getEvidenceEntries(): Promise<UnknownRecord[]> {
  expect(existsSync(HELPER_PATH), "Expected lib/evidence.ts to export getEvidenceStack()").toBe(true);
  const importedModule = (await import(/* @vite-ignore */ pathToFileURL(HELPER_PATH).href)) as EvidenceModule;
  expect(typeof importedModule.getEvidenceStack, "getEvidenceStack should be a function export").toBe("function");
  return entriesFromStack(importedModule.getEvidenceStack?.());
}

function sourceFamiliesFrom(row: UnknownRecord, index: number): string[] {
  const raw = firstDefined(row, SOURCE_FAMILY_KEYS);
  const label = `evidence conclusion ${index + 1} sourceFamilies`;

  if (typeof raw === "string") return [nonEmptyString(raw, label)];
  expect(Array.isArray(raw), `${label} should be an array`).toBe(true);

  return (raw as unknown[]).map((source, sourceIndex) => {
    if (typeof source === "string") return nonEmptyString(source, `${label}[${sourceIndex}]`);
    const sourceRecord = record(source, `${label}[${sourceIndex}]`);
    return stringFrom(sourceRecord, ["family", "label", "name", "title", "source"], `${label}[${sourceIndex}] label`);
  });
}

function linksFrom(row: UnknownRecord, index: number): EvidenceLink[] {
  const raw = firstDefined(row, LINK_KEYS);
  const label = `evidence conclusion ${index + 1} links`;

  if (typeof raw === "string") return [{ href: nonEmptyString(raw, label) }];
  expect(Array.isArray(raw), `${label} should be an array`).toBe(true);

  return (raw as unknown[]).map((link, linkIndex) => {
    if (typeof link === "string") return { href: nonEmptyString(link, `${label}[${linkIndex}]`) };
    const linkRecord = record(link, `${label}[${linkIndex}]`);
    const href = stringFrom(linkRecord, ["href", "url", "path", "to", "route"], `${label}[${linkIndex}] href`);
    const maybeLabel = firstDefined(linkRecord, ["label", "title", "view", "name"]);
    return {
      href,
      label: typeof maybeLabel === "string" ? maybeLabel.trim() : undefined,
    };
  });
}

function confidenceFrom(row: UnknownRecord, index: number): unknown {
  const value = firstDefined(row, CONFIDENCE_KEYS);
  const label = `evidence conclusion ${index + 1} confidence`;
  expect(value, `${label} should be present`).not.toBeUndefined();

  if (typeof value === "number") {
    expect(Number.isFinite(value), `${label} should be finite`).toBe(true);
    expect(value, `${label} should be non-negative`).toBeGreaterThanOrEqual(0);
    expect(value, `${label} should be a 0-1 or 0-100 score`).toBeLessThanOrEqual(100);
    return value;
  }

  return nonEmptyString(value, label);
}

function collectText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(collectText).join(" ");
  if (typeof value === "object") return Object.values(value as UnknownRecord).map(collectText).join(" ");
  return "";
}

function expectNoBannedWording(text: string, label: string): void {
  for (const { label: bannedLabel, pattern } of BANNED_WORDING) {
    expect(text, `${label} should avoid banned wording: ${bannedLabel}`).not.toMatch(pattern);
  }
}

async function importEvidenceStack(): Promise<ComponentType> {
  expect(existsSync(COMPONENT_PATH), "Expected components/insights/EvidenceStack.tsx").toBe(true);
  const importedModule = await import(/* @vite-ignore */ pathToFileURL(COMPONENT_PATH).href);
  const Component = (importedModule.default ?? importedModule.EvidenceStack) as ComponentType | undefined;
  expect(typeof Component, "EvidenceStack should be a React component export").toBe("function");
  return Component as ComponentType;
}

describe("getEvidenceStack", () => {
  it("returns at least six conclusions with source families, confidence, status, caveats, and view links", async () => {
    const entries = await getEvidenceEntries();
    expect(entries.length, "Evidence Stack should include at least six conclusions").toBeGreaterThanOrEqual(6);

    const distinctFamilies = new Set<string>();
    const distinctViewLinks = new Set<string>();

    entries.forEach((entry, index) => {
      stringFrom(entry, CONCLUSION_KEYS, `evidence conclusion ${index + 1}`);
      sourceFamiliesFrom(entry, index).forEach((family) => distinctFamilies.add(family));
      confidenceFrom(entry, index);
      stringFrom(entry, STATUS_KEYS, `evidence conclusion ${index + 1} status`);
      stringFrom(entry, CAVEAT_KEYS, `evidence conclusion ${index + 1} caveat`);

      const links = linksFrom(entry, index);
      expect(links.length, `evidence conclusion ${index + 1} should link to relevant views`).toBeGreaterThan(0);
      for (const link of links) {
        expect(link.href, `evidence conclusion ${index + 1} link should target a relevant app view`).toMatch(
          RELEVANT_VIEW_PATTERN,
        );
        distinctViewLinks.add(link.href.split("#")[0]);
      }
    });

    expect(distinctFamilies.size, "Evidence Stack should use many collected source families").toBeGreaterThanOrEqual(6);
    expect(distinctViewLinks.size, "Evidence Stack should link across multiple relevant views").toBeGreaterThanOrEqual(3);
  });

  it("uses careful wording without causal, layoff-predictive, guarantee, or advice claims", async () => {
    const entries = await getEvidenceEntries();
    expectNoBannedWording(collectText(entries), "getEvidenceStack()");
  });
});

describe("EvidenceStack component", () => {
  it("renders the title, conclusion rows/cards, source chips, caveat/coverage language, and relevant links", async () => {
    const EvidenceStack = await importEvidenceStack();
    const entries = await getEvidenceEntries();
    const { container } = render(<EvidenceStack />);

    expect(screen.getByRole("heading", { name: /Evidence Stack:\s*where signals agree/i })).toBeInTheDocument();

    const pageText = document.body.textContent ?? "";
    const renderedConclusions = entries.filter((entry, index) =>
      pageText.includes(stringFrom(entry, CONCLUSION_KEYS, `evidence conclusion ${index + 1}`)),
    );
    expect(renderedConclusions.length, "EvidenceStack should render each conclusion row/card").toBeGreaterThanOrEqual(6);

    const familyLabels = [...new Set(entries.flatMap((entry, index) => sourceFamiliesFrom(entry, index)))];
    const renderedFamilies = familyLabels.filter((family) => pageText.includes(family));
    expect(renderedFamilies.length, "EvidenceStack should render source-family chips").toBeGreaterThanOrEqual(6);

    expect(pageText, "EvidenceStack should include caveat or coverage language").toMatch(
      /caveat|coverage|covered|limitation|limited|partial/i,
    );
    expectNoBannedWording(pageText, "EvidenceStack rendered text");

    const renderedLinks = Array.from(container.querySelectorAll("a"))
      .map((link) => link.getAttribute("href") ?? "")
      .filter(Boolean);
    expect(
      renderedLinks.filter((href) => RELEVANT_VIEW_PATTERN.test(href)).length,
      "EvidenceStack should render links to relevant app views",
    ).toBeGreaterThanOrEqual(3);
  });
});

describe("/analysis EvidenceStack wiring", () => {
  it("renders EvidenceStack before or near the top of InsightsView", () => {
    expect(existsSync(INSIGHTS_VIEW_PATH), "Expected components/insights/InsightsView.tsx").toBe(true);
    expect(existsSync(ANALYSIS_PAGE_PATH), "Expected app/analysis/page.tsx").toBe(true);

    const insightsSource = readFileSync(INSIGHTS_VIEW_PATH, "utf8");
    const analysisSource = readFileSync(ANALYSIS_PAGE_PATH, "utf8");
    expect(`${analysisSource}\n${insightsSource}`, "Expected /analysis to import or render EvidenceStack").toMatch(
      /EvidenceStack/,
    );

    const renderSource = insightsSource.slice(Math.max(0, insightsSource.indexOf("return (")));
    const evidenceIndex = renderSource.indexOf("<EvidenceStack");
    expect(evidenceIndex, "InsightsView should render <EvidenceStack />").toBeGreaterThanOrEqual(0);

    const firstAnalysisSectionIndex = Math.min(
      ...ANALYSIS_COMPONENT_MARKERS.map((marker) => renderSource.indexOf(marker)).filter((index) => index >= 0),
    );
    expect(evidenceIndex, "EvidenceStack should appear before the existing analysis modules").toBeLessThan(
      firstAnalysisSectionIndex,
    );
  });
});

describe("analysis i18n Evidence Stack keys", () => {
  it("keeps English and Chinese analysis keys in parity when Evidence Stack keys are added", () => {
    const en = analysisEn as Record<string, string>;
    const zh = analysisZh as Record<string, string>;
    expect(Object.keys(zh).sort()).toEqual(Object.keys(en).sort());

    const evidenceKeys = Object.keys(en).filter((key) => /evidence/i.test(key));
    for (const key of evidenceKeys) {
      expect(typeof zh[key], `${key} should have a Chinese translation`).toBe("string");
      expect(zh[key].trim().length, `${key} Chinese translation should not be empty`).toBeGreaterThan(0);
      expectNoBannedWording(en[key], `${key} English translation`);
      expectNoBannedWording(zh[key], `${key} Chinese translation`);
    }
  });
});
