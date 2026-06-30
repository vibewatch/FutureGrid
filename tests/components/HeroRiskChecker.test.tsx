// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next/link so it renders as a plain anchor in tests
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import HeroRiskChecker from "@/components/dashboard/HeroRiskChecker";

describe("HeroRiskChecker", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the search input", () => {
    render(<HeroRiskChecker />);
    expect(
      screen.getByRole("combobox", { name: /search occupations/i })
    ).toBeInTheDocument();
  });

  it("typing a query shows matching results in the dropdown", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<HeroRiskChecker />);

    // flush mount effect (setTimeout 0 for default selection)
    await act(async () => {
      vi.runAllTimers();
    });

    const input = screen.getByRole("combobox", { name: /search occupations/i });
    await user.type(input, "software");

    // dropdown listbox should appear
    const listbox = screen.getByRole("listbox", { name: /matching occupations/i });
    expect(listbox).toBeInTheDocument();

    // at least one option visible
    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThan(0);

    // all visible options should relate to "software"
    for (const opt of options) {
      expect(opt.textContent?.toLowerCase()).toMatch(/software/);
    }
  });

  it("selecting a result from the dropdown shows the gauge", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<HeroRiskChecker />);

    await act(async () => {
      vi.runAllTimers();
    });

    const input = screen.getByRole("combobox", { name: /search occupations/i });
    await user.type(input, "nurse");

    const options = await screen.findAllByRole("option");
    expect(options.length).toBeGreaterThan(0);

    // Click the first option (uses onMouseDown)
    await user.pointer({ target: options[0], keys: "[MouseLeft>]" });

    // After picking, the gauge SVG should be visible
    await waitFor(() => {
      expect(screen.getByRole("img")).toBeInTheDocument();
    });
  });

  it("on mount, loads a default 'software' occupation and shows the gauge", async () => {
    render(<HeroRiskChecker />);

    // The default selection is loaded in a setTimeout(0)
    await act(async () => {
      vi.runAllTimers();
    });

    // Gauge SVG should be rendered for the default selection
    await waitFor(() => {
      expect(screen.getByRole("img")).toBeInTheDocument();
    });
  });

  it("clearing the query hides the dropdown", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<HeroRiskChecker />);

    await act(async () => {
      vi.runAllTimers();
    });

    const input = screen.getByRole("combobox", { name: /search occupations/i });
    await user.type(input, "engineer");

    // dropdown should appear
    expect(screen.getByRole("listbox", { name: /matching occupations/i })).toBeInTheDocument();

    // clear the input
    await user.clear(input);

    // dropdown should disappear
    expect(
      screen.queryByRole("listbox", { name: /matching occupations/i })
    ).not.toBeInTheDocument();
  });

  it("keyboard Escape closes the dropdown", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<HeroRiskChecker />);

    await act(async () => {
      vi.runAllTimers();
    });

    const input = screen.getByRole("combobox", { name: /search occupations/i });
    await user.type(input, "software");

    expect(screen.getByRole("listbox", { name: /matching occupations/i })).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(
      screen.queryByRole("listbox", { name: /matching occupations/i })
    ).not.toBeInTheDocument();
  });
});
