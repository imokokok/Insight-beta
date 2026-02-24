# 国际化硬编码文本处理 Spec

## Why

项目中存在大量硬编码的中英文字符串（约200+处），这些文本没有使用国际化函数处理，导致：

1. 无法实现多语言切换
2. 代码中存在大量fallback硬编码文本
3. 翻译文件不完整，缺少对应的翻译key
4. 影响用户体验和国际化支持

## What Changes

- 移除所有硬编码的中英文字符串，替换为 t() 函数调用
- 补充翻译文件中缺失的翻译key
- 移除代码中的fallback硬编码文本
- 统一翻译key命名规范

## Impact

- Affected specs: 国际化规范
- Affected code:
  - `src/app/oracle/chainlink/page.tsx`
  - `src/app/oracle/band/page.tsx`
  - `src/app/oracle/api3/page.tsx`
  - `src/app/oracle/pyth/page.tsx`
  - `src/app/oracle/protocols/[protocol]/page.tsx`
  - `src/app/alerts/page.tsx`
  - `src/app/explore/page.tsx`
  - `src/components/common/KpiCard.tsx`
  - `src/components/common/AppLayout.tsx`
  - `src/features/oracle/chainlink/components/HeartbeatMonitor.tsx`
  - `src/features/oracle/band/components/OracleScriptList.tsx`
  - `src/features/oracle/band/components/DataFreshnessCard.tsx`
  - `src/features/oracle/band/components/ValidatorHealthCard.tsx`
  - `src/features/oracle/api3/components/DapiList.tsx`
  - `src/features/oracle/api3/components/AlertConfigPanel.tsx`
  - `src/features/oracle/pyth/components/PublisherMonitor.tsx`
  - `src/features/explore/components/TrendingFeeds.tsx`
  - `src/features/explore/components/SortSelector.tsx`
  - `src/features/explore/components/MobileFilterSheet.tsx`
  - `src/features/cross-chain/components/CrossChainOverview.tsx`
  - `src/features/cross-chain/components/CrossChainComparison.tsx`
  - `src/features/cross-chain/components/LiquidityAnalysis.tsx`
  - `src/features/comparison/components/ComparisonControls.tsx`
  - `src/i18n/locales/en/*.ts`
  - `src/i18n/locales/zh/*.ts`

## ADDED Requirements

### Requirement: 翻译Key命名规范

系统应使用统一的翻译key命名规范，确保key的可读性和一致性。

#### Scenario: 翻译key命名

- **WHEN** 添加新的翻译key
- **THEN** key应遵循 `{模块}.{类型}.{名称}` 格式
- **AND** 模块名使用小驼峰命名
- **AND** 类型包括：title, description, label, placeholder, ariaLabel, error, empty

### Requirement: 移除硬编码Fallback

系统应移除所有代码中的fallback硬编码文本，确保翻译文件完整。

#### Scenario: 移除fallback

- **WHEN** 使用 t() 函数
- **THEN** 不应包含 `|| '硬编码文本'` 的fallback
- **AND** 翻译文件中必须存在对应的key

### Requirement: 通用文本复用

系统应复用已存在的通用翻译key，避免重复定义。

#### Scenario: 复用通用key

- **WHEN** 需要翻译通用文本（如：健康、警告、异常）
- **THEN** 使用 `common.status.*` 等通用key
- **AND** 不重复定义相同的翻译

### Requirement: placeholder和aria-label国际化

系统应确保所有placeholder和aria-label属性使用国际化。

#### Scenario: 属性国际化

- **WHEN** 组件包含placeholder或aria-label属性
- **THEN** 属性值应使用 t() 函数
- **AND** 提供对应的中英文翻译

## 翻译Key规划

### 通用Key (common.\*)

```
common.status.healthy = 健康 / Healthy
common.status.warning = 警告 / Warning
common.status.critical = 异常 / Critical
common.error.loadFailed = 加载数据失败 / Failed to load data
common.kpi.comparedToLastPeriod = 较上期 / vs last period
common.search.ariaLabel = 搜索 / Search
common.close.ariaLabel = 关闭 / Close
common.refresh = 刷新 / Refresh
common.retry = 重试 / Retry
common.lastUpdated = 最后更新 / Last Updated
```

### Chainlink模块 (chainlink.\*)

