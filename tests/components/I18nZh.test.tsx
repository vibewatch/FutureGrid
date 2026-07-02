// @vitest-environment jsdom
//
// i18n ZH rendering tests (issue #54)
//
// Verifies that:
// 1. HeatmapChart renders its aria-label and sr-only summary in ZH when locale="zh"
// 2. CountryExposureChart renders its button aria-labels in ZH when locale="zh"
// 3. app/error.tsx renders localized ZH strings when locale="zh"
// 4. Locale-aware number and date formatting uses zh-CN conventions

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { formatNumber, formatCurrency } from "@/lib/utils";
import { useFormatters } from "@/lib/i18n/useFormatters";

// ── 1. Mock useLanguage so all useT / useFormatters calls see locale="zh" ───

const mockUseLanguage = vi.fn(() => ({
  locale: "en" as "en" | "zh",
  setLocale: vi.fn(),
}));

vi.mock("@/lib/i18n/LanguageProvider", () => ({
  useLanguage: () => mockUseLanguage(),
}));

// ── 2. Component imports (after vi.mock) ─────────────────────────────────────

import HeatmapChart from "@/components/charts/HeatmapChart";
import CountryExposureChart from "@/components/charts/CountryExposureChart";
import ErrorPage from "@/app/error";
import NotFoundUI from "@/components/ui/NotFoundUI";

// ── Helpers ───────────────────────────────────────────────────────────────────

function setLocale(locale: "en" | "zh") {
  mockUseLanguage.mockReturnValue({ locale, setLocale: vi.fn() });
}

beforeEach(() => {
  setLocale("en");
});

// ── HeatmapChart ZH tests ─────────────────────────────────────────────────────

describe("HeatmapChart – ZH locale", () => {
  it("renders ZH aria-label on the SVG when locale=zh", () => {
    setLocale("zh");
    const { container } = render(<HeatmapChart />);
    const svg = container.querySelector('svg[role="img"]');
    expect(svg).not.toBeNull();
    const label = svg?.getAttribute("aria-label") ?? "";
    expect(label).toMatch(/热力图/);
  });

  it("renders ZH sr-only summary when locale=zh", () => {
    setLocale("zh");
    const { container } = render(<HeatmapChart />);
    const srSpan = container.querySelector("span.sr-only");
    expect(srSpan).not.toBeNull();
    expect(srSpan?.textContent).toMatch(/热力图/);
  });

  it("renders ZH table caption when locale=zh", () => {
    setLocale("zh");
    const { container } = render(<HeatmapChart />);
    const caption = container.querySelector("caption");
    expect(caption?.textContent).toMatch(/国家/);
  });

  it("renders EN aria-label by default (locale=en)", () => {
    setLocale("en");
    const { container } = render(<HeatmapChart />);
    const svg = container.querySelector('svg[role="img"]');
    const label = svg?.getAttribute("aria-label") ?? "";
    expect(label).toMatch(/Heatmap/i);
  });
});

// ── CountryExposureChart ZH tests ─────────────────────────────────────────────

describe("CountryExposureChart – ZH locale", () => {
  it("renders ZH aria-label on ranked bar chart button when locale=zh", () => {
    setLocale("zh");
    const { container } = render(<CountryExposureChart />);
    const btn = container.querySelector('[aria-label="排名柱状图"]');
    expect(btn).not.toBeNull();
  });

  it("renders ZH aria-label on scatter button when locale=zh", () => {
    setLocale("zh");
    const { container } = render(<CountryExposureChart />);
    const btn = container.querySelector('[aria-label="GDP 与 AI 使用量散点图"]');
    expect(btn).not.toBeNull();
  });

  it("renders EN aria-label on bar chart button by default", () => {
    setLocale("en");
    const { container } = render(<CountryExposureChart />);
    const btn = container.querySelector('[aria-label="Ranked bar chart"]');
    expect(btn).not.toBeNull();
  });
});

// ── Error page ZH tests ───────────────────────────────────────────────────────

