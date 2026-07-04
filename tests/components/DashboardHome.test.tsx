// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("@/components/dashboard/SummaryCard", () => ({
  default: ({ title, href }: { title: string; href: string }) => <a href={href}>{title}</a>,
}));
vi.mock("@/components/charts/JobImpactChart", () => ({ default: () => <div>Job impact chart</div> }));
vi.mock("@/components/charts/PredictiveChart", () => ({ default: () => <div>Predictive chart</div> }));
vi.mock("@/components/ui/AnimatedCounter", () => ({
  default: ({ value, suffix = "" }: { value: number; suffix?: string }) => <span>{value}{suffix}</span>,
}));
vi.mock("@/components/ui/Reveal", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/dashboard/HeroRiskChecker", () => ({ default: () => <div>Risk checker</div> }));
vi.mock("@/components/dashboard/HighlightsBento", () => ({ default: () => <div>Highlights</div> }));
vi.mock("@/components/charts/SectorScatterChart", () => ({ default: () => <div>Sector scatter</div> }));
vi.mock("@/components/dashboard/KeyFindings", () => ({ default: () => <div>Key findings</div> }));
vi.mock("@/components/ui/DataAsOfBadge", () => ({ default: () => <div>Data badge</div> }));

import DashboardHome from "@/components/dashboard/DashboardHome";

describe("DashboardHome journey lenses", () => {
  it("renders the safe first-view lens grid with preserved route links", () => {
    render(
      <DashboardHome
        insightsLength={12}
        totalWorkforce={1_000_000}
        sectors={[
          { sector: "Software", avgRisk: 0.42, occupationCount: 4, brightShare: 0.5 },
        ]}
        highRiskCount={3}
        lowRiskCount={2}
        avgRiskAll={0.37}
        workforceExposure={{
          highExposureShare: 0.25,
          highExposureWorkforce: 250_000,
          totalWorkforce: 1_000_000,
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: /start from the question/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /global ai signals/i })).toHaveAttribute("href", "/global");
    expect(screen.getByRole("link", { name: /careers, sectors, skills/i })).toHaveAttribute("href", "/careers");
    expect(screen.getByRole("link", { name: /labor-market pressure/i })).toHaveAttribute("href", "/labor");
    expect(screen.getByRole("link", { name: /cross-lens intelligence/i })).toHaveAttribute("href", "/analysis");
    expect(screen.getByRole("link", { name: /sources and methods/i })).toHaveAttribute("href", "/sources");
    expect(screen.getByText(/LCAs are not approvals/i)).toBeInTheDocument();
    expect(screen.getByText(/descriptive market signals/i)).toBeInTheDocument();
  });
});
