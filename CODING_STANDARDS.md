# Insight 代码规范

本文档定义了 Insight 项目的代码规范和最佳实践，所有贡献者都应遵循这些规范。

## 目录

1. [项目概述](#项目概述)
2. [代码风格与格式](#代码风格与格式)
3. [TypeScript 规范](#typescript-规范)
4. [React 与 Next.js 规范](#react-与-nextjs-规范)
5. [目录结构规范](#目录结构规范)
6. [命名规范](#命名规范)
7. [Git 提交规范](#git-提交规范)
8. [测试规范](#测试规范)
9. [安全规范](#安全规范)
10. [性能规范](#性能规范)
11. [文档规范](#文档规范)

---

## 项目概述

Insight 是一个基于区块链的预言机平台，前端采用 Next.js 15 + React 19 + TypeScript 5 构建，后端使用 Next.js API Routes，智能合约使用 Solidity + Hardhat。技术栈包括 Tailwind CSS、viem、zod 等现代化工具链。

---

## 代码风格与格式

### 基本原则

代码格式遵循 Prettier 默认配置，使用 ESLint 进行代码质量检查。所有代码在提交前必须通过格式检查和 lint 检查。使用 `npm run format:write` 自动格式化代码，使用 `npm run lint` 检查代码问题。

### 缩进与空格

使用两个空格缩进，不使用 Tab 字符。在文件末尾保留一个空行。方法之间使用一个空行分隔，方法内部逻辑相关的代码可以不留空行，不相关的逻辑使用一个空行分隔。行宽限制为 100 个字符，超过时应换行对齐。

### 引号与分号

使用单引号（`'`）包裹字符串，不使用双引号或反引号。所有语句必须以分号结尾，包括 `const`、`let` 声明。解构赋值时保持一致的格式，必要时换行对齐。

```typescript
// 正确示例
const componentName = 'InsightOracle';
const items = ['a', 'b', 'c'];
const data = {
  id: 1,
  name: 'test',
};

// 错误示例
const componentName = 'InsightOracle';
const items = ['a', 'b', 'c'];
const data = { id: 1, name: 'test' };
```

### 括号与空格

在大括号风格上使用 1TBS（One True Brace Style），即左大括号不换行。控制语句（if、for、while 等）的条件括号内侧不加空格，外侧加空格。函数调用和定义时，参数列表的括号内侧不加空格。

```typescript
// 正确示例
if (condition) {
  doSomething();
}

function processData(input: string): void {
  // 处理逻辑
}

// 错误示例
if (condition) {
  doSomething();
}

function processData(input: string): void {
  // 处理逻辑
}
```

---

## TypeScript 规范

### 类型推断与显式类型

优先使用类型推断，但在以下情况下必须显式声明类型：函数参数和返回值、公共 API 的导出函数和变量、复杂对象结构的属性。避免使用 `any` 类型，使用 `unknown` 替代需要类型安全的地方。使用类型断言时优先使用 `as` 语法而非 `<Type>` 语法。

```typescript
// 正确示例
interface User {
  id: string;
  name: string;
  email: string;
}

function fetchUser(id: string): Promise<User> {
  return api.get(`/users/${id}`);
}

// 错误示例
function fetchUser(id: any): Promise<any> {
  return api.get(`/users/${id}`);
}
```

### 泛型使用

泛型命名应使用有意义的单字母或描述性名称。常用的泛型参数命名约定如下：T 用于通用类型，K 用于键类型，V 用于值类型，E 用于元素类型。使用约束（extends）来限制泛型类型参数的范围。

```typescript
// 正确示例
function getItem<T>(items: T[], index: number): T | undefined {
  return items[index];
}

interface Cache<K extends string, V> {
  get(key: K): V | undefined;
  set(key: K, value: V): void;
}
```

### 类型导入

使用 `import type` 导入仅用于类型定义的符号，使用 `import` 导入同时用于值和类型的符号。这有助于优化打包体积并明确意图。

```typescript
import type { User, Role } from '@/types/user';
import { createUser } from '@/lib/user';
```

### 严格模式

始终启用 TypeScript 的严格模式配置，包括 `strict: true`、`noUncheckedIndexedAccess: true`、`noImplicitReturns: true`、`noFallthroughCasesInSwitch: true`、`noUnusedLocals: true`、`noUnusedParameters: true`。这些配置在项目的 `tsconfig.json` 中已启用。

---

## React 与 Next.js 规范

### 组件分类

组件分为三类：服务端组件（Server Components）、客户端组件（Client Components）和共享组件（Shared Components）。服务端组件默认使用，不包含交互逻辑；客户端组件使用 `"use client"` 指令声明，包含状态、副作用或事件处理；共享组件应设计为无状态的，支持服务端和客户端渲染。

### 组件文件结构

每个组件应包含主组件文件、类型定义和样式。组件文件使用 PascalCase 命名，如 `OracleCard.tsx`。关联的类型定义可以放在同一文件中，或单独的 `types.ts` 文件中。组件的样式使用 Tailwind CSS，通过 `className` 属性传递。

```typescript
// src/components/features/oracle/OracleCard.tsx
"use client";

import { cn } from "@/lib/utils";
import type { Oracle } from "@/lib/types/oracle";

interface OracleCardProps {
  oracle: Oracle;
  className?: string;
}

export function OracleCard({ oracle, className }: OracleCardProps) {
  return (
    <div className={cn("card-base", className)}>
      <h3>{oracle.name}</h3>
    </div>
  );
}
```

### Hooks 使用规范

使用 React Hooks 时遵循以下规则：只在组件顶层或自定义 Hook 中调用 Hooks。自定义 Hook 名称必须以 `use` 开头，如 `useOracleData`。将复杂的组件逻辑抽取为自定义 Hook，提高代码可读性和可维护性。状态管理优先使用本地状态和 Context，避免不必要的全局状态。

```typescript
// src/hooks/oracle/useOracleData.ts
'use client';

import { useState, useEffect } from 'react';
import type { Oracle } from '@/lib/types/oracle';

export function useOracleData(oracleId: string) {
  const [data, setData] = useState<Oracle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await fetchOracle(oracleId);
        setData(result);
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [oracleId]);

  return { data, loading, error };
}
```

### 错误处理

使用 Error Boundary 捕获组件渲染错误，在 API 调用处进行适当的错误处理和用户提示。定义自定义错误类以区分不同类型的错误，便于错误分类和用户通知。

```typescript
// src/lib/errors/appErrors.ts
export class ApiClientError extends Error {
  code: string;
  details?: unknown;

  constructor(code: string, details?: unknown) {
    super(code);
    this.code = code;
    this.details = details;
  }
}
```

### 性能优化

使用 `React.memo` 包装纯展示组件避免不必要的重渲染。使用 `useMemo` 和 `useCallback` 缓存计算结果和回调函数。大型列表使用虚拟滚动（react-virtuoso）优化渲染性能。图片和静态资源使用 Next.js Image 组件优化加载。

```typescript
import { memo, useCallback, useMemo } from "react";

interface ExpensiveComponentProps {
  data: number[];
  onItemClick: (id: string) => void;
}

export const ExpensiveComponent = memo(function ExpensiveComponent({
  data,
  onItemClick,
}: ExpensiveComponentProps) {
  const processedData = useMemo(() => {
    return data.map((item) => transform(item));
  }, [data]);

  const handleClick = useCallback(
    (id: string) => {
      onItemClick(id);
    },
    [onItemClick],
  );

  return <div>{/* render content */}</div>;
});
```

---

## 目录结构规范

### 根目录结构

项目的根目录包含配置文件（`package.json`、`tsconfig.json`、`next.config.ts` 等）、文档（`README.md`、`docs/`）、脚本（`scripts/`）、智能合约（`contracts/`）和源代码（`src/`）。

### 源代码结构

`src/` 目录采用功能驱动的目录结构：

```
src/
├── app/              # Next.js App Router 页面
│   ├── api/          # API 路由
│   └── [feature]/    # 功能页面
├── components/       # React 组件
│   ├── features/     # 功能组件
│   └── ui/           # 基础 UI 组件
├── contexts/         # React Context
├── hooks/            # 自定义 Hooks
├── i18n/             # 国际化
├── lib/              # 工具库
│   ├── api/          # API 相关
│   ├── blockchain/   # 区块链相关
│   ├── config/       # 配置
│   ├── types/        # 类型定义
│   └── utils/        # 工具函数
└── server/           # 服务端逻辑
```

### 组件目录规范

功能组件按模块组织，每个模块包含相关组件、类型定义和工具函数。基础 UI 组件独立于业务逻辑，可复用于多个功能模块。组件目录结构示例：

```
src/components/features/oracle/
├── OracleCharts.tsx
├── OracleStatsBanner.tsx
├── OracleHealthScore.tsx
└── types.ts
```

---

## 命名规范

### 文件命名

TypeScript/TSX 文件使用 PascalCase 命名，如 `OracleCard.tsx`。配置文件使用 kebab-case 命名，如 `next.config.ts`。脚本文件使用 camelCase 命名，如 `deploy.js`。测试文件添加 `.test.tsx` 或 `.spec.ts` 后缀。

### 变量与常量命名

变量和函数使用 camelCase 命名，如 `oracleData`、`fetchUserData`。常量使用 SCREAMING_SNAKE_CASE 命名，如 `MAX_RETRY_COUNT`、`DEFAULT_TIMEOUT`。布尔值变量使用 `is`、`has`、`can` 等前缀，如 `isLoading`、`hasError`、`canSubmit`。

### 接口与类型命名

接口和类型使用 PascalCase 命名。接口名称使用完整描述性名词，可添加 `I` 前缀或直接使用名词。类型别名使用描述性名称。泛型参数使用单个大写字母。

```typescript
interface IUserRepository {
  findById(id: string): Promise<User | null>;
}

type UserStatus = 'active' | 'inactive' | 'pending';

type ApiResponse<T> = {
  data: T;
  success: boolean;
};
```

### CSS 类名命名

使用 Tailwind CSS 时，遵循以下命名模式：布局类名使用语义化名称如 `container`、`sidebar`。组件包装类使用组件名如 `oracle-card-wrapper`。工具类组合使用 `cn()` 函数管理。

---

## Git 提交规范

### 提交信息格式

提交信息使用 Conventional Commits 格式，包含类型、范围和描述三部分。类型包括 `feat`（新功能）、`fix`（修复 bug）、`docs`（文档更新）、`style`（格式调整）、`refactor`（重构）、`test`（测试）、`chore`（构建或辅助工具）。范围描述受影响的模块，如 `oracle`、`api`、`ui`。

```
feat(oracle): add sync status indicator
fix(api): resolve rate limit issue
docs(readme): update installation guide
```

### 分支命名

主分支使用 `main` 命名。功能分支使用 `feature/` 前缀，如 `feature/add-oracle-filter`。修复分支使用 `fix/` 前缀，如 `fix/memory-leak`。实验分支使用 `experiment/` 前缀，如 `experiment/new-ui`。

### 提交前检查

在提交代码前，确保运行以下检查：通过 `npm run lint` 检查代码质量问题，通过 `npm run typecheck` 检查类型错误，通过 `npm run format:check` 检查代码格式，运行相关测试确保功能正常。不提交 `.env.local` 等敏感文件。

---

## 测试规范

### 测试框架

单元测试使用 Vitest + React Testing Library，E2E 测试使用 Playwright。测试文件与源文件同名，添加 `.test.tsx` 或 `.test.ts` 后缀，放在源文件同目录或 `__tests__` 目录。

### 测试覆盖率

核心业务逻辑测试覆盖率应达到 80% 以上。公共 API 接口必须编写测试。边缘情况和错误处理路径也需要测试。运行 `npm run test:coverage` 查看测试覆盖率报告。

### 测试编写原则

每个测试用例应遵循 Arrange-Act-Assert 模式。测试应该独立运行，不依赖其他测试的执行顺序。使用有意义的测试描述，明确测试意图。避免测试实现细节，专注于行为验证。

```typescript
// 正确示例
describe("OracleCard", () => {
  it("should display oracle name and status", () => {
    const oracle: Oracle = { id: "1", name: "Test Oracle", status: "active" };
    render(<OracleCard oracle={oracle} />);

    expect(screen.getByText("Test Oracle")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("should handle loading state", () => {
    render(<OracleCard loading />);

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });
});
```

---

## 安全规范

### 输入验证

所有用户输入必须经过验证和清理。使用 Zod 进行表单数据和 API 请求体验证。服务端不能信任客户端发送的任何数据，包括 headers、cookies 和 query parameters。对用户输入进行适当的转义和过滤，防止 XSS 攻击。

```typescript
import { z } from 'zod';

const CreateAssertionSchema = z.object({
  assertionType: z.enum(['binary', 'numeric']),
  value: z.string().min(1).max(1000),
  expirationTime: z.number().positive(),
});

export async function createAssertion(data: unknown) {
  const result = CreateAssertionSchema.safeParse(data);
  if (!result.success) {
    throw new ApiClientError('invalid_input', result.error.format());
  }
  // 处理验证通过的 data
}
```

### 敏感信息

敏感信息如 API 密钥、私钥等存储在环境变量中，以 `NEXT_PUBLIC_` 开头的变量会暴露给客户端。禁止在代码中硬编码敏感信息。使用 `.env.local` 存储本地开发配置，不提交到版本控制。生产环境的敏感信息通过 CI/CD 环境变量注入。

### 依赖安全

定期运行 `npm audit` 检查依赖漏洞。及时更新依赖到安全版本。避免使用已知存在安全问题的包。锁文件（`package-lock.json`）必须提交，确保构建可重现。

### 安全相关 ESLint 规则

项目已启用 ESLint 安全插件，检测常见安全问题：禁止使用 `eval()`、检测可能的时序攻击、禁止使用不安全的文件操作、禁止加载不可信的模块。

---

## 性能规范

### 渲染优化

避免不必要的重渲染，使用 `React.memo` 包装纯组件。使用 `useMemo` 和 `useCallback` 缓存计算结果和回调。大型列表使用虚拟化渲染（如 react-virtuoso）。合理使用代码分割和懒加载减少首屏体积。

```typescript
import { lazy, Suspense } from "react";

const HeavyComponent = lazy(() =>
  import("@/components/features/heavy/HeavyComponent").then((mod) => ({
    default: mod.HeavyComponent,
  })),
);

function Page() {
  return (
    <Suspense fallback={<Skeleton />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### 数据获取

使用 SWR 或 React Query 进行客户端数据获取和缓存。对于服务端渲染，使用 Next.js 的 `fetch` 和缓存机制。实现合理的错误处理和重试逻辑。对大列表实现分页或无限滚动。

```typescript
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function useOracleData(oracleId: string) {
  const { data, error, isLoading } = useSWR(`/api/oracle/${oracleId}`, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  return { data, error, isLoading };
}
```

### 构建优化

分析打包体积使用 `npm run analyze:bundle`。移除未使用的代码和依赖。合理配置 Next.js 的 `next/image` 优化图片加载。对公共代码进行分割和缓存。

---

## 文档规范

### 代码注释

遵循「为什么」而非「是什么」的原则进行注释。复杂的业务逻辑和算法必须添加注释说明设计意图。API 接口使用 JSDoc 标注参数和返回值。已弃用的代码添加 `@deprecated` 注释并说明原因。避免对显而易见的代码添加注释。

```typescript
/**
 * 计算预言机的健康评分
 * 基于同步状态、响应时间和准确率三个维度加权计算
 *
 * @param oracle - 预言机实例数据
 * @returns 健康评分（0-100）
 */
export function calculateHealthScore(oracle: Oracle): number {
  const syncScore = oracle.isSynced ? 50 : 0;
  const responseScore = Math.min(30, oracle.avgResponseTime / 100);
  const accuracyScore = (oracle.accuracy / 100) * 20;

  return syncScore + responseScore + accuracyScore;
}
```

### API 文档

API 端点应包含请求方法、路径、请求参数、响应格式和示例。使用 TypeScript 类型定义自动生成 API 文档。复杂端点提供额外的说明文档。参考 `docs/API.md` 模板编写 API 文档。

---

## 附录

### 常用命令

开发环境启动使用 `npm run dev`，构建生产版本使用 `npm run build`，运行 lint 检查使用 `npm run lint`，运行类型检查使用 `npm run typecheck`，运行单元测试使用 `npm run test`，运行 E2E 测试使用 `npm run test:e2e`，格式化代码使用 `npm run format:write`。

### 推荐的 VS Code 设置

在 VS Code 中安装以下扩展：ESLint、Prettier、TypeScript Hero、Tailwind CSS IntelliSense、GitLens。配置保存时自动格式化：Editor: Format On Save 启用，Default Formatter 设置为 Prettier。

### 资源链接

- [Next.js 文档](https://nextjs.org/docs)
- [TypeScript 文档](https://www.typescriptlang.org/docs)
- [React 文档](https://react.dev)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [ESLint 文档](https://eslint.org/docs/latest)
- [Prettier 文档](https://prettier.io/docs)
