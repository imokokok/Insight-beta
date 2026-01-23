import { test as setup, expect } from "@playwright/test";

setup("setup chaos engineering scenario", async ({ page }) => {
  await page.route("**/*", (route) => {
    const chaosMode = process.env.CHAOS_MODE;

    if (chaosMode === "network_error") {
      route.abort("failed");
    } else if (chaosMode === "slow_network") {
      route.continue({ delay: Math.random() * 5000 });
    } else if (chaosMode === "timeout") {
      route.continue({ timeout: 1 });
    } else {
      route.continue();
    }
  });

  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");
});

export {};
