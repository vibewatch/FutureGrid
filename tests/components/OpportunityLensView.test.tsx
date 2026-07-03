// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import OpportunityLensView from "@/components/labor/OpportunityLensView";
import type { LaborOpportunityData } from "@/lib/labor-opportunity";

const FIXTURE: LaborOpportunityData = {
  source: {
    mode: "snapshot-fallback",
    datasetId: "occupation-snapshot",
    sourceName: "Bundled BLS-linked forecast snapshot",
    publisher: "FutureGrid",
    asOf: "2025",
  },
  datasetBadgeIds: ["occupation-snapshot", "job-postings"],
  summary: {
    occupationsTracked: 2,
    totalAnnualOpenings: 180000,
    highExposureOpeningsShare: 0.42,
    medianTopDemandWage: 95000,
    exposureMedian: 0.31,
    openingsMedian: 90000,
  },
  chartRows: [
    {
      socCode: "15-1252",
      title: "Software Developers",
      sector: "Computer and Mathematical",
      careerHref: "/careers/15-1252",
      aiExposure: 0.42,
      automationRisk: "High",
      annualOpenings: 105000,
      currentEmployment: 1690000,
      projectedEmployment: null,
      employmentChange: null,
      employmentPercentChange: null,
      medianAnnualWage: 132000,
      latestAnnualPostings: 548000,
    },
    {
      socCode: "29-1141",
      title: "Registered Nurses",
      sector: "Healthcare Practitioners and Technical",
      careerHref: "/careers/29-1141",
      aiExposure: 0.16,
      automationRisk: "Medium",
      annualOpenings: 75000,
      currentEmployment: 3200000,
      projectedEmployment: null,
      employmentChange: null,
      employmentPercentChange: null,
      medianAnnualWage: 89000,
      latestAnnualPostings: 445000,
    },
  ],
  spotlight: {
    lowerExposure: [
      {
        socCode: "29-1141",
        title: "Registered Nurses",
        sector: "Healthcare Practitioners and Technical",
        careerHref: "/careers/29-1141",
        aiExposure: 0.16,
        automationRisk: "Medium",
        annualOpenings: 75000,
        currentEmployment: 3200000,
        projectedEmployment: null,
        employmentChange: null,
        employmentPercentChange: null,
        medianAnnualWage: 89000,
        latestAnnualPostings: 445000,
      },
    ],
    highExposure: [
      {
        socCode: "15-1252",
        title: "Software Developers",
        sector: "Computer and Mathematical",
        careerHref: "/careers/15-1252",
        aiExposure: 0.42,
        automationRisk: "High",
        annualOpenings: 105000,
        currentEmployment: 1690000,
        projectedEmployment: null,
        employmentChange: null,
        employmentPercentChange: null,
        medianAnnualWage: 132000,
        latestAnnualPostings: 548000,
      },
    ],
  },
};

describe("OpportunityLensView", () => {
  it("renders the opportunity heading, source context, and linked spotlight cards", () => {
    render(<OpportunityLensView data={FIXTURE} />);

    expect(
      screen.getByRole("heading", { name: /where projected demand and ai exposure meet/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/source context/i)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /open career card/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /view source notes/i })).toBeInTheDocument();
  });
});
