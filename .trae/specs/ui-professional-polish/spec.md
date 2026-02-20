# 专项分析页面 UI 专业性优化 Spec

## Why

当前五个专项分析页面（Chainlink、Pyth、API3、Band、UMA）功能已完整，但 UI 呈现缺少专业数据分析平台应有的视觉层次和交互细节。通过适度的优化提升页面的专业感和数据可读性。

## What Changes

- 统计卡片添加趋势指示器（上升/下降箭头 + 变化百分比）
- 页面头部添加协议健康状态指示器
- Tab 导航添加图标提升识别度
- 表格添加基础排序功能
- 优化空数据状态展示

## Impact

- Affected specs: 专项分析页面 UI
- Affected code:
  - `src/app/oracle/chainlink/page.tsx` (修改)
  - `src/app/oracle/pyth/page.tsx` (修改)
  - `src/app/oracle/api3/page.tsx` (修改)
  - `src/app/oracle/band/page.tsx` (修改)
  - `src/components/common/StatCard/EnhancedStatCard.tsx` (可能修改)

## ADDED Requirements

### Requirement: 统计卡片趋势指示

统计卡片应显示数据变化趋势，帮助用户快速理解数据走向。

#### Scenario: 用户查看统计卡片

- **WHEN** 用户查看页面顶部的统计卡片
- **THEN** 卡片显示趋势箭头（上升/下降/持平）和变化百分比

### Requirement: 协议健康状态指示器

页面头部应显示协议整体健康状态，让用户一目了然地了解协议运行状况。

#### Scenario: 用户查看页面头部

- **WHEN** 用户访问专项分析页面
- **THEN** 页面标题旁显示健康状态指示器（健康/警告/异常）

### Requirement: Tab 导航图标

每个 Tab 应配有图标，提升视觉识别度和专业感。

#### Scenario: 用户查看 Tab 导航

- **WHEN** 用户查看 Tab 导航
- **THEN** 每个 Tab 显示对应的图标

### Requirement: 表格排序功能

数据表格应支持基础排序功能，方便用户查找和分析数据。

#### Scenario: 用户点击表头排序

- **WHEN** 用户点击表格列标题
- **THEN** 表格按该列升序或降序排列

## MODIFIED Requirements

无

## REMOVED Requirements

无
