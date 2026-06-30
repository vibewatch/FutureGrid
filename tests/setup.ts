// Use the vitest-specific entry point so expect.extend targets vitest's expect
import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Polyfill browser APIs not provided by jsdom so components don't crash

vi.stubGlobal(
  "IntersectionObserver",
  class MockIntersectionObserver {
    private cb: IntersectionObserverCallback;
    constructor(cb: IntersectionObserverCallback) {
      this.cb = cb;
    }
    observe(el: Element) {
      // Fire immediately with isIntersecting: true so scroll-triggered
      // animations (e.g. RiskGauge) activate during tests
      this.cb(
        [{ isIntersecting: true, target: el } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver
      );
    }
    unobserve() {}
    disconnect() {}
  }
);

vi.stubGlobal(
  "ResizeObserver",
  class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
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

// jsdom doesn't implement scrollIntoView
if (typeof Element !== "undefined") {
  Element.prototype.scrollIntoView = () => {};
}
