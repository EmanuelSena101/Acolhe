import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/e-mail/i).fill("admin@saudeterritorio.dev");
    await page.getByLabel(/senha/i).fill("admin123");
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForURL("**/dashboard", { timeout: 10000 });
  });

  test("should display KPI cards", async ({ page }) => {
    await expect(page.getByText(/painel/i).first()).toBeVisible();
    await expect(page.getByText(/domic[ií]lio/i).first()).toBeVisible({ timeout: 10000 });
  });

  test("should display sidebar navigation", async ({ page }) => {
    await expect(page.getByText(/saudeterritorio/i).first()).toBeVisible();
    await expect(page.getByText(/painel/i).first()).toBeVisible();
    await expect(page.getByText(/territorio/i).first()).toBeVisible();
  });

  test("should navigate to territorio", async ({ page }) => {
    await page
      .getByText(/territorio/i)
      .first()
      .click();
    await expect(page).toHaveURL(/territorio/);
  });

  test("should have UBS selector", async ({ page }) => {
    await expect(page.getByRole("combobox").or(page.locator("select")).first()).toBeVisible({
      timeout: 10000,
    });
  });
});
