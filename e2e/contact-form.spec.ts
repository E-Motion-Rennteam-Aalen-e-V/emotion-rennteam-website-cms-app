import { expect, test } from "@playwright/test";

test.describe("Contact form", () => {
  test("submits successfully with valid input", async ({ page }) => {
    await page.goto("/kontakt");
    await page.waitForLoadState("networkidle");

    await page.locator("#name").fill("Ada Lovelace");
    await page.locator("#email").fill(`ada.${Date.now()}@example.com`);
    await page.locator("#message").fill("Dies ist eine Testnachricht vom E2E-Smoke-Test.");
    await page.locator("#consent").check();

    await page.getByRole("button", { name: /senden/i }).click();

    await expect(page.getByRole("status")).toContainText("Danke für deine Nachricht");
  });

  test("shows field errors for an invalid email", async ({ page }) => {
    await page.goto("/kontakt");
    await page.waitForLoadState("networkidle");

    await page.locator("#name").fill("Ada Lovelace");
    await page.locator("#email").fill("not-an-email");
    await page.locator("#message").fill("Dies ist eine Testnachricht vom E2E-Smoke-Test.");
    await page.locator("#consent").check();

    await page.getByRole("button", { name: /senden/i }).click();

    await expect(page.locator("#email-error")).toBeVisible();
  });
});
