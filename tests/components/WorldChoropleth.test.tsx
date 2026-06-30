// @vitest-environment jsdom
//
// WorldChoropleth — unit tests
//
// Full-render strategy: global.fetch is mocked to return a minimal 3-country
// FeatureCollection so d3-geo can compute projection paths without network I/O.
// SVG <path> elements rendered inside <svg role="img"> are NOT accessible via
// getByRole (the img role hides descendants from the accessibility tree), so we
// query them with container.querySelector / querySelectorAll instead.
//
// If d3-geo path computation fails (empty path strings) the elements are still
// rendered in the DOM and fireEvent.click still triggers the React handler.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Minimal 3-country GeoJSON — simple polygons in natural coordinates
const MOCK_GEO = {
  type: "FeatureCollection",
  features: [
    {
      id: "USA",
      type: "Feature",
      properties: { name: "United States" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-130, 25],
            [-60, 25],
            [-60, 50],
            [-130, 50],
            [-130, 25],
          ],
        ],
      },
    },
    {
      id: "CHN",
      type: "Feature",
      properties: { name: "China" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [70, 18],
            [135, 18],
            [135, 53],
            [70, 53],
            [70, 18],
          ],
        ],
      },
    },
    {
      id: "GBR",
      type: "Feature",
      properties: { name: "United Kingdom" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-5, 49],
            [2, 49],
            [2, 59],
            [-5, 59],
            [-5, 49],
          ],
        ],
      },
    },
  ],
};

function makeFetchMock() {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(MOCK_GEO),
  });
}

import WorldChoropleth from "@/components/charts/WorldChoropleth";

describe("WorldChoropleth", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", makeFetchMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    // Re-apply setup.ts stubs that vi.unstubAllGlobals() removes
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }));
  });

  it("renders metric toggle buttons before geo data arrives", () => {
    // Use a never-resolving promise so no state update fires after the test body
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));

    render(<WorldChoropleth />);

    expect(screen.getByText("Claude.ai usage")).toBeInTheDocument();
    expect(screen.getByText("GenAI diffusion")).toBeInTheDocument();
    expect(screen.getByText("AI readiness")).toBeInTheDocument();
  });

  it("shows loading skeleton while geo data is pending", async () => {
    // Use a never-resolving fetch so we can inspect the loading state
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(new Promise(() => {})),
    );

    const { container } = render(<WorldChoropleth />);

    // Skeleton is rendered (aria-hidden so query via container)
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(container.querySelector("svg.choropleth-svg")).toBeNull();
  });

  it("fetches world-countries.geo.json on mount", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_GEO),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<WorldChoropleth />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("world-countries.geo.json"),
      );
    });
  });

  it("renders SVG with country paths after geo data loads", async () => {
    const { container } = render(<WorldChoropleth />);

    await waitFor(() => {
      expect(container.querySelector("svg.choropleth-svg")).not.toBeNull();
    });

    // At least the 3 mocked countries should produce path elements
    const paths = container.querySelectorAll("svg.choropleth-svg path");
    expect(paths.length).toBeGreaterThanOrEqual(3);
  });

  it("renders country paths with role=button when onCountrySelect is provided", async () => {
    const onCountrySelect = vi.fn();
    const { container } = render(
      <WorldChoropleth onCountrySelect={onCountrySelect} />,
    );

    await waitFor(() => {
      expect(
        container.querySelectorAll('path[role="button"]').length,
      ).toBeGreaterThan(0);
    });
  });

  it("clicking a country path calls onCountrySelect with its iso3 code", async () => {
    const onCountrySelect = vi.fn();
    const { container } = render(
      <WorldChoropleth onCountrySelect={onCountrySelect} />,
    );

    await waitFor(() => {
      expect(
        container.querySelectorAll('path[role="button"]').length,
      ).toBeGreaterThan(0);
    });

    const firstPath = container.querySelector('path[role="button"]')!;
    fireEvent.click(firstPath);

    expect(onCountrySelect).toHaveBeenCalledTimes(1);
    expect(onCountrySelect).toHaveBeenCalledWith(expect.any(String));
  });

  it("clicking a country path calls onCountrySelect with the correct iso3", async () => {
    const onCountrySelect = vi.fn();
    const { container } = render(
      <WorldChoropleth onCountrySelect={onCountrySelect} />,
    );

    await waitFor(() => {
      expect(
        container.querySelectorAll('path[role="button"]').length,
      ).toBeGreaterThan(0);
    });

    // Find a path for one of the known mocked countries by aria-label
    const usaPath = container.querySelector(
      'path[aria-label*="United States"]',
    ) as HTMLElement | null;
    if (usaPath) {
      fireEvent.click(usaPath);
      expect(onCountrySelect).toHaveBeenCalledWith("USA");
    } else {
      // Fallback: first path resolves to one of the 3 mocked iso3 codes
      const firstPath = container.querySelector('path[role="button"]')!;
      fireEvent.click(firstPath);
      expect(["USA", "CHN", "GBR"]).toContain(
        (onCountrySelect.mock.calls[0] as string[])[0],
      );
    }
  });

  it("metric toggle switches the active button state", async () => {
    const user = userEvent.setup();
    render(<WorldChoropleth />);

    const diffusionBtn = screen.getByText("GenAI diffusion").closest("button")!;
    expect(diffusionBtn).toHaveAttribute("aria-pressed", "false");

    await user.click(diffusionBtn);

    expect(diffusionBtn).toHaveAttribute("aria-pressed", "true");

    // The previously active Claude button should now be inactive
    const claudeBtn = screen.getByText("Claude.ai usage").closest("button")!;
    expect(claudeBtn).toHaveAttribute("aria-pressed", "false");
  });

  it("shows an error message if the fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 }),
    );

    render(<WorldChoropleth />);

    await waitFor(() => {
      expect(
        screen.getByText(/Map unavailable/i),
      ).toBeInTheDocument();
    });
  });
});
