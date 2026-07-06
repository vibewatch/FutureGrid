// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import GuardrailBadge, {
  GUARDRAIL_BADGES,
  inferGuardrailBadgeKind,
  type GuardrailBadgeKind,
} from "@/components/ui/GuardrailBadge";

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
});
