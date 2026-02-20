# 专项分析页面优化实现 Spec

## Why

根据评估报告，五个专项分析页面存在功能完整度不一致、交互体验差异等问题。需要补全 Chainlink 页面功能、统一自动刷新功能、添加面包屑导航等，提升用户体验和页面一致性。

## What Changes

- Chainlink 页面集成现有组件（OcrRoundMonitor、OperatorList、FeedAggregation）
- Pyth 页面添加 Publisher 和价格推送详细列表
- 四个页面（Chainlink、Pyth、API3、Band）添加自动刷新功能
- UMA 页面添加面包屑导航
- 四个页面添加导出功能

## Impact

- Affected specs: 专项分析页面功能
- Affected code:
  - `src/app/oracle/chainlink/page.tsx` (修改)
  - `src/app/oracle/pyth/page.tsx` (修改)
  - `src/app/oracle/api3/page.tsx` (修改)
  - `src/app/oracle/band/page.tsx` (修改)
  - `src/app/oracle/analytics/disputes/page.tsx` (修改)

## ADDED Requirements

### Requirement: Chainlink 页面功能补全

系统应在 Chainlink 页面的 OCR轮次、节点运营商、喂价聚合 Tab 中显示实际数据，而非占位符。

#### Scenario: 用户查看 OCR 轮次

- **WHEN** 用户点击 OCR轮次 Tab
- **THEN** 系统显示 OcrRoundMonitor 组件，展示轮次 ID、参与节点数、聚合阈值、答案等数据

#### Scenario: 用户查看节点运营商

- **WHEN** 用户点击节点运营商 Tab
- **THEN** 系统显示 OperatorList 组件，展示运营商名称、状态、响应时间等

#### Scenario: 用户查看喂价聚合

- **WHEN** 用户点击喂价聚合 Tab
- **THEN** 系统显示 FeedAggregation 组件，展示喂价对、价格、状态等

### Requirement: 统一自动刷新功能

Chainlink、Pyth、API3、Band 四个页面应提供自动刷新控制功能。

#### Scenario: 用户启用自动刷新

- **WHEN** 用户点击自动刷新开关
- **THEN** 系统按设定间隔自动刷新数据

### Requirement: 统一面包屑导航

UMA 页面应添加与其他页面一致的面包屑导航。

#### Scenario: 用户访问 UMA 页面

- **WHEN** 用户访问 `/oracle/analytics/disputes`
- **THEN** 页面顶部显示面包屑导航 "预言机 > UMA 分析"

### Requirement: 导出功能

Chainlink、Pyth、API3、Band 四个页面应提供数据导出功能。

#### Scenario: 用户导出数据

- **WHEN** 用户点击导出按钮
- **THEN** 系统将当前数据导出为 CSV 文件

## MODIFIED Requirements

无

## REMOVED Requirements

无
