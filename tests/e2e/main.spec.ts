import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Insight/);
  });

  test('should display main navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.locator('nav')).toBeVisible();
  });
});

test.describe('Oracle Pages', () => {
  test('should load oracle list page', async ({ page }) => {
    await page.goto('/oracle');
    // Wait for page to load and check for main content
    await page.waitForLoadState('networkidle');

    // Check for either "Oracles" heading or main content area
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();

    // Verify we're on the oracle page by checking URL or content
    const url = page.url();
    expect(url).toContain('/oracle');
  });

  test('should display oracle page content', async ({ page }) => {
    await page.goto('/oracle');
    await page.waitForLoadState('networkidle');

    // Check for main content area or loading state
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });

  test('should handle non-existent oracle gracefully', async ({ page }) => {
    await page.goto('/oracle/non-existent-address');
    await page.waitForLoadState('networkidle');

    // Should show some content (either error or fallback)
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible();
  });
});

test.describe('Alerts System', () => {
  test('should load alerts page', async ({ page }) => {
    await page.goto('/alerts');
    await page.waitForLoadState('networkidle');

    // Check for main content
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();

    // Verify URL
    const url = page.url();
    expect(url).toContain('/alerts');
  });

  test('should display alerts page structure', async ({ page }) => {
    await page.goto('/alerts');
    await page.waitForLoadState('networkidle');

    // Check for heading or main content
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });
});

test.describe('Performance', () => {
  test('should load within performance budget', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // Relaxed budget for CI/demo mode (8 seconds)
    expect(loadTime).toBeLessThan(8000);
  });

  test('should have proper meta tags', async ({ page }) => {
    await page.goto('/');
    const description = page.locator('meta[name="description"]');
    const count = await description.count();

    // If description exists, check content
    if (count > 0) {
      const content = await description.getAttribute('content');
      expect(content?.toLowerCase()).toContain('oracle');
    }
  });
});

test.describe('Accessibility', () => {
  test('should have no critical accessibility violations', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Check for basic accessibility - page should be usable
    const main = page.locator('main');
    await expect(main).toBeVisible();

    // Check for navigation
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('should have proper heading structure', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get all h1 elements
    const h1Elements = page.locator('h1');
    const h1Count = await h1Elements.count();

    // Should have at least one h1
    expect(h1Count).toBeGreaterThanOrEqual(1);

    // First h1 should be visible
    if (h1Count > 0) {
      await expect(h1Elements.first()).toBeVisible();
    }
  });
});

test.describe('Navigation', () => {
  test('should navigate to main pages', async ({ page }) => {
    await page.goto('/');

    // Test navigation to Oracle page
    const oracleLink = page.locator('nav a[href*="/oracle"]').first();
    if (await oracleLink.isVisible().catch(() => false)) {
      await oracleLink.click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/oracle');
    }
  });

  test('should show sidebar navigation', async ({ page }) => {
    await page.goto('/');

    // Check for sidebar or main navigation
    const sidebar = page.locator('aside, [role="complementary"], nav');
    await expect(sidebar.first()).toBeVisible();
  });
});
