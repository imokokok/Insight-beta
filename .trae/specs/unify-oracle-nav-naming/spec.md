# 预言机协议导航命名与位置统一化 Spec

## Why

当前导航栏中，预言机协议相关页面的命名和位置不统一：

- "仲裁分析"是 UMA 预言机的专门分析页面，使用功能性命名，位于"运营"分组
- "API3"和"Band Protocol"使用协议名称，位于"主要"分组

这种不一致会让用户困惑，需要统一命名风格和位置。

## What Changes

### 方案选择

**采用方案：统一使用功能性命名 + 放入同一分组**

将所有预言机协议专用分析页面统一命名风格，并放入"协议分析"分组：

| 原名称        | 新名称    | 说明                         |
| ------------- | --------- | ---------------------------- |
| API3          | API3 分析 | 第一方预言机分析             |
| Band Protocol | Band 分析 | 跨链预言机分析               |
| 仲裁分析      | UMA 分析  | 乐观预言机分析（原仲裁分析） |

### 导航结构调整

- 新增"协议分析"分组
- 将 API3、Band Protocol、UMA（原仲裁分析）放入该分组
- 移除"主要"分组中的 API3 和 Band Protocol
- 移除"运营"分组中的仲裁分析

## Impact

- Affected specs: 导航配置、国际化
- Affected code:
  - `src/components/common/EnhancedSidebar.tsx` - 导航配置
  - `src/i18n/locales/zh/nav.ts` - 中文翻译
  - `src/i18n/locales/en/nav.ts` - 英文翻译

---

## ADDED Requirements

### Requirement: 协议分析分组

系统 SHALL 在导航栏中提供"协议分析"分组，包含所有预言机协议的专用分析页面。

#### Scenario: 分组显示

- **WHEN** 用户查看导航栏
- **THEN** 显示"协议分析"分组
- **AND** 分组包含 API3 分析、Band 分析、UMA 分析三个导航项

### Requirement: 统一功能性命名

系统 SHALL 使用功能性命名风格命名各协议分析页面。

#### Scenario: API3 命名

- **WHEN** 用户查看 API3 导航项
- **THEN** 显示名称为"API3 分析"
- **AND** 描述为"第一方预言机 - Airnode 技术与签名数据验证"

#### Scenario: Band Protocol 命名

- **WHEN** 用户查看 Band Protocol 导航项
- **THEN** 显示名称为"Band 分析"
- **AND** 描述为"跨链预言机 - Cosmos 生态与数据桥监控"

#### Scenario: UMA 命名

- **WHEN** 用户查看 UMA 导航项
- **THEN** 显示名称为"UMA 分析"
- **AND** 描述为"乐观预言机 - 争议仲裁与断言验证"

---

## MODIFIED Requirements

### Requirement: 导航配置更新

现有导航配置 SHALL 更新以支持新的分组结构。

**修改内容：**

1. 新增 `protocolAnalysis` 分组
2. 将 `api3` 和 `band` 从 `main` 分组移至 `protocolAnalysis` 分组
3. 将 `arbitration` 从 `operations` 分组移至 `protocolAnalysis` 分组，并重命名为 `uma`
4. 更新各导航项的 label 和 description

### Requirement: 国际化文本更新

现有国际化配置 SHALL 更新以支持新的命名。

**修改内容：**

1. 添加分组翻译 `protocolAnalysis: '协议分析'`
2. 更新 API3 翻译为 `api3Analysis: 'API3 分析'`
3. 更新 Band 翻译为 `bandAnalysis: 'Band 分析'`
4. 添加 UMA 翻译 `umaAnalysis: 'UMA 分析'`
5. 更新相关描述翻译

---

## REMOVED Requirements

无移除的需求。本次变更仅调整命名和位置，不影响现有功能。
