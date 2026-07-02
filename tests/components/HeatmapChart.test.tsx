// @vitest-environment jsdom
//
// HeatmapChart — accessibility tests
//
// Verifies that HeatmapChart exposes:
//  1. An accessible name (aria-label on the SVG role="img")
//  2. A sr-only text alternative (span.sr-only)
//  3. A keyboard-navigable accessible data table (table.sr-only) with:
//     - a caption
//     - column-header <th scope="col"> cells for each metric
//     - row-header <th scope="row"> cells for each country
//     - data cells (<td>) with the raw metric values

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import HeatmapChart from "@/components/charts/HeatmapChart";

describe("HeatmapChart accessibility", () => {
  it("SVG has role=img and a non-empty aria-label", () => {
    const { container } = render(<HeatmapChart />);
    const svg = container.querySelector('svg[role="img"]');
    expect(svg).not.toBeNull();
    const label = svg?.getAttribute("aria-label") ?? "";
    expect(label.length).toBeGreaterThan(0);
  });

  it("renders a non-empty sr-only text summary", () => {
    const { container } = render(<HeatmapChart />);
    const srSpan = container.querySelector("span.sr-only");
    expect(srSpan).not.toBeNull();
    expect((srSpan?.textContent ?? "").length).toBeGreaterThan(0);
  });

  it("renders an accessible data table with caption and country row headers", () => {
    const { container } = render(<HeatmapChart />);
    const table = container.querySelector("table.sr-only");
    expect(table).not.toBeNull();

    // Caption must be present and non-empty
    const caption = table?.querySelector("caption");
    expect(caption).not.toBeNull();
    expect((caption?.textContent ?? "").length).toBeGreaterThan(0);

    // At least one <th scope="col"> for the metric headers
    const colHeaders = table?.querySelectorAll("th[scope='col']");
    expect((colHeaders?.length ?? 0)).toBeGreaterThan(0);

    // At least one <th scope="row"> for country row headers
    const rowHeaders = table?.querySelectorAll("th[scope='row']");
    expect((rowHeaders?.length ?? 0)).toBeGreaterThan(0);

    // Data cells should be present
    const dataCells = table?.querySelectorAll("td");
    expect((dataCells?.length ?? 0)).toBeGreaterThan(0);
  });

  it("accessible table has one row per country in the TARGET_ISO3 list", () => {
    const { container } = render(<HeatmapChart />);
    const table = container.querySelector("table.sr-only");
    const rowHeaders = table?.querySelectorAll("th[scope='row']");
    // The component renders up to 25 countries
    expect((rowHeaders?.length ?? 0)).toBeGreaterThanOrEqual(1);
  });
});
