import { expect, test } from "@playwright/test";

test.describe("CMS login", () => {
  test("shows the login form and rejects bad credentials with an error", async ({ page }) => {
    await page.goto("/admin/login");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: /Redaktions-Login/i })).toBeVisible();

    await page.locator("#username").fill("does-not-exist");
    await page.locator("#password").fill("wrong-password");
    await page.getByRole("button", { name: /anmelden/i }).click();

    // Whatever the exact server-side reason (invalid credentials, or the
    // CMS not being configured with a session secret in this environment),
    // a failed login must surface a visible error, not silently do nothing.
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});
