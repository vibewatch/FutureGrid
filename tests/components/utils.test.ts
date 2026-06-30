// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  colorForRisk,
  parseBLSValue,
  socCodeToOnet,
} from "@/lib/utils";

describe("formatCurrency", () => {
  it("formats a round number as USD", () => {
    expect(formatCurrency(75000)).toBe("$75,000");
  });

  it("formats zero as $0", () => {
    expect(formatCurrency(0)).toBe("$0");
  });

  it("formats large salary correctly", () => {
    expect(formatCurrency(120000)).toBe("$120,000");
  });
});

describe("formatNumber", () => {
  it("formats integer without decimals by default", () => {
    expect(formatNumber(1000)).toBe("1,000");
  });

  it("formats with specified decimals", () => {
    expect(formatNumber(1234.567, 2)).toBe("1,234.57");
  });

  it("formats zero", () => {
    expect(formatNumber(0)).toBe("0");
  });
});

describe("formatPercent", () => {
  it("prefixes positive values with +", () => {
    expect(formatPercent(5.5)).toBe("+5.5%");
  });

  it("prefixes negative values with - (no +)", () => {
    expect(formatPercent(-3.2)).toBe("-3.2%");
  });

  it("zero is treated as positive (+0.0%)", () => {
    expect(formatPercent(0)).toBe("+0.0%");
  });

  it("respects custom decimal places", () => {
    expect(formatPercent(2.5, 0)).toBe("+3%");
  });
});

describe("colorForRisk", () => {
  it("Low → green", () => {
    expect(colorForRisk("Low")).toBe("#22c55e");
  });

  it("Medium → yellow", () => {
    expect(colorForRisk("Medium")).toBe("#eab308");
  });

  it("High → orange", () => {
    expect(colorForRisk("High")).toBe("#f97316");
  });

  it("Very High → red", () => {
    expect(colorForRisk("Very High")).toBe("#ef4444");
  });

  it("unknown value → gray fallback", () => {
    expect(colorForRisk("Unknown")).toBe("#6b7280");
  });
});

describe("parseBLSValue", () => {
  it("parses a valid numeric string", () => {
    expect(parseBLSValue("12345.6")).toBeCloseTo(12345.6);
  });

  it("returns 0 for non-numeric string", () => {
    expect(parseBLSValue("N/A")).toBe(0);
    expect(parseBLSValue("")).toBe(0);
    expect(parseBLSValue("—")).toBe(0);
  });
});

describe("socCodeToOnet", () => {
  it("appends .00 when no dot present", () => {
    expect(socCodeToOnet("15-1252")).toBe("15-1252.00");
  });

  it("leaves code unchanged when dot is present", () => {
    expect(socCodeToOnet("15-1252.00")).toBe("15-1252.00");
    expect(socCodeToOnet("15-1252.99")).toBe("15-1252.99");
  });
});
