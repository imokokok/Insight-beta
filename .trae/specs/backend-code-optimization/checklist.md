# 非前端代码优化 Checklist

## 错误处理统一

- [x] `apiResponse.ts` 和 `apiErrors.ts` 已合并，使用统一的 `AppError` 基类
- [x] 所有 API 返回统一的错误响应格式 `{ success: false, error: { code, message, details } }`
- [x] 生产环境错误响应不泄露敏感信息
- [x] 所有 API 路由已更新使用统一错误处理
- [x] Mock 数据标识统一为 `isMock: boolean` 字段

## 代码重复消除

- [ ] Oracle 客户端通用方法已上移到 `EvmOracleClient` 基类
- [ ] Chainlink、Pyth、API3、Band Oracle 客户端无重复代码
- [ ] 验证逻辑统一使用 `inputValidation.ts`
- [ ] Mock 数据服务已统一到 `mockDataService.ts`

## 类型安全增强

- [ ] 区块链合约返回值使用 Zod schema 验证
- [ ] `pythOracle.ts` 无类型断言
- [ ] `bandOracle.ts` 无类型断言
- [ ] `db.ts` 无 `as unknown as` 类型断言
- [ ] `unifiedOracleTypes.ts` 已按领域拆分
- [ ] 无类型定义循环依赖
- [ ] `strictNullChecks` 已启用

## 性能优化

- [ ] 速率限制支持 Redis 存储
- [ ] 缓存支持分布式部署
- [ ] 缓存键命名规范已建立
- [ ] 数据库复合索引已添加
- [ ] 连接池监控已实现
- [ ] `drizzle.config.ts` schema 路径正确

## 安全性增强

- [x] `BatchInserter` 表名/列名有白名单验证
- [ ] 通知渠道配置已加密存储
- [ ] 日志不记录敏感请求体字段
- [x] Cron 端点在开发环境也有认证

## 可维护性改进

- [ ] 合约地址已集中到 `src/config/contracts/`
- [ ] 日志使用统一 JSON 格式
- [ ] 请求 ID 追踪已实现
- [ ] 审计日志和通用日志已合并

## 测试覆盖

- [ ] `/api/alerts` 路由有集成测试
- [ ] `/api/oracle/*` 路由有集成测试
- [ ] `/api/comparison/*` 路由有集成测试
- [ ] `BatchInserter` 有完整测试用例
- [ ] 数据库查询有测试
- [ ] 连接池健康检查有测试

## 脚本改进

- [ ] `provision-supabase.mjs` 已转换为 TypeScript
- [ ] `validate-schema-consistency.ts` 安全警告已修复
- [ ] 脚本有完善的错误处理和日志
