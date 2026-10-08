import { describe, expect, it } from "vitest";
import {
  getAIAdoptionTracker,
  getAdoptionByOccupationGroup,
  getAdoptionHeadlines,
  getAdoptionPulseData,
  getFirmAdoptionByState,
  getIndustryAdoption,
  quarterLabel,
  shortDateLabel,
} from "@/lib/ai-adoption-tracker";
import { CANONICAL_SECTORS } from "@/lib/sector-taxonomy";
import { validateAIAdoptionTracker } from "../scripts/lib/validate.mjs";

describe("ai-adoption-tracker dataset", () => {
  const data = getAIAdoptionTracker();

  it("passes the build-time validator", () => {
    expect(() => validateAIAdoptionTracker(data as unknown as Record<string, unknown>)).not.toThrow();
  });

  it("rejects out-of-range percentages", () => {
    const broken = structuredClone(data);
    broken.businesses.national[0].aiUsePct = 140;
    expect(() => validateAIAdoptionTracker(broken as unknown as Record<string, unknown>)).toThrow(/outside \[0, 100\]/);
  });

  it("keeps workers and businesses in separate sections with their own sources", () => {
    expect(data.sources.map((s) => s.id).sort()).toEqual(["census-btos-ai", "stlouisfed-rps-genai"]);
    expect(data.caveats.join(" ")).toMatch(/must not be merged/i);
  });

  it("has chronologically ordered worker and business series", () => {
    const dates = data.workers.headline.adoptionWork.map((p) => p.date);
    expect([...dates].sort()).toEqual(dates);
    const cycles = data.businesses.national.map((c) => c.cycle);
    expect([...cycles].sort()).toEqual(cycles);
  });
});

describe("adoption view models", () => {
  it("maps every RPS occupation group onto a canonical FutureGrid sector", () => {
    const rows = getAdoptionByOccupationGroup();
    expect(rows.length).toBeGreaterThanOrEqual(18);
    for (const r of rows) expect(CANONICAL_SECTORS).toContain(r.sector);
    for (let i = 1; i < rows.length; i++) expect(rows[i].adoptionWorkPct).toBeLessThanOrEqual(rows[i - 1].adoptionWorkPct);
  });

  it("derives headline metrics with year-over-year deltas", () => {
    const h = getAdoptionHeadlines();
    expect(h.workerAdoptionWork?.value).toBeGreaterThan(0);
    expect(h.workerAdoptionWork?.yoyPp).not.toBeNull();
    expect(h.businessAiUse?.value).toBeGreaterThan(0);
  });

  it("builds aligned trend series for the dashboard pulse", () => {
    const p = getAdoptionPulseData();
    expect(p.workers.labels).toHaveLength(p.workers.work.length);
    expect(p.workers.labels).toHaveLength(p.workers.overall.length);
    expect(p.firms.labels).toHaveLength(p.firms.now.length);
    expect(p.firms.labels).toHaveLength(p.firms.next6m.length);
    // Adults using GenAI for anything ≥ employed adults using it for work in every quarter.
    p.workers.work.forEach((w, i) => expect(p.workers.overall[i]).toBeGreaterThanOrEqual(w - 5));
  });

  it("joins BTOS firm use onto RPS industries without merging the values", () => {
    const rows = getIndustryAdoption();
    const info = rows.find((r) => r.naics === "51");
    expect(info).toBeDefined();
    expect(info!.workerAdoptionPct).not.toBe(info!.firmAiUsePct);
    // Multi-code NAICS sectors resolve through their first BTOS code.
    expect(rows.find((r) => r.naics === "31-33")?.firmAiUsePct).not.toBeNull();
  });

  it("excludes the BTOS multi-state pseudo-code from state rankings", () => {
    const states = getFirmAdoptionByState();
    expect(states.some((s) => s.state === "XX")).toBe(false);
    expect(states.length).toBeGreaterThanOrEqual(50);
  });

  it("formats period labels", () => {
    expect(quarterLabel("2026-04-01")).toBe("Q2 2026");
    expect(quarterLabel("2024-10-01")).toBe("Q4 2024");
    expect(shortDateLabel("2026-09-06")).toBe("Sep 6 '26");
  });
});
