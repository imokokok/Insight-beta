# Insight 开发者指南

## 目录

1. [快速开始](#快速开始)
2. [开发环境配置](#开发环境配置)
3. [项目结构](#项目结构)
4. [编码规范](#编码规范)
5. [API 开发](#api-开发)
6. [组件开发](#组件开发)
7. [测试指南](#测试指南)
8. [调试技巧](#调试技巧)
9. [性能优化](#性能优化)
10. [常见问题](#常见问题)

## 快速开始

### 环境要求

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Git

### 安装步骤

```bash
# 克隆仓库
git clone <repository-url>
cd insight-beta

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 文件，填写必要的配置

# 运行数据库迁移
npm run supabase:provision

# 编译智能合约
npm run contracts:compile

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000 查看应用。

## 开发环境配置

### 推荐 IDE 设置

#### VS Code 扩展

- **ESLint** - 代码质量检查
- **Prettier** - 代码格式化
- **Tailwind CSS IntelliSense** - CSS 类名提示
- **TypeScript Importer** - 自动导入
- **GitLens** - Git 增强

#### VS Code 设置

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "non-relative"
}
```

### 环境变量配置

#### 必需的环境变量

```bash
# 数据库
INSIGHT_DATABASE_URL=postgresql://user:password@localhost:5432/insight

# Redis
INSIGHT_REDIS_URL=redis://localhost:6379

# 区块链 RPC
INSIGHT_POLYGON_RPC_URL=https://polygon-rpc.com
INSIGHT_ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc

# 安全
INSIGHT_ADMIN_TOKEN=your-secure-admin-token
INSIGHT_JWT_SECRET=your-jwt-secret

# 可选：监控
SENTRY_DSN=your-sentry-dsn
```

## 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   ├── oracle/            # 预言机页面
│   ├── disputes/          # 争议页面
│   └── layout.tsx         # 根布局
├── components/            # React 组件
│   ├── ui/               # 基础 UI 组件
│   └── features/         # 功能组件
├── hooks/                # 自定义 Hooks
├── lib/                  # 工具库
│   ├── types/           # TypeScript 类型
│   ├── utils/           # 工具函数
│   └── config/          # 配置
├── server/              # 服务端逻辑
│   ├── oracle/          # 预言机服务
│   └── apiResponse/     # API 响应处理
└── i18n/               # 国际化
```

## 编码规范

### TypeScript 规范

#### 类型定义

```typescript
// ✅ 好的做法：使用接口定义对象类型
interface User {
  id: string;
  name: string;
  email: string;
}

// ✅ 好的做法：使用类型别名定义联合类型
type Status = 'pending' | 'active' | 'inactive';

// ❌ 避免：使用 any
type BadExample = any;

// ✅ 好的做法：使用 unknown 并类型收窄
function processData(data: unknown) {
  if (typeof data === 'string') {
    return data.toUpperCase();
  }
}
```

#### 函数定义

```typescript
// ✅ 好的做法：明确返回类型
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ✅ 好的做法：使用异步函数
async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch user');
  }
  return response.json();
}

// ✅ 好的做法：使用默认参数
function greet(name: string, greeting: string = 'Hello'): string {
  return `${greeting}, ${name}!`;
}
```

### React 组件规范

#### 组件结构

```typescript
// ✅ 好的做法：使用函数组件
import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
  disabled?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  onClick,
  disabled = false,
}: ButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = useCallback(async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);
    try {
      await onClick?.();
    } finally {
      setIsLoading(false);
    }
  }, [disabled, isLoading, onClick]);

  return (
    <button
      className={cn(
        'px-4 py-2 rounded-lg font-medium',
        variant === 'primary' && 'bg-blue-600 text-white',
        variant === 'secondary' && 'bg-gray-200 text-gray-800',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      onClick={handleClick}
      disabled={disabled || isLoading}
    >
      {isLoading ? 'Loading...' : children}
    </button>
  );
}
```

#### Hooks 规范

```typescript
// ✅ 好的做法：自定义 Hook
import { useState, useEffect } from 'react';
import { useSWR } from 'swr';

interface UseOracleDataOptions {
  refreshInterval?: number;
  revalidateOnFocus?: boolean;
}

export function useOracleData(options: UseOracleDataOptions = {}) {
  const { refreshInterval = 5000, revalidateOnFocus = true } = options;

  const { data, error, isLoading, mutate } = useSWR('/api/oracle/stats', fetcher, {
    refreshInterval,
    revalidateOnFocus,
  });

  return {
    data,
    error,
    isLoading,
    refresh: mutate,
  };
}

// ✅ 好的做法：使用 useCallback 缓存函数
const handleSubmit = useCallback(async (values: FormValues) => {
  try {
    await submitForm(values);
    showToast('Success');
  } catch (error) {
    showToast('Error');
  }
}, []);

// ✅ 好的做法：使用 useMemo 缓存计算
const filteredItems = useMemo(() => {
  return items.filter((item) => item.status === filterStatus);
}, [items, filterStatus]);
```

## API 开发

### API 路由结构

```typescript
// src/app/api/oracle/assertions/route.ts
import { handleApi, rateLimit, requireAdmin } from '@/server/apiResponse';
import { z } from 'zod';

// 定义请求参数验证 schema
const querySchema = z.object({
  status: z.enum(['Pending', 'Disputed', 'Resolved']).optional(),
  limit: z.coerce.number().min(1).max(100).default(30),
  cursor: z.coerce.number().min(0).default(0),
});

/**
 * @swagger
 * /api/oracle/assertions:
 *   get:
 *     summary: 获取断言列表
 *     tags: [Assertions]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, Disputed, Resolved]
 *     responses:
 *       200:
 *         description: 成功获取断言列表
 */
export async function GET(request: Request) {
  return handleApi(request, async () => {
    // 1. 速率限制检查
    const limited = await rateLimit(request, {
      key: 'assertions_get',
      limit: 120,
      windowMs: 60_000,
    });
    if (limited) return limited;

    // 2. 解析和验证参数
    const url = new URL(request.url);
    const params = querySchema.parse(Object.fromEntries(url.searchParams));

    // 3. 业务逻辑
    const { items, total, nextCursor } = await listAssertions(params);

    // 4. 返回响应
    return {
      success: true,
      data: { items, total, nextCursor },
    };
  });
}
```

### 错误处理

```typescript
import { AppError, ValidationError, NotFoundError } from '@/lib/errors';

// ✅ 好的做法：使用自定义错误类
export async function GET(request: Request) {
  return handleApi(request, async () => {
    try {
      const data = await fetchData();
      return { success: true, data };
    } catch (error) {
      if (error instanceof ValidationError) {
        return { success: false, error: error.message, code: 'VALIDATION_ERROR' };
      }
      if (error instanceof NotFoundError) {
        return { success: false, error: error.message, code: 'NOT_FOUND' };
      }
      throw error; // 让全局错误处理器处理
    }
  });
}
```

## 组件开发

### 组件分类

#### 1. 基础 UI 组件

```typescript
// src/components/ui/button.tsx
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium',
          'focus-visible:outline-none focus-visible:ring-2',
          'disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-blue-600 text-white hover:bg-blue-700': variant === 'default',
            'bg-red-600 text-white hover:bg-red-700': variant === 'destructive',
            'border border-gray-300 bg-transparent': variant === 'outline',
            'h-9 px-4 py-2': size === 'default',
            'h-8 px-3 text-sm': size === 'sm',
            'h-10 px-6': size === 'lg',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
```

#### 2. 功能组件

```typescript
// src/components/features/assertion/AssertionCard.tsx
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/LanguageProvider';
import type { Assertion } from '@/lib/types';

interface AssertionCardProps {
  assertion: Assertion;
  onDispute?: (id: string) => void;
}

export function AssertionCard({ assertion, onDispute }: AssertionCardProps) {
  const { t } = useI18n();
  const [isDisputing, setIsDisputing] = useState(false);

  const handleDispute = async () => {
    setIsDisputing(true);
    try {
      await onDispute?.(assertion.id);
    } finally {
      setIsDisputing(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold">{assertion.market}</h3>
          <p className="text-gray-500 mt-1">
            {t('oracle.card.bond')}: {assertion.bondUsd}
          </p>
        </div>
        <Button
          variant="destructive"
          onClick={handleDispute}
          disabled={isDisputing}
        >
          {isDisputing ? t('common.loading') : t('oracle.dispute')}
        </Button>
      </div>
    </Card>
  );
}
```

## 测试指南

### 单元测试

```typescript
// src/components/features/assertion/AssertionCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AssertionCard } from './AssertionCard';

const mockAssertion = {
  id: 'test-1',
  market: 'Test Market',
  bondUsd: 1000,
  status: 'Pending',
};

describe('AssertionCard', () => {
  it('renders assertion details', () => {
    render(<AssertionCard assertion={mockAssertion} />);

    expect(screen.getByText('Test Market')).toBeInTheDocument();
    expect(screen.getByText(/1000/)).toBeInTheDocument();
  });

  it('calls onDispute when dispute button clicked', async () => {
    const onDispute = vi.fn();
    render(<AssertionCard assertion={mockAssertion} onDispute={onDispute} />);

    const button = screen.getByText('oracle.dispute');
    fireEvent.click(button);

    expect(onDispute).toHaveBeenCalledWith('test-1');
  });

  it('disables button while disputing', () => {
    render(<AssertionCard assertion={mockAssertion} />);

    const button = screen.getByText('oracle.dispute');
    fireEvent.click(button);

    expect(button).toBeDisabled();
  });
});
```

### API 测试

```typescript
// src/app/api/oracle/assertions/route.test.ts
import { describe, it, expect, vi } from 'vitest';
import { GET } from './route';

vi.mock('@/server/oracle', () => ({
  listAssertions: vi.fn().mockResolvedValue({
    items: [],
    total: 0,
    nextCursor: null,
  }),
}));

describe('GET /api/oracle/assertions', () => {
  it('returns assertions list', async () => {
    const request = new Request('http://localhost:3000/api/oracle/assertions');
    const response = await GET(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.items).toEqual([]);
  });

  it('validates query parameters', async () => {
    const request = new Request('http://localhost:3000/api/oracle/assertions?limit=invalid');
    const response = await GET(request);

    expect(response.status).toBe(400);
  });
});
```

### E2E 测试

```typescript
// tests/assertions.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Assertions Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/oracle');
  });

  test('displays assertions list', async ({ page }) => {
    await expect(page.locator('[data-testid="assertion-list"]')).toBeVisible();
  });

  test('can filter by status', async ({ page }) => {
    await page.click('[data-testid="status-filter"]');
    await page.click('text=Pending');

    await expect(page.locator('[data-testid="assertion-card"]')).toHaveCount(
      await page.locator('[data-testid="assertion-card"]').count(),
    );
  });

  test('can create new assertion', async ({ page }) => {
    await page.click('[data-testid="create-assertion-button"]');
    await page.fill('[name="market"]', 'Test Market');
    await page.fill('[name="bond"]', '1000');
    await page.click('[data-testid="submit-button"]');

    await expect(page.locator('text=Assertion created')).toBeVisible();
  });
});
```

## 调试技巧

### 使用 React DevTools

1. 安装 React DevTools 浏览器扩展
2. 查看组件树和 Props
3. 检查 Hooks 状态
4. 性能分析

### 使用 VS Code 调试

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "npm run dev"
    },
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    }
  ]
}
```

### 日志调试

```typescript
// 使用 logger 而不是 console.log
import { logger } from '@/lib/logger';

// ✅ 好的做法：使用结构化日志
logger.info('Processing assertion', {
  assertionId: id,
  status,
  timestamp: new Date().toISOString(),
});

logger.error('Failed to process assertion', {
  assertionId: id,
  error: error.message,
  stack: error.stack,
});
```

## 性能优化

### 组件优化

```typescript
// ✅ 使用 React.memo 避免不必要的重渲染
import { memo } from 'react';

export const ExpensiveComponent = memo(
  function ExpensiveComponent({ data }) {
    // 组件逻辑
  },
  (prevProps, nextProps) => {
    // 自定义比较函数
    return prevProps.id === nextProps.id;
  },
);

// ✅ 使用 useMemo 缓存计算
const sortedData = useMemo(() => {
  return [...data].sort((a, b) => b.timestamp - a.timestamp);
}, [data]);

// ✅ 使用 useCallback 缓存回调
const handleClick = useCallback(
  (id: string) => {
    router.push(`/oracle/${id}`);
  },
  [router],
);
```

### 数据获取优化

```typescript
// ✅ 使用 SWR 进行数据缓存
import useSWR from 'swr';

function useAssertions() {
  return useSWR(
    '/api/oracle/assertions',
    fetcher,
    {
      refreshInterval: 5000,
      revalidateOnFocus: false,
      dedupingInterval: 2000,
    }
  );
}

// ✅ 使用分页和虚拟滚动
import { Virtuoso } from 'react-virtuoso';

function AssertionList({ items }) {
  return (
    <Virtuoso
      useWindowScroll
      data={items}
      endReached={loadMore}
      overscan={200}
      itemContent={(index, item) => (
        <AssertionCard key={item.id} assertion={item} />
      )}
    />
  );
}
```

### 图片优化

```typescript
// ✅ 使用 Next.js Image 组件
import Image from 'next/image';

function Avatar({ src, alt }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={40}
      height={40}
      className="rounded-full"
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,..."
    />
  );
}
```

## 常见问题

### Q: 如何解决 "Module not found" 错误？

A: 检查 tsconfig.json 中的 paths 配置：

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Q: 如何添加新的 API 路由？

A: 在 `src/app/api/` 下创建对应的目录结构，例如：

```
src/app/api/oracle/new-feature/route.ts
```

### Q: 如何添加新的组件？

A:

1. 基础组件放在 `src/components/ui/`
2. 功能组件放在 `src/components/features/{feature-name}/`
3. 记得添加对应的测试文件

### Q: 如何运行特定测试？

A:

```bash
# 运行特定文件
npm test src/components/features/assertion/AssertionCard.test.tsx

# 运行特定测试
npm test -- -t "should render"

# 运行 E2E 测试
npm run test:e2e
```

### Q: 如何提交代码？

A: 使用 Conventional Commits 规范：

```bash
# 功能提交
git commit -m "feat: add new assertion filter"

# 修复提交
git commit -m "fix: resolve dispute status update issue"

# 文档提交
git commit -m "docs: update API documentation"
```

## 资源链接

- [Next.js 文档](https://nextjs.org/docs)
- [React 文档](https://react.dev)
- [TypeScript 文档](https://www.typescriptlang.org/docs)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [项目架构文档](./ARCHITECTURE.md)
- [API 文档](http://localhost:3000/docs)

## 贡献指南

1. Fork 仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 获取帮助

- 查看 [GitHub Issues](https://github.com/your-org/insight/issues)
- 加入 Discord 社区
- 联系开发团队
