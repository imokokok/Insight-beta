# 项目代码完整整理规格

## Why

项目经过长期开发，代码库已经相当庞大，需要进行系统性的整理以确保：

- 代码结构清晰、易于维护
- 遵循统一的编码规范
- 移除冗余和未使用的代码
- 优化导入和依赖关系
- 提高代码质量和可读性

## What Changes

- 审查并优化项目目录结构
- 统一代码风格和导入规范
- 清理未使用的代码、类型和导入
- 整理和优化类型定义
- 标准化组件结构
- 完善 API 路由规范
- 检查并完善测试覆盖
- 优化国际化文件

## Impact

- Affected specs: 所有功能模块
- Affected code: 整个 `src/` 目录

---

## 项目现状分析

### 一、项目结构概览

```
src/
├── app/                    # Next.js App Router
│   ├── alerts/            # 告警页面
│   ├── analytics/         # 分析页面
│   ├── api/               # API 路由 (50+ 路由)
│   ├── cross-chain/       # 跨链分析页面
│   ├── explore/           # 数据探索页面
│   ├── oracle/            # 预言机分析页面
│   └── ...                # 其他页面
├── components/            # 组件库
│   ├── charts/           # 图表组件
│   ├── common/           # 通用组件 (30+ 组件)
│   └── ui/               # 基础 UI 组件 (20+ 组件)
├── config/               # 配置文件
├── features/             # 功能模块
│   ├── alerts/          # 告警功能
│   ├── comparison/      # 价格比较
│   ├── cross-chain/     # 跨链分析
│   ├── dashboard/       # 仪表板
│   ├── explore/         # 数据探索
│   └── oracle/          # 预言机分析 (含 api3, band, chainlink, pyth 等子模块)
├── hooks/               # 自定义 Hooks (10+ hooks)
├── i18n/                # 国际化 (中英文)
├── lib/                 # 核心库
│   ├── api/            # API 工具
│   ├── blockchain/     # 区块链交互
│   ├── database/       # 数据库操作
│   ├── design-system/  # 设计系统
│   ├── errors/         # 错误处理
│   ├── monitoring/     # 监控
│   ├── security/       # 安全
│   └── shared/         # 共享工具
├── types/              # 类型定义
└── utils/              # 工具函数
```

### 二、需要整理的问题

#### 1. 导入规范问题

- 部分文件未遵循统一的导入顺序
- 存在直接从组件文件导入而非从 index 导入的情况
- 类型导入和值导入混用

#### 2. 类型定义问题

- 类型定义分散在多个位置
- 存在重复或相似的类型定义
- 部分类型缺少文档注释

#### 3. 组件结构问题

- 部分组件缺少统一的导出规范
- 组件目录结构不一致
- 缺少组件文档

#### 4. API 路由问题

- API 路由数量多 (50+)，需要审查是否有冗余
- 部分路由缺少统一的错误处理
- 缺少完整的 API 文档

#### 5. 代码质量问题

- 可能存在未使用的代码
- 部分文件可能有重复逻辑
- 需要检查测试覆盖率

---

## 整理计划

### 阶段一：代码质量检查

#### 1.1 运行代码检查工具

- 执行 `npm run lint` 检查 ESLint 问题
- 执行 `npm run typecheck` 检查 TypeScript 问题
- 分析并修复所有警告和错误

#### 1.2 清理未使用的代码

- 使用 ESLint 的 `unused-imports` 插件清理未使用的导入
- 检查并移除未使用的变量、函数和类型
- 清理未使用的文件

### 阶段二：导入规范统一

#### 2.1 统一导入顺序

按照 ESLint 配置的 `import/order` 规则：

1. 内置模块 (react, next)
2. 外部模块 (第三方库)
3. 内部模块 (@/\*)
4. 相对导入

#### 2.2 统一导入方式

- UI 组件：从 `@/components/ui` 导入
- 通用组件：从 `@/components/common` 导入
- 类型导入：使用 `import type { ... }`

### 阶段三：类型定义整理

#### 3.1 审查类型文件

- 检查 `src/types/` 目录下的类型定义
- 检查各功能模块内的类型定义
- 识别重复或相似的类型

#### 3.2 优化类型组织

- 将共享类型移至 `src/types/`
- 将模块特定类型保留在功能模块内
- 添加必要的类型文档注释

### 阶段四：组件结构标准化

#### 4.1 审查组件目录结构

- 检查组件是否遵循统一的目录结构
- 确保每个组件都有 index.ts 导出

#### 4.2 组件分类整理

- UI 组件：基础原子组件
- 通用组件：可复用的业务组件
- 功能组件：特定功能的组件

### 阶段五：API 路由审查

#### 5.1 审查 API 路由

- 检查所有 API 路由的使用情况
- 识别冗余或废弃的路由
- 确保统一的错误处理和响应格式

#### 5.2 完善 API 文档

- 确保所有 API 都有 Swagger 文档
- 添加缺失的 API 描述和参数说明

### 阶段六：国际化文件整理

#### 6.1 审查国际化文件

- 检查中英文翻译是否完整对应
- 清理未使用的翻译键
- 确保翻译键命名规范

### 阶段七：测试覆盖检查

#### 7.1 检查测试覆盖

- 运行 `npm run test:coverage` 检查覆盖率
- 识别缺少测试的关键模块
- 补充必要的测试

---

## 整理标准

### 导入规范

```typescript
// ✅ 正确的导入顺序
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { Card, Badge } from '@/components/ui';
import { StatCard, EmptyState } from '@/components/common';
import { useAlerts } from '@/features/alerts';
import type { Alert, AlertRule } from '@/types';
```

### 类型定义规范

```typescript
// ✅ 使用 type 关键字定义类型
export type AlertStatus = 'active' | 'resolved' | 'pending';

// ✅ 使用 interface 定义对象类型
export interface Alert {
  id: string;
  status: AlertStatus;
  createdAt: Date;
}

// ✅ 添加 JSDoc 注释
/**
 * 告警配置规则
 */
export interface AlertRule {
  /** 规则 ID */
  id: string;
  /** 告警阈值 */
  threshold: number;
}
```

### 组件结构规范

```typescript
// ✅ 标准组件结构
import { useState } from 'react';

import { Card } from '@/components/ui';
import type { ComponentProps } from './types';

export interface MyComponentProps {
  title: string;
  value?: number;
}

export function MyComponent({ title, value = 0 }: MyComponentProps) {
  return (
    <Card>
      <h2>{title}</h2>
      <span>{value}</span>
    </Card>
  );
}
```

### API 路由规范

```typescript
// ✅ 标准 API 路由结构
import { NextResponse } from 'next/server';

import { withErrorHandling } from '@/lib/api/middleware';
import { validateRequest } from '@/lib/api/validation';

export async function GET(request: Request) {
  return withErrorHandling(async () => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const data = await fetchData(id);
    return NextResponse.json(data);
  });
}
```

---

## 预期成果

1. **代码质量提升**
   - 无 ESLint 警告和错误
   - 无 TypeScript 类型错误
   - 代码格式统一

2. **结构清晰**
   - 目录结构规范
   - 导入路径统一
   - 类型定义清晰

3. **可维护性提高**
   - 移除冗余代码
   - 统一编码规范
   - 完善文档注释

4. **测试覆盖完善**
   - 关键模块有测试覆盖
   - 测试用例清晰有效
