# 告警中心页面设计升级 Spec

## Why

当前告警中心页面采用传统的设计风格，与专项分析页面（如 Chainlink、Pyth 等协议分析页面）相比，视觉效果不够现代、高级。专项分析页面采用了更精致的设计语言，包括顶部状态栏、KPI 卡片、深色背景、更紧凑的布局等。为了提升用户体验和界面一致性，需要对告警中心页面进行设计升级。

## What Changes

- 添加顶部状态栏（TopStatusBar）组件，显示网络状态、连接状态、最后更新时间
- 将统计栏（StatsBar）升级为 KPI 卡片网格（KpiOverview），采用深色背景和更精致的样式
- 优化页面整体布局，采用更紧凑的间距和更现代的视觉风格
- 统一卡片样式，使用 `bg-[rgba(15,23,42,0.8)]` 深色背景和 `backdrop-blur-sm` 效果
- 优化 Tab 导航样式，使其与专项分析页面保持一致
- 添加页面背景色 `bg-[#0A0F1C]` 以匹配专项分析页面风格
- 优化筛选区域的视觉设计，使用更紧凑的布局

## Impact

- Affected specs: 告警中心页面视觉设计
- Affected code:
  - `src/app/alerts/page.tsx` - 主要页面组件
  - 可能需要创建新的组件或复用现有组件

## ADDED Requirements

### Requirement: 顶部状态栏

系统应在告警中心页面顶部添加状态栏组件，显示实时网络状态信息。

#### Scenario: 显示网络状态

- **WHEN** 用户访问告警中心页面
- **THEN** 页面顶部应显示状态栏，包含：
  - 网络健康状态指示器（健康/警告/异常）
  - 连接状态指示器（已连接/断开）
  - 最后更新时间
  - 自动刷新开关
  - 刷新按钮
  - 导出按钮

### Requirement: KPI 卡片网格

系统应使用 KPI 卡片网格替代当前的 StatsBar 组件，提供更直观的数据展示。

#### Scenario: 显示关键指标

- **WHEN** 告警数据加载完成
- **THEN** 应显示 KPI 卡片网格，每个卡片包含：
  - 指标标签
  - 指标值（使用等宽字体）
  - 趋势指示器（可选）
  - 状态颜色（根据严重程度显示不同颜色）

#### Scenario: 加载状态

- **WHEN** 数据正在加载
- **THEN** 显示骨架屏加载状态

### Requirement: 深色背景主题

系统应采用深色背景主题，与专项分析页面保持视觉一致性。

#### Scenario: 页面背景

- **WHEN** 用户访问告警中心页面
- **THEN** 页面背景应为深色 `bg-[#0A0F1C]`

#### Scenario: 卡片背景

- **WHEN** 显示各种卡片组件
- **THEN** 卡片应使用半透明深色背景 `bg-[rgba(15,23,42,0.8)]` 和模糊效果 `backdrop-blur-sm`

### Requirement: 紧凑布局

系统应采用更紧凑的布局间距，提升信息密度和视觉效果。

#### Scenario: 组件间距

- **WHEN** 渲染页面组件
- **THEN** 应使用 `space-y-3` 或 `space-y-4` 替代 `space-y-6`

#### Scenario: 内边距

- **WHEN** 渲染卡片和容器
- **THEN** 应使用 `p-3` 或 `p-4` 替代 `p-6`

### Requirement: Tab 导航优化

系统应优化 Tab 导航样式，使其与专项分析页面保持一致。

#### Scenario: Tab 列表样式

- **WHEN** 显示 Tab 导航
- **THEN** 应使用紧凑的 Tab 样式，图标和文字对齐良好

## MODIFIED Requirements

无

## REMOVED Requirements

无
