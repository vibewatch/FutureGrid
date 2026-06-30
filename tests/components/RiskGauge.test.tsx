// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RiskGauge from "@/components/ui/RiskGauge";

describe("RiskGauge", () => {
  it("renders value text in the SVG", () => {
    render(<RiskGauge value={42} />);
    expect(screen.getByText("42%")).toBeInTheDocument();
  });

  it("value=5 → Low band in aria-label", () => {
    render(<RiskGauge value={5} />);
    const svg = screen.getByRole("img");
    expect(svg).toHaveAttribute("aria-label", expect.stringContaining("Low exposure"));
  });

  it("value=35 → Medium band in aria-label", () => {
    render(<RiskGauge value={35} />);
    const svg = screen.getByRole("img");
    expect(svg).toHaveAttribute("aria-label", expect.stringContaining("Medium exposure"));
  });

  it("value=55 → High band in aria-label", () => {
    render(<RiskGauge value={55} />);
    const svg = screen.getByRole("img");
    expect(svg).toHaveAttribute("aria-label", expect.stringContaining("High exposure"));
  });

  it("value=75 → Very High band in aria-label", () => {
    render(<RiskGauge value={75} />);
    const svg = screen.getByRole("img");
    expect(svg).toHaveAttribute("aria-label", expect.stringContaining("Very High exposure"));
  });

  it("includes value percentage in aria-label", () => {
    render(<RiskGauge value={75} />);
    const svg = screen.getByRole("img");
    expect(svg).toHaveAttribute("aria-label", expect.stringContaining("75%"));
  });

  it("renders optional label text", () => {
    render(<RiskGauge value={30} label="Nurse" />);
    expect(screen.getByText("Nurse")).toBeInTheDocument();
  });

  it("renders optional sublabel text", () => {
    render(<RiskGauge value={30} label="Nurse" sublabel="Healthcare" />);
    expect(screen.getByText("Healthcare")).toBeInTheDocument();
  });

  it("aria-label includes label and sublabel", () => {
    render(<RiskGauge value={50} label="Accountant" sublabel="Finance" />);
    const svg = screen.getByRole("img");
    const label = svg.getAttribute("aria-label") ?? "";
    expect(label).toContain("Accountant");
    expect(label).toContain("Finance");
  });

  it("renders value=0 without errors", () => {
    render(<RiskGauge value={0} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("renders value=100 without errors", () => {
    render(<RiskGauge value={100} />);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });
});
