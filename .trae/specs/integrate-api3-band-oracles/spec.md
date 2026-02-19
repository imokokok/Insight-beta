# API3 和 Band Protocol 预言机集成规格

## Why

当前 Insight 平台已集成 Chainlink、Pyth、RedStone 和 UMA 四个预言机协议，但缺少 API3（第一方预言机/Airnode 技术）和 Band Protocol（跨链数据传输/Cosmos 生态）这两个重要预言机的支持。集成这两个预言机可以：

- 补充第一方数据源验证能力（API3 独有）
- 扩展 Cosmos 生态和跨链数据传输监控（Band Protocol 独有）
- 提供 OEV（Oracle Extractable Value）分析功能
- 增强平台的预言机覆盖范围和数据多样性

## What Changes

### 新增预言机协议支持

- **API3** - 第一方预言机协议，支持 Airnode 技术和 dAPIs
- **Band Protocol** - 跨链数据预言机，支持 Cosmos 生态

### 新增功能模块

- API3 Airnode 监控面板
- API3 dAPIs 数据源管理
- API3 OEV（Oracle Extractable Value）监控
- Band Protocol 跨链数据桥监控
- Band Protocol 自定义数据源管理
- 第一方数据源验证系统

### 现有页面增强

- 协议探索器增加 API3 和 Band Protocol 支持
- 价格比较页面增加新协议数据源
- 跨链分析页面增强 Band Protocol 数据桥支持
- 可靠性评分系统增加新协议评估

## Impact

### Affected specs

- 预言机协议配置
- 价格数据采集
- 跨链数据传输
- 数据源验证

### Affected code

- `src/features/oracle/constants/protocols.ts` - 协议配置
- `src/lib/blockchain/` - 新增 API3 和 Band 客户端
- `src/features/oracle/components/ProtocolExplorer.tsx` - 协议探索器
- `src/app/oracle/` - 预言机相关页面
- `src/lib/database/` - 数据库表结构

---

## ADDED Requirements

### Requirement: API3 预言机集成

系统 SHALL 提供 API3 预言机的完整集成支持，包括价格数据采集、Airnode 监控和 dAPIs 管理。

#### Scenario: API3 价格数据获取

- **WHEN** 用户请求特定交易对的价格数据
- **THEN** 系统能够从 API3 dAPIs 获取实时价格
- **AND** 返回包含签名数据的价格信息

#### Scenario: Airnode 健康监控

- **WHEN** 系统执行 Airnode 健康检查
- **THEN** 显示 Airnode 运行状态、响应时间和数据新鲜度
- **AND** 在异常情况下触发告警

#### Scenario: OEV 监控

- **WHEN** 用户查看 OEV 数据
- **THEN** 显示可提取价值估算和历史 OEV 数据
- **AND** 提供 OEV 优化建议

### Requirement: Band Protocol 预言机集成

系统 SHALL 提供 Band Protocol 预言机的完整集成支持，包括跨链数据传输和 Cosmos 生态支持。

#### Scenario: Band Protocol 价格数据获取

- **WHEN** 用户请求特定交易对的价格数据
- **THEN** 系统能够从 Band Protocol 获取实时价格
- **AND** 返回包含数据聚合验证的价格信息

#### Scenario: 跨链数据桥监控

- **WHEN** 用户查看跨链数据桥状态
- **THEN** 显示 Band Protocol 数据桥的传输状态和延迟
- **AND** 提供跨链数据传输历史记录

#### Scenario: Cosmos 生态支持

- **WHEN** 用户选择 Cosmos 生态链
- **THEN** 系统能够获取 Band Protocol 在该链上的价格数据
- **AND** 显示 Cosmos 链特有的数据验证信息

### Requirement: 第一方数据源验证

系统 SHALL 提供第一方数据源验证功能，用于验证 API3 Airnode 提供的签名数据。

#### Scenario: 签名数据验证

- **WHEN** 系统接收到 API3 签名价格数据
- **THEN** 验证签名有效性和数据完整性
- **AND** 显示验证结果和信任评分

#### Scenario: 数据源追溯

- **WHEN** 用户查看数据源详情
- **THEN** 显示数据从第一方提供商到链上的完整路径
- **AND** 提供数据源信誉评分

### Requirement: API3 Airnode 监控页面

系统 SHALL 提供独立的 API3 Airnode 监控页面。

#### Scenario: Airnode 状态概览

