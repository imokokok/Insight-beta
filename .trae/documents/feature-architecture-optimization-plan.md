# Feature-Based 架构优化执行计划

## 概述

根据架构分析报告，本项目已采用完整的 Feature-Based 架构。本计划将执行三项优化建议，进一步提升架构质量。

---

## 优化一：API 路由整合

### 目标

将 `src/app/api/` 下的业务 API 逻辑移入对应 feature 的 `api/` 目录，保留 `app/api/` 仅作为 Next.js 路由入口。

### 当前状态

```
src/app/api/
├── alerts/          # 告警 API
├── comparison/      # 比较 API
├── cross-chain/     # 跨链 API
├── explore/         # 探索 API
├── oracle/          # Oracle API
└── ...
```

### 目标状态

```
src/features/
├── alerts/
│   └── api/
│       ├── index.ts           # 统一导出
│       ├── history.ts         # ✅ 已存在
│       ├── alerts.ts          # 新增：告警 CRUD
│       ├── rules.ts           # 新增：规则管理
│       ├── channels.ts        # 新增：通知通道
│       └── batch.ts           # 新增：批量操作
├── comparison/
│   └── api/
│       ├── index.ts
│       ├── metrics.ts
│       ├── heatmap.ts
│       └── realtime.ts
├── cross-chain/
│   └── api/
│       ├── index.ts
│       ├── bridges.ts
│       ├── chainStatus.ts
│       └── liquidity.ts
├── explore/
│   └── api/
│       ├── index.ts
│       ├── discovery.ts
│       ├── marketOverview.ts
│       └── trending.ts
└── oracle/
    └── api/
        ├── index.ts
        ├── chainlink/
        ├── api3/
        ├── pyth/
        ├── band/
        └── uma/

src/app/api/  # 仅保留路由入口
├── alerts/
│   └── route.ts  # 调用 features/alerts/api
├── comparison/
│   └── route.ts  # 调用 features/comparison/api
└── ...
```

### 执行步骤

#### Phase 1: Alerts API 迁移

1. 在 `features/alerts/api/` 创建 API 函数
2. 迁移 `app/api/alerts/route.ts` 逻辑
3. 迁移 `app/api/alerts/[id]/route.ts` 逻辑
4. 迁移 `app/api/alerts/batch/route.ts` 逻辑
5. 迁移 `app/api/alerts/rules/` 逻辑
6. 迁移 `app/api/alerts/channels/` 逻辑
7. 更新 `app/api/alerts/` 路由入口调用新 API

#### Phase 2: Comparison API 迁移

1. 创建 `features/comparison/api/` 目录
2. 迁移比较相关 API 逻辑
3. 更新路由入口

#### Phase 3: Cross-chain API 迁移

1. 创建 `features/cross-chain/api/` 目录
2. 迁移跨链相关 API 逻辑
3. 更新路由入口

#### Phase 4: Explore API 迁移

1. 创建 `features/explore/api/` 目录
2. 迁移探索相关 API 逻辑
3. 更新路由入口

#### Phase 5: Oracle API 迁移

1. 创建 `features/oracle/api/` 目录结构
2. 迁移各协议 API 逻辑
3. 更新路由入口

---

## 优化二：共享组件归类

### 目标

将 `src/components/common/` 下的组件按功能分组，提高可维护性。

### 当前状态

```
src/components/common/
├── AnimatedContainer.tsx
├── AppLayout.tsx
├── AutoRefreshControl.tsx
├── Breadcrumb.tsx
├── ChartCard.tsx
├── ... (40+ 文件平铺)
└── index.ts
```

### 目标状态

```
src/components/common/
├── layout/              # 布局组件
│   ├── AppLayout.tsx
│   ├── Layout.tsx
│   ├── EnhancedSidebar.tsx
│   ├── MobileNav.tsx
│   ├── Breadcrumb.tsx
│   ├── PageHeader.tsx
│   └── index.ts
├── data/                # 数据展示组件
│   ├── StatCard/
│   ├── KpiCard.tsx
│   ├── StatsBar.tsx
│   ├── Gauge.tsx
│   ├── TrendIndicator.tsx
│   ├── CompactList.tsx
│   └── index.ts
├── charts/              # 图表相关组件
│   ├── ChartCard.tsx
│   ├── ChartFullscreen.tsx
│   ├── ChartToolbar.tsx
│   └── index.ts
├── feedback/            # 反馈组件
│   ├── EmptyState.tsx
│   ├── ErrorBoundary.tsx
│   ├── DashboardToast.tsx
│   ├── LoadingWithProgress.tsx
│   └── index.ts
├── forms/               # 表单组件
│   ├── RecipientInput.tsx
│   └── index.ts
├── controls/            # 控制组件
│   ├── AutoRefreshControl.tsx
│   ├── TimeRangeSelector.tsx
│   ├── DensityToggle.tsx
│   └── index.ts
├── shared/              # 其他共享组件
│   ├── CopyButton.tsx
│   ├── LanguageSwitcher.tsx
│   ├── ResourceHints.tsx
│   └── index.ts
└── index.ts             # 统一导出
```

### 执行步骤

#### Phase 1: 创建目录结构

1. 创建 `layout/`, `data/`, `charts/`, `feedback/`, `forms/`, `controls/`, `shared/` 目录

#### Phase 2: 迁移布局组件

