# Chainlink 分析页面彻底重构 Spec

## Why

当前的Chainlink分析页面存在以下问题：

1. **信息架构混乱** - 10个标签页分散用户注意力，缺乏数据叙事
2. **视觉风格不专业** - 使用通用卡片组件，缺乏专业金融数据分析平台的视觉感
3. **信息密度低** - 大量空白，首屏没有展示关键数据
4. **缺乏数据焦点** - 没有突出核心指标和实时数据变化
5. **交互体验差** - 用户需要频繁切换标签页才能获取完整信息

需要参考Bloomberg Terminal、TradingView、Dune Analytics等专业数据分析平台的设计理念，彻底重构页面，同时保留所有现有功能。

## What Changes

- **BREAKING** 移除10个标签页结构，改为单页面仪表盘布局
- 采用专业数据分析平台的视觉设计语言
- 实现高信息密度的仪表盘布局
- 添加实时数据更新动画和状态指示
- 优化数据表格和图表的视觉呈现
- 增加数据对比和趋势分析功能
- 实现响应式设计，支持移动端查看
- **所有现有功能完整保留**

## Impact

- Affected specs: 数据分析平台设计优化
- Affected code:
  - `src/app/oracle/chainlink/page.tsx` - 主页面完全重构
  - `src/features/oracle/chainlink/components/` - 所有组件重构
  - `src/app/globals.css` - 新增专业数据展示样式

---

## 现有功能清单（必须全部保留）

### 1. 概览功能

- [x] Chainlink 协议概览介绍
- [x] 核心特性展示（OCR协议、节点运营商、安全机制）
- [x] 支持的链列表展示

### 2. 价格趋势功能

- [x] ETH/USD、BTC/USD、LINK/USD 价格历史图表
- [x] 时间范围选择（24H/7D/30D）
- [x] 价格统计（当前价格、最高价、最低价、变化）
- [x] 价格变化百分比显示
- [x] 刷新功能

### 3. 数据质量分析功能

- [x] 综合质量评分（0-100分）
- [x] 波动性指标（小时/日/周波动率、最大回撤）
- [x] 多协议价格对比表格
- [x] 近期异常事件列表
- [x] 交易对选择器

### 4. OCR轮次监控功能

- [x] OCR轮次列表表格
- [x] 参与节点数显示
- [x] 聚合阈值显示
- [x] 答案值显示
- [x] 开始/更新时间
- [x] 节点贡献度展开详情
- [x] 提议者标识

### 5. 节点运营商功能

- [x] 运营商列表展示
- [x] 在线/离线状态
- [x] 可靠性评分（综合、在线时间、响应时间、Feed支持）
- [x] 响应时间显示
- [x] 最后心跳时间
- [x] 支持的Feed列表

### 6. 喂价聚合功能

- [x] Feed列表表格
- [x] 交易对/价格/心跳/偏差/聚合器地址/最后更新
- [x] 状态筛选（全部/活跃/非活跃）
- [x] 搜索功能
- [x] 排序功能
- [x] 点击跳转Feed详情页

### 7. Gas成本分析功能

- [x] 总Gas消耗/ETH成本/USD成本/交易数量统计
- [x] Gas成本趋势图表（折线/面积/柱状切换）
- [x] 指标切换（成本/Gas/交易数）
- [x] 时间范围选择（1H/24H/7D/30D）
- [x] 按Feed统计表格
- [x] 按链统计表格
- [x] 视图切换（Feeds/Chains）

### 8. Heartbeat监控功能

- [x] 总Feed数/活跃数/超时数/严重超时数统计
- [x] 告警列表表格
- [x] Feed名称/链/心跳间隔/最后更新/超时时长/状态
- [x] 状态排序（严重>超时>活跃）
- [x] 状态徽章（活跃/超时/严重超时）

### 9. 偏差触发统计功能

- [x] 总触发次数/总Feed数/活跃触发Feed/最后更新统计
- [x] 触发最活跃的前5个Feed
- [x] 所有Feed偏差触发详情表格
- [x] 时间范围选择（24H/7D/30D）
- [x] 偏差阈值/触发次数/更新频率/平均更新间隔/最后触发时间

### 10. 多链价格对比功能

- [x] 多链价格对比表格
- [x] 资产选择（ETH/BTC/LINK/USDC/USDT）
- [x] 链选择
- [x] 价格一致性评分
- [x] 最大偏差显示
- [x] 价格范围显示

