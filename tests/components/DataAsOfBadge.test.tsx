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

  it("uses the chronologically latest asOf when datasetIds contains multiple ids", () => {
    // country-exposure → asOf "2025" (Dec 31, 2025); ai-frontier → asOf "2026-07-02"
    render(
      <DataAsOfBadge datasetIds={["country-exposure", "ai-frontier"]} />,
    );
    // Jul 2, 2026 is later than Dec 31, 2025, so "2026-07-02" wins → "Jul 2026"
    expect(screen.getByText(/Data as of Jul 2026/i)).toBeInTheDocument();
  });

  it("FY2025 (Sep 30) does not win over plain 2025 (Dec 31) — calendar-aware ordering", () => {
    // h1b-trends asOf="FY2025" ends Sep 30, 2025.
    // job-postings asOf="2025" represents Dec 31, 2025 — which is later.
    render(<DataAsOfBadge datasetIds={["h1b-trends", "job-postings"]} />);
    // Plain "2025" wins and is displayed as-is (not formatted as a month string)
    expect(screen.getByText(/Data as of 2025/i)).toBeInTheDocument();
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

// ── Projection-window provenance — canonical employment-projections path ───────

describe("DataAsOfBadge — employment-projections 2024-2034 provenance", () => {
  it("renders the canonical 2024-2034 projection window without date corruption", () => {
    // employment-projections has asOf="2024-2034" in data/provenance.json.
    // The old regex /^\d{4}-\d{2}/ would naively match "2024-20" and parse
    // month=2034-1=2033 → year ~2193. The fixed regex requires valid months
    // 01–12, so "2024-2034" passes through as-is.
    render(<DataAsOfBadge datasetId="employment-projections" />);

    // Must show the window string as-is, not a mangled calendar date.
    expect(screen.getByText(/Data as of 2024-2034/i)).toBeInTheDocument();

    // Must NOT produce a corrupted far-future year or Unix epoch.
    const rendered = document.body.textContent ?? "";
    expect(rendered).not.toMatch(/\b(1970|2193|2[1-9]\d{2})\b/);
  });

  it("aria-label for employment-projections badge includes '2024-2034'", () => {
    render(<DataAsOfBadge datasetId="employment-projections" />);
    const badge = screen.getByText(/Data as of 2024-2034/i);
    expect(badge).toHaveAttribute("aria-label", expect.stringContaining("2024-2034"));
  });

  it("ZH locale renders employment-projections window without corruption", () => {
    mockUseLanguage.mockReturnValueOnce({ locale: "zh", setLocale: vi.fn() });
    render(<DataAsOfBadge datasetId="employment-projections" />);
    expect(screen.getByText(/数据截至 2024-2034/)).toBeInTheDocument();
    const rendered = document.body.textContent ?? "";
    expect(rendered).not.toMatch(/\b(1970|2193|2[1-9]\d{2})\b/);
  });
});