1. 移动 `AppLayout.tsx`, `Layout.tsx`, `EnhancedSidebar.tsx` 等
2. 创建 `layout/index.ts` 导出

#### Phase 3: 迁移数据展示组件

1. 移动 `StatCard/`, `KpiCard.tsx`, `StatsBar.tsx` 等
2. 创建 `data/index.ts` 导出

#### Phase 4: 迁移图表组件

1. 移动 `ChartCard.tsx`, `ChartFullscreen.tsx` 等
2. 创建 `charts/index.ts` 导出

#### Phase 5: 迁移反馈组件

1. 移动 `EmptyState.tsx`, `ErrorBoundary.tsx` 等
2. 创建 `feedback/index.ts` 导出

#### Phase 6: 迁移其他组件

1. 移动表单、控制、共享组件
2. 创建各目录 `index.ts` 导出

#### Phase 7: 更新主入口

1. 更新 `components/common/index.ts` 统一导出
2. 更新所有导入路径

---

## 优化三：类型定义优化

### 目标

减少 `src/types/` 中的重复定义，将业务类型移入对应 feature。

### 当前状态

```
src/types/
├── oracle/
│   ├── index.ts        # 从 unifiedOracleTypes 重新导出
│   ├── protocol.ts     # 协议类型
│   ├── comparison.ts   # 比较类型
│   ├── dispute.ts      # 争议类型
│   └── reliability.ts  # 可靠性类型
├── common/
├── database/
├── shared/
├── unifiedOracleTypes.ts  # 统一 Oracle 类型
└── index.ts
```

### 问题分析

1. `types/oracle/index.ts` 从 `unifiedOracleTypes.ts` 重新导出，存在冗余
2. 部分 feature 内部已有类型定义（如 `features/alerts/types/`）
3. `features/oracle/api3/types/` 与 `types/oracle/` 存在潜在重复

### 目标状态

```
src/types/                    # 仅保留全局共享类型
├── common/
│   ├── status.ts            # 通用状态类型
│   ├── pagination.ts        # 分页类型
│   └── index.ts
├── database/
│   └── index.ts             # 数据库类型
├── shared/
│   └── kpi.ts               # KPI 共享类型
└── index.ts

src/features/
├── alerts/types/             # 告警类型（已存在）
│   └── index.ts
├── comparison/types/         # 比较类型
│   └── index.ts
├── cross-chain/types/        # 跨链类型（已存在）
│   └── index.ts
├── oracle/
│   ├── types/               # Oracle 核心类型
│   │   ├── protocol.ts      # 协议类型
│   │   ├── unified.ts       # 统一类型
│   │   └── index.ts
│   ├── api3/types/          # API3 特定类型
│   ├── chainlink/types/     # Chainlink 特定类型
│   ├── pyth/types/          # Pyth 特定类型
│   └── band/types/          # Band 特定类型
└── ...
```

### 执行步骤

#### Phase 1: 分析类型依赖

1. 检查 `types/oracle/` 与 `features/oracle/*/types/` 的重复
2. 确定哪些类型应保留在全局，哪些应移入 feature

#### Phase 2: 创建 Oracle 统一类型目录

1. 在 `features/oracle/types/` 创建统一类型文件
2. 迁移 `unifiedOracleTypes.ts` 内容
3. 更新导入路径

#### Phase 3: 迁移业务类型

1. 将 `types/oracle/comparison.ts` 移入 `features/comparison/types/`
2. 将 `types/oracle/dispute.ts` 移入 `features/oracle/types/`
3. 将 `types/oracle/reliability.ts` 移入 `features/oracle/reliability/types/`

#### Phase 4: 清理全局类型

1. 删除 `types/oracle/` 目录
2. 删除 `unifiedOracleTypes.ts`
3. 更新 `types/index.ts`

#### Phase 5: 更新所有导入

1. 全局搜索并更新类型导入路径
2. 确保所有引用正确

---

## 执行顺序

```
Week 1: 优化一 Phase 1-2 (Alerts + Comparison API 迁移)
Week 2: 优化一 Phase 3-5 (Cross-chain + Explore + Oracle API 迁移)
Week 3: 优化二 Phase 1-4 (组件归类 - 布局/数据/图表)
Week 4: 优化二 Phase 5-7 (组件归类 - 反馈/表单/控制 + 导出)
Week 5: 优化三 Phase 1-3 (类型分析 + Oracle 类型迁移)
Week 6: 优化三 Phase 4-5 (类型清理 + 导入更新)
```

---

## 风险评估

| 风险                     | 影响 | 缓解措施                         |
| ------------------------ | ---- | -------------------------------- |
| 导入路径变更导致编译错误 | 高   | 分批迁移，每批完成后运行测试     |
| API 路由变更影响前端调用 | 高   | 保持路由路径不变，仅重构内部实现 |
| 类型迁移导致类型丢失     | 中   | 使用 TypeScript 编译器验证       |
| 组件移动影响现有功能     | 中   | 保持导出路径兼容                 |

---

## 验证标准

### API 迁移验证

- [ ] 所有 API 路由正常响应
- [ ] 前端功能无异常
- [ ] 测试用例通过

### 组件归类验证

- [ ] 所有组件正常渲染
- [ ] 导入路径正确
- [ ] 无 TypeScript 错误

### 类型优化验证

- [ ] 无类型错误
- [ ] 类型提示正常
- [ ] 构建成功
