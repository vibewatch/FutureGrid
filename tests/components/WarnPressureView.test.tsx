// @vitest-environment jsdom
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { ComponentType, ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const COMPONENT_PATH = path.join(process.cwd(), "components/labor/WarnPressureView.tsx");
const LABOR_MARKET_COMPONENT_PATH = path.join(process.cwd(), "components/labor/LaborMarketView.tsx");
const STATE_LABOR_MODULE = path.join(process.cwd(), "lib/state-labor.ts");
const CAUSAL_PHRASES = [
  /\bcauses?\b/i,
  /\bcaused by\b/i,
  /\bdrives?\b/i,
  /\bleads? to\b/i,
  /\bresults? in\b/i,
  /\bbecause of\b/i,
];

type UnknownRecord = Record<string, unknown>;
type StateLaborModule = {
  getWarnPressureTopStates: (limit?: number) => unknown;
};

vi.mock("next/dynamic", () => ({
  default: (_loader: unknown, options?: { loading?: () => ReactNode }) => {
    const DynamicStub = () => options?.loading?.() ?? <div data-testid="dynamic-tab-panel" />;
    return DynamicStub;
  },
}));

function record(value: unknown, label: string): UnknownRecord {
  expect(value, `${label} should be an object`).toBeTruthy();
  expect(typeof value, `${label} should be an object`).toBe("object");
  expect(Array.isArray(value), `${label} should not be an array`).toBe(false);
  return value as UnknownRecord;
}

function statesFrom(value: unknown, label: string): UnknownRecord[] {
  if (Array.isArray(value)) return value.map((item, index) => record(item, `${label}[${index}]`));

  const data = record(value, label);
  const states = data.states ?? data.jurisdictions ?? data.stateLabor ?? data.stateLaborData;
  expect(Array.isArray(states), `${label} should expose a states array`).toBe(true);
  return (states as unknown[]).map((item, index) => record(item, `${label}.states[${index}]`));
}

function stringFrom(row: UnknownRecord, keys: string[], label: string): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  throw new Error(`${label} should expose one of: ${keys.join(", ")}`);
}

async function importComponent(): Promise<ComponentType> {
  expect(existsSync(COMPONENT_PATH), "Expected components/labor/WarnPressureView.tsx").toBe(true);
  const importedModule = await import(/* @vite-ignore */ pathToFileURL(COMPONENT_PATH).href);
  const Component = (importedModule.default ?? importedModule.WarnPressureView) as ComponentType | undefined;
  expect(typeof Component, "WarnPressureView should be a React component export").toBe("function");
  return Component as ComponentType;
}

async function importLaborMarketView(): Promise<ComponentType> {
  expect(existsSync(LABOR_MARKET_COMPONENT_PATH), "Expected components/labor/LaborMarketView.tsx").toBe(true);
  const importedModule = await import(/* @vite-ignore */ pathToFileURL(LABOR_MARKET_COMPONENT_PATH).href);
  const Component = (importedModule.default ?? importedModule.LaborMarketView) as ComponentType | undefined;
  expect(typeof Component, "LaborMarketView should be a React component export").toBe("function");
  return Component as ComponentType;
}

async function topRankedState(): Promise<UnknownRecord> {
  expect(
    existsSync(STATE_LABOR_MODULE),
    "Expected lib/state-labor.ts so WarnPressureView can render real ranked data",
  ).toBe(true);
  const stateLaborModule = (await import(/* @vite-ignore */ pathToFileURL(STATE_LABOR_MODULE).href)) as StateLaborModule;
  expect(typeof stateLaborModule.getWarnPressureTopStates).toBe("function");
  const states = statesFrom(stateLaborModule.getWarnPressureTopStates(1), "getWarnPressureTopStates(1)");
  expect(states.length, "Expected at least one ranked WARN Pressure state").toBeGreaterThan(0);
  return states[0];
}

describe("WarnPressureView", () => {
  it("renders the heading, non-causal methodology, and at least one ranked state", async () => {
    const WarnPressureView = await importComponent();
    const topState = await topRankedState();
    render(<WarnPressureView />);

    expect(screen.getAllByRole("heading", { name: /warn pressure/i }).length).toBeGreaterThan(0);

    const pageText = document.body.textContent ?? "";
    expect(pageText).toMatch(/percentile/i);
    expect(pageText).toMatch(/70\s*%|0\.70/);
    expect(pageText).toMatch(/30\s*%|0\.30/);
    expect(pageText).toMatch(/context|correlat|compare|index/i);
    for (const phrase of CAUSAL_PHRASES) {
      expect(pageText, `WarnPressureView should avoid causal wording: ${phrase}`).not.toMatch(phrase);
    }

    const stateName = stringFrom(topState, ["stateName", "name"], "top ranked state name");
    expect(screen.getAllByText(stateName, { exact: false }).length).toBeGreaterThan(0);
  });
});

describe("LaborMarketView WARN Pressure tab", () => {
  it("adds WARN Pressure as the third labor tab", async () => {
    const LaborMarketView = await importLaborMarketView();
    render(<LaborMarketView />);

    const tabs = screen.getAllByRole("button");
    expect(tabs.map((tab) => tab.textContent?.trim())).toEqual([
      expect.stringMatching(/turnover|trend/i),
      expect.stringMatching(/layoff|notice/i),
      expect.stringMatching(/warn pressure/i),
    ]);
  });
});
