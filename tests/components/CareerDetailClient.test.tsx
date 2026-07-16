// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CareerDetailClient from "@/components/careers/CareerDetailClient";
import type { CareerEvidencePassport } from "@/lib/career-evidence-passport";
import type { CareerInsight, SectorAggregate, ReskillingTarget } from "@/lib/data";
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
  aiExposure: 0.72,
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
  orsAutomationFrictionScore: 34,
  orsAutomationFrictionBand: "Moderate friction",
  orsCoverage: "broad-soc",
  orsPhysicalPresenceScore: 28,
  orsDecisionMakingPct: 72,
  orsPreparationRequirement: "Bachelor's degree",
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
    "This release is a FutureGrid broad-SOC seed derived from public BLS ORS requirement concepts and categories, not direct occupation-level ORS survey estimates. It describes job requirements, not worker ability, AI capability, or displacement probability. Automation friction is a FutureGrid derived score and should be read alongside exposure, demand, wage, and projection signals.",
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
    expect(within(passportPanel).getByText("34/100")).toBeInTheDocument();
    expect(within(passportPanel).getByText(/broad SOC seed ORS job-requirements coverage/i)).toBeInTheDocument();
    expect(within(passportPanel).getByText(/H-1B offered wage \$145,000/i)).toBeInTheDocument();
    expect(within(passportPanel).getByText(/not visa approvals/i)).toBeInTheDocument();
    expect(within(passportPanel).getByText(/not worker ability, AI capability, or displacement probability/i)).toBeInTheDocument();
    expect(within(passportPanel).getByText(/seed-static \/ seed-derived/i)).toBeInTheDocument();
    expect(within(passportPanel).getByRole("link", { name: /Computer Occupations, All Other/i })).toHaveAttribute(
      "href",
      "/careers/15-1299",
    );
  });
});

// ─── D5 regression: transRetrainUnknown label when jobZoneDelta === null ───────
//
// When a reskilling path has jobZoneDelta=null (sentinel job-zone), CareerDetailClient
// must render the "transRetrainUnknown" i18n key rather than treating null as 0 (same zone)
// or crashing with a type error.

function makeTransition(overrides: Partial<ReskillingTarget>): ReskillingTarget {
  return {
    occupationCode: "99-9999",
    occupationName: "Test Occupation",
    sectorName: "Test Sector",
    automationRisk: "Low",
    aiExposure: 0.1,
    medianSalary: 80000,
    outlook: "Average",
    sharedSkills: ["Communication"],
    sharedCount: 1,
    overlapScore: 0.2,
    missingSkills: [],
    salaryDelta: 5000,
    exposureDropPts: 10,
    jobZone: 0,
    jobZoneDelta: null,
    growthRate: null,
    projectedOpenings: null,
    totalEmployment: null,
    transitionScore: 60,
    ...overrides,
  };
}

function renderWithTransitions(transitions: ReskillingTarget[]) {
  return render(
    <CareerDetailClient
      code="15-1252"
      career={career}
      allInsightCodes={["15-1252", "99-9999"]}
      onet={null}
      sectorAgg={sectorAgg}
      trend={[]}
      transitions={transitions}
      exposureLenses={null}
      h1bSignal={h1bSignal}
      evidencePassport={evidencePassport}
      h1bFirst={2024}
      h1bLatest={2025}
    />,
  );
}

describe("CareerDetailClient — D5 reskilling transition retrain labels", () => {
  it("renders 'Training lvl unavailable' when jobZoneDelta is null (sentinel zone)", () => {
    renderWithTransitions([makeTransition({ jobZoneDelta: null })]);
    expect(screen.getByText("Training lvl unavailable")).toBeInTheDocument();
  });

  it("renders 'Similar training' when jobZoneDelta is 0 (same zone)", () => {
    renderWithTransitions([makeTransition({ jobZoneDelta: 0, jobZone: 2 })]);
    expect(screen.getByText("Similar training")).toBeInTheDocument();
  });

  it("renders 'Similar training' when jobZoneDelta is negative (easier zone)", () => {
    renderWithTransitions([makeTransition({ jobZoneDelta: -1, jobZone: 1 })]);
    expect(screen.getByText("Similar training")).toBeInTheDocument();
  });

  it("renders '+{n} training lvl' when jobZoneDelta is positive", () => {
    renderWithTransitions([makeTransition({ jobZoneDelta: 2, jobZone: 4 })]);
    expect(screen.getByText("+2 training lvl")).toBeInTheDocument();
  });

  it("all three label variants can coexist in the same rendered list", () => {
    renderWithTransitions([
      makeTransition({ occupationCode: "99-0001", occupationName: "Occ A", jobZoneDelta: null }),
      makeTransition({ occupationCode: "99-0002", occupationName: "Occ B", jobZoneDelta: -1, jobZone: 1 }),
      makeTransition({ occupationCode: "99-0003", occupationName: "Occ C", jobZoneDelta: 3, jobZone: 5 }),
    ]);
    expect(screen.getByText("Training lvl unavailable")).toBeInTheDocument();
    expect(screen.getByText("Similar training")).toBeInTheDocument();
    expect(screen.getByText("+3 training lvl")).toBeInTheDocument();
  });
});
