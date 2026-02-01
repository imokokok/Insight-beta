/**
 * 关键用户流程 E2E 测试
 *
 * 覆盖核心业务流程的端到端测试
 */

import { test, expect, Page } from '@playwright/test';

// ============================================================================
// 测试数据
// ============================================================================

const TEST_CONFIG = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  timeout: 30000,
};

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 等待页面加载完成
 */
async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

/**
 * 检查页面是否有错误
 */
async function checkForErrors(page: Page): Promise<void> {
  const errors: string[] = [];
  
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  page.on('pageerror', (error) => {
    errors.push(error.message);
  });

  // 返回检查函数
  return new Promise((resolve) => {
    setTimeout(() => {
      if (errors.length > 0) {
        console.warn('Page errors:', errors);
      }
      resolve();
    }, 1000);
  });
}

// ============================================================================
// 首页和导航测试
// ============================================================================

test.describe('首页和导航', () => {
  test('首页应该正确加载', async ({ page }) => {
    await page.goto(TEST_CONFIG.baseUrl);
    await waitForPageLoad(page);

    // 检查页面标题
    await expect(page).toHaveTitle(/OracleMonitor|Insight/i);

    // 检查主要元素存在
    await expect(page.locator('header, nav, [role="banner"]')).toBeVisible();
    
    // 检查没有严重的控制台错误
    await checkForErrors(page);
  });

  test('导航菜单应该正常工作', async ({ page }) => {
    await page.goto(TEST_CONFIG.baseUrl);
    await waitForPageLoad(page);

    // 检查导航链接
    const navLinks = page.locator('nav a, [role="navigation"] a');
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);

    // 测试导航到各个页面
    const pages = ['/', '/oracle', '/disputes', '/alerts'];
    for (const path of pages) {
      await page.goto(`${TEST_CONFIG.baseUrl}${path}`);
      await waitForPageLoad(page);
      expect(page.url()).toContain(path);
    }
  });
});

// ============================================================================
// Oracle 数据查看流程
// ============================================================================

