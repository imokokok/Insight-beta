/**
 * E2E Tests for Oracle Monitoring Platform
 *
 * 通用预言机监控平台端到端测试
 */

import { test, expect, Page } from '@playwright/test';

// ============================================================================
// 测试数据
// ============================================================================

const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!',
};

const TEST_INSTANCE = {
  name: 'Test Chainlink ETH/USD',
  protocol: 'chainlink',
  chain: 'ethereum',
  address: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
};

// ============================================================================
// 辅助函数
// ============================================================================

async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.fill('input[name="email"]', TEST_USER.email);
  await page.fill('input[name="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
}

async function createTestInstance(page: Page): Promise<void> {
  await page.goto('/oracle/dashboard');
  await page.click('text=添加实例');
  await page.fill('input[name="name"]', TEST_INSTANCE.name);
  await page.selectOption('select[name="protocol"]', TEST_INSTANCE.protocol);
  await page.selectOption('select[name="chain"]', TEST_INSTANCE.chain);
  await page.fill('input[name="address"]', TEST_INSTANCE.address);
  await page.click('button[type="submit"]');
  await page.waitForSelector(`text=${TEST_INSTANCE.name}`);
}

// ============================================================================
// 认证测试
// ============================================================================

test.describe('Authentication', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/登录|Login/);
    
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    await page.waitForURL('/');
    await expect(page).toHaveURL('/');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    await login(page);
    await page.click('text=退出|Logout');
    await page.waitForURL('/login');
    await expect(page).toHaveURL('/login');
  });
});

// ============================================================================
// Dashboard 测试
// ============================================================================

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display dashboard with stats', async ({ page }) => {
    await page.goto('/oracle/dashboard');
    
    await expect(page.locator('text=通用预言机监控平台')).toBeVisible();
    await expect(page.locator('text=总实例数')).toBeVisible();
    await expect(page.locator('text=支持协议')).toBeVisible();
    await expect(page.locator('text=1小时更新')).toBeVisible();
    await expect(page.locator('text=活跃告警')).toBeVisible();
  });

  test('should switch between tabs', async ({ page }) => {
    await page.goto('/oracle/dashboard');
    
    // 测试标签切换
    await page.click('text=协议');
    await expect(page.locator('text=协议分布')).toBeVisible();
    
    await page.click('text=实例');
    await expect(page.locator('text=实例列表')).toBeVisible();
    
    await page.click('text=对比');
    await expect(page.locator('text=跨协议价格对比')).toBeVisible();
    
    await page.click('text=告警');
    await expect(page.locator('text=告警管理')).toBeVisible();
  });

  test('should refresh data', async ({ page }) => {
    await page.goto('/oracle/dashboard');
    
    await page.click('button:has-text("刷新")');
    await expect(page.locator('.animate-spin')).toBeVisible();
    await expect(page.locator('.animate-spin')).not.toBeVisible();
  });
});

// ============================================================================
// 实例管理测试
// ============================================================================

test.describe('Instance Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should create new instance', async ({ page }) => {
    await page.goto('/oracle/dashboard');
    await page.click('text=添加实例');
    
    await page.fill('input[name="name"]', 'E2E Test Instance');
    await page.selectOption('select[name="protocol"]', 'chainlink');
    await page.selectOption('select[name="chain"]', 'ethereum');
    await page.fill('input[name="address"]', '0x1234567890123456789012345678901234567890');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=E2E Test Instance')).toBeVisible();
  });

  test('should filter instances', async ({ page }) => {
    await page.goto('/oracle/dashboard');
    await page.click('text=实例');
    
    await page.fill('input[placeholder="搜索实例..."]', 'chainlink');
    await expect(page.locator('text=chainlink')).toBeVisible();
  });

  test('should toggle instance status', async ({ page }) => {
    await createTestInstance(page);
    
    await page.click('text=实例');
    const toggle = page.locator('input[type="checkbox"]').first();
    
    const initialState = await toggle.isChecked();
    await toggle.click();
    
    await page.waitForTimeout(1000);
    const newState = await toggle.isChecked();
    expect(newState).not.toBe(initialState);
  });
});

// ============================================================================
// 价格对比测试
// ============================================================================

test.describe('Price Comparison', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display price comparison', async ({ page }) => {
    await page.goto('/oracle/dashboard');
    await page.click('text=对比');
    
    await expect(page.locator('text=跨协议价格对比')).toBeVisible();
    
    // 选择交易对
    await page.selectOption('select', 'ETH/USD');
    await page.waitForTimeout(2000);
    
    // 验证价格表格
    await expect(page.locator('table')).toBeVisible();
  });

  test('should show price deviation', async ({ page }) => {
    await page.goto('/oracle/dashboard');
    await page.click('text=对比');
    
    await page.selectOption('select', 'BTC/USD');
    await page.waitForTimeout(2000);
    
    // 检查统计信息
    await expect(page.locator('text=平均价格')).toBeVisible();
    await expect(page.locator('text=中位数')).toBeVisible();
    await expect(page.locator('text=价格范围')).toBeVisible();
  });
});

// ============================================================================
// 告警管理测试
// ============================================================================

