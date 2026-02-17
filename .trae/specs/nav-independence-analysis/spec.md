# 导航栏页面功能独立性分析 Spec

## Why
用户希望了解当前导航栏中各个页面的功能是否独立，以便决定是否可以按照现有页面区分来继续深耕优化。

## What Changes
- 分析导航栏5个主要页面的功能独立性
- 评估各页面/子功能之间的依赖关系
- 提供优化建议

## Impact
- Affected specs: 无直接影响，仅为分析文档
- Affected code: 无代码变更

---

## 导航栏页面结构分析

### 当前导航配置

| 页面 | 路由 | 子功能数量 | 组织方式 |
|------|------|-----------|----------|
| Oracle Analytics | `/analytics` | 3个 | Tabs |
| Cross-Chain | `/cross-chain` | 3个 | Tabs |
| Explore | `/explore` | 2个 | Tabs |
| Alerts Center | `/alerts` | 1个 | 独立页面 |
| Arbitration | `/oracle/analytics/disputes` | 1个 | 独立页面 |

---

## 各页面功能独立性详细分析

### 1. Oracle Analytics 页面 (`/analytics`)

**子功能：**
- **Dashboard** - Oracle 仪表盘概览
- **Comparison** - Oracle 价格比较
- **Deviation** - 价格偏差分析

**数据源独立性：**
| 子功能 | Hook | API 端点 | 独立性 |
|--------|------|----------|--------|
| Dashboard | `useOracleDashboard` | `/api/oracle/stats` | ✅ 独立 |
| Comparison | `useComparisonData` | `/api/comparison/*` | ✅ 独立 |
| Deviation | `useDeviationAnalytics` | `/api/oracle/analytics/deviation` | ✅ 独立 |

**Feature 模块独立性：**
| 子功能 | Feature 模块 | 共享组件 |
|--------|-------------|----------|
| Dashboard | `features/oracle/dashboard` | 无 |
| Comparison | `features/comparison` | 无 |
| Deviation | `features/oracle/analytics/deviation` | 无 |

**结论：** ⚠️ **可拆分**
- 三个子功能各自有独立的数据源、hooks 和组件
- 建议可以拆分为 3 个独立页面
- 当前 Tabs 组织方式适合概览，但深度优化时建议独立

---

### 2. Cross-Chain 页面 (`/cross-chain`)

**子功能：**
- **Overview** - 跨链概览
- **Comparison** - 跨链价格比较
- **History** - 历史偏差分析

**数据源独立性：**
| 子功能 | Hook | API 端点 | 独立性 |
|--------|------|----------|--------|
| Overview | `useCrossChainDashboard` | `/api/cross-chain/dashboard` | ⚠️ 共享前缀 |
| Comparison | `useCrossChainComparison` | `/api/cross-chain/comparison` | ⚠️ 共享前缀 |
| History | `useCrossChainHistory` | `/api/cross-chain/history` | ⚠️ 共享前缀 |

**Feature 模块独立性：**
| 子功能 | Feature 模块 | 共享组件 |
|--------|-------------|----------|
| Overview | `features/cross-chain` | 共享模块 |
| Comparison | `features/cross-chain` | 共享模块 |
| History | `features/cross-chain` | 共享模块 |

**结论：** ✅ **适合保持现状**
- 三个子功能共享 `cross-chain` feature 模块
- 数据源都属于跨链分析领域
- 功能相关性强，适合保持在同一页面
- 建议继续深耕现有结构

---

### 3. Explore 页面 (`/explore`)

**子功能：**
- **Protocols** - 协议浏览器
- **Address** - 地址查询

**数据源独立性：**
| 子功能 | 组件 | 数据源 | 独立性 |
|--------|------|--------|--------|
| Protocols | `ProtocolExplorer` | `/api/oracle/protocols` | ✅ 独立 |
| Address | `AddressExplorer` | `/api/oracle/address` | ✅ 独立 |

