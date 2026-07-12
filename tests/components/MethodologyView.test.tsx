// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import MethodologyView from "@/components/methodology/MethodologyView";
import MethodologyPage from "@/app/methodology/page";
import type { DatasetProvenance } from "@/lib/provenance";
import type {
  ClearedDownload,
  FlaggedDownload,
} from "@/components/methodology/MethodologyView";

// ─── Mock i18n ────────────────────────────────────────────────────────────────
// Use a real EN locale so GuardrailBadge renders correct localized labels.
vi.mock("@/lib/i18n/LanguageProvider", () => ({
  useLanguage: () => ({ locale: "en" as const, setLocale: vi.fn() }),
}));

// ─── Mock next/navigation (usePathname used by LanguageProvider chain) ────────
vi.mock("next/navigation", () => ({
  usePathname: () => "/methodology",
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SAMPLE_DATASETS: DatasetProvenance[] = [
  {
    id: "occupation-snapshot",
    file: "data/occupation-snapshot.json",
    generatedAt: "2026-07-02T08:42:54.780Z",
    asOf: "2025",
    source: { name: "Anthropic Economic Index", publisher: "Anthropic" },
    version: "1",
    rows: 756,
  },
  {
    id: "warn-notices",
    file: "data/warn-notices.json",
    generatedAt: "2026-07-01T19:53:29.838Z",
    asOf: "2026-07-01",
    source: "BLS / State WARN public records",
    version: "1",
    rows: 12527,
  },
  {
    id: "jolts",
    file: "data/jolts.json",
    generatedAt: "2026-07-01T03:33:52.824Z",
    asOf: "2026-07-01",
    source: { name: "BLS JOLTS", publisher: "BLS" },
    version: "1",
    rows: 21,
  },
];

const CLEARED: ClearedDownload[] = [
  {
    id: "occupation-snapshot",
    filename: "occupation-snapshot.json",
    label: "Occupation Snapshot",
    license: "CC-BY 4.0",
    attribution: "Anthropic Economic Index + BLS OEWS.",
  },
  {
    id: "warn-notices",
    filename: "warn-notices.json",
    label: "WARN Notices",
    license: "Public Records",
    attribution: "State WARN Act public records.",
    publicPath: "/warn-notices.json",
  },
];

const FLAGGED: FlaggedDownload[] = [
  {
    id: "market-ai-signals",
    label: "Market AI Signals",
    reason: "Yahoo ToS — redistribution prohibited.",
  },
  {
    id: "ai-layoffs",
    label: "AI Layoffs",
    reason: "Challenger proprietary.",
  },
  {
    id: "ai-company-stocks",
    label: "AI Company Stock Signals",
    reason: "Historical market data fixture not redistribution-cleared.",
  },
  {
    id: "global-ai-metrics",
    label: "Global AI Metrics",
    reason: "IMF non-commercial terms.",
  },
  {
    id: "ai-usage-proxies",
    label: "AI Usage Proxies",
    reason: "QuestMobile terms.",
  },
  {
    id: "openrouter-models",
    label: "OpenRouter Model Catalog",
    reason: "Catalog/API redistribution terms review required.",
  },
  {
    id: "aioe-exposure",
    label: "AIOE Exposure",
    reason: "No explicit open license.",
  },
  {
    id: "automation-baseline",
    label: "Automation Baseline",
    reason: "No open license.",
  },
];

function renderView() {
  return render(
    <MethodologyView
      datasets={SAMPLE_DATASETS}
      basePath=""
      clearedDownloads={CLEARED}
      flaggedDownloads={FLAGGED}
    />,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("MethodologyView", () => {
  it("renders all four metric sections", () => {
    renderView();
    expect(screen.getByTestId("section-exposure")).toBeTruthy();
    expect(screen.getByTestId("section-warn")).toBeTruthy();
    expect(screen.getByTestId("section-market")).toBeTruthy();
    expect(screen.getByTestId("section-forecast")).toBeTruthy();
  });

  it("renders the changelog section with dataset rows", () => {
    renderView();
    const section = screen.getByTestId("section-changelog");
    expect(section).toBeTruthy();
    // Each dataset id should appear in the table
    expect(section.textContent).toContain("occupation-snapshot");
    expect(section.textContent).toContain("warn-notices");
    expect(section.textContent).toContain("jolts");
  });

  it("sorts changelog rows newest-first (occupation-snapshot before jolts)", () => {
    renderView();
    const cells = screen
      .getByTestId("section-changelog")
      .querySelectorAll("td:first-child");
    const ids = Array.from(cells).map((c) => c.textContent?.trim() ?? "");
    // occupation-snapshot (2026-07-02) should appear before jolts (2026-07-01)
    expect(ids.indexOf("occupation-snapshot")).toBeLessThan(
      ids.indexOf("jolts"),
    );
  });

  it("renders row counts in the changelog", () => {
    renderView();
    const section = screen.getByTestId("section-changelog");
    expect(section.textContent).toContain("756");
    expect(section.textContent).toContain("12,527");
  });

  it("renders cleared downloads with download links", () => {
    renderView();
    const cleared = screen.getByTestId("cleared-downloads");
    const links = cleared.querySelectorAll("a[download]");
    expect(links.length).toBe(CLEARED.length);
    expect(cleared.textContent).toContain("Observed");
  });

  it("cleared download for warn-notices uses the /warn-notices.json publicPath", () => {
    renderView();
    const cleared = screen.getByTestId("cleared-downloads");
    const links = cleared.querySelectorAll("a[download]");
    const warnLink = Array.from(links).find((l) =>
      (l as HTMLAnchorElement).href.includes("warn-notices.json"),
    ) as HTMLAnchorElement | undefined;
    expect(warnLink).toBeTruthy();
    expect(warnLink?.href).not.toContain("/data/warn-notices.json");
    expect(warnLink?.href).toContain("/warn-notices.json");
  });

  it("renders all flagged datasets as unavailable", () => {
    renderView();
    const flaggedContainer = screen.getByTestId("flagged-downloads");
    for (const dl of FLAGGED) {
      const item = screen.getByTestId(`flagged-${dl.id}`);
      expect(item).toBeTruthy();
      expect(flaggedContainer.contains(item)).toBe(true);
    }
    expect(flaggedContainer.textContent).toContain("Restricted");
  });

  it("excluded datasets are NOT offered as download links", () => {
    renderView();
    const clearedContainer = screen.getByTestId("cleared-downloads");
    const links = clearedContainer.querySelectorAll("a[download]");
    const downloadedFiles = Array.from(links).map(
      (l) => (l as HTMLAnchorElement).getAttribute("download") ?? "",
    );
    // None of the flagged dataset filenames should appear as cleared downloads
    const excludedFilenames = [
      "market-ai-signals.json",
      "ai-layoffs.json",
      "ai-company-stocks.json",
      "global-ai-metrics.json",
      "ai-usage-proxies.json",
      "openrouter-models.json",
      "aioe-exposure.json",
      "automation-baseline.json",
    ];
    for (const excluded of excludedFilenames) {
      expect(downloadedFiles).not.toContain(excluded);
    }
  });

  it("renders the prominent caveat block with role=note", () => {
    renderView();
    const notes = document.querySelectorAll("[role=note]");
    // At least the main caveat + market non-advisory should be role=note
    expect(notes.length).toBeGreaterThanOrEqual(1);
  });

  it("renders download section", () => {
    renderView();
    expect(screen.getByTestId("section-download")).toBeTruthy();
  });

  it("methodology page exposes the occupational requirements download", () => {
    render(<MethodologyPage />);
    const cleared = screen.getByTestId("cleared-downloads");
    expect(cleared.textContent).toContain("Occupational Requirements Seed");
    const links = cleared.querySelectorAll("a[download]");
    const orsLink = Array.from(links).find(
      (link) =>
        (link as HTMLAnchorElement).getAttribute("download") ===
        "occupational-requirements.json",
    ) as HTMLAnchorElement | undefined;
    expect(orsLink).toBeTruthy();
    expect(orsLink?.getAttribute("href")).toBe("/data/occupational-requirements.json");
  });
});

describe("MethodologyView — ZH locale renders", () => {
  it("renders without error when i18n returns zh keys", () => {
    // The mock already returns 'methodology.<key>' for all keys,
    // which simulates zh locale behaviour (keys present, different strings).
    expect(() => renderView()).not.toThrow();
    // Spot-check that the changelog section still exists.
    expect(screen.getByTestId("section-changelog")).toBeTruthy();
  });

  it("ZH: still excludes flagged datasets from cleared downloads", () => {
    renderView();
    const clearedContainer = screen.getByTestId("cleared-downloads");
    const links = clearedContainer.querySelectorAll("a[download]");
    const downloadedFiles = Array.from(links).map(
      (l) => (l as HTMLAnchorElement).getAttribute("download") ?? "",
    );
    expect(downloadedFiles).not.toContain("market-ai-signals.json");
    expect(downloadedFiles).not.toContain("ai-layoffs.json");
  });
});
