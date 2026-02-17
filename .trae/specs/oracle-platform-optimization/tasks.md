# Tasks

## 阶段一：安全修复（P0）

- [x] Task 1: 修复 SQL 注入风险
  - [x] SubTask 1.1: 修改 `src/features/oracle/services/priceDeviationAnalytics.ts` 中的动态时间间隔查询，使用参数化方式
  - [x] SubTask 1.2: 审查所有 SQL 查询文件，确保使用参数化查询
  - [x] SubTask 1.3: 添加 SQL 注入防护的单元测试

- [x] Task 2: 增强 API 安全
  - [x] SubTask 2.1: 为 SSE 端点添加 IP 级别速率限制
  - [x] SubTask 2.2: 实现敏感 URL 参数过滤，防止日志泄露
  - [x] SubTask 2.3: 将 API 密钥存储改为加密方式或使用环境变量

- [x] Task 3: 添加请求去重和取消机制
  - [x] SubTask 3.1: 在 `useAutoRefresh` hook 中添加 AbortController 支持
  - [x] SubTask 3.2: 实现请求去重逻辑，避免重复请求
  - [x] SubTask 3.3: 添加竞态条件测试

## 阶段二：性能优化（P1）

- [x] Task 4: 优化数据库批量操作
  - [x] SubTask 4.1: 重构 `unifiedPriceService.ts` 的 `insertPriceHistory` 方法为批量插入
  - [x] SubTask 4.2: 添加批量操作的性能测试
  - [x] SubTask 4.3: 验证批量插入的数据完整性

- [x] Task 5: 并行化 API 调用
  - [x] SubTask 5.1: 修改 `priceDeviationAnalytics.ts` 的 `generateReport` 方法使用 Promise.all
  - [x] SubTask 5.2: 添加并发控制，限制最大并发数
  - [x] SubTask 5.3: 添加并行处理的错误处理

- [x] Task 6: 统一缓存实现
  - [x] SubTask 6.1: 删除 `apiCache.ts` 中的 `APICacheService` 类
  - [x] SubTask 6.2: 删除 `realDataService.ts` 中的 `DataCache` 类
  - [x] SubTask 6.3: 更新所有缓存调用使用 `@/lib/cache` 的 LRUCache
  - [x] SubTask 6.4: 添加缓存清理的启动和停止函数

## 阶段三：架构重构（P1）

- [x] Task 7: 统一价格服务架构
  - [x] SubTask 7.1: 创建 `src/features/oracle/services/price/` 目录结构
  - [x] SubTask 7.2: 重构 `priceFetcher.ts` 为 `price/fetcher.ts`
  - [x] SubTask 7.3: 重构 `unifiedPriceService.ts` 历史查询部分为 `price/history.ts`
  - [x] SubTask 7.4: 重构 `realtime/RealtimePriceService.ts` 为 `price/realtime.ts`
  - [x] SubTask 7.5: 创建 `price/index.ts` 统一导出 `OraclePriceService`

- [x] Task 8: 集中类型定义
  - [x] SubTask 8.1: 创建 `src/types/stats.ts` 集中统计类型定义
  - [x] SubTask 8.2: 创建 `src/types/price.ts` 集中价格类型定义
  - [x] SubTask 8.3: 更新所有导入路径使用集中类型
  - [x] SubTask 8.4: 删除重复的类型定义文件

## 阶段四：代码质量（P2）

- [x] Task 9: 消除 any 类型
  - [x] SubTask 9.1: 为 `src/lib/database/schema.ts` 添加具体类型
  - [x] SubTask 9.2: 为 `src/app/api/sse/price/route.ts` 添加响应类型
  - [x] SubTask 9.3: 为 `src/lib/blockchain/walletConnect.ts` 添加钱包类型
  - [x] SubTask 9.4: 运行类型检查确保无 any 类型

- [x] Task 10: 增强错误处理
  - [x] SubTask 10.1: 创建 `OracleError` 和 `ExternalServiceError` 错误类
  - [x] SubTask 10.2: 更新 `realDataService.ts` 使用结构化错误
  - [x] SubTask 10.3: 添加错误恢复策略
  - [x] SubTask 10.4: 更新错误日志格式

- [x] Task 11: 处理模拟数据
  - [x] SubTask 11.1: 在 `useOracleDashboard.ts` 中添加环境变量判断
  - [x] SubTask 11.2: 创建演示模式配置
  - [x] SubTask 11.3: 添加演示模式的 UI 提示

## 阶段五：测试补充（P2）

- [x] Task 12: 添加核心服务测试
  - [x] SubTask 12.1: 为 `priceDeviationAnalytics.ts` 添加单元测试
  - [x] SubTask 12.2: 为 `unifiedPriceService.ts` 添加单元测试
  - [x] SubTask 12.3: 为 `realDataService.ts` 添加单元测试

- [x] Task 13: 添加 Hooks 测试
  - [x] SubTask 13.1: 为 `useOracleDashboard.ts` 添加测试
  - [x] SubTask 13.2: 为 `useAutoRefresh.ts` 添加测试
  - [x] SubTask 13.3: 为 `useDeviationAnalytics.ts` 添加测试

- [x] Task 14: 添加 API 集成测试
  - [x] SubTask 14.1: 为 `/api/oracle/analytics/deviation` 添加集成测试
  - [x] SubTask 14.2: 为 `/api/oracle/stats` 添加集成测试
  - [x] SubTask 14.3: 为 `/api/sse/price` 添加集成测试

## 阶段六：验证和清理

- [x] Task 15: 验证优化效果
  - [x] SubTask 15.1: 运行完整的测试套件
  - [x] SubTask 15.2: 运行类型检查
  - [x] SubTask 15.3: 运行 ESLint 检查
  - [x] SubTask 15.4: 验证构建成功

# Task Dependencies
- [Task 2] depends on [Task 1] (安全修复优先)
- [Task 4] depends on [Task 1] (数据库优化在安全修复后)
- [Task 5] depends on [Task 4] (性能优化顺序)
- [Task 6] depends on [Task 5] (缓存统一在性能优化后)
- [Task 7] depends on [Task 6] (架构重构在性能优化后)
- [Task 8] depends on [Task 7] (类型集中化)
- [Task 9] depends on [Task 8] (类型安全)
- [Task 10] depends on [Task 9] (错误处理)
- [Task 11] depends on [Task 10] (代码质量)
- [Task 12] depends on [Task 7] (服务测试在重构后)
- [Task 13] depends on [Task 12] (Hooks 测试)
- [Task 14] depends on [Task 13] (API 测试)
- [Task 15] depends on [Task 1-14] (最终验证)
