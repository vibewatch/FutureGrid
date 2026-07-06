// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CareerDetailClient from "@/components/careers/CareerDetailClient";
import type { CareerEvidencePassport } from "@/lib/career-evidence-passport";
import type { CareerInsight, SectorAggregate } from "@/lib/data";
import type { H1bOccupationSignal } from "@/lib/h1b";

vi.mock("@/lib/i18n/LanguageProvider", () => ({
  useLanguage: () => ({ locale: "en" as const, setLocale: vi.fn() }),
}));

vi.mock("@/components/charts/PredictiveChart", () => ({
  default: () => <div data-testid="predictive-chart" />,
}));

vi.mock("@/components/charts/OccupationTrendChart", () => ({
  default: () => <div data-testid="occupation-trend-chart" />,
}));

const career: CareerInsight = {
  occupationCode: "15-1252",
  occupationName: "Software Developers",
  automationRisk: "High",
  automationProbability: 0.42,
  growthRate: 1.2,
  growthWindow: { fromYear: 2019, toYear: 2025 },
  medianSalary: 132270,
  totalEmployment: 1650000,
  projectedOpenings: 125000,
  outlook: "Bright",
  sectorName: "Computer and Mathematical",
  skills: ["Programming", "Systems Analysis", "Critical Thinking"],
  employmentHistory: null,
  wageHistory: null,
};

const sectorAgg: SectorAggregate = {
  sector: "Computer and Mathematical",
  avgRisk: 0.31,
  avgGrowth: 1,
  avgSalary: 120000,
  totalEmployment: 5000000,
  brightShare: 0.6,
  occupationCount: 10,
};

const h1bSignal: H1bOccupationSignal = {
  socCode: "15-1252",
  socTitle: "Software Developers",
  totalCount: 100000,
  countByYear: { "2024": 10000, "2025": 12000 },
  firstYear: 2024,
  firstYearCount: 10000,
  latestYear: 2025,
  latestYearCount: 12000,
  medianWageAnnualLatest: 145000,
  cagr: 0.05,
  rankByTotal: 1,
  totalOccupations: 800,
  shareOfLatestYear: 0.1,
};

const evidencePassport: CareerEvidencePassport = {
  socCode: "15-1252",
  title: "Software Developers",
  sector: "Computer and Mathematical",
  aiExposurePct: 42,
  automationRisk: "High",
  medianAnnualSalary: 132270,
  currentEmployment: 1650000,
  projectedEmployment: 1800000,
  employmentChangePct: 9.1,
  projectedOpenings: 125000,
  projectionWindow: "2024–2034",
  h1bTotalLcas: 100000,
  h1bLatestLcas: 12000,
  h1bLatestFiscalYear: 2025,
  h1bMedianWageAnnual: 145000,
  h1bCagr: 0.05,
  latestAnnualPostings: 54000,
  jobPostingYear: 2025,
  jobPostingsSourceStatus: "seed-derived",
  jobPostingsMode: "seed-static",
  skills: ["Programming", "Systems Analysis"],
  transitions: [
    {
      socCode: "15-1299",
      title: "Computer Occupations, All Other",
      transitionScore: 82,
      exposureDropPts: 12,
      missingSkills: ["Security"],
    },
  ],
  caveats: [
    "H-1B values are certified Labor Condition Applications, not visa approvals.",
    "Job postings are seed-static seed-derived data.",
    "Transition matches are directional skill-overlap context, not placement guarantees.",
  ],
};

describe("CareerDetailClient", () => {
  it("renders the Career Evidence Passport with proxy and LCA caveats", () => {
    render(
      <CareerDetailClient
        code="15-1252"
        career={career}
        allInsightCodes={["15-1252", "15-1299"]}
        onet={null}
        sectorAgg={sectorAgg}
        trend={[]}
        transitions={[]}
        exposureLenses={null}
        h1bSignal={h1bSignal}
        evidencePassport={evidencePassport}
        h1bFirst={2024}
        h1bLatest={2025}
      />,
    );

    expect(screen.getByRole("heading", { name: "Career Evidence Passport" })).toBeInTheDocument();
    expect(screen.getByText("Proxy / seed data labeled")).toBeInTheDocument();
    expect(screen.getByText("Descriptive-only")).toBeInTheDocument();
    const passportPanel = screen.getByRole("region", { name: "Career Evidence Passport" });
    expect(within(passportPanel).getByText("42.0%")).toBeInTheDocument();
    expect(within(passportPanel).getByText(/H-1B offered wage \$145,000/i)).toBeInTheDocument();
    expect(within(passportPanel).getByText(/not visa approvals/i)).toBeInTheDocument();
    expect(within(passportPanel).getByText(/seed-static \/ seed-derived/i)).toBeInTheDocument();
    expect(within(passportPanel).getByRole("link", { name: /Computer Occupations, All Other/i })).toHaveAttribute(
      "href",
      "/careers/15-1299",
    );
  });
});
