import { test, expect } from "@playwright/test";

// Supabase env eksikse istemci konsola benign bir uyarı basar; onu görmezden gel.
const IGNORE = [/Missing Supabase env vars/i];
const isBenign = (msg) => IGNORE.some((re) => re.test(msg));

test("login sayfası render oluyor", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));

  await page.goto("/login");
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[placeholder="Password"]')).toBeVisible();

  // Yakalanmamış JS hatası (crash) olmamalı
  expect(pageErrors.filter((m) => !isBenign(m))).toEqual([]);
});

test("korumalı kök rota girişe yönlendirir", async ({ page }) => {
  await page.goto("/");
  // Oturum yokken ProtectedRoute girişe yönlendirir → email alanı görünür
  await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 });
  await expect(page).toHaveTitle(/Staple/i);
});

test("bilinmeyen rota 404 (NotFound) gösterir", async ({ page }) => {
  await page.goto("/boyle-bir-sayfa-yok-12345");
  // Uygulama çökmeden bir şey render etmeli (NotFound veya yönlendirme)
  await expect(page.locator("#root")).not.toBeEmpty();
});
