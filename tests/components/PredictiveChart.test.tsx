// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "dark" }),
}));

import PredictiveChart from "@/components/charts/PredictiveChart";

function metricValue(label: string): string {
  const labelNode = screen.getByText(label);
  const card = labelNode.parentElement;
  const valueNode = card?.querySelector(".text-2xl");
  expect(valueNode).not.toBeNull();
  return valueNode?.textContent ?? "";
}

describe("PredictiveChart", () => {
  it("renders the data-backed top-openings chart with accessible labels", async () => {
    const { container } = render(<PredictiveChart />);

    await waitFor(() => {
      expect(container.querySelectorAll("rect.pc-bar")).toHaveLength(15);
    });

    expect(
      screen.getByLabelText("Horizontal bar chart: top occupations by projected annual openings")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Horizontal bar chart showing occupations with the highest projected annual openings/i)
    ).toBeInTheDocument();
    expect(screen.getByText("Top Occupations by Projected Annual Openings")).toBeInTheDocument();
    expect(screen.getByText("661,300")).toBeInTheDocument();
    expect(metricValue("Occupations Shown")).toBe("15");
    expect(metricValue("Avg AI Exposure")).toBe("17.1%");
    expect(metricValue("Bright Outlook")).toBe("15");
  });

  it("filters the rendered bars and summary cards by sector", async () => {
    const { container } = render(<PredictiveChart selectedSector="Management" />);

    await waitFor(() => {
      expect(container.querySelectorAll("rect.pc-bar")).toHaveLength(15);
    });

    expect(screen.getByText("Top Occupations by Projected Annual Openings: Management")).toBeInTheDocument();
    expect(screen.getByText("230,000")).toBeInTheDocument();
    expect(metricValue("Occupations Shown")).toBe("15");
    expect(metricValue("Avg AI Exposure")).toBe("12.0%");
    expect(metricValue("Bright Outlook")).toBe("10");
  });

  it("shows the empty-state message for sectors without projection rows", async () => {
    const { container } = render(<PredictiveChart selectedSector="Computer & Mathematical" />);

    await waitFor(() => {
      expect(screen.getByText("No projection data available for this sector")).toBeInTheDocument();
    });

    expect(container.querySelectorAll("rect.pc-bar")).toHaveLength(0);
    expect(metricValue("Occupations Shown")).toBe("0");
    expect(metricValue("Avg AI Exposure")).toBe("0.0%");
    expect(metricValue("Bright Outlook")).toBe("0");
  });
});