describe("app/error.tsx – ZH locale", () => {
  const fakeError = Object.assign(new Error("test"), { digest: "abc123" });

  it("renders ZH error title when locale=zh", () => {
    setLocale("zh");
    render(<ErrorPage error={fakeError} />);
    expect(screen.getByText("出了些问题")).toBeInTheDocument();
  });

  it("renders ZH error body when locale=zh", () => {
    setLocale("zh");
    render(<ErrorPage error={fakeError} />);
    expect(screen.getByText(/此页面发生了意外错误/)).toBeInTheDocument();
  });

  it("renders ZH error ID label when locale=zh", () => {
    setLocale("zh");
    render(<ErrorPage error={fakeError} />);
    expect(screen.getByText(/错误 ID/)).toBeInTheDocument();
  });

  it("renders ZH dashboard link label when locale=zh", () => {
    setLocale("zh");
    render(<ErrorPage error={fakeError} />);
    expect(screen.getByText("← 控制台")).toBeInTheDocument();
  });

  it("renders EN error title by default", () => {
    setLocale("en");
    render(<ErrorPage error={fakeError} />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });
});

// ── NotFoundUI ZH tests ───────────────────────────────────────────────────────

describe("NotFoundUI – ZH locale", () => {
  it("renders ZH not-found headline when locale=zh", () => {
    setLocale("zh");
    render(<NotFoundUI />);
    expect(screen.getByText("此页面已偏离网格")).toBeInTheDocument();
  });

  it("renders ZH nav label for dashboard when locale=zh", () => {
    setLocale("zh");
    render(<NotFoundUI />);
    expect(screen.getByText(/← 控制台/)).toBeInTheDocument();
  });

  it("renders EN headline by default", () => {
    setLocale("en");
    render(<NotFoundUI />);
    expect(
      screen.getByText("This page drifted off the grid"),
    ).toBeInTheDocument();
  });
});

// ── Locale-aware number / date formatting tests ───────────────────────────────

describe("formatNumber – locale param", () => {
  it("formats with en-US by default", () => {
    expect(formatNumber(1000)).toBe("1,000");
  });

  it("accepts zh-CN locale without throwing", () => {
    const result = formatNumber(1000, 0, "zh-CN");
    expect(typeof result).toBe("string");
    expect(result).toContain("1");
    expect(result).toContain("000");
  });

  it("formats with decimals using zh-CN", () => {
    const result = formatNumber(1234.567, 2, "zh-CN");
    expect(result).toContain("1");
    expect(result).toContain("234");
  });
});

describe("formatCurrency – locale param", () => {
  it("formats in en-US by default", () => {
    expect(formatCurrency(75000)).toBe("$75,000");
  });

  it("accepts zh-CN locale without throwing", () => {
    const result = formatCurrency(75000, "zh-CN");
    expect(typeof result).toBe("string");
    expect(result).toContain("75");
  });
});

// ── useFormatters hook tests ─────────────────────────────────────────────────

type Formatters = ReturnType<typeof useFormatters>;

function UseFormattersHarness({
  onCapture,
}: {
  onCapture: (f: Formatters) => void;
}) {
  const formatters = useFormatters();
  onCapture(formatters);
  return null;
}

describe("useFormatters – locale binding", () => {
  it("formatNumber returns a string bound to zh-CN when locale=zh", () => {
    setLocale("zh");
    let captured: Formatters | null = null;
    render(
      <UseFormattersHarness onCapture={(f) => { captured = f; }} />,
    );
    expect(captured).not.toBeNull();
    const result = captured!.formatNumber(1000);
    expect(typeof result).toBe("string");
    expect(result).toContain("1");
    expect(result).toContain("000");
  });

  it("formatDate returns a localized string for zh-CN locale", () => {
    setLocale("zh");
    let captured: Formatters | null = null;
    render(
      <UseFormattersHarness onCapture={(f) => { captured = f; }} />,
    );
    const result = captured!.formatDate(new Date("2025-01-15"));
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("formatNumber returns en-US format when locale=en", () => {
    setLocale("en");
    let captured: Formatters | null = null;
    render(
      <UseFormattersHarness onCapture={(f) => { captured = f; }} />,
    );
    expect(captured!.formatNumber(1000)).toBe("1,000");
  });
});
