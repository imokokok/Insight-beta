# Tasks - 平台优化分析

本任务列表基于对 Insight 预言机数据分析平台的全面分析，按优先级排序。

## 高优先级任务

- [x] Task 1: 补充核心业务模块测试覆盖
  - [x] SubTask 1.1: 为 alerts 模块添加单元测试（useAlerts.ts, AlertCard.tsx, AlertRuleForm.tsx）
  - [x] SubTask 1.2: 为 cross-chain 模块添加单元测试（useCrossChain.ts, CrossChainComparison.tsx）
  - [x] SubTask 1.3: 为 explore 模块添加单元测试（useGlobalSearch.ts, GlobalSearch.tsx）
  - [ ] SubTask 1.4: 为关键 API 路由添加集成测试（/api/alerts, /api/cross-chain, /api/oracle/stats）

- [x] Task 2: API 安全加固
  - [x] SubTask 2.1: 为所有 API 路由统一应用认证中间件（特别是 /api/alerts/batch）
  - [ ] SubTask 2.2: 完善 API 输入验证，添加完整 Zod Schema
  - [ ] SubTask 2.3: 生产环境配置 Redis 限流存储

- [x] Task 3: 代码清理与重构
  - [x] SubTask 3.1: 合并重复的 PriceHistoryChart 组件（保留 features/oracle 中的实现）
  - [ ] SubTask 3.2: 合并重复的 ThreatLevelBadge 组件
  - [ ] SubTask 3.3: 移除或填充空的服务层目录（alerts/wallet/explore/dashboard/comparison）

## 中优先级任务

- [x] Task 4: 性能监控增强
  - [x] SubTask 4.1: 添加 Web Vitals 监控（reportWebVitals 函数）
  - [ ] SubTask 4.2: 为高频 API 路由添加 ISR 缓存
  - [ ] SubTask 4.3: 优化实时价格服务的缓存策略

- [x] Task 5: 代码规范统一
  - [x] SubTask 5.1: 将 25 处 console 调用替换为 logger 工具
  - [x] SubTask 5.2: 为 /api/explore/search 添加错误处理
  - [ ] SubTask 5.3: 修复 Breadcrumb.tsx 中的 any 类型断言

- [ ] Task 6: 文档完善
  - [ ] SubTask 6.1: 完善 docs/deployment/security.md 文档
  - [ ] SubTask 6.2: 添加性能调优指南文档
  - [ ] SubTask 6.3: 补充 API 使用示例和最佳实践

## 低优先级任务

- [ ] Task 7: 功能增强
  - [ ] SubTask 7.1: 评估 PWA 支持的可行性
  - [ ] SubTask 7.2: 使用 next/font 进行字体优化
  - [ ] SubTask 7.3: 将部分 React.lazy 替换为 next/dynamic

- [ ] Task 8: 架构优化
  - [ ] SubTask 8.1: 添加 CSRF 保护机制
  - [ ] SubTask 8.2: 实现 API Key 持久化存储（数据库）
  - [ ] SubTask 8.3: 评估并实施 API 版本控制

---

# Task Dependencies

- Task 2.1 依赖 Task 3.3（服务层实现后才能正确应用认证）
- Task 4.2 依赖 Task 2.3（Redis 配置完成后才能使用 ISR 缓存）
- Task 6.1 依赖 Task 2（安全加固完成后更新文档）

---

# 预期成果

完成以上任务后，项目将达到以下状态：

1. **测试覆盖率提升**：核心业务模块测试覆盖率达到 80% 以上
2. **安全性增强**：所有 API 路由具备完整的认证和输入验证
3. **代码质量提升**：消除重复代码，统一代码规范
4. **性能可观测性**：具备完整的性能监控和指标收集
5. **文档完善**：运维和开发文档完整可用
