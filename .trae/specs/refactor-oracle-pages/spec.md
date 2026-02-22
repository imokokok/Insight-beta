# Oracle 分析页面统一重构 - Pyth/API3/Band

## Why

Pyth、API3、Band三个分析页面目前使用传统的标签页结构，存在与之前Chainlink页面相同的问题：

1. **页面过长** - 所有功能堆叠在一个页面，用户需要大量滚动
2. **信息架构混乱** - 多个标签页分散用户注意力
3. **视觉风格不统一** - 与新重构的Chainlink页面风格不一致

需要将这三个页面统一重构为与Chainlink相同的混合布局模式。

## What Changes

- 采用与Chainlink相同的 **"核心仪表盘 + Tab切换"** 混合布局模式

- 复用已创建的仪表盘组件（TabNavigation, TabContent, MetricCard等）

- 统一视觉风格和交互体验

- 保持所有现有功能完整

## Impact

- Affected specs: refactor-chainlink-dashboard, optimize-chainlink-layout

- Affected code:
  - `src/app/oracle/pyth/page.tsx` - Pyth页面重构

  - `src/app/oracle/api3/page.tsx` - API3页面重构

  - `src/app/oracle/band/page.tsx` - Band页面重构

  - `src/features/oracle/pyth/components/dashboard/` - 新增Pyth仪表盘组件

  - `src/features/oracle/api3/components/dashboard/` - 新增API3仪表盘组件

  - `src/features/oracle/band/components/dashboard/` - 新增Band仪表盘组件

---

## 现有功能清单（必须全部保留）

### Pyth 页面功能

- [x] 概览（协议介绍、核心特性、Publisher状态、价格推送统计）

- [x] Publisher列表（名称、可信度评分、发布频率、支持价格源、状态）

- [x] 价格推送列表（名称、分类、价格、更新频率、置信区间、状态）

- [x] 价格趋势图表

- [x] 跨链价格对比

- [x] 置信区间对比图表

- [x] Hermes服务状态

- [x] 自动刷新控制

- [x] 数据导出功能

### API3 页面功能

- [x] 概览（协议介绍、核心特性）

- [x] Airnodes列表（地址、链、状态、心跳、响应时间）

- [x] 价格更新监控

- [x] dAPIs列表

- [x] Gas成本分析

- [x] 跨协议对比

- [x] 签名验证面板

- [x] 告警配置面板

- [x] 自动刷新控制

- [x] 数据导出功能

### Band 页面功能

- [x] 概览（协议状态、平均延迟、数据可靠性、支持的链）

- [x] 数据桥列表和状态

- [x] 数据源列表

- [x] Oracle Scripts列表

- [x] 传输历史

- [x] Cosmos链选择器和IBC状态

- [x] 价格趋势

- [x] 数据质量分析

- [x] 价格对比

- [x] 自动刷新控制

- [x] 数据导出功能

---

## ADDED Requirements

### Requirement: 统一混合布局模式

三个页面 SHALL 采用与Chainlink相同的混合布局模式。

#### Scenario: 首屏展示

- **WHEN** 用户访问任一Oracle分析页面

- **THEN** 首屏应展示：
  1. 顶部状态栏（网络健康、连接状态、操作按钮）
  2. KPI概览区（4个核心指标卡片）
  3. Tab导航栏
  4. 当前Tab内容

### Requirement: Pyth页面Tab分组

Pyth页面 SHALL 按以下方式分组：

| Tab ID      | Tab名称   | 包含功能                                        |
| ----------- | --------- | ----------------------------------------------- |
| overview    | 概览      | 协议介绍、核心特性、Publisher状态、价格推送统计 |
| publishers  | Publisher | Publisher列表                                   |
| price-feeds | 价格推送  | 价格推送列表、价格趋势图表                      |
| analysis    | 数据分析  | 跨链价格对比、置信区间对比                      |
| hermes      | 服务状态  | Hermes服务状态                                  |

### Requirement: API3页面Tab分组

API3页面 SHALL 按以下方式分组：

| Tab ID   | Tab名称  | 包含功能                |
| -------- | -------- | ----------------------- |
| overview | 概览     | 协议介绍、核心特性      |
| airnodes | Airnodes | Airnodes列表            |
| data     | 数据服务 | 价格更新监控、dAPIs列表 |
| analysis | 分析工具 | Gas成本分析、跨协议对比 |
| tools    | 工具     | 签名验证面板、告警配置  |

### Requirement: Band页面Tab分组

Band页面 SHALL 按以下方式分组：

| Tab ID   | Tab名称  | 包含功能                                   |
| -------- | -------- | ------------------------------------------ |
| overview | 概览     | 协议状态、支持的链、数据桥状态、数据源分布 |
| bridges  | 数据桥   | 数据桥列表、传输历史                       |
| sources  | 数据源   | 数据源列表、Oracle Scripts                 |
| cosmos   | Cosmos   | Cosmos链选择器、IBC状态                    |
| analysis | 数据分析 | 价格趋势、数据质量、价格对比               |

### Requirement: 复用仪表盘组件

三个页面 SHALL 复用Chainlink的仪表盘组件：

- TabNavigation

- TabContent

- TabPanelWrapper

- useTabNavigation

- MetricCard

- StatusIndicator

- CollapsibleDataPanel

### Requirement: 统一视觉风格

三个页面 SHALL 使用统一的视觉风格：

- 深色主题配色

- 专业数据分析风格

- 紧凑布局

- 等宽字体数值显示

- 状态脉冲动画

---

## 组件详细规格

### 1. Pyth KPI卡片

```typescript
interface PythKpiStats {
  totalPublishers: number;
  activePublishers: number;
  activePriceFeeds: number;
  avgLatency: number;
}
```

### 2. API3 KPI卡片

```typescript
interface Api3KpiStats {
  totalAirnodes: number;
  onlineAirnodes: number;
  priceUpdateEvents: number;
  totalDapis: number;
}
```

### 3. Band KPI卡片

```typescript
interface BandKpiStats {
  activeBridges: number;
  totalTransfers: number;
  totalSources: number;
  avgLatency: number;
}
```

---

## 实施优先级

1. **Pyth页面** - 功能最相似Chainlink，优先实施
2. **API3页面** - 功能相对独立
3. **Band页面** - 功能最复杂，最后实施
