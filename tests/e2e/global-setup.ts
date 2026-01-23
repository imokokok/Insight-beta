import { test as setup, expect } from "@playwright/test";

setup("authenticate", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const walletButton = page.locator('button:has-text("Connect Wallet")');
  if (await walletButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log("Wallet connection required for full test suite");
  }
});
