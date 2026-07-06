// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GlobalAIEcosystemComparison } from "@/components/global/GlobalView";
import { globalEn } from "@/lib/i18n/messages/en/global";
import { globalZh } from "@/lib/i18n/messages/zh/global";
import { DEEP_LINK_HREFS, SECTION_IDS } from "@/lib/section-anchors";
import type { GlobalAIEcosystemData } from "@/lib/global-ai-ecosystem";

vi.mock("@/lib/i18n/LanguageProvider", () => ({
  useLanguage: () => ({
    locale: "en" as const,
    setLocale: vi.fn(),
  }),
}));

const FIXTURE_DATA: GlobalAIEcosystemData = {
  rows: [
    {
      iso3: "USA",
      countryName: "United States",
      region: "North America",
      modelCount: 7,
      endpointCount: 10,
      modelProviderCount: 2,
      endpointProviderCount: 3,
      diffusionPct: 31.2,
      readinessScore: 86,
      readinessGap: 2,
      quadrant: "balanced-leader",
      proxyCaveat:
        "OpenRouter catalog footprint is a provider-identity proxy, not usage or deployment geography.",
    },
    {
      iso3: "FRA",
      countryName: "France",
      region: "Europe",
      modelCount: 2,
      endpointCount: 3,
      modelProviderCount: 1,
      endpointProviderCount: 1,
      diffusionPct: null,
      readinessScore: null,
      readinessGap: null,
      quadrant: "catalog-without-readiness",
      proxyCaveat:
        "OpenRouter catalog footprint is a provider-identity proxy, not usage or deployment geography.",
    },
  ],
  regions: ["Europe", "North America"],
  quadrants: ["balanced-leader", "catalog-without-readiness"],
  summary: {
    comparedCountries: 2,
    countriesWithCatalog: 2,
    countriesWithReadiness: 1,
    countriesWithBoth: 1,
  },
};

describe("GlobalAIEcosystemComparison", () => {
  it("renders a filterable country comparison table with proxy caveat copy", async () => {
    render(<GlobalAIEcosystemComparison data={FIXTURE_DATA} />);

    const section = document.getElementById(SECTION_IDS.globalAIEcosystemMap);
    expect(section).toHaveClass("scroll-mt-24");
    expect(section).toHaveAttribute(
      "aria-labelledby",
      `${SECTION_IDS.globalAIEcosystemMap}-heading`,
    );
    expect(
      screen.getByRole("heading", { name: "Global AI ecosystem comparison map" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("table")).toHaveAccessibleName(
      /country-level ai ecosystem comparison/i,
    );
    expect(screen.getByText(/public catalog\/provider-identity footprint/i)).toBeInTheDocument();
    expect(screen.getByText("United States")).toBeInTheDocument();
    expect(screen.getByText("France")).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Region"), "Europe");

    expect(screen.queryByText("United States")).not.toBeInTheDocument();
    expect(screen.getByText("France")).toBeInTheDocument();
  });

  it("keeps ecosystem-map i18n and cross-page deep links stable", () => {
    const enKeys = Object.keys(globalEn).filter((key) => key.startsWith("ecosystemMap")).sort();
    const zhKeys = Object.keys(globalZh).filter((key) => key.startsWith("ecosystemMap")).sort();

    expect(enKeys.length).toBeGreaterThan(0);
    expect(zhKeys).toEqual(enKeys);
    expect(SECTION_IDS.globalAIEcosystemMap).toBe("global-ai-ecosystem-map");
    expect(DEEP_LINK_HREFS.globalAIEcosystemMap).toBe("/global#global-ai-ecosystem-map");
  });
});
