# Tasks

- [x] Task 1: 修复 API 输入验证和错误处理
  - [ ] SubTask 1.1: 修复 `src/app/api/alerts/[id]/route.ts` 中的输入验证，添加 action 参数验证
  - [ ] SubTask 1.2: 修复错误消息，确保与实际错误原因匹配
  - [ ] SubTask 1.3: 添加请求体结构验证

- [x] Task 2: 修复批量操作内存存储问题
  - [ ] SubTask 2.1: 在 `src/features/alerts/api/batch.ts` 中移除内存 Map 存储
  - [ ] SubTask 2.2: 创建数据库表存储批量操作状态
  - [ ] SubTask 2.3: 实现数据库持久化的批量操作逻辑

- [x] Task 3: 修复数值解析安全问题
  - [ ] SubTask 3.1: 修复 `src/features/oracle/chainlink/components/FeedAggregation.tsx` 中的 parseFloat NaN 处理
  - [ ] SubTask 3.2: 修复 `src/features/alerts/api/channelTest.ts` 中的 parseInt 处理
  - [ ] SubTask 3.3: 修复 `src/config/constants.ts` 中的环境变量解析，处理空字符串情况

- [x] Task 4: 修复 JSON 解析错误处理
  - [ ] SubTask 4.1: 修复 `src/features/oracle/components/ProtocolExplorer.tsx` 中的 JSON.parse 错误处理
  - [ ] SubTask 4.2: 检查并修复其他类似的 JSON.parse 调用

- [ ] Task 5: 修复加密失败处理逻辑
  - [ ] SubTask 5.1: 修改 `src/features/alerts/services/notificationChannelService.ts` 中的 encryptSensitiveFields 函数
  - [ ] SubTask 5.2: 加密失败时抛出错误而非静默继续

- [x] Task 6: 修复数据库操作问题
  - [ ] SubTask 6.1: 为 `src/features/alerts/api/rules.ts` 中的更新操作添加事务
  - [ ] SubTask 6.2: 修复 `src/lib/database/db.ts` 中的健康检查竞态条件
  - [ ] SubTask 6.3: 完善 Promise.race 超时处理，添加资源清理

- [ ] Task 7: 修复异步资源清理问题
  - [ ] SubTask 7.1: 修复 `src/features/comparison/components/ComparisonContent.tsx` 中的 WebSocket 重连清理
  - [ ] SubTask 7.2: 确保组件卸载时清理所有定时器

- [x] Task 8: 修复边界条件和除零风险
  - [ ] SubTask 8.1: 修复 `src/app/api/oracle/api3/oev/route.ts` 中的除零检查
  - [ ] SubTask 8.2: 审查并修复其他潜在的除零情况

# Task Dependencies

- Task 2 依赖 Task 6（数据库操作改进后才能实现批量操作持久化）
- Task 5 可以与 Task 1 并行执行
- Task 3、Task 4、Task 7、Task 8 可以并行执行
