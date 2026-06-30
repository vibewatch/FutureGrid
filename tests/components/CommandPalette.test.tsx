// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next/navigation so useRouter doesn't crash in jsdom
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
}));

import CommandPalette from "@/components/ui/CommandPalette";

function openPaletteViaEvent() {
  window.dispatchEvent(new Event("open-command-palette"));
}

describe("CommandPalette", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is not visible on initial render", () => {
    render(<CommandPalette />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens when 'open-command-palette' event is dispatched", async () => {
    render(<CommandPalette />);
    await act(async () => {
      openPaletteViaEvent();
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("dialog has correct aria-label", async () => {
    render(<CommandPalette />);
    await act(async () => {
      openPaletteViaEvent();
    });
    expect(
      screen.getByRole("dialog", { name: /command palette/i })
    ).toBeInTheDocument();
  });

  it("shows default results (up to 20 items) when opened with no query", async () => {
    render(<CommandPalette />);
    await act(async () => {
      openPaletteViaEvent();
      vi.runAllTimers(); // flush focus setTimeout
    });

    const listbox = screen.getByRole("listbox", { name: /search results/i });
    expect(listbox).toBeInTheDocument();

    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThan(0);
    expect(options.length).toBeLessThanOrEqual(20);
  });

  it("shows grouped section headings (Occupations, Sectors, or Skills)", async () => {
    render(<CommandPalette />);
    await act(async () => {
      openPaletteViaEvent();
      vi.runAllTimers();
    });

    const text = document.body.textContent ?? "";
    const hasAnyGroup =
      text.includes("Occupations") ||
      text.includes("Sectors") ||
      text.includes("Skills");
    expect(hasAnyGroup).toBe(true);
  });

  it("typing filters results to matching items", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CommandPalette />);

    await act(async () => {
      openPaletteViaEvent();
      vi.runAllTimers();
    });

    const input = screen.getByRole("textbox", { name: /search/i });
    await user.type(input, "software");

    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThan(0);

    for (const opt of options) {
      expect(opt.textContent?.toLowerCase()).toMatch(/software/);
    }
  });

  it("shows 'No results' message for a query that matches nothing", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CommandPalette />);

    await act(async () => {
      openPaletteViaEvent();
      vi.runAllTimers();
    });

    const input = screen.getByRole("textbox", { name: /search/i });
    await user.type(input, "zzzznotarealterm12345");

    await waitFor(() => {
      expect(screen.getByText(/no results/i)).toBeInTheDocument();
    });
  });

  it("Escape key closes the palette", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CommandPalette />);

    await act(async () => {
      openPaletteViaEvent();
      vi.runAllTimers();
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("clicking the backdrop closes the palette", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CommandPalette />);

    await act(async () => {
      openPaletteViaEvent();
      vi.runAllTimers();
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // The backdrop is the div with aria-hidden="true" and onClick=closePalette
    const backdrop = document.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(backdrop).not.toBeNull();
    await user.click(backdrop);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("Ctrl+K keyboard shortcut opens the palette", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CommandPalette />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.keyboard("{Control>}k{/Control}");

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });
});
