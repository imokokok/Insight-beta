# 非前端代码优化 Spec

## Why

项目后端代码（API 路由、数据库层、区块链客户端、安全模块等）存在错误处理不一致、代码重复、类型安全隐患、性能瓶颈等问题。通过优化可以提升代码质量、增强安全性、改善可维护性。

## What Changes

- 统一错误处理和 API 响应格式
- 消除 Oracle 客户端代码重复
- 加强类型安全，减少类型断言
- 完善缓存和速率限制策略
- 增加测试覆盖率
- 统一配置管理
- 改进安全性

## Impact

- Affected specs: API 架构、数据库层、区块链客户端、安全模块
- Affected code:
  - `src/lib/api/` - API 响应和中间件
  - `src/lib/errors/` - 错误处理
  - `src/lib/blockchain/` - Oracle 客户端
  - `src/lib/database/` - 数据库操作
  - `src/lib/security/` - 安全模块
  - `src/app/api/` - API 路由
  - `src/types/` - 类型定义
  - `scripts/` - 脚本文件

## ADDED Requirements

### Requirement: 统一错误处理系统

系统应使用统一的错误处理机制，避免多套错误处理系统并存。

#### Scenario: API 错误响应格式统一

- **WHEN** API 发生错误
- **THEN** 所有 API 返回统一格式 `{ success: false, error: { code: string, message: string, details?: unknown } }`

#### Scenario: 错误信息不泄露敏感数据

- **WHEN** 生产环境发生内部错误
- **THEN** 返回通用错误消息，详细信息仅记录日志

### Requirement: Oracle 客户端代码复用

各 Oracle 客户端的通用方法应提取到基类或 mixin 中。

#### Scenario: 新增 Oracle 客户端

- **WHEN** 开发者需要添加新的 Oracle 客户端
- **THEN** 只需实现差异化的 `fetchRawPriceData` 和 `parsePriceFromContract` 方法

### Requirement: 类型安全增强

减少类型断言使用，增加运行时类型验证。

#### Scenario: 合约返回值解析

- **WHEN** 解析区块链合约返回值
- **THEN** 使用 Zod 或类似库进行运行时验证，而非类型断言

### Requirement: 分布式缓存支持

缓存和速率限制应支持分布式部署场景。

#### Scenario: 多实例部署

- **WHEN** 应用部署在多个实例上
- **THEN** 速率限制和缓存在所有实例间共享

### Requirement: 安全性增强

敏感数据处理应遵循安全最佳实践。

#### Scenario: 敏感配置存储

- **WHEN** 存储通知渠道配置（webhook URL、bot token 等）
- **THEN** 使用加密存储

#### Scenario: SQL 查询安全

- **WHEN** 动态构建 SQL 查询
- **THEN** 表名和列名经过白名单验证

### Requirement: API 测试覆盖

关键 API 路由应有集成测试覆盖。

#### Scenario: API 回归测试

- **WHEN** 修改 API 路由代码
- **THEN** 测试套件能捕获潜在的回归问题

### Requirement: 配置集中管理

合约地址、RPC URL 等配置应集中管理。

#### Scenario: 配置更新

- **WHEN** 需要更新合约地址
- **THEN** 只需修改一处配置文件

### Requirement: 日志格式统一

系统应使用统一的结构化日志格式。

#### Scenario: 日志分析

- **WHEN** 需要分析系统日志
- **THEN** 所有日志使用 JSON 格式，包含请求 ID 追踪

## MODIFIED Requirements

无

## REMOVED Requirements

无