**Feature 模块独立性：**
| 子功能 | Feature 模块 | 共享组件 |
|--------|-------------|----------|
| Protocols | `features/oracle/components/ProtocolExplorer` | 无 |
| Address | `features/oracle/components/AddressExplorer` | 无 |

**结论：** ⚠️ **可拆分**
- 两个子功能数据源完全独立
- 各自有独立的组件实现
- 建议可以拆分为 2 个独立页面：
  - `/protocols` - 协议浏览器
  - `/address` - 地址查询

---

### 4. Alerts Center 页面 (`/alerts`)

**功能：**
- 统一告警管理中心
- 支持多种告警来源：price_anomaly、cross_chain、security

**数据源独立性：**
| 功能 | Hook | API 端点 | 独立性 |
|------|------|----------|--------|
| Alerts | `useAlerts` | `/api/alerts` | ✅ 完全独立 |

**Feature 模块独立性：**
| 功能 | Feature 模块 | 共享组件 |
|------|-------------|----------|
| Alerts | `features/alerts` | 无 |

**结论：** ✅ **完全独立**
- 有独立的 feature 模块 `features/alerts`
- 有独立的 API 端点
- 有独立的类型定义
- 可以继续深耕优化

---

### 5. Arbitration 页面 (`/oracle/analytics/disputes`)

**功能：**
- Oracle 争议数据分析
- 仲裁相关数据展示

**数据源独立性：**
| 功能 | Hook | API 端点 | 独立性 |
|------|------|----------|--------|
| Disputes | `useDisputeAnalytics` | 独立数据源 | ✅ 完全独立 |

**Feature 模块独立性：**
| 功能 | Feature 模块 | 共享组件 |
|------|-------------|----------|
| Disputes | `features/oracle/analytics/disputes` | 无 |

**结论：** ✅ **完全独立**
- 有独立的 feature 模块 `features/oracle/analytics/disputes`
- 有独立的 hooks 和类型定义
- 可以继续深耕优化

---

## 总体评估

### 功能独立性矩阵

| 页面 | 数据源独立 | Feature 模块独立 | 组件独立 | 建议操作 |
|------|-----------|-----------------|----------|----------|
| Analytics | ⚠️ 部分 | ✅ 是 | ✅ 是 | 可拆分 |
| Cross-Chain | ⚠️ 共享 | ⚠️ 共享 | ⚠️ 共享 | 保持现状 |
| Explore | ✅ 是 | ✅ 是 | ✅ 是 | 可拆分 |
| Alerts Center | ✅ 是 | ✅ 是 | ✅ 是 | 继续深耕 |
| Arbitration | ✅ 是 | ✅ 是 | ✅ 是 | 继续深耕 |

### 优化建议

#### 推荐保持现状的页面：
1. **Cross-Chain** - 功能相关性强，共享模块多
2. **Alerts Center** - 已完全独立
3. **Arbitration** - 已完全独立

#### 可考虑拆分的页面：
1. **Analytics** - 可拆分为：
   - `/analytics/dashboard` - Oracle 仪表盘
   - `/analytics/comparison` - 价格比较
   - `/analytics/deviation` - 偏差分析

2. **Explore** - 可拆分为：
   - `/protocols` - 协议浏览器
   - `/address` - 地址查询

---

## 最终结论

**可以按照现在的页面区分来继续深耕优化**，但需要注意：

1. **完全独立的页面**（Alerts Center、Arbitration）可以直接深耕优化
2. **功能相关性强的页面**（Cross-Chain）建议保持现有 Tabs 结构
3. **子功能独立的页面**（Analytics、Explore）可以考虑拆分为独立页面，但不是必须的

如果目标是深度优化每个功能，建议优先级：
1. 先优化完全独立的页面（Alerts Center、Arbitration）
2. 再优化 Cross-Chain（保持现有结构）
3. 最后考虑是否需要拆分 Analytics 和 Explore
