# Tasks

## 优先级 1: 错误处理统一

- [x] Task 1: 统一错误处理系统
  - [x] SubTask 1.1: 合并 `apiResponse.ts` 和 `apiErrors.ts`，统一使用 `AppError` 作为基础错误类型
  - [x] SubTask 1.2: 创建统一的错误响应格式 `{ success: false, error: { code, message, details } }`
  - [x] SubTask 1.3: 修改 `handleApi` 函数，生产环境返回通用错误消息
  - [x] SubTask 1.4: 更新所有 API 路由使用统一的错误处理

- [x] Task 2: 统一 API 响应格式
  - [x] SubTask 2.1: 创建 API 响应工具函数 `success()` 和 `error()`
  - [x] SubTask 2.2: 更新所有 API 路由使用统一响应格式
  - [x] SubTask 2.3: 统一 Mock 数据标识为 `isMock: boolean` 字段

## 优先级 2: 代码重复消除

- [ ] Task 3: Oracle 客户端重构
  - [ ] SubTask 3.1: 将 `getPriceForSymbol()`、`getMultiplePrices()`、`fetchAllFeeds()`、`checkFeedHealth()` 上移到 `EvmOracleClient` 基类
  - [ ] SubTask 3.2: 重构 Chainlink、Pyth、API3、Band Oracle 客户端，移除重复代码
  - [ ] SubTask 3.3: 添加单元测试验证重构后功能正确

- [x] Task 4: 验证逻辑统一
  - [x] SubTask 4.1: 统一使用 `inputValidation.ts` 中的验证函数
  - [x] SubTask 4.2: 删除 `src/lib/api/validation/index.ts` 中的重复验证逻辑
  - [x] SubTask 4.3: 更新 API 路由中的内联验证逻辑

- [ ] Task 5: Mock 数据服务统一
  - [ ] SubTask 5.1: 创建 `src/lib/testing/mockDataService.ts` 统一管理 Mock 数据
  - [ ] SubTask 5.2: 重构各 API 路由中的 Mock 数据生成逻辑

## 优先级 3: 类型安全增强

- [ ] Task 6: 减少类型断言
  - [ ] SubTask 6.1: 为区块链合约返回值创建 Zod schema
  - [ ] SubTask 6.2: 替换 `pythOracle.ts` 中的类型断言为运行时验证
  - [ ] SubTask 6.3: 替换 `bandOracle.ts` 中的类型断言为运行时验证
  - [ ] SubTask 6.4: 替换 `db.ts` 中的 `as unknown as` 类型断言

- [ ] Task 7: 类型定义重构
  - [ ] SubTask 7.1: 将 `unifiedOracleTypes.ts` 按领域拆分为独立文件
  - [ ] SubTask 7.2: 消除类型定义中的循环依赖
  - [ ] SubTask 7.3: 启用 `strictNullChecks` 并修复相关问题

## 优先级 4: 性能优化

- [x] Task 8: 分布式缓存支持
  - [x] SubTask 8.1: 添加 Redis 客户端配置（可选）
  - [x] SubTask 8.2: 重构 `rateLimit.ts` 支持 Redis 存储
  - [ ] SubTask 8.3: 重构 `cache.ts` 支持分布式缓存
  - [ ] SubTask 8.4: 添加缓存键命名规范和失效策略

- [x] Task 9: 数据库优化
  - [ ] SubTask 9.1: 分析常用查询模式，添加复合索引
  - [ ] SubTask 9.2: 添加连接池监控和动态调整机制
  - [x] SubTask 9.3: 修正 `drizzle.config.ts` 中的 schema 路径

## 优先级 5: 安全性增强

- [x] Task 10: 安全改进
  - [x] SubTask 10.1: 为 `BatchInserter` 添加表名和列名白名单验证
  - [ ] SubTask 10.2: 加密存储通知渠道配置
  - [ ] SubTask 10.3: 添加请求体敏感字段过滤到日志
  - [x] SubTask 10.4: 加强 Cron 端点认证（开发环境也要求认证）

## 优先级 6: 可维护性改进

- [ ] Task 11: 配置集中管理
  - [ ] SubTask 11.1: 创建 `src/config/contracts/` 目录
  - [ ] SubTask 11.2: 将各 Oracle 合约地址迁移到统一配置文件
  - [ ] SubTask 11.3: 更新所有引用使用新配置路径

- [ ] Task 12: 日志系统统一
  - [ ] SubTask 12.1: 统一使用结构化 JSON 日志格式
  - [ ] SubTask 12.2: 添加请求 ID 追踪中间件
  - [ ] SubTask 12.3: 合并审计日志和通用日志系统

## 优先级 7: 测试覆盖

- [ ] Task 13: API 测试
  - [ ] SubTask 13.1: 为 `/api/alerts` 路由添加集成测试
  - [ ] SubTask 13.2: 为 `/api/oracle/*` 路由添加集成测试
  - [ ] SubTask 13.3: 为 `/api/comparison/*` 路由添加集成测试

- [ ] Task 14: 数据库测试
  - [x] SubTask 14.1: 为 `BatchInserter` 添加更多测试用例
  - [ ] SubTask 14.2: 为数据库查询添加测试
  - [ ] SubTask 14.3: 为数据库连接池健康检查添加测试

## 优先级 8: 脚本改进

- [ ] Task 15: 脚本优化
  - [ ] SubTask 15.1: 将 `provision-supabase.mjs` 转换为 TypeScript
  - [ ] SubTask 15.2: 修复 `validate-schema-consistency.ts` 中的安全警告
  - [ ] SubTask 15.3: 为脚本添加完善的错误处理和日志

# Task Dependencies

- [Task 2] 依赖 [Task 1] - 需要先统一错误处理系统
- [Task 3] 可与 [Task 4]、[Task 5] 并行
- [Task 6] 依赖 [Task 3] - Oracle 客户端重构后再处理类型断言
- [Task 8] 可与 [Task 9] 并行
- [Task 10] 可与 [Task 11]、[Task 12] 并行
- [Task 13]、[Task 14] 应在主要重构完成后执行
