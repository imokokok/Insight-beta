# 修复项目错误逻辑 Spec

## Why

项目中存在多处错误逻辑问题，包括 API 错误处理不当、类型转换风险、边界条件处理缺失、异步操作问题以及数据库操作安全隐患，这些问题可能导致运行时错误、数据丢失或安全漏洞。

## What Changes

- 修复 API 路由中的错误处理逻辑，确保错误消息准确
- 添加输入验证，避免类型断言滥用
- 修复批量操作的内存存储问题，改用数据库持久化
- 处理 parseFloat/parseInt 的 NaN 情况
- 添加 JSON.parse 的错误处理
- 修复除零风险和边界条件处理
- 完善 Promise 超时处理和 WebSocket 重连清理
- 修复数据库操作的事务和竞态问题
- 修复加密失败时的处理逻辑

## Impact

- Affected specs: alerts API, oracle API, database operations
- Affected code:
  - `src/app/api/alerts/[id]/route.ts`
  - `src/features/alerts/api/batch.ts`
  - `src/features/alerts/api/rules.ts`
  - `src/features/alerts/api/channelTest.ts`
  - `src/features/alerts/services/notificationChannelService.ts`
  - `src/features/oracle/chainlink/components/FeedAggregation.tsx`
  - `src/features/oracle/components/ProtocolExplorer.tsx`
  - `src/lib/database/db.ts`
  - `src/config/constants.ts`

## ADDED Requirements

### Requirement: API 输入验证

系统 SHALL 对所有 API 请求的输入参数进行严格验证，不得仅依赖类型断言。

#### Scenario: 无效 action 参数

- **WHEN** 用户提交无效的 action 参数
- **THEN** 系统返回明确的验证错误消息，指出具体哪个参数无效

#### Scenario: 缺少必需参数

- **WHEN** 请求缺少必需的 action 字段
- **THEN** 系统返回 400 错误并明确指出缺少的字段

### Requirement: 批量操作持久化

系统 SHALL 将批量操作状态存储在数据库中，而非内存。

#### Scenario: 服务器重启

- **WHEN** 服务器重启后
- **THEN** 批量操作的状态仍然可以从数据库恢复

### Requirement: 数值解析安全

系统 SHALL 安全处理所有数值解析操作，避免 NaN 导致的运行时错误。

#### Scenario: parseFloat 无效输入

- **WHEN** parseFloat 接收到非数字字符串
- **THEN** 系统使用默认值 0 或跳过该条目

#### Scenario: parseInt 空字符串

- **WHEN** parseInt 接收到空字符串
- **THEN** 系统使用配置的默认值

### Requirement: 加密操作可靠性

系统 SHALL 确保敏感字段加密成功后才进行存储。

#### Scenario: 加密失败

- **WHEN** 敏感字段加密失败
- **THEN** 系统抛出错误并阻止存储操作，而非静默保留明文

### Requirement: 数据库事务完整性

系统 SHALL 对涉及多步操作的数据库更新使用事务。

#### Scenario: 并发更新

- **WHEN** 多个请求同时更新同一条记录
- **THEN** 事务确保数据一致性

## MODIFIED Requirements

### Requirement: API 错误响应

系统 SHALL 返回准确的错误消息，错误消息应反映实际的错误原因，而非通用的错误描述。

### Requirement: 异步资源清理

系统 SHALL 在组件卸载或操作完成时正确清理异步资源，包括定时器和 WebSocket 连接。
