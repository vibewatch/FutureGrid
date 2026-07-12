// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import GuardrailBadge, {
  GUARDRAIL_BADGES,
  inferGuardrailBadgeKind,
  type GuardrailBadgeKind,
} from "@/components/ui/GuardrailBadge";
import { commonEn } from "@/lib/i18n/messages/en/common";
import { commonZh } from "@/lib/i18n/messages/zh/common";

const mockUseLanguage = vi.fn(() => ({ locale: "en" as "en" | "zh", setLocale: vi.fn() }));
vi.mock("@/lib/i18n/LanguageProvider", () => ({
  useLanguage: () => mockUseLanguage(),
}));

describe("GuardrailBadge", () => {
  it("defines the shared observed/proxy/restricted/descriptive vocabulary", () => {
    expect(Object.keys(GUARDRAIL_BADGES).sort()).toEqual([
      "descriptive",
      "observed",
      "proxy",
      "restricted",
    ]);

    for (const kind of Object.keys(GUARDRAIL_BADGES) as GuardrailBadgeKind[]) {
      render(<GuardrailBadge kind={kind} />);
      // EN locale: rendered label should match the i18n EN key (same as GUARDRAIL_BADGES fallback)
      expect(screen.getByText(GUARDRAIL_BADGES[kind].label)).toHaveAttribute(
        "aria-label",
        expect.stringContaining(GUARDRAIL_BADGES[kind].description),
      );
    }
  });

  it("classifies common source and caveat wording", () => {
    expect(inferGuardrailBadgeKind("State WARN public records observed filings")).toBe("observed");
    expect(inferGuardrailBadgeKind("OpenRouter public model catalog proxy")).toBe("proxy");
    expect(inferGuardrailBadgeKind("Yahoo ToS redistribution prohibited")).toBe("restricted");
    expect(inferGuardrailBadgeKind("Descriptive benchmark comparison only")).toBe("descriptive");
  });

  it("renders localized EN labels from i18n common namespace", () => {
    render(<GuardrailBadge kind="proxy" />);
    expect(screen.getByText(commonEn.guardrailLabel_proxy)).toBeInTheDocument();
  });

  it("renders localized ZH labels from i18n common namespace", () => {
    mockUseLanguage.mockReturnValueOnce({ locale: "zh", setLocale: vi.fn() });
    render(<GuardrailBadge kind="proxy" />);
    expect(screen.getByText(commonZh.guardrailLabel_proxy)).toBeInTheDocument();
  });

  it("EN/ZH label parity: all four kinds have translations in both locales", () => {
    const kinds: GuardrailBadgeKind[] = ["observed", "proxy", "restricted", "descriptive"];
    for (const kind of kinds) {
      const enLabel = commonEn[`guardrailLabel_${kind}` as keyof typeof commonEn];
      const zhLabel = commonZh[`guardrailLabel_${kind}` as keyof typeof commonZh];
      const enDesc = commonEn[`guardrailDesc_${kind}` as keyof typeof commonEn];
      const zhDesc = commonZh[`guardrailDesc_${kind}` as keyof typeof commonZh];

      expect(enLabel, `EN label for ${kind}`).toBeTruthy();
      expect(zhLabel, `ZH label for ${kind}`).toBeTruthy();
      expect(enDesc, `EN desc for ${kind}`).toBeTruthy();
      expect(zhDesc, `ZH desc for ${kind}`).toBeTruthy();
      // Labels must differ between locales
      expect(enLabel, `EN/ZH label should differ for ${kind}`).not.toBe(zhLabel);
    }
  });

  it("accessible aria-label contains both label and description in ZH locale", () => {
    mockUseLanguage.mockReturnValueOnce({ locale: "zh", setLocale: vi.fn() });
    render(<GuardrailBadge kind="descriptive" />);
    const badge = screen.getByText(commonZh.guardrailLabel_descriptive);
    expect(badge).toHaveAttribute(
      "aria-label",
      expect.stringContaining(commonZh.guardrailDesc_descriptive),
    );
  });
});
