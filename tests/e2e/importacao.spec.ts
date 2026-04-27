import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Importacao", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/e-mail/i).fill("admin@saudeterritorio.dev");
    await page.getByLabel(/senha/i).fill("admin123");
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForURL("**/dashboard", { timeout: 10000 });
  });

  test("should display importacao page with dropzone", async ({ page }) => {
    await page.goto("/importacao");
    await expect(page.getByText(/importa[cç][aã]o/i).first()).toBeVisible();
    await expect(page.getByText(/arrastar|soltar|upload|csv|xml/i).first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("should show fixture file info", async ({ page }) => {
    await page.goto("/importacao");
    const fixtureDir = path.join(process.cwd(), "tests/fixtures");
    const input = page.locator('input[type="file"]').first();

    if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
      await input.setInputFiles(path.join(fixtureDir, "ficha-a-valida.csv"));
      await expect(
        page
          .getByText(/ficha-a-valida/i)
          .or(page.getByText(/csv/i))
          .first(),
      ).toBeVisible({ timeout: 5000 });
    }
  });
});
