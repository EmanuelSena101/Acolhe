import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/e-mail/i).fill("admin@saudeterritorio.dev");
    await page.getByLabel(/senha/i).fill("admin123");
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForURL("**/dashboard", { timeout: 10000 });
  });

  test("should navigate to visitas page", async ({ page }) => {
    await page
      .getByText(/visitas/i)
      .first()
      .click();
    await expect(page).toHaveURL(/visitas/);
  });

  test("should navigate to importacao page", async ({ page }) => {
    await page
      .getByText(/importacao/i)
      .first()
      .click();
    await expect(page).toHaveURL(/importacao/);
    await expect(page.getByText(/importa[cç][aã]o/i).first()).toBeVisible();
  });

  test("should navigate to relatorios page", async ({ page }) => {
    await page
      .getByText(/relatorios/i)
      .first()
      .click();
    await expect(page).toHaveURL(/relatorios/);
    await expect(page.getByText(/relat[oó]rio/i).first()).toBeVisible();
  });

  test("should navigate to domicilios page", async ({ page }) => {
    await page
      .getByText(/domicilios/i)
      .first()
      .click();
    await expect(page).toHaveURL(/domicilios/);
  });
});
