# 预言机数据分析平台优化 Spec

## Why
当前预言机数据分析平台存在架构分散、性能瓶颈、安全隐患和测试覆盖不足等问题，影响系统的可维护性、性能表现和安全性。需要进行系统性优化以提升代码质量和用户体验。

## What Changes
- 统一并优化服务层架构，合并重复的价格服务
- 修复 SQL 注入风险和 API 安全问题
- 优化数据库查询性能和 API 调用效率
- 统一缓存实现，消除重复代码
- 增强类型安全和错误处理
- 补充关键模块的测试覆盖

## Impact
- Affected specs: oracle-services, api-security, performance-optimization
- Affected code: 
  - `src/features/oracle/services/` - 服务层重构
  - `src/lib/api/middleware.ts` - 安全增强
  - `src/lib/cache/` - 缓存统一
  - `src/types/` - 类型定义集中

## ADDED Requirements

### Requirement: 统一价格服务架构
系统 SHALL 提供统一的价格服务接口，整合分散的价格获取、历史查询和实时推送功能。

#### Scenario: 价格服务统一调用
- **WHEN** 组件需要获取价格数据时
- **THEN** 通过统一的 `OraclePriceService` 接口获取，无需关心底层实现

### Requirement: SQL 查询安全
系统 SHALL 使用完全参数化的 SQL 查询，防止 SQL 注入攻击。

#### Scenario: 动态时间间隔查询
- **WHEN** 执行包含动态时间间隔的查询时
- **THEN** 使用参数化方式传递时间参数，而非字符串拼接

### Requirement: API 速率限制
系统 SHALL 对所有公开 API 端点实施速率限制，防止滥用。

#### Scenario: SSE 连接限制
- **WHEN** 用户请求 SSE 价格推送时
- **THEN** 检查 IP 级别的连接限制，超限返回 429 状态码

### Requirement: 批量数据库操作
系统 SHALL 使用批量插入代替循环插入，提升数据库写入性能。

#### Scenario: 价格历史批量写入
- **WHEN** 需要插入多条价格历史记录时
- **THEN** 使用单条 INSERT 语句批量插入所有记录

### Requirement: 并行 API 调用
系统 SHALL 对独立的 API 调用使用并行处理，减少总响应时间。

#### Scenario: 多交易对分析
- **WHEN** 需要分析多个交易对的偏差趋势时
- **THEN** 使用 Promise.all 并行处理所有交易对

### Requirement: 统一缓存实现
系统 SHALL 使用统一的 LRUCache 实现，消除重复的缓存代码。

#### Scenario: 缓存服务调用
- **WHEN** 需要缓存 API 响应时
- **THEN** 使用 `@/lib/cache` 提供的统一缓存接口

### Requirement: 类型安全增强
系统 SHALL 消除所有 `any` 类型使用，使用具体的类型定义。

#### Scenario: API 响应类型
- **WHEN** 处理外部 API 响应时
- **THEN** 使用预定义的接口类型进行类型检查

### Requirement: 关键模块测试覆盖
系统 SHALL 为核心服务和 hooks 提供单元测试覆盖。

#### Scenario: 价格偏差分析测试
- **WHEN** 运行测试套件时
- **THEN** 验证价格偏差分析服务的正确性和边界情况处理

## MODIFIED Requirements

### Requirement: 错误处理增强
原有的简单错误日志 SHALL 替换为结构化的错误类型和处理流程。

**变更详情**：
- 使用 `OracleError` 和 `ExternalServiceError` 替代通用 Error
- 添加错误码和上下文信息
- 实现错误恢复策略

### Requirement: 缓存清理机制
原有的全局 setInterval 清理 SHALL 改为可控制的清理服务。

**变更详情**：
- 导出 `startCacheCleanup` 和 `stopCacheCleanup` 函数
- 在应用启动和关闭时调用相应函数
- 支持多实例部署场景

## REMOVED Requirements

### Requirement: 分散的价格服务
**Reason**: 多个价格服务职责重叠，维护成本高
**Migration**: 合并到统一的 `OraclePriceService`

### Requirement: 重复的缓存实现
**Reason**: 存在 3 个不同的缓存实现，代码冗余
**Migration**: 统一使用 `LRUCache`
