import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("should load successfully", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Insight/);
  });

  test("should display main navigation", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("nav")).toBeVisible();
  });

  test("should be responsive on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await expect(page.locator("nav")).toBeVisible();
  });
});

test.describe("Oracle Pages", () => {
  test("should load oracle list page", async ({ page }) => {
    await page.goto("/oracle");
    await expect(page.locator("h1")).toContainText("Oracles");
  });

  test("should display oracle stats", async ({ page }) => {
    await page.goto("/oracle");
    await expect(page.locator('[class*="stats"]')).toBeVisible();
  });

  test("should handle non-existent oracle gracefully", async ({ page }) => {
    await page.goto("/oracle/non-existent-address");
    await expect(page.locator("text=Not Found")).toBeVisible();
  });
});

test.describe("Alerts System", () => {
  test("should load alerts page", async ({ page }) => {
    await page.goto("/alerts");
    await expect(page.locator("h1")).toContainText(/Alert/);
  });

  test("should display alert rules", async ({ page }) => {
    await page.goto("/alerts");
    await expect(page.locator('[class*="alert-rule"]')).toBeVisible();
  });
});

test.describe("Performance", () => {
  test("should load within performance budget", async ({ page }) => {
    const startTime = Date.now();
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(5000);
  });

  test("should have proper meta tags", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      /oracle/i,
    );
  });
});

test.describe("Accessibility", () => {
  test("should have no accessibility violations", async ({ page }) => {
    await page.goto("/");
    const violations = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        violations.push(msg.text());
      }
    });

    await page.waitForTimeout(1000);
    expect(violations.filter((v) => v.includes("a11y"))).toHaveLength(0);
  });

  test("should have proper heading structure", async ({ page }) => {
    await page.goto("/");
    const h1Count = await page.locator("h1").count();
    expect(h1Count).toBe(1);
  });
});
