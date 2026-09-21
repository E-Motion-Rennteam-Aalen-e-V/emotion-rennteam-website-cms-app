import "@testing-library/jest-dom/vitest";

// jsdom doesn't implement IntersectionObserver, which framer-motion's
// `whileInView` (used throughout the site's Reveal/Stagger components)
// relies on. A minimal no-op stub is enough for component tests.
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: ReadonlyArray<number> = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

if (typeof globalThis.IntersectionObserver === "undefined") {
  globalThis.IntersectionObserver =
    MockIntersectionObserver as unknown as typeof IntersectionObserver;
}
