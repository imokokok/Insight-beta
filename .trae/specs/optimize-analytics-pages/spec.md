# 专项分析页面 UI 优化规范

## Why

专项分析页面（偏离分析和争议分析）是用户深入了解预言机数据质量的核心功能页面。当前页面存在布局不统一、视觉层次不清晰、列表卡片样式单调等问题，影响用户的数据分析体验。

## What Changes

- 统一两个专项分析页面的布局结构和视觉风格
- 优化统计卡片区域的展示效果
- 改进列表卡片（TrendList、AnomalyList、DisputeList）的视觉设计
- 增强 Tab 内容区域的布局和交互体验
- 添加微交互效果提升视觉层次

## Impact

- Affected specs: UI 组件系统、专项分析功能模块
- Affected code:
  - `src/app/oracle/analytics/deviation/page.tsx` - 偏离分析页面入口
  - `src/app/oracle/analytics/disputes/page.tsx` - 争议分析页面入口
  - `src/features/oracle/analytics/deviation/components/DeviationContent.tsx` - 偏离分析内容组件
  - `src/features/oracle/analytics/disputes/components/DisputeContent.tsx` - 争议分析内容组件
  - `src/features/oracle/analytics/deviation/components/TrendList.tsx` - 趋势列表组件
  - `src/features/oracle/analytics/deviation/components/AnomalyList.tsx` - 异常列表组件
  - `src/features/oracle/analytics/disputes/components/DisputeList.tsx` - 争议列表组件

## ADDED Requirements

### Requirement: 统一页面头部设计

两个专项分析页面应使用统一的页面头部布局和样式。

#### Scenario: 页面标题区域优化

- **WHEN** 用户访问专项分析页面
- **THEN** 页面标题区域应包含：
  - 页面图标
  - 页面标题和描述
  - 操作按钮组（刷新、导出、自动刷新控制）
  - 数据刷新指示器

#### Scenario: 统计概览区域统一

- **WHEN** 用户查看统计数据
- **THEN** 两个页面应使用统一的统计卡片组件（UnifiedStatsPanel）
- **AND** 统计卡片应有清晰的图标和颜色区分

### Requirement: 列表卡片视觉优化

列表项卡片应有更丰富的视觉层次和交互反馈。

#### Scenario: TrendList 卡片优化

- **WHEN** 用户浏览趋势列表
- **THEN** 每个列表项应包含：
  - 左侧颜色条指示偏离程度
  - 符号名称和趋势方向徽章
  - 关键指标网格展示
  - 展开/收起详情功能
  - Hover 时有阴影和边框高亮效果

#### Scenario: AnomalyList 卡片优化

- **WHEN** 用户浏览异常列表
- **THEN** 每个列表项应包含：
  - 严重程度颜色条
  - 异常符号和时间信息
  - 离群协议标签组
  - 关键数据指标
  - Hover 时有阴影效果

#### Scenario: DisputeList 卡片优化

- **WHEN** 用户浏览争议列表
- **THEN** 每个列表项应包含：
  - 状态指示条
  - 争议声明标题
  - 参与者地址信息
  - 保证金和协议信息
  - Hover 时有边框高亮效果

### Requirement: Tab 内容区域优化

Tab 内容区域应有更清晰的视觉分区和流畅的切换动画。

#### Scenario: Tab 容器样式优化

- **WHEN** 用户切换 Tab
- **THEN** Tab 容器应有：
  - 圆角背景卡片包裹
  - Tab 按钮有图标和文字
  - 选中 Tab 有高亮背景
  - 切换时有淡入淡出动画

#### Scenario: 内容网格布局优化

- **WHEN** 用户查看 Tab 内容
- **THEN** 内容区域应使用响应式网格布局
- **AND** 图表卡片应有统一的圆角和阴影样式

### Requirement: 微交互效果

页面应有平滑的过渡动画和交互反馈。

#### Scenario: 微交互效果

- **WHEN** 用户与页面元素交互
- **THEN** 应有平滑的过渡动画
- **AND** Hover 状态应有明显的视觉反馈

## MODIFIED Requirements

### Requirement: 页面容器布局

页面容器应有统一的间距和最大宽度限制。

#### Scenario: 容器间距统一

- **WHEN** 页面加载完成
- **THEN** 内容区域应有统一的垂直间距（space-y-6）
- **AND** 水平内边距应响应式调整（p-4 sm:p-6）

## REMOVED Requirements

### Requirement: 移除冗余的卡片包装

**Reason**: 部分内容区域不需要额外的 Card 包装，可以使用更轻量的布局组件
**Migration**: 使用 ContentSection 和 ContentGrid 替代
