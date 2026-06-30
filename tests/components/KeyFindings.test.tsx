// @vitest-environment jsdom

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import KeyFindings from "@/components/dashboard/KeyFindings";

// KeyFindings uses <Link> (next/link) but not useRouter directly;
// next/link renders as a plain <a> in jsdom without router mocking.

describe("KeyFindings", () => {
  it("renders the band heading", () => {
    const { container } = render(<KeyFindings />);
    const heading = container.querySelector("#key-findings-heading");
    expect(heading).not.toBeNull();
    expect((heading?.textContent ?? "").length).toBeGreaterThan(0);
  });

  it("renders at least 3 stat card links", () => {
    const { container } = render(<KeyFindings />);
    // 4 cards are built (high-exposure-share, total-workforce, top-riser,
    // occupations-count); each wraps in a <Link> which renders as <a>.
    expect(container.querySelectorAll("a").length).toBeGreaterThanOrEqual(3);
  });

  it("renders the band subheading paragraph", () => {
    const { container } = render(<KeyFindings />);
    // The subhead <p> always follows the heading <h2> in the section header div
    const section = container.querySelector("section");
    expect(section).not.toBeNull();
    const paras = section!.querySelectorAll("p");
    expect(paras.length).toBeGreaterThan(0);
  });
});
