/**
 * tests/sectors-i18n.test.ts
 *
 * Parity checks for the sectors i18n namespace.
 * Issue: FutureGrid#109
 *
 * Coverage:
 *  - EN and ZH sectors namespaces have identical sorted key sets.
 *    This catches any WageTierPolarizationLens keys Neo adds to one locale
 *    but forgets to add to the other.
 *  - No value in either locale is an empty string (every key has a translation).
 *
 * These tests pass immediately given the current state of en/sectors.ts and
 * zh/sectors.ts and will continue to guard future additions by Neo.
 */

import { describe, expect, it } from "vitest";

import { sectorsEn } from "@/lib/i18n/messages/en/sectors";
import { sectorsZh } from "@/lib/i18n/messages/zh/sectors";

describe("sectors i18n — EN / ZH key-set parity", () => {
  it("EN and ZH sectors namespaces have identical sorted key sets", () => {
    const enKeys = Object.keys(sectorsEn).sort();
    const zhKeys = Object.keys(sectorsZh).sort();
    expect(enKeys).toEqual(zhKeys);
  });
});

describe("sectors i18n — no empty values", () => {
  it("no EN sectors value is an empty string", () => {
    for (const [key, value] of Object.entries(sectorsEn)) {
      expect(value, `EN sectors key "${key}" must not be empty`).not.toBe("");
    }
  });

  it("no ZH sectors value is an empty string", () => {
    for (const [key, value] of Object.entries(sectorsZh)) {
      expect(value, `ZH sectors key "${key}" must not be empty`).not.toBe("");
    }
  });
});