test.describe('Alert Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display alerts', async ({ page }) => {
    await page.goto('/oracle/dashboard');
    await page.click('text=告警');
    
    await expect(page.locator('text=告警管理')).toBeVisible();
  });

  test('should filter alerts by severity', async ({ page }) => {
    await page.goto('/oracle/dashboard');
    await page.click('text=告警');
    
    await page.selectOption('select:has-text("所有级别")', 'critical');
    await page.waitForTimeout(1000);
    
    // 验证筛选结果
    const alerts = page.locator('[data-testid="alert-item"]');
    const count = await alerts.count();
    
    if (count > 0) {
      await expect(alerts.first().locator('text=critical')).toBeVisible();
    }
  });

  test('should acknowledge alert', async ({ page }) => {
    await page.goto('/oracle/dashboard');
    await page.click('text=告警');
    
    // 查找未处理的告警
    const acknowledgeButton = page.locator('button:has-text("确认")').first();
    
    if (await acknowledgeButton.isVisible()) {
      await acknowledgeButton.click();
      await page.waitForTimeout(1000);
      
      // 验证状态更新
      await expect(page.locator('text=acknowledged')).toBeVisible();
    }
  });
});

// ============================================================================
// SLA 监控测试
// ============================================================================

test.describe('SLA Monitoring', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display SLA dashboard', async ({ page }) => {
    await page.goto('/oracle/sla');
    
    await expect(page.locator('text=SLA 监控面板')).toBeVisible();
    await expect(page.locator('text=整体合规率')).toBeVisible();
    await expect(page.locator('text=合规协议')).toBeVisible();
    await expect(page.locator('text=风险协议')).toBeVisible();
    await expect(page.locator('text=违约协议')).toBeVisible();
  });

  test('should show SLA reports', async ({ page }) => {
    await page.goto('/oracle/sla');
    
    await expect(page.locator('text=协议 SLA 报告')).toBeVisible();
    
    // 检查报告卡片
    const reports = page.locator('[data-testid="sla-report"]');
    const count = await reports.count();
    
    if (count > 0) {
      await expect(reports.first().locator('text=正常运行时间')).toBeVisible();
      await expect(reports.first().locator('text=平均延迟')).toBeVisible();
    }
  });

  test('should refresh SLA data', async ({ page }) => {
    await page.goto('/oracle/sla');
    
    await page.click('button:has-text("刷新")');
    await expect(page.locator('.animate-spin')).toBeVisible();
    await expect(page.locator('.animate-spin')).not.toBeVisible();
  });
});

// ============================================================================
// GraphQL API 测试
// ============================================================================

test.describe('GraphQL API', () => {
  test('should fetch price feeds via GraphQL', async ({ request }) => {
    const response = await request.post('/api/graphql', {
      data: {
        query: `
          query {
            priceFeeds(limit: 5) {
              id
              protocol
              chain
              symbol
              price
              timestamp
            }
          }
        `,
      },
    });

    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.data).toBeDefined();
    expect(data.data.priceFeeds).toBeInstanceOf(Array);
  });

  test('should fetch oracle instances via GraphQL', async ({ request }) => {
    const response = await request.post('/api/graphql', {
      data: {
        query: `
          query {
            oracleInstances(limit: 5) {
              id
              name
              protocol
              chain
              enabled
            }
          }
        `,
      },
    });

    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.data).toBeDefined();
    expect(data.data.oracleInstances).toBeInstanceOf(Array);
  });

  test('should fetch global stats via GraphQL', async ({ request }) => {
    const response = await request.post('/api/graphql', {
      data: {
        query: `
          query {
            globalStats {
              totalInstances
              activeInstances
              totalProtocols
              totalChains
              totalPriceUpdates1h
              activeAlerts
              systemHealth
            }
          }
        `,
      },
    });

    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.data).toBeDefined();
    expect(data.data.globalStats).toBeDefined();
    expect(typeof data.data.globalStats.totalInstances).toBe('number');
  });
});

// ============================================================================
// REST API 测试
// ============================================================================

test.describe('REST API', () => {
  test('should get unified overview', async ({ request }) => {
    const response = await request.get('/api/oracle/unified?action=overview');
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.instances).toBeDefined();
    expect(data.prices).toBeDefined();
    expect(data.sync).toBeDefined();
    expect(data.alerts).toBeDefined();
  });

  test('should get protocols list', async ({ request }) => {
    const response = await request.get('/api/oracle/unified?action=protocols');
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.protocols).toBeInstanceOf(Array);
    expect(data.protocols.length).toBeGreaterThan(0);
  });

  test('should get alerts', async ({ request }) => {
    const response = await request.get('/api/oracle/unified?action=alerts');
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.alerts).toBeInstanceOf(Array);
  });
});

// ============================================================================
// 性能测试
// ============================================================================

test.describe('Performance', () => {
  test('dashboard should load within 3 seconds', async ({ page }) => {
    const start = Date.now();
    
    await login(page);
    await page.goto('/oracle/dashboard');
    await page.waitForLoadState('networkidle');
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(3000);
  });

  test('price comparison should load within 2 seconds', async ({ page }) => {
    await login(page);
    
    const start = Date.now();
    await page.goto('/oracle/dashboard');
    await page.click('text=对比');
    await page.waitForSelector('text=跨协议价格对比');
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
  });
});

// ============================================================================
// 响应式测试
// ============================================================================

test.describe('Responsive Design', () => {
  test('should display correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await login(page);
    
    await page.goto('/oracle/dashboard');
    
    // 验证移动端布局
    await expect(page.locator('text=通用预言机监控平台')).toBeVisible();
    
    // 检查统计卡片是否垂直排列
    const cards = page.locator('[data-testid="stat-card"]');
    const firstCard = await cards.first().boundingBox();
    const secondCard = await cards.nth(1).boundingBox();
    
    if (firstCard && secondCard) {
      expect(secondCard.y).toBeGreaterThan(firstCard.y);
    }
  });

  test('should display correctly on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await login(page);
    
    await page.goto('/oracle/dashboard');
    await expect(page.locator('text=通用预言机监控平台')).toBeVisible();
  });
});
