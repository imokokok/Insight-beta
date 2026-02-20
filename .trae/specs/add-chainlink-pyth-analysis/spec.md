# Chainlink 与 Pyth 专项分析功能 Spec

## Why

当前系统已有 API3、Band Protocol、UMA 的专项分析页面，但 Chainlink 和 Pyth 作为市场份额最大和使用最广泛的预言机，缺少针对其特有功能的深度分析页面。用户无法监控 Chainlink 的 OCR 轮次、节点运营商状态，以及 Pyth 的 Publisher 可信度、价格推送延迟等关键指标。

## What Changes

- 新增 Chainlink 专项分析页面 `/oracle/chainlink`
- 新增 Pyth 专项分析页面 `/oracle/pyth`
- 新增相关 API 接口
- 更新导航栏配置，将新页面加入专项分析分组
- 更新国际化配置

## Impact

- Affected specs: 导航结构、预言机分析模块
- Affected code:
  - `src/app/oracle/chainlink/` (新增)
  - `src/app/oracle/pyth/` (新增)
  - `src/app/api/oracle/chainlink/` (新增)
  - `src/app/api/oracle/pyth/` (新增)
  - `src/features/oracle/chainlink/` (新增)
  - `src/features/oracle/pyth/` (新增)
  - `src/components/common/EnhancedSidebar.tsx` (修改)
  - `src/i18n/locales/zh/nav.ts` (修改)
  - `src/i18n/locales/en/nav.ts` (修改)

## ADDED Requirements

### Requirement: Chainlink 专项分析页面

系统应提供 Chainlink 专项分析页面，包含以下功能模块：

#### Scenario: 用户查看 Chainlink OCR 轮次监控

- **WHEN** 用户访问 `/oracle/chainlink` 页面
- **THEN** 系统显示 OCR（Off-Chain Reporting）轮次信息，包括轮次 ID、参与节点数、聚合阈值、最后更新时间

#### Scenario: 用户查看 Chainlink 节点运营商状态

- **WHEN** 用户在 Chainlink 页面查看节点运营商 Tab
- **THEN** 系统显示节点运营商列表，包括运营商名称、在线状态、响应时间、支持的喂价对

#### Scenario: 用户查看 Chainlink 喂价聚合详情

- **WHEN** 用户在 Chainlink 页面查看喂价聚合 Tab
- **THEN** 系统显示各喂价对的聚合详情，包括最新价格、心跳阈值、偏差阈值、聚合器地址

### Requirement: Pyth 专项分析页面

系统应提供 Pyth 专项分析页面，包含以下功能模块：

#### Scenario: 用户查看 Pyth Publisher 监控

- **WHEN** 用户访问 `/oracle/pyth` 页面
- **THEN** 系统显示 Publisher（数据发布者）列表，包括发布者名称、可信度评分、发布频率、支持的价格源

#### Scenario: 用户查看 Pyth 价格推送分析

- **WHEN** 用户在 Pyth 页面查看价格推送 Tab
- **THEN** 系统显示价格推送统计，包括推送频率、平均延迟、更新触发条件

#### Scenario: 用户查看 Pyth Hermes 服务状态

- **WHEN** 用户在 Pyth 页面查看服务状态 Tab
- **THEN** 系统显示 Hermes 服务状态，包括服务可用性、响应时间、支持的链

## MODIFIED Requirements

### Requirement: 导航栏专项分析分组

导航栏专项分析分组应包含 Chainlink 和 Pyth 入口：

- 新增 Chainlink 入口，链接到 `/oracle/chainlink`
- 新增 Pyth 入口，链接到 `/oracle/pyth`

## REMOVED Requirements

无
