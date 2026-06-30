// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DataExport from "@/components/sources/DataExport";

// jsdom lacks URL.createObjectURL; stub it before any download click.
beforeEach(() => {
  Object.defineProperty(globalThis.URL, "createObjectURL", {
    value: vi.fn(() => "blob:x"),
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis.URL, "revokeObjectURL", {
    value: vi.fn(),
    writable: true,
    configurable: true,
  });
});

describe("DataExport", () => {
  it("renders download buttons for all 3 datasets (CSV + JSON each = 6 buttons)", () => {
    render(<DataExport />);
    // 3 datasets × 2 formats (CSV, JSON) = 6 buttons
    expect(screen.getAllByRole("button").length).toBeGreaterThanOrEqual(6);
  });

  it("calls URL.createObjectURL when a download button is clicked", () => {
    render(<DataExport />);
    const buttons = screen.getAllByRole("button");
    // Click the first CSV download button (occupations dataset)
    fireEvent.click(buttons[0]);
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it("does not throw when clicking a JSON download button", () => {
    render(<DataExport />);
    const buttons = screen.getAllByRole("button");
    // buttons[1] is the JSON button for the first dataset
    expect(() => fireEvent.click(buttons[1])).not.toThrow();
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it("renders the panel heading", () => {
    render(<DataExport />);
    const heading = document.getElementById("data-export-heading");
    expect(heading).not.toBeNull();
    expect((heading?.textContent ?? "").length).toBeGreaterThan(0);
  });
});
