import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CookieConsent from "@/components/CookieConsent";

// Regression coverage for a bug found in hands-on end-to-end testing of the
// CMS: the cookie banner is rendered in the root layout, so it also appeared
// on /admin/* routes. It is `fixed inset-x-0 bottom-0` and full-width, which
// overlapped and intercepted clicks on the "Speichern" (save) button in the
// admin edit panels - an editor visiting the CMS for the first time in a
// browser (no consent cookie yet) could not save anything until they first
// dismissed a banner that talks about public-site tracking cookies and has
// no relevance to the admin backend at all.
const mockUsePathname = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

describe("CookieConsent admin exclusion", () => {
  afterEach(() => {
    document.cookie = "cookie-consent=; max-age=0; path=/";
    vi.clearAllMocks();
  });

  it("does not render on /admin routes, even without a consent cookie yet", () => {
    mockUsePathname.mockReturnValue("/admin");
    render(<CookieConsent />);
    expect(screen.queryByRole("dialog", { name: "Cookie-Hinweis" })).not.toBeInTheDocument();
  });

  it("does not render on nested /admin/* routes", () => {
    mockUsePathname.mockReturnValue("/admin/team");
    render(<CookieConsent />);
    expect(screen.queryByRole("dialog", { name: "Cookie-Hinweis" })).not.toBeInTheDocument();
  });

  it("still renders on public routes without a consent cookie", () => {
    mockUsePathname.mockReturnValue("/");
    render(<CookieConsent />);
    expect(screen.getByRole("dialog", { name: "Cookie-Hinweis" })).toBeInTheDocument();
  });
});
