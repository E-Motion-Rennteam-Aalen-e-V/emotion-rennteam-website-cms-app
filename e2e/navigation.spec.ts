import { expect, test } from "@playwright/test";

test.describe("Navigation", () => {
  test("homepage loads and links to the team page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/E-Motion/i);

    await page.getByRole("link", { name: "Team", exact: true }).first().click();
    await expect(page).toHaveURL(/\/team$/);
  });

  test("navigates to the contact page and back home", async ({ page }) => {
    await page.goto("/kontakt");
    await expect(page.locator("form")).toBeVisible();

    await page.getByRole("link", { name: /E-Motion/i }).first().click();
    await expect(page).toHaveURL("/");
  });
});
