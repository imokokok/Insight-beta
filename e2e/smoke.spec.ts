/**
 * Smoke Tests - E2E 冒烟测试
 *
 * 快速验证核心功能是否正常的轻量级 E2E 测试
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// ============================================================================
// 基础页面加载测试
// ============================================================================

test.describe('Smoke Tests - Page Loading', () => {
  test('首页应该加载', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');
    
    // 检查页面是否有基本内容
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // 检查标题
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('Oracle 页面应该加载', async ({ page }) => {
    await page.goto(`${BASE_URL}/oracle`);
    await page.waitForLoadState('domcontentloaded');
    
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // 验证 URL
    expect(page.url()).toContain('/oracle');
  });

  test('Alerts 页面应该加载', async ({ page }) => {
    await page.goto(`${BASE_URL}/alerts`);
    await page.waitForLoadState('domcontentloaded');
    
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    expect(page.url()).toContain('/alerts');
  });
});

// ============================================================================
// API 健康检查
// ============================================================================

test.describe('Smoke Tests - API Health', () => {
  test('REST API - unified stats should respond', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/oracle/unified?type=stats`);
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toBeDefined();
  });

  test('REST API - protocols list should respond', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/oracle/unified?type=protocols`);
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.protocols).toBeDefined();
    expect(Array.isArray(data.protocols)).toBe(true);
  });
});

// ============================================================================
// 响应式测试
// ============================================================================

test.describe('Smoke Tests - Responsive', () => {
  test('should display on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');
    
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should display on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');
    
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should display on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');
    
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

// ============================================================================
// 性能测试
// ============================================================================

test.describe('Smoke Tests - Performance', () => {
  test('homepage should load within 10 seconds', async ({ page }) => {
    const start = Date.now();
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(10000);
  });

  test('API should respond within 2 seconds', async ({ request }) => {
    const start = Date.now();
    
    await request.get(`${BASE_URL}/api/oracle/unified?action=overview`);
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
  });
});
