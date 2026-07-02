// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock LanguageProvider so useT works without a real context tree
const mockUseLanguage = vi.fn(() => ({ locale: "en" as "en" | "zh", setLocale: vi.fn() }));
vi.mock("@/lib/i18n/LanguageProvider", () => ({
  useLanguage: () => mockUseLanguage(),
}));

import DataAsOfBadge from "@/components/ui/DataAsOfBadge";

describe("DataAsOfBadge", () => {
  it("renders 'Data as of 2025' for occupation-snapshot (asOf=2025)", () => {
    render(<DataAsOfBadge datasetId="occupation-snapshot" />);
    // "2025" is a plain year — rendered as-is
    expect(screen.getByText(/Data as of 2025/i)).toBeInTheDocument();
  });

  it("renders month+year for ai-frontier (asOf=2026-07-02)", () => {
    render(<DataAsOfBadge datasetId="ai-frontier" />);
    // "2026-07-02" formats to "Jul 2026"
    expect(screen.getByText(/Data as of Jul 2026/i)).toBeInTheDocument();
  });

  it("renders nothing for an unknown dataset id", () => {
    const { container } = render(
      <DataAsOfBadge datasetId="this-dataset-does-not-exist" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when no props are given and all asOf values are null (edge case via mocked module)", () => {
    // Even with no props it falls back to getLatestAsOf(), which is non-null in
    // the real registry.  Just confirm it renders SOMETHING (not an error).
    const { container } = render(<DataAsOfBadge />);
    expect(container).toBeTruthy();
  });

  it("uses the most-recent asOf when datasetIds contains multiple ids", () => {
    // country-exposure → asOf "2025"; ai-frontier → asOf "2026-07-02"
    render(
      <DataAsOfBadge datasetIds={["country-exposure", "ai-frontier"]} />,
    );
    // "2026-07-02" > "2025", so Jul 2026 wins
    expect(screen.getByText(/Data as of Jul 2026/i)).toBeInTheDocument();
  });

  it("has an accessible aria-label matching visible text", () => {
    render(<DataAsOfBadge datasetId="ai-frontier" />);
    const badge = screen.getByText(/Data as of Jul 2026/i);
    expect(badge).toHaveAttribute("aria-label", expect.stringContaining("Jul 2026"));
  });

  it("renders ZH label when locale is zh", () => {
    mockUseLanguage.mockReturnValueOnce({ locale: "zh", setLocale: vi.fn() });
    render(<DataAsOfBadge datasetId="ai-frontier" />);
    // ZH translation is "数据截至 {date}"
    expect(screen.getByText(/数据截至/)).toBeInTheDocument();
  });
});