- **WHEN** 用户访问 Airnode 监控页面
- **THEN** 显示所有已配置 Airnode 的运行状态
- **AND** 提供响应时间、可用性等关键指标

#### Scenario: Airnode 详细信息

- **WHEN** 用户点击特定 Airnode
- **THEN** 显示该 Airnode 的详细配置和运行历史
- **AND** 提供日志查看和告警配置功能

### Requirement: OEV 分析页面

系统 SHALL 提供 OEV（Oracle Extractable Value）分析功能。

#### Scenario: OEV 概览

- **WHEN** 用户访问 OEV 分析页面
- **THEN** 显示当前可提取价值总量和分布
- **AND** 提供按交易对分组的 OEV 数据

#### Scenario: OEV 历史分析

- **WHEN** 用户查看 OEV 历史数据
- **THEN** 显示 OEV 随时间的变化趋势
- **AND** 提供与价格偏差的相关性分析

### Requirement: Band Protocol 数据桥页面

系统 SHALL 提供 Band Protocol 跨链数据桥监控页面。

#### Scenario: 数据桥状态

- **WHEN** 用户访问数据桥页面
- **THEN** 显示所有支持链的数据桥状态
- **AND** 提供实时传输延迟和成功率数据

#### Scenario: 传输历史

- **WHEN** 用户查看传输历史
- **THEN** 显示跨链数据传输的详细记录
- **AND** 提供筛选和搜索功能

### Requirement: 自定义数据源管理

系统 SHALL 支持 Band Protocol 自定义数据源的管理和监控。

#### Scenario: 数据源列表

- **WHEN** 用户访问自定义数据源页面
- **THEN** 显示所有已配置的自定义数据源
- **AND** 提供数据源状态和更新频率信息

#### Scenario: 数据源创建

- **WHEN** 用户创建新的自定义数据源
- **THEN** 提供数据源配置向导
- **AND** 验证配置有效性并部署

### Requirement: 协议对比增强

系统 SHALL 在现有协议对比功能中增加 API3 和 Band Protocol 的对比支持。

#### Scenario: 多协议价格对比

- **WHEN** 用户选择多个协议进行价格对比
- **THEN** 能够包含 API3 和 Band Protocol 的价格数据
- **AND** 显示各协议的价格差异和延迟对比

#### Scenario: 可靠性对比

- **WHEN** 用户查看协议可靠性评分
- **THEN** 包含 API3 和 Band Protocol 的可靠性指标
- **AND** 提供基于统一标准的评分对比

### Requirement: 数据聚合验证

系统 SHALL 提供 Band Protocol 数据聚合验证功能。

#### Scenario: 聚合数据验证

- **WHEN** 系统接收到 Band Protocol 价格数据
- **THEN** 验证数据聚合过程的有效性
- **AND** 显示参与聚合的数据源信息

#### Scenario: 数据源权重分析

- **WHEN** 用户查看数据源权重
- **THEN** 显示各数据源在聚合中的权重分配
- **AND** 提供权重调整历史记录

---

## MODIFIED Requirements

### Requirement: 协议配置扩展

现有协议配置 SHALL 扩展以支持 API3 和 Band Protocol。

**修改内容：**

- 在 `PROTOCOLS` 数组中添加 API3 和 Band Protocol 配置
- 添加新的协议类型 `first_party` 用于 API3
- 添加新的协议类型 `cross_chain` 用于 Band Protocol
- 扩展协议特性列表以包含新功能

### Requirement: 价格数据采集增强

现有价格数据采集系统 SHALL 扩展以支持新协议的数据格式。

**修改内容：**

- 支持签名价格数据格式（API3）
- 支持聚合价格数据格式（Band Protocol）
- 扩展 `UnifiedPriceFeed` 类型以包含新字段
- 更新价格采集调度任务

### Requirement: 跨链分析增强

现有跨链分析功能 SHALL 增强 Band Protocol 数据桥支持。

**修改内容：**

- 添加 Band Protocol 数据桥状态监控
- 集成 Cosmos 生态链数据
- 扩展跨链价格比较功能

### Requirement: 协议探索器增强

现有协议探索器 SHALL 增强以支持新协议的特定功能。

**修改内容：**

- 添加 API3 Airnode 状态显示
- 添加 Band Protocol 数据桥状态显示
- 支持第一方数据源筛选
- 添加 OEV 相关指标显示

---

## REMOVED Requirements

无移除的需求。本次集成仅增加新功能，不影响现有功能。
