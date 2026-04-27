import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("should show login page", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /entrar/i })).toBeVisible();
    await expect(page.getByLabel(/e-mail/i)).toBeVisible();
    await expect(page.getByLabel(/senha/i)).toBeVisible();
  });

  test("should login as admin", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/e-mail/i).fill("admin@saudeterritorio.dev");
    await page.getByLabel(/senha/i).fill("admin123");
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForURL("**/dashboard", { timeout: 10000 });
    await expect(page).toHaveURL(/dashboard/);
  });

  test("should reject invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/e-mail/i).fill("wrong@email.com");
    await page.getByLabel(/senha/i).fill("wrongpassword");
    await page.getByRole("button", { name: /entrar/i }).click();
    await expect(page.getByText(/credenciais|erro|invalid/i)).toBeVisible({ timeout: 5000 });
  });

  test("should redirect unauthenticated user to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/login/);
  });
});