```
chainlink.tabs.overview = 概览 / Overview
chainlink.tabs.feeds = 喂价数据 / Price Feeds
chainlink.tabs.nodes = 节点监控 / Node Monitor
chainlink.tabs.costs = 成本分析 / Cost Analysis
chainlink.tabs.advanced = 高级分析 / Advanced Analytics
chainlink.pageDescription = 去中心化预言机网络 - OCR 轮次与节点运营商监控
chainlink.overview.title = Chainlink 协议概览
chainlink.overview.description = 去中心化预言机网络状态摘要
chainlink.features.title = 核心特性
chainlink.features.ocr.label = OCR 协议
chainlink.features.ocr.value = 链下报告聚合
chainlink.features.operators.label = 节点运营商
chainlink.features.operators.value = 去中心化数据源
chainlink.features.security.label = 安全机制
chainlink.features.security.value = 多签名验证
chainlink.supportedChains.title = 支持的链
chainlink.supportedChains.description = Chainlink 支持的区块链网络
chainlink.feedStatus.title = Feed 状态概览
chainlink.feedStatus.total = 总 Feed 数
chainlink.feedStatus.active = 活跃 Feed
chainlink.feedStatus.inactive = 非活跃 Feed
chainlink.nodeStatus.title = 节点运营商状态
chainlink.nodeStatus.total = 总节点数
chainlink.nodeStatus.online = 在线节点
chainlink.nodeStatus.offline = 离线节点
```

### Band模块 (band.\*)

```
band.tabs.overview = 概览 / Overview
band.tabs.bridges = 数据桥 / Data Bridges
band.tabs.sources = 数据源 / Data Sources
band.tabs.analysis = 数据分析 / Data Analysis
band.pageDescription = 跨链预言机 - Cosmos 生态与数据桥监控
band.overview.title = Band 协议概览
band.overview.description = 跨链预言机网络状态摘要
band.features.title = 核心特性
band.features.crossChain.label = 跨链数据桥
band.features.crossChain.value = 多链数据传输
band.features.ibc.label = IBC 协议
band.features.ibc.value = Cosmos 互操作
band.features.validation.label = 数据验证
band.features.validation.value = 多源聚合验证
band.bridgeStatus.title = 数据桥状态概览
band.bridgeList.title = 数据桥列表
band.bridgeList.empty = 暂无数据桥信息
band.cosmosSelector.title = Cosmos 链选择器
band.cosmosSelector.description = 选择 Cosmos 生态链查看详细数据
band.blockInfo.title = Band Chain 区块信息
band.blockInfo.description = 最新区块状态
band.ibcStatus.title = IBC 状态
band.ibcStatus.description = 当前选中链的 IBC 连接状态
```

### API3模块 (api3.\*)

```
api3.pageDescription = 第一方预言机 - Airnode 技术与签名数据验证
api3.overview.title = API3 协议概览
api3.overview.description = 第一方预言机网络状态摘要
api3.features.title = 核心特性
api3.supportedChains.title = 支持的链
api3.dapi.refresh.ariaLabel = 刷新数据
api3.alertConfig.selectAlertType = 选择告警类型
api3.alertConfig.alertNamePlaceholder = 输入告警名称
api3.alertConfig.selectDapi = 选择 dAPI
api3.alertConfig.airnodeAddressPlaceholder = 输入 Airnode 地址
api3.alertConfig.selectNetwork = 选择网络
api3.alertConfig.thresholdPlaceholder = 输入阈值
```

### Pyth模块 (pyth.\*)

```
pyth.pageDescription = 高频预言机 - 实时价格推送与 Publisher 监控
pyth.overview.title = Pyth Network 协议概览
pyth.features.title = 核心特性
pyth.publisher.selectPublisher = 选择 Publisher
```

### 探索模块 (explore.\*)

```
explore.trending.loadError = 加载热门交易对失败
explore.trending.empty.title = 暂无热门交易对
explore.trending.empty.description = 当前没有可用的热门交易对数据
explore.sort.selectMethod = 选择排序方式
explore.scrollLeft.ariaLabel = 向左滚动
explore.scrollRight.ariaLabel = 向右滚动
```

### 跨链模块 (crossChain.\*)

```
crossChain.priceStatus.title = Price Status Overview
crossChain.monitoredChains = Monitored Chains
crossChain.priceRange = Price Range
crossChain.status = Status
crossChain.liquidity.selectChain = 选择链
crossChain.liquidity.selectAsset = 选择资产
```

### 协议模块 (protocol.\*)

```
protocol.stats.title = 协议统计
protocol.error.failedToLoad = Failed to Load Protocol
protocol.priceFeeds.title = Price Feeds
protocol.nodes.title = Nodes
protocol.supportedChains.title = Supported Chains
protocol.features.title = Features
```

### 比较模块 (comparison.\*)

```
comparison.controls.filter = Filter
comparison.controls.settings = Settings
comparison.controls.refresh = Refresh
comparison.controls.export = Export
```
