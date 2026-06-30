// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import CountryDetailPanel from "@/components/dashboard/CountryDetailPanel";
import type { EnrichedCountry } from "@/components/dashboard/CountryDetailPanel";

// ── Test fixtures ──────────────────────────────────────────────────────────────

const usaCountry: EnrichedCountry = {
  iso3: "USA",
  name: "United States",
  usageIndex: 3.624,
  usagePct: 0.2158,
  usageCount: 208200,
  hasClaudeData: true,
  proxyNote: null,
  diffusionPct: 32.5,
  diffusionTrend: { h1_2025: 28.0, h2_2025: 30.0, q1_2026: 32.5 },
  diffusionDelta: 4.5,
  aiReadiness: 0.78,
  readinessSubIndices: {
    digitalInfrastructure: 0.19,
    humanCapital: 0.18,
    innovation: 0.18,
    regulationEthics: 0.22,
  },
  gdpPerWorkingAgeCapita: 132531,
};

const chnCountry: EnrichedCountry = {
  iso3: "CHN",
  name: "China",
  usageIndex: null,
  usagePct: null,
  usageCount: null,
  hasClaudeData: false,
  proxyNote: "Claude.ai unavailable; proxy data only.",
  diffusionPct: 16.4,
  diffusionTrend: { h1_2025: 10.0, h2_2025: 13.0, q1_2026: 16.4 },
  diffusionDelta: 6.4,
  aiReadiness: 0.60,
  readinessSubIndices: {
    digitalInfrastructure: 0.19,
    humanCapital: 0.15,
    innovation: 0.15,
    regulationEthics: 0.15,
  },
  gdpPerWorkingAgeCapita: 19189,
};

const defaultProps = {
  countries: [usaCountry, chnCountry],
  top12: [usaCountry],
  maxIndex: 3.624,
  cnnicUsers: "515M",
  questMau: "680M",
  doubaoMau: "100M",
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("CountryDetailPanel", () => {
  it("renders the section heading and ranking list", () => {
    render(<CountryDetailPanel {...defaultProps} />);
    expect(screen.getByText("Top Countries by AI Adoption")).toBeInTheDocument();
    expect(screen.getByRole("listitem")).toBeInTheDocument();
    // "United States" appears in both the selector option and the ranking card
    expect(screen.getAllByText("United States").length).toBeGreaterThanOrEqual(1);
  });

  it("opens modal via fg:openCountry CustomEvent for a known country", async () => {
    render(<CountryDetailPanel {...defaultProps} />);

    act(() => {
      window.dispatchEvent(new CustomEvent("fg:openCountry", { detail: "USA" }));
    });

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    // Country name appears in dialog header
    expect(screen.getByRole("heading", { name: "United States" })).toBeInTheDocument();
  });

  it("ignores fg:openCountry for an iso3 not in the countries list", () => {
    render(<CountryDetailPanel {...defaultProps} />);

    act(() => {
      window.dispatchEvent(new CustomEvent("fg:openCountry", { detail: "DEU" }));
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("modal shows Claude.ai usage metrics for a country with data", async () => {
    render(<CountryDetailPanel {...defaultProps} />);

    act(() => {
      window.dispatchEvent(new CustomEvent("fg:openCountry", { detail: "USA" }));
    });

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    // Scope assertions to the dialog to avoid matching the ranking card
    const { within } = await import("@testing-library/react");
    const dialog = screen.getByRole("dialog");

    // usageIndex rendered as toFixed(3) inside the modal
    expect(within(dialog).getByText("3.624")).toBeInTheDocument();
    // global share: "21.58% global share"
    expect(within(dialog).getByText(/21\.58%\s*global share/)).toBeInTheDocument();
  });

  it("modal shows four IMF AIPI sub-index progressbars for a country with readinessSubIndices", async () => {
    render(<CountryDetailPanel {...defaultProps} />);

    act(() => {
      window.dispatchEvent(new CustomEvent("fg:openCountry", { detail: "USA" }));
    });

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    expect(
      screen.getByRole("progressbar", { name: /Digital Infrastructure/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: /Human Capital/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: /Innovation/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: /Regulation/i }),
    ).toBeInTheDocument();
  });

  it("modal closes on Escape keypress", async () => {
    const user = userEvent.setup();
    render(<CountryDetailPanel {...defaultProps} />);

    act(() => {
      window.dispatchEvent(new CustomEvent("fg:openCountry", { detail: "USA" }));
    });

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("modal closes when the close button is clicked", async () => {
    const user = userEvent.setup();
    render(<CountryDetailPanel {...defaultProps} />);

    act(() => {
      window.dispatchEvent(new CustomEvent("fg:openCountry", { detail: "USA" }));
    });

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /Close country detail/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("opens modal when a ranking-row button is clicked", async () => {
    const user = userEvent.setup();
    render(<CountryDetailPanel {...defaultProps} />);

    await user.click(screen.getByRole("listitem"));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  it("shows China native ecosystem context block for CHN", async () => {
    render(<CountryDetailPanel {...defaultProps} />);

    act(() => {
      window.dispatchEvent(new CustomEvent("fg:openCountry", { detail: "CHN" }));
    });

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    // cnnicUsers, questMau, doubaoMau are rendered inside the China context block
    expect(screen.getByText("515M")).toBeInTheDocument();
    expect(screen.getByText("680M")).toBeInTheDocument();
    expect(screen.getByText("100M")).toBeInTheDocument();
  });
});
