# API3 和 Band Protocol 导航独立化与功能深耕 Spec

## Why

当前 API3 和 Band Protocol 两个预言机协议被归类在"预言机协议"父导航下，但它们的功能定位完全不同（API3 是第一方预言机，Band Protocol 是跨链预言机）。将它们独立出来可以：

- 减少导航层级，提升用户体验
- 让每个协议有独立的发展空间和深耕方向
- 避免用户混淆两个协议的功能定位

## What Changes

### 导航结构调整

- **移除**"预言机协议"父导航
- **新增** API3 直接导航入口
- **新增** Band Protocol 直接导航入口

### API3 功能深耕

- 创建统一的 API3 入口页面（Tab 切换式）
- 整合 Airnodes 监控、OEV 分析、dAPIs 管理
- 新增签名验证功能入口
- 新增 dAPIs 详情页面

### Band Protocol 功能深耕

- 创建统一的 Band Protocol 入口页面（Tab 切换式）
- 整合数据桥监控、数据源管理、传输历史
- 增强 Cosmos 链支持展示
- 新增传输历史详情页面

## Impact

- Affected specs: 导航配置、预言机协议页面结构
- Affected code:
  - `src/components/common/EnhancedSidebar.tsx` - 导航配置
  - `src/i18n/locales/zh/nav.ts` - 导航国际化
  - `src/i18n/locales/en/nav.ts` - 导航国际化
  - `src/app/oracle/api3/` - API3 页面重构
  - `src/app/oracle/band/` - Band Protocol 页面重构

---

## ADDED Requirements

### Requirement: API3 独立导航入口

系统 SHALL 在导航栏中提供 API3 的独立入口，无需父导航层级。

#### Scenario: 导航访问

- **WHEN** 用户点击导航栏中的 API3
- **THEN** 系统直接跳转到 API3 主页面
- **AND** 显示 API3 的核心功能概览

### Requirement: Band Protocol 独立导航入口

系统 SHALL 在导航栏中提供 Band Protocol 的独立入口，无需父导航层级。

#### Scenario: 导航访问

- **WHEN** 用户点击导航栏中的 Band Protocol
- **THEN** 系统直接跳转到 Band Protocol 主页面
- **AND** 显示 Band Protocol 的核心功能概览

### Requirement: API3 统一入口页面

系统 SHALL 提供 API3 的统一入口页面，使用 Tab 切换不同功能模块。

#### Scenario: 页面布局

- **WHEN** 用户访问 API3 页面
- **THEN** 显示 API3 协议概览卡片（总 Airnodes 数、在线数、OEV 总量等）
- **AND** 提供 Tab 切换：概览、Airnodes、OEV、dAPIs、签名验证

#### Scenario: 概览 Tab

- **WHEN** 用户选择概览 Tab
- **THEN** 显示 API3 协议的整体状态摘要
- **AND** 显示关键指标趋势图表

#### Scenario: Airnodes Tab

- **WHEN** 用户选择 Airnodes Tab
- **THEN** 显示所有 Airnode 节点列表和状态
- **AND** 支持按链筛选

#### Scenario: OEV Tab

- **WHEN** 用户选择 OEV Tab
- **THEN** 显示 OEV 分析数据
- **AND** 提供时间范围选择

#### Scenario: dAPIs Tab

- **WHEN** 用户选择 dAPIs Tab
- **THEN** 显示所有 dAPIs 列表
- **AND** 支持按链和状态筛选

#### Scenario: 签名验证 Tab

- **WHEN** 用户选择签名验证 Tab
- **THEN** 显示签名验证面板
- **AND** 支持输入签名数据进行验证

### Requirement: Band Protocol 统一入口页面

系统 SHALL 提供 Band Protocol 的统一入口页面，使用 Tab 切换不同功能模块。

#### Scenario: 页面布局

- **WHEN** 用户访问 Band Protocol 页面
- **THEN** 显示 Band Protocol 协议概览卡片（数据桥数、活跃数、传输量等）
- **AND** 提供 Tab 切换：概览、数据桥、数据源、传输历史、Cosmos

#### Scenario: 概览 Tab

- **WHEN** 用户选择概览 Tab
- **THEN** 显示 Band Protocol 协议的整体状态摘要
- **AND** 显示跨链连接拓扑图

#### Scenario: 数据桥 Tab

- **WHEN** 用户选择数据桥 Tab
- **THEN** 显示所有跨链数据桥列表和状态
- **AND** 支持按状态筛选

#### Scenario: 数据源 Tab

- **WHEN** 用户选择数据源 Tab
- **THEN** 显示所有数据源列表
- **AND** 支持按类型（EVM/Cosmos）和链筛选

#### Scenario: 传输历史 Tab

- **WHEN** 用户选择传输历史 Tab
- **THEN** 显示跨链传输历史记录
- **AND** 支持按状态和时间筛选

#### Scenario: Cosmos Tab

- **WHEN** 用户选择 Cosmos Tab
- **THEN** 显示 Cosmos 生态链支持情况
- **AND** 显示各链的数据可用性状态

---

## MODIFIED Requirements

### Requirement: 导航配置更新

现有导航配置 SHALL 更新以支持独立的 API3 和 Band Protocol 入口。

**修改内容：**

- 移除 `oracleProtocols` 导航分组
- 添加独立的 `api3` 导航项
- 添加独立的 `band` 导航项
- 更新导航描述以反映协议定位

### Requirement: 国际化文本更新

现有国际化配置 SHALL 更新以支持新的导航结构。

**修改内容：**

- 添加 API3 导航相关翻译
- 添加 Band Protocol 导航相关翻译
- 更新页面标题和描述翻译

---

## REMOVED Requirements

### Requirement: 预言机协议父导航

**Reason**: 两个协议功能定位不同，独立导航更清晰
**Migration**: 将现有子页面整合到各自的统一入口页面中
