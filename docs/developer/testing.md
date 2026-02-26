# 测试指南

本文档介绍 Insight 项目的测试策略和最佳实践。

## 概述

Insight 使用现代化的测试工具链，确保代码质量和应用稳定性：

- **Vitest**: 单元测试和集成测试框架
- **Playwright**: 端到端（E2E）测试框架
- **Testing Library**: React 组件测试工具
- **V8 Coverage**: 测试覆盖率报告

## 目录

- [测试策略](#测试策略)
- [单元测试](#单元测试)
- [组件测试](#组件测试)
- [集成测试](#集成测试)
- [E2E 测试](#e2e-测试)
- [测试覆盖率](#测试覆盖率)
- [测试最佳实践](#测试最佳实践)

---

## 测试策略

### 测试金字塔

```
        /\
       /E2E\      <-- 少量端到端测试
      /------\
     / 集成测试 \   <-- 适量集成测试
    /----------\
   /  单元测试   \  <-- 大量单元测试
  /--------------\
```

### 测试分类

| 类型     | 工具                     | 覆盖范围       | 速度 | 数量 |
| -------- | ------------------------ | -------------- | ---- | ---- |
| 单元测试 | Vitest                   | 函数、工具类   | 快   | 多   |
| 组件测试 | Vitest + Testing Library | React 组件     | 中   | 中   |
| 集成测试 | Vitest                   | API 路由、Hook | 中   | 中   |
| E2E 测试 | Playwright               | 完整用户流程   | 慢   | 少   |

---

## 单元测试

### 运行测试

```bash
# 运行所有测试（监视模式）
npm run test

# 运行所有测试（无监视模式）
npm run test:ci

# 运行特定文件
npm run test -- src/lib/utils.test.ts

# 运行特定测试用例
npm run test -- -t "函数名"

# 仅运行变更的测试
npm run test -- --changed
```

### 测试文件命名

测试文件应与源代码放在同一目录，命名为 `*.test.ts` 或 `*.spec.ts`：

```
src/
  lib/
    utils.ts
    utils.test.ts      # 单元测试
  components/
    Button.tsx
    Button.test.tsx    # 组件测试
```

### 编写单元测试

示例：测试工具函数

```typescript
import { describe, it, expect } from 'vitest';
import { formatNumber, calculatePercentage } from './utils';

describe('formatNumber', () => {
  it('should format numbers with commas', () => {
    expect(formatNumber(1000)).toBe('1,000');
  });

  it('should handle decimal numbers', () => {
    expect(formatNumber(1234.56)).toBe('1,234.56');
  });
});

describe('calculatePercentage', () => {
  it('should calculate percentage correctly', () => {
    expect(calculatePercentage(25, 100)).toBe(25);
  });

  it('should handle zero denominator', () => {
    expect(calculatePercentage(10, 0)).toBe(0);
  });
});
```

### Mock 外部依赖

```typescript
import { vi, describe, it, expect } from 'vitest';
import { fetchPrice } from './priceFetcher';

// Mock fetch
vi.mock('node-fetch');

describe('fetchPrice', () => {
  it('should fetch price successfully', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ price: 2000 }),
    });

    global.fetch = mockFetch;

    const price = await fetchPrice('ETH/USD');
    expect(price).toBe(2000);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
```

---

## 组件测试

### 使用 Testing Library

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    await fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows loading state', () => {
    render(<Button isLoading>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### 测试用户交互

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchForm from './SearchForm';

describe('SearchForm', () => {
  it('submits search query', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<SearchForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Search'), 'ETH/USD');
    await user.click(screen.getByText('Search'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('ETH/USD');
    });
  });
});
```

---

## 集成测试

### 测试 API 路由

```typescript
import { describe, it, expect } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { GET } from '@/app/api/health/route';

describe('/api/health', () => {
  it('returns healthy status', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
  });
});
```

### 测试自定义 Hook

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useCounter from './useCounter';

describe('useCounter', () => {
  it('should initialize with default value', () => {
    const { result } = renderHook(() => useCounter());
    expect(result.current.count).toBe(0);
  });

  it('should increment count', () => {
    const { result } = renderHook(() => useCounter());

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });

  it('should decrement count', () => {
    const { result } = renderHook(() => useCounter(5));

    act(() => {
      result.current.decrement();
    });

    expect(result.current.count).toBe(4);
  });
});
```

---

## E2E 测试

### 运行 E2E 测试

```bash
# 运行所有 E2E 测试
npm run test:e2e

# 运行有头模式（显示浏览器）
npm run test:e2e:headed

# 运行特定测试文件
npm run test:e2e -- e2e/smoke.spec.ts

# 运行测试并生成 trace
npm run test:e2e -- --trace on

# 查看 trace
npx playwright show-trace test-results/trace.zip
```

### 配置 Playwright

Playwright 配置位于 `playwright.config.ts`：

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

### 编写 E2E 测试

```typescript
import { test, expect } from '@playwright/test';

test.describe('首页测试', () => {
  test('应该正确加载首页', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Insight/);
    await expect(page.getByText('Oracle Analytics')).toBeVisible();
  });

  test('应该显示导航菜单', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Alerts' })).toBeVisible();
  });
});

test.describe('搜索功能', () => {
  test('应该能够搜索价格源', async ({ page }) => {
    await page.goto('/explore');

    await page.fill('[data-testid="search-input"]', 'ETH/USD');
    await page.click('[data-testid="search-button"]');

    await expect(page.getByText('ETH/USD')).toBeVisible();
  });
});

test.describe('告警功能', () => {
  test('应该能够创建告警', async ({ page }) => {
    await page.goto('/alerts');

    await page.click('text=Create Alert');
    await page.fill('[name="name"]', 'ETH Price Alert');
    await page.fill('[name="symbol"]', 'ETH/USD');
    await page.selectOption('[name="condition"]', 'deviation');
    await page.fill('[name="threshold"]', '1');
    await page.click('button[type="submit"]');

    await expect(page.getByText('Alert created successfully')).toBeVisible();
  });
});
```

### 常用 Playwright API

```typescript
// 导航
await page.goto('/path');
await page.goBack();
await page.goForward();
await page.reload();

// 元素操作
await page.click('selector');
await page.fill('selector', 'text');
await page.selectOption('selector', 'value');
await page.check('selector');
await page.uncheck('selector');

// 断言
await expect(page.locator('selector')).toBeVisible();
await expect(page.locator('selector')).toBeHidden();
await expect(page.locator('selector')).toHaveText('text');
await expect(page.locator('selector')).toHaveValue('value');
await expect(page).toHaveURL(/url/);
await expect(page).toHaveTitle(/title/);

// 等待
await page.waitForSelector('selector');
await page.waitForLoadState('networkidle');
await page.waitForTimeout(1000);
```

---

## 测试覆盖率

### 生成覆盖率报告

```bash
# 运行测试并生成覆盖率报告
npm run test:coverage

# 运行测试并打开覆盖率报告
npm run test:coverage:report
```

### 覆盖率配置

覆盖率配置位于 `vitest.config.ts`：

```typescript
coverage: {
  exclude: [
    'src/**/*.d.ts',
    'src/**/*.test.ts',
    'src/**/*.test.tsx',
    'src/types/**',
    'src/app/**/*.tsx',
    'src/i18n/**',
  ],
  include: ['src/**/*.{ts,tsx}'],
  provider: 'v8',
  reporter: ['text', 'json', 'html', 'lcov', 'cobertura'],
  reportsDirectory: './coverage',
  thresholds: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },
}
```

### 覆盖率指标

| 指标           | 说明                  | 目标 |
| -------------- | --------------------- | ---- |
| **Statements** | 代码语句覆盖率        | 80%  |
| **Branches**   | 分支覆盖率（if/else） | 80%  |
| **Functions**  | 函数覆盖率            | 80%  |
| **Lines**      | 行覆盖率              | 80%  |

### 忽略覆盖率

使用注释忽略特定代码的覆盖率检查：

```typescript
/* c8 ignore start */
function legacyFunction() {
  // 旧代码，暂不测试
}
/* c8 ignore stop */

// 忽略单行
/* c8 ignore next */
if (process.env.NODE_ENV === 'test') {
  setupMock();
}
```

---

## 测试最佳实践

### 1. 测试命名

使用描述性的测试名称：

```typescript
// ❌ 不好
it('works', () => {
  /* ... */
});

// ✅ 好
it('should format numbers with commas', () => {
  /* ... */
});
it('should throw error when input is negative', () => {
  /* ... */
});
```

### 2. AAA 模式

遵循 Arrange-Act-Assert 模式：

```typescript
it('should calculate total price', () => {
  // Arrange - 准备
  const items = [
    { price: 10, quantity: 2 },
    { price: 20, quantity: 1 },
  ];

  // Act - 执行
  const total = calculateTotal(items);

  // Assert - 断言
  expect(total).toBe(40);
});
```

### 3. 避免重复

使用 `beforeEach` 和 `afterEach`：

```typescript
describe('UserService', () => {
  let service: UserService;
  let mockDb: MockDatabase;

  beforeEach(() => {
    mockDb = createMockDatabase();
    service = new UserService(mockDb);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create user', async () => {
    await service.createUser({ name: 'Test' });
    expect(mockDb.insert).toHaveBeenCalled();
  });
});
```

### 4. 测试边界条件

```typescript
describe('validateEmail', () => {
  it('should accept valid email', () => {
    expect(validateEmail('test@example.com')).toBe(true);
  });

  it('should reject missing @', () => {
    expect(validateEmail('testexample.com')).toBe(false);
  });

  it('should reject empty string', () => {
    expect(validateEmail('')).toBe(false);
  });

  it('should reject null', () => {
    expect(validateEmail(null)).toBe(false);
  });
});
```

### 5. 不要测试实现细节

```typescript
// ❌ 测试实现
it('should call setState with correct value', () => {
  const setState = vi.fn();
  const component = render(<Counter setState={setState} />);
  component.increment();
  expect(setState).toHaveBeenCalledWith(1);
});

// ✅ 测试行为
it('should increment count', () => {
  const { result } = renderHook(() => useCounter());
  act(() => result.current.increment());
  expect(result.current.count).toBe(1);
});
```

### 6. 保持测试独立

每个测试应该独立运行，不依赖其他测试：

```typescript
// ❌ 依赖其他测试
let count = 0;

it('increments', () => {
  count++;
  expect(count).toBe(1);
});

it('decrements', () => {
  count--;
  expect(count).toBe(0); // 依赖上一个测试
});

// ✅ 独立测试
it('increments', () => {
  const counter = new Counter();
  counter.increment();
  expect(counter.count).toBe(1);
});

it('decrements', () => {
  const counter = new Counter();
  counter.count = 1;
  counter.decrement();
  expect(counter.count).toBe(0);
});
```

### 7. 使用数据驱动测试

```typescript
import { describe, it, expect } from 'vitest';

describe('add', () => {
  const testCases = [
    { a: 1, b: 2, expected: 3 },
    { a: -1, b: 1, expected: 0 },
    { a: 0, b: 0, expected: 0 },
    { a: 100, b: 200, expected: 300 },
  ];

  test.each(testCases)('add($a, $b) should return $expected', ({ a, b, expected }) => {
    expect(add(a, b)).toBe(expected);
  });
});
```

---

## CI/CD 集成

### GitHub Actions

项目配置了 GitHub Actions 用于自动测试：

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:ci
      - run: npm run test:e2e
```

### 运行 CI 检查

提交代码前，确保所有检查通过：

```bash
# 完整检查
npm run lint
npm run typecheck
npm run test:ci
npm run test:e2e
```

---

**返回 [文档总索引](../README.md)**
