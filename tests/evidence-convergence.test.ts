/**
 * Focused tests for the additive getEvidenceConvergence() selector in lib/evidence.ts.
 * Validates the convergence contract:
 *   - Items derive from existing getEvidenceStack() conclusions
 *   - Order, id, title, status, confidence, and primaryHref are all preserved
 *   - Summary counts and generatedAt are lifted unchanged from the stack
 *   - Returns a fresh copy on every call (immutable output)
 *
 * Issue: vibewatch/FutureGrid#103
 */

import { describe, expect, it } from "vitest";
import { getEvidenceStack, getEvidenceConvergence } from "@/lib/evidence";
import type { EvidenceStatus, EvidenceConfidence } from "@/lib/evidence";

const VALID_STATUSES: EvidenceStatus[] = ["agreement", "mixed", "coverage-gap", "watch"];
const VALID_CONFIDENCES: EvidenceConfidence[] = ["high", "medium", "low"];
const VALID_APP_ROUTE = /^\/(analysis|careers|sectors|labor|skills|explore|global|sources|report)(?:\/|#|$)/;

describe("getEvidenceConvergence — return shape", () => {
  it("returns an object with a summary object and an items array", () => {
    const convergence = getEvidenceConvergence();
    expect(typeof convergence).toBe("object");
    expect(Array.isArray(convergence.items)).toBe(true);
    expect(typeof convergence.summary).toBe("object");
    expect(Array.isArray(convergence.summary)).toBe(false);
  });

  it("items count matches getEvidenceStack conclusions count (≥6)", () => {
    const stack = getEvidenceStack();
    const { items } = getEvidenceConvergence();
    expect(items.length).toBe(stack.conclusions.length);
    expect(items.length).toBeGreaterThanOrEqual(6);
  });

  it("item ids are unique across the list", () => {
    const { items } = getEvidenceConvergence();
    const ids = items.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("getEvidenceConvergence — items preserve conclusion values", () => {
  it("preserves id, title, status, confidence, and primaryHref in order", () => {
    const stack = getEvidenceStack();
    const { items } = getEvidenceConvergence();

    items.forEach((item, index) => {
      const conclusion = stack.conclusions[index];
      expect(item.id, `item[${index}].id`).toBe(conclusion.id);
      expect(item.title, `item[${index}].title`).toBe(conclusion.title);
      expect(item.status, `item[${index}].status`).toBe(conclusion.status);
      expect(item.confidence, `item[${index}].confidence`).toBe(conclusion.confidence);
      expect(item.primaryHref, `item[${index}].primaryHref`).toBe(conclusion.recommendedViewHref);
    });
  });

  it("item order is identical to getEvidenceStack conclusions order", () => {
    const stackIds = getEvidenceStack().conclusions.map((c) => c.id);
    const itemIds = getEvidenceConvergence().items.map((item) => item.id);
    expect(itemIds).toEqual(stackIds);
  });

  it("every item status is a valid EvidenceStatus", () => {
    for (const item of getEvidenceConvergence().items) {
      expect(VALID_STATUSES, `item "${item.id}" status "${item.status}" should be valid`).toContain(item.status);
    }
  });

  it("every item confidence is a valid EvidenceConfidence", () => {
    for (const item of getEvidenceConvergence().items) {
      expect(VALID_CONFIDENCES, `item "${item.id}" confidence "${item.confidence}" should be valid`).toContain(
        item.confidence,
      );
    }
  });

  it("every item primaryHref targets a valid app route", () => {
    for (const item of getEvidenceConvergence().items) {
      expect(item.primaryHref, `item "${item.id}" primaryHref should be a valid app route`).toMatch(VALID_APP_ROUTE);
    }
  });

  it("items cover at least two distinct primary routes", () => {
    const routes = new Set(getEvidenceConvergence().items.map((item) => item.primaryHref));
    expect(routes.size).toBeGreaterThanOrEqual(2);
  });
});

describe("getEvidenceConvergence — summary counts and metadata", () => {
  it("summary status counts sum to total items count", () => {
    const { summary, items } = getEvidenceConvergence();
    const total = summary.agreementCount + summary.mixedCount + summary.coverageGapCount + summary.watchCount;
    expect(total).toBe(items.length);
  });

  it("summary counts match getEvidenceStack summary exactly", () => {
    const stackSummary = getEvidenceStack().summary;
    const { summary } = getEvidenceConvergence();
    expect(summary.agreementCount).toBe(stackSummary.agreementCount);
    expect(summary.mixedCount).toBe(stackSummary.mixedCount);
    expect(summary.coverageGapCount).toBe(stackSummary.coverageGapCount);
    expect(summary.watchCount).toBe(stackSummary.watchCount);
  });

  it("summary title and caveat are non-empty strings", () => {
    const { summary } = getEvidenceConvergence();
    expect(typeof summary.title).toBe("string");
    expect(summary.title.trim().length).toBeGreaterThan(0);
    expect(typeof summary.caveat).toBe("string");
    expect(summary.caveat.trim().length).toBeGreaterThan(0);
  });

  it("summary finding is a non-empty string", () => {
    const { summary } = getEvidenceConvergence();
    expect(typeof summary.finding).toBe("string");
    expect(summary.finding.trim().length).toBeGreaterThan(0);
  });

  it("summary generatedAt is a non-empty ISO-8601 date string", () => {
    const { summary } = getEvidenceConvergence();
    expect(typeof summary.generatedAt).toBe("string");
    expect(summary.generatedAt.trim().length).toBeGreaterThan(0);
    expect(summary.generatedAt, "generatedAt should start with YYYY-MM-DD").toMatch(/^\d{4}-\d{2}-\d{2}/);
  });
});

describe("getEvidenceConvergence — immutability / pure selector", () => {
  it("returns a fresh copy on each call — mutating items does not affect subsequent calls", () => {
    const first = getEvidenceConvergence();
    first.items[0].title = "__mutated__";
    const second = getEvidenceConvergence();
    expect(second.items[0].title).not.toBe("__mutated__");
  });

  it("returns consistent item count across two calls", () => {
    expect(getEvidenceConvergence().items.length).toBe(getEvidenceConvergence().items.length);
  });
});
