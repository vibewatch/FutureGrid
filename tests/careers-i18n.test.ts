/**
 * tests/careers-i18n.test.ts
 *
 * Parity checks for the careers i18n namespace:
 * - The 11 new H-1B keys exist in both EN and ZH.
 * - EN and ZH have identical key sets (sorted).
 * - No value in either locale is an empty string.
 */

import { describe, expect, it } from "vitest";

import { careersEn } from "@/lib/i18n/messages/en/careers";
import { careersZh } from "@/lib/i18n/messages/zh/careers";

const H1B_KEYS = [
  "h1bSectionTitle",
  "h1bSectionSubtitle",
  "h1bStatDecadeTotal",
  "h1bStatLatestVolume",
  "h1bStatMedianWage",
  "h1bStatRank",
  "h1bRankValue",
  "h1bShareNote",
  "h1bViewTrends",
  "h1bSparklineLabel",
  "h1bNoData",
] as const;

describe("careers i18n — H-1B keys presence", () => {
  for (const key of H1B_KEYS) {
    it(`EN contains key "${key}"`, () => {
      expect(careersEn).toHaveProperty(key);
    });

    it(`ZH contains key "${key}"`, () => {
      expect(careersZh).toHaveProperty(key);
    });
  }
});

describe("careers i18n — EN / ZH key-set parity", () => {
  it("EN and ZH have identical sorted key sets", () => {
    const enKeys = Object.keys(careersEn).sort();
    const zhKeys = Object.keys(careersZh).sort();
    expect(enKeys).toEqual(zhKeys);
  });
});

describe("careers i18n — no empty values", () => {
  it("no EN careers value is an empty string", () => {
    for (const [key, value] of Object.entries(careersEn)) {
      expect(value, `EN key "${key}" must not be empty`).not.toBe("");
    }
  });

  it("no ZH careers value is an empty string", () => {
    for (const [key, value] of Object.entries(careersZh)) {
      expect(value, `ZH key "${key}" must not be empty`).not.toBe("");
    }
  });
});