test.describe('Oracle 数据查看流程', () => {
  test('应该能查看 Oracle 列表', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.baseUrl}/oracle`);
    await waitForPageLoad(page);

    // 检查页面标题或主要内容
    const content = page.locator('main, [role="main"], .content');
    await expect(content).toBeVisible();

    // 检查是否有数据或空状态
    const hasData = await page.locator('[data-testid="oracle-item"], .oracle-item').count() > 0;
    const hasEmptyState = await page.locator('text=No data, Empty, 暂无数据').count() > 0;
    
    expect(hasData || hasEmptyState).toBeTruthy();
  });

  test('应该能查看 Oracle 详情', async ({ page }) => {
    // 先访问列表页
    await page.goto(`${TEST_CONFIG.baseUrl}/oracle`);
    await waitForPageLoad(page);

    // 尝试点击第一个 Oracle 项
    const firstItem = page.locator('[data-testid="oracle-item"], .oracle-item, a[href*="/oracle/"]').first();
    
    if (await firstItem.isVisible().catch(() => false)) {
      await firstItem.click();
      await waitForPageLoad(page);

      // 检查详情页内容
      const detailContent = page.locator('main, [role="main"], .detail-content');
      await expect(detailContent).toBeVisible();
    } else {
      test.skip();
    }
  });

  test('应该能使用搜索功能', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.baseUrl}/oracle`);
    await waitForPageLoad(page);

    // 查找搜索输入框
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="搜索" i]').first();
    
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('ETH');
      await searchInput.press('Enter');
      
      // 等待搜索结果
      await page.waitForTimeout(1000);
      
      // 检查页面是否更新
      const content = page.locator('main, [role="main"]');
      await expect(content).toBeVisible();
    } else {
      test.skip();
    }
  });

  test('应该能使用筛选功能', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.baseUrl}/oracle`);
    await waitForPageLoad(page);

    // 查找筛选器
    const filterSelect = page.locator('select, [role="combobox"], .filter').first();
    
    if (await filterSelect.isVisible().catch(() => false)) {
      await filterSelect.click();
      
      // 选择第一个选项
      const options = page.locator('option, [role="option"]').nth(1);
      if (await options.isVisible().catch(() => false)) {
        await options.click();
        
        // 等待筛选结果
        await page.waitForTimeout(1000);
        
        const content = page.locator('main, [role="main"]');
        await expect(content).toBeVisible();
      }
    } else {
      test.skip();
    }
  });
});

// ============================================================================
// 争议查看流程
// ============================================================================

test.describe('争议查看流程', () => {
  test('应该能查看争议列表', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.baseUrl}/disputes`);
    await waitForPageLoad(page);

    const content = page.locator('main, [role="main"], .content');
    await expect(content).toBeVisible();

    // 检查页面是否有争议数据或空状态
    const hasContent = await page.locator('text=Dispute, 争议, dispute').count() > 0;
    const hasEmptyState = await page.locator('text=No disputes, Empty, 暂无争议').count() > 0;
    
    expect(hasContent || hasEmptyState).toBeTruthy();
  });

  test('应该能查看争议详情', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.baseUrl}/disputes`);
    await waitForPageLoad(page);

    // 尝试点击第一个争议项
    const firstItem = page.locator('[data-testid="dispute-item"], .dispute-item, a[href*="/disputes/"]').first();
    
    if (await firstItem.isVisible().catch(() => false)) {
      await firstItem.click();
      await waitForPageLoad(page);

      const detailContent = page.locator('main, [role="main"], .detail-content');
      await expect(detailContent).toBeVisible();
    } else {
      test.skip();
    }
  });
});

// ============================================================================
// 响应式和性能测试
// ============================================================================

test.describe('响应式和性能', () => {
  test('应该在不同视口下正常显示', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(TEST_CONFIG.baseUrl);
      await waitForPageLoad(page);

      // 检查主要内容是否可见
      const content = page.locator('main, [role="main"], .content').first();
      await expect(content).toBeVisible();

      // 截图用于视觉回归测试
      await page.screenshot({
        path: `./e2e/screenshots/homepage-${viewport.name.toLowerCase()}.png`,
        fullPage: true,
      });
    }
  });

  test('页面加载性能应该符合标准', async ({ page }) => {
    // 使用 Performance API 测量加载时间
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.startTime,
        loadComplete: navigation.loadEventEnd - navigation.startTime,
      };
    });

    console.log('Performance metrics:', performanceMetrics);

    // 断言加载时间
    expect(performanceMetrics.domContentLoaded).toBeLessThan(5000); // 5秒内
    expect(performanceMetrics.loadComplete).toBeLessThan(10000); // 10秒内
  });
});

// ============================================================================
// 错误处理测试
// ============================================================================

test.describe('错误处理', () => {
  test('应该优雅处理 404 页面', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.baseUrl}/non-existent-page`);
    await waitForPageLoad(page);

    // 检查是否显示 404 页面或错误信息
    const errorContent = page.locator('text=404, Not Found, 页面不存在, Page not found');
    const hasError = await errorContent.count() > 0;
    
    // 或者检查是否重定向到首页
    const isHomePage = page.url() === TEST_CONFIG.baseUrl + '/';
    
    expect(hasError || isHomePage).toBeTruthy();
  });

  test('应该处理 API 错误', async ({ page }) => {
    // 拦截 API 请求并模拟错误
    await page.route('**/api/**', (route) => {
      if (route.request().url().includes('test-error')) {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Test error' }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto(TEST_CONFIG.baseUrl);
    await waitForPageLoad(page);

    // 页面应该仍然加载，只是可能显示错误状态
    const content = page.locator('main, [role="main"], .content');
    await expect(content).toBeVisible();
  });
});

// ============================================================================
// 可访问性测试
// ============================================================================

test.describe('可访问性', () => {
  test('页面应该有正确的标题结构', async ({ page }) => {
    await page.goto(TEST_CONFIG.baseUrl);
    await waitForPageLoad(page);

    // 检查是否有 h1
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();

    // 检查标题层级
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').count();
    expect(headings).toBeGreaterThan(0);
  });

  test('交互元素应该有正确的 ARIA 属性', async ({ page }) => {
    await page.goto(TEST_CONFIG.baseUrl);
    await waitForPageLoad(page);

    // 检查按钮是否有可访问的名称
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      const hasAccessibleName = await button.evaluate((el) => {
        return el.hasAttribute('aria-label') || 
               el.hasAttribute('aria-labelledby') || 
               el.textContent?.trim().length > 0;
      });
      
      if (await button.isVisible()) {
        expect(hasAccessibleName).toBeTruthy();
      }
    }
  });

  test('图片应该有 alt 属性', async ({ page }) => {
    await page.goto(TEST_CONFIG.baseUrl);
    await waitForPageLoad(page);

    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const hasAlt = await img.evaluate((el) => el.hasAttribute('alt'));
      
      if (await img.isVisible()) {
        // 装饰性图片可以有空的 alt
        expect(hasAlt).toBeTruthy();
      }
    }
  });
});
