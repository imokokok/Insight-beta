# UI显示问题修复 Spec

## Why

前端UI存在多处潜在的显示问题，包括文字不对齐、元素溢出容器、响应式布局问题等，影响用户体验和界面美观度。

## What Changes

- 修复 InlineDataDisplay 组件的边框分隔符逻辑问题
- 修复 UnifiedStatsPanel 组件的边框显示不一致
- 修复 StatsBar 组件分隔符在小屏幕上的显示问题
- 修复 AlertCard 组件内容溢出风险
- 修复 VirtualTableRow 组件固定宽度导致的溢出问题
- 修复 Alerts 页面 TabsList 的7列网格溢出问题
- 修复 SummaryStatsBase 组件使用字符串拼接className的问题
- 修复 KpiCard 组件趋势信息换行问题
- 修复 PageHeader 组件按钮组溢出问题
- 修复 Breadcrumb 组件长标题溢出问题

## Impact

- Affected specs: UI组件显示规范
- Affected code:
  - `src/components/common/InlineDataDisplay.tsx`
  - `src/components/common/StatCard/EnhancedStatCard.tsx`
  - `src/components/common/StatsBar.tsx`
  - `src/features/alerts/components/AlertCard.tsx`
  - `src/features/comparison/components/VirtualTableRow.tsx`
  - `src/app/alerts/page.tsx`
  - `src/components/common/SummaryStatsBase.tsx`
  - `src/components/common/KpiCard.tsx`
  - `src/components/common/PageHeader.tsx`
  - `src/components/common/Breadcrumb.tsx`

## ADDED Requirements

### Requirement: InlineDataDisplay 边框分隔符

系统应正确显示InlineDataDisplay组件的边框分隔符，确保最后一个元素不显示右边框，且响应式布局下边框显示正确。

#### Scenario: 边框分隔符正确显示

- **WHEN** 用户查看InlineDataDisplay组件
- **THEN** 每行最后一个元素不显示右边框
- **AND** 响应式布局下边框正确适应列数变化

### Requirement: UnifiedStatsPanel 边框一致性

系统应确保UnifiedStatsPanel组件的边框显示一致，简化边框逻辑。

#### Scenario: 边框显示一致

- **WHEN** 用户查看UnifiedStatsPanel组件
- **THEN** 各统计项之间的边框显示一致
- **AND** 最后一列不显示右边框

### Requirement: StatsBar 分隔符响应式

系统应确保StatsBar组件的分隔符在不同屏幕尺寸下正确显示。

#### Scenario: 分隔符响应式显示

- **WHEN** 用户在小屏幕上查看StatsBar组件
- **THEN** 分隔符正确隐藏或显示
- **AND** 布局不会因分隔符变化而跳跃

### Requirement: AlertCard 内容不溢出

系统应确保AlertCard组件的内容不会溢出容器边界。

#### Scenario: 长内容正确截断

- **WHEN** AlertCard包含长标题或描述
- **THEN** 内容正确截断或换行
- **AND** 不会溢出卡片边界

### Requirement: VirtualTableRow 响应式宽度

系统应确保VirtualTableRow组件在不同屏幕尺寸下正确显示，不会因固定宽度溢出。

#### Scenario: 表格行响应式显示

- **WHEN** 用户在小屏幕上查看虚拟表格
- **THEN** 表格行正确适应屏幕宽度
- **AND** 内容不会溢出

### Requirement: TabsList 网格溢出修复

系统应确保7列TabsList在小屏幕上不会溢出容器。

#### Scenario: TabsList响应式显示

- **WHEN** 用户在小屏幕上查看Alerts页面
- **THEN** TabsList正确换行或滚动
- **AND** 不会溢出容器边界

### Requirement: SummaryStatsBase className处理

系统应使用cn()函数处理className，确保样式正确应用。

#### Scenario: 样式正确应用

- **WHEN** SummaryStatsBase组件渲染
- **THEN** className正确合并
- **AND** 样式一致

### Requirement: KpiCard 趋势信息不换行

系统应确保KpiCard组件的趋势图标和百分比在同一行显示。

#### Scenario: 趋势信息正确显示

- **WHEN** KpiCard显示趋势信息
- **THEN** 图标和百分比在同一行
- **AND** 不会意外换行

### Requirement: PageHeader 按钮组响应式

系统应确保PageHeader组件的按钮组在小屏幕上正确显示。

#### Scenario: 按钮组响应式显示

- **WHEN** 用户在小屏幕上查看PageHeader
- **THEN** 按钮组正确换行或隐藏
- **AND** 不会溢出容器

### Requirement: Breadcrumb 长标题处理

系统应确保Breadcrumb组件的长标题正确截断。

#### Scenario: 长标题正确截断

- **WHEN** Breadcrumb包含长标题项目
- **THEN** 标题正确截断
- **AND** 不会破坏布局
