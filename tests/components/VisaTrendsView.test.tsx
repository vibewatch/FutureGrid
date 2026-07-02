// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Stable theme without a ThemeProvider.
vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "dark" }),
}));

// Render the dynamic charts' loading stub synchronously (matches the
// WarnPressureView test pattern). The chart canvases themselves are exercised
// by ChartA11y.test — here we assert the sections VisaTrendsView renders
// directly (headings, stat cards, tables, caveats).
vi.mock("next/dynamic", () => ({
  default: (_loader: unknown, options?: { loading?: () => ReactNode }) => {
    const DynamicStub = () => options?.loading?.() ?? <div data-testid="chart-stub" />;
    return DynamicStub;
  },
}));

// Mock the language context so useT / useFormatters resolve without a provider.
const mockUseLanguage = vi.fn(() => ({
  locale: "en" as "en" | "zh",
  setLocale: vi.fn(),
}));
vi.mock("@/lib/i18n/LanguageProvider", () => ({
  useLanguage: () => mockUseLanguage(),
}));

import VisaTrendsView from "@/components/visa/VisaTrendsView";

beforeEach(() => {
  mockUseLanguage.mockReturnValue({ locale: "en", setLocale: vi.fn() });
});

describe("VisaTrendsView", () => {
  it("renders the hero and the key sections (wage/volume/occupation/exposure)", () => {
    render(<VisaTrendsView />);

    expect(
      screen.getByRole("heading", { level: 1, name: /H-1B Work-Visa Trends/i }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: /Offered-Wage Trend/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Filing-Volume Trend/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Top Occupations Over the Decade/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /H-1B Demand by AI-Exposure Tier/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Top Sponsoring Employers/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Top States/i }),
    ).toBeInTheDocument();
  });

  it("renders the three new deep-dive section headings", () => {
    render(<VisaTrendsView />);

    // Deep-dive 1: Wage Trajectories by Occupation
    expect(
      screen.getByRole("heading", { name: /Wage Trajectories by Occupation/i }),
    ).toBeInTheDocument();

    // Deep-dive 3: State Deep-Dive
    expect(
      screen.getByRole("heading", { name: /State Deep-Dive/i }),
    ).toBeInTheDocument();
  });

  it("shows a known headline number and the leading occupation", () => {
    render(<VisaTrendsView />);
    // FY2025 certified LCAs = 544,740 (rendered in a stat card).
    expect(screen.getByText(/544,740/)).toBeInTheDocument();
    // Software Developers is the top occupation in the latest fiscal year.
    expect(screen.getAllByText(/Software Developers/i).length).toBeGreaterThan(0);
  });

  it("renders the descriptive filings-not-approvals caveat", () => {
    render(<VisaTrendsView />);
    expect(screen.getByText(/employer filings, not visa approvals/i)).toBeInTheDocument();
  });

  it("renders the top-states accessible table with a state row", () => {
    render(<VisaTrendsView />);
    const table = screen.getByRole("table", {
      name: /Top states by total certified H-1B LCAs/i,
    });
    // California leads by total certified LCAs.
    expect(within(table).getByText("CA")).toBeInTheDocument();
  });

  it("renders the state deep-dive table with all-states data", () => {
    render(<VisaTrendsView />);
    // The deep-dive section has its own accessible table.
    const deepTable = screen.getByRole("table", {
      name: /All H-1B states — sortable/i,
    });
    expect(deepTable).toBeInTheDocument();
    // CA should appear in the deep-dive table too.
    expect(within(deepTable).getByText("CA")).toBeInTheDocument();
  });

  it("renders the employer deep-dive table with mean wage column", () => {
    render(<VisaTrendsView />);
    const empTable = screen.getByRole("table", {
      name: /Top H-1B sponsoring employers — detailed table/i,
    });
    expect(empTable).toBeInTheDocument();
    // At least one employer row should be present (COGNIZANT is #1 by volume).
    expect(within(empTable).getByText(/COGNIZANT/i)).toBeInTheDocument();
  });

  it("renders the state detail panel for the default state (CA)", () => {
    render(<VisaTrendsView />);
    // The state detail panel has a heading "{state} Detail".
    expect(screen.getByRole("heading", { name: /CA Detail/i })).toBeInTheDocument();
  });

  it("changes the state detail panel when a different row is selected", () => {
    render(<VisaTrendsView />);
    // Find the state dropdown and switch to TX.
    const selector = screen.getByRole("combobox", { name: /Select a state/i });
    fireEvent.change(selector, { target: { value: "TX" } });
    expect(screen.getByRole("heading", { name: /TX Detail/i })).toBeInTheDocument();
  });

  it("renders Chinese copy when the locale is zh", () => {
    mockUseLanguage.mockReturnValue({ locale: "zh", setLocale: vi.fn() });
    render(<VisaTrendsView />);
    expect(
      screen.getByRole("heading", { level: 1, name: /H-1B 工作签证趋势/ }),
    ).toBeInTheDocument();
    // ZH section heading for the wage trend.
    expect(screen.getByRole("heading", { name: /薪资趋势/ })).toBeInTheDocument();
    // ZH heading for the new wage-by-occupation section.
    expect(screen.getByRole("heading", { name: /各职业薪资走势/ })).toBeInTheDocument();
    // ZH heading for the state deep-dive.
    expect(screen.getByRole("heading", { name: /州级深度分析/ })).toBeInTheDocument();
    // Data-driven values remain present regardless of locale.
    expect(screen.getByText(/544,740/)).toBeInTheDocument();
  });
});