### 11. 全局功能

- [x] 自动刷新控制
- [x] 手动刷新按钮
- [x] 数据导出功能
- [x] 最后更新时间显示
- [x] 刷新状态指示
- [x] 错误处理和重试
- [x] 加载骨架屏

---

## ADDED Requirements

### Requirement: 仪表盘布局系统

系统 SHALL 提供专业的单页面仪表盘布局。

#### Scenario: 首屏信息展示

- **WHEN** 用户访问Chainlink分析页面
- **THEN** 首屏应展示以下内容（按优先级）：
  1. 顶部状态栏：网络健康状态、实时连接状态、最后更新时间、操作按钮
  2. KPI概览区：4个核心指标卡片（总Feed数、活跃节点、平均延迟、OCR轮次）
  3. 主图表区：价格趋势图表（支持多资产）
  4. 实时状态面板：Feed状态列表、节点运营商状态
  5. 详细数据区（可折叠）：所有分析功能

#### Scenario: 信息密度控制

- **WHEN** 用户查看仪表盘
- **THEN** 关键指标使用紧凑卡片展示
- **AND** 图表占据主要视觉空间
- **AND** 次要信息通过折叠或滚动展示

### Requirement: 专业数据可视化

系统 SHALL 提供专业级数据可视化组件。

#### Scenario: 价格趋势图表

- **WHEN** 用户查看价格趋势
- **THEN** 图表应包含：
  - 深色背景配亮色数据线
  - 网格线辅助阅读
  - 悬停显示精确数值
  - 支持时间范围切换（1H/24H/7D/30D）
  - 支持多资产叠加对比

#### Scenario: 实时数据更新

- **WHEN** 数据实时更新时
- **THEN** 使用平滑动画过渡
- **AND** 显示更新时间戳
- **AND** 数值变化时闪烁提示（绿色上涨/红色下跌）

### Requirement: 数据状态卡片

系统 SHALL 提供专业的数据状态卡片组件。

#### Scenario: KPI卡片设计

- **WHEN** 展示关键指标
- **THEN** 卡片应包含：
  - 大号数值显示（使用等宽字体）
  - 小号标签说明
  - 趋势指示器（↑↓→）
  - 变化百分比
  - 状态颜色编码

#### Scenario: 状态指示器

- **WHEN** 显示Feed或节点状态
- **THEN** 使用以下视觉编码：
  - 健康/在线：绿色圆点 + 脉冲动画
  - 警告/延迟：黄色圆点
  - 错误/离线：红色圆点
  - 未知：灰色圆点

### Requirement: 数据表格优化

系统 SHALL 提供专业的数据表格展示。

#### Scenario: Feed列表表格

- **WHEN** 用户查看Feed列表
- **THEN** 表格应包含：
  - 固定表头
  - 行悬停高亮
  - 排序功能
  - 搜索筛选
  - 分页或虚拟滚动
  - 紧凑行高（减少空白）

#### Scenario: 数据格式化

- **WHEN** 显示数值数据
- **THEN** 应用以下格式化规则：
  - 价格：$X,XXX.XX（大数用K/M/B后缀）
  - 百分比：+X.XX% / -X.XX%
  - 时间：相对时间（如"2分钟前"）
  - 地址：缩写显示（0x1234...5678）

### Requirement: 响应式设计

系统 SHALL 支持多设备访问。

#### Scenario: 桌面端布局

- **WHEN** 屏幕宽度 >= 1440px
- **THEN** 使用三栏布局：
  - 左侧：导航和快速筛选
  - 中间：主图表和数据
  - 右侧：实时状态和告警

#### Scenario: 平板端布局

- **WHEN** 屏幕宽度 1024px - 1439px
- **THEN** 使用两栏布局：
  - 上方：KPI卡片和主图表
  - 下方：数据表格和详情

#### Scenario: 移动端布局

- **WHEN** 屏幕宽度 < 1024px
- **THEN** 使用单栏布局：
  - 垂直堆叠所有内容
  - 可折叠的数据区域
  - 底部固定快速操作栏

### Requirement: 深色主题优化

系统 SHALL 提供优化的深色主题。

#### Scenario: 颜色方案

- **WHEN** 用户查看页面
- **THEN** 使用以下颜色方案：
  - 背景：深蓝黑 (#0A0F1C)
  - 卡片背景：半透明深色 (rgba(15, 23, 42, 0.8))
  - 主要文字：亮白 (#F8FAFC)
  - 次要文字：灰色 (#94A3B8)
  - 强调色：蓝色 (#3B82F6) 和青色 (#06B6D4)
  - 成功：绿色 (#22C55E)
  - 警告：黄色 (#F59E0B)
  - 错误：红色 (#EF4444)

#### Scenario: 数据可视化配色

- **WHEN** 显示图表数据
- **THEN** 使用高对比度配色：
  - 主要数据线：亮蓝色 (#60A5FA)
  - 次要数据线：青色 (#22D3EE)
  - 对比数据线：紫色 (#A78BFA)
  - 网格线：低透明度灰色 (rgba(148, 163, 184, 0.1))

---

## MODIFIED Requirements

### Requirement: 页面组件结构

现有组件结构应重新组织。

**原结构**（标签页模式）：

```
├── 概览
├── 价格趋势
├── 数据质量
├── OCR轮次
├── 节点运营商
├── 喂价聚合
├── Gas成本
├── Heartbeat
├── 偏差分析
└── 多链对比
```

**新结构**（仪表盘模式）：

```
ChainlinkDashboard
├── TopStatusBar                    # 顶部状态栏
│   ├── 网络健康状态
│   ├── 实时连接状态
│   ├── 最后更新时间
│   └── 操作按钮（刷新、自动刷新、导出）
│
├── KpiOverview                     # KPI概览区
│   ├── 总Feed数卡片
│   ├── 活跃节点数卡片
│   ├── 平均延迟卡片
│   └── OCR轮次卡片
│
├── MainContentArea                 # 主内容区
│   ├── PriceTrendChart             # 价格趋势图表（主图表）
│   │   ├── 多资产选择
│   │   ├── 时间范围选择
│   │   └── 图表工具栏
│   │
│   └── SidePanel                   # 侧边面板
│       ├── FeedStatusList          # Feed状态列表（精简版）
│       └── OperatorStatusList      # 节点运营商状态（精简版）
│
├── DataPanels                      # 数据面板区（可折叠）
│   ├── FeedAggregationPanel        # 喂价聚合面板
│   │   ├── 搜索和筛选
│   │   └── Feed列表表格
│   │
│   ├── OcrRoundPanel               # OCR轮次面板
│   │   └── OCR轮次表格
│   │
│   └── HeartbeatPanel              # Heartbeat面板
│       ├── 统计卡片
│       └── 告警列表
│
└── DetailedAnalysisArea            # 详细分析区（默认折叠）
    ├── DataQualitySection          # 数据质量分析
    │   ├── 质量评分
    │   ├── 波动性指标
    │   ├── 多协议对比
    │   └── 异常事件
    │
    ├── GasCostSection              # Gas成本分析
    │   ├── 统计卡片
    │   ├── 趋势图表
    │   └── 按Feed/链统计表格
    │
    ├── DeviationSection            # 偏差触发统计
    │   ├── 统计卡片
    │   ├── 活跃Feed排行
    │   └── 详细表格
    │
    └── CrossChainSection           # 多链价格对比
        ├── 资产选择
        ├── 链选择
        └── 价格对比表格
```

### Requirement: 组件视觉风格

现有组件应采用专业数据分析风格。

- 移除圆角卡片，使用直角或微圆角（4px）
- 增加边框和分隔线
- 使用等宽字体显示数值
- 减少装饰性元素
- 增加数据密度
- 表格使用紧凑行高
- 图表使用深色背景

### Requirement: 交互优化

现有交互应优化用户体验。

- 减少页面跳转，使用折叠面板
- 添加快捷键支持（R刷新、E导出）
- 添加数据搜索全局入口
- 优化加载状态，使用骨架屏
- 添加数据更新动画

---

## REMOVED Requirements

### Requirement: 标签页导航

**Reason**: 标签页模式不适合数据分析仪表盘，用户需要频繁切换才能获取完整信息。

**Migration**: 所有标签页内容整合到单页面仪表盘中，通过折叠面板和滚动组织。用户可以通过侧边导航快速跳转到对应区域。

---

## 组件详细规格

### 1. TopStatusBar 组件

```typescript
interface TopStatusBarProps {
  networkStatus: 'healthy' | 'warning' | 'critical';
  isConnected: boolean;
  lastUpdated: Date | null;
  isRefreshing: boolean;
  autoRefreshEnabled: boolean;
  refreshInterval: number;
  timeUntilRefresh: number;
  onRefresh: () => void;
  onToggleAutoRefresh: () => void;
  onIntervalChange: (interval: number) => void;
  onExport: () => void;
}
```

### 2. KpiOverview 组件

```typescript
interface KpiCardProps {
  label: string;
  value: number | string;
  trend?: 'up' | 'down' | 'neutral';
  changePercent?: number;
  status?: 'healthy' | 'warning' | 'critical';
  icon: React.ReactNode;
}

interface KpiOverviewProps {
  stats: {
    totalFeeds: number;
    activeNodes: number;
    avgLatency: number;
    ocrRounds: number;
  };
}
```

### 3. PriceTrendChart 组件

```typescript
interface PriceTrendChartProps {
  assets: Array<{ symbol: string; displaySymbol: string }>;
  selectedAsset: string;
  onAssetChange: (symbol: string) => void;
  timeRange: '1h' | '24h' | '7d' | '30d';
  onTimeRangeChange: (range: string) => void;
  showMultiAsset: boolean;
  selectedCompareAssets: string[];
  onCompareAssetsChange: (assets: string[]) => void;
}
```

### 4. CollapsibleDataPanel 组件

```typescript
interface CollapsibleDataPanelProps {
  title: string;
  icon: React.ReactNode;
  defaultExpanded?: boolean;
  badge?: string | number;
  children: React.ReactNode;
}
```

### 5. FeedStatusList 组件（精简版）

```typescript
interface FeedStatusListProps {
  feeds: Array<{
    pair: string;
    price: string;
    status: 'active' | 'timeout' | 'critical';
    lastUpdate: string;
  }>;
  maxVisible?: number;
  onViewAll: () => void;
}
```

### 6. OperatorStatusList 组件（精简版）

```typescript
interface OperatorStatusListProps {
  operators: Array<{
    name: string;
    online: boolean;
    reliabilityScore: number;
  }>;
  maxVisible?: number;
  onViewAll: () => void;
}
```

---

## 数据流设计

### 页面级状态管理

```typescript
interface ChainlinkDashboardState {
  // 数据状态
  overviewStats: OverviewStats | null;
  priceHistory: PriceHistoryData | null;
  feeds: ChainlinkFeed[];
  operators: Operator[];
  ocrRounds: OcrRound[];
  heartbeatStats: HeartbeatStats | null;
  gasCostData: GasCostAnalysisData | null;
  deviationStats: DeviationStats | null;
  qualityData: FeedQualityData | null;
  crossChainData: CrossChainData | null;

  // UI状态
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  autoRefreshEnabled: boolean;
  refreshInterval: number;

  // 折叠状态
  expandedPanels: Set<string>;
}
```

### 数据获取策略

1. **首屏加载**：并行获取关键数据
   - 概览统计
   - 价格历史
   - Feed列表
   - 节点运营商

2. **延迟加载**：用户展开面板时获取
   - OCR轮次详情
   - Heartbeat详情
   - Gas成本详情
   - 偏差统计详情
   - 数据质量详情
   - 多链对比详情

3. **实时更新**：定时刷新
   - 价格数据（可配置间隔）
   - Feed状态
   - 节点状态

---

## 样式规范

### 间距系统

```css
--spacing-xs: 0.25rem; /* 4px */
--spacing-sm: 0.5rem; /* 8px */
--spacing-md: 0.75rem; /* 12px */
--spacing-lg: 1rem; /* 16px */
--spacing-xl: 1.5rem; /* 24px */
--spacing-2xl: 2rem; /* 32px */
```

### 字体系统

```css
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
--font-sans: 'Inter', system-ui, sans-serif;

--text-xs: 0.75rem; /* 12px */
--text-sm: 0.875rem; /* 14px */
--text-base: 1rem; /* 16px */
--text-lg: 1.125rem; /* 18px */
--text-xl: 1.25rem; /* 20px */
--text-2xl: 1.5rem; /* 24px */
--text-3xl: 1.875rem; /* 30px */
```

### 数值显示规范

- 所有数值使用等宽字体
- 大数值使用K/M/B后缀
- 百分比保留2位小数
- 价格根据大小调整精度
  - > = 1000: 2位小数
  - > = 1: 4位小数
  - < 1: 6位小数
