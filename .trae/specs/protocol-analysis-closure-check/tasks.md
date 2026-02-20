# Tasks

## 高优先级任务

- [x] Task 1: 创建协议详情 API
  - [x] SubTask 1.1: 创建 `/api/oracle/protocols/[protocol]/route.ts` 文件
  - [x] SubTask 1.2: 实现协议基本信息查询逻辑
  - [x] SubTask 1.3: 实现价格源列表查询
  - [x] SubTask 1.4: 实现性能指标计算
  - [x] SubTask 1.5: 添加错误处理和日志

- [x] Task 2: 协议比较真实数据支持
  - [x] SubTask 2.1: 创建 `/api/comparison/metrics` API 路由
  - [x] SubTask 2.2: 实现协议性能指标聚合逻辑
  - [x] SubTask 2.3: 修改 `ProtocolCompare.tsx` 调用真实 API
  - [x] SubTask 2.4: 移除 `generateMockMetrics` 函数
  - [x] SubTask 2.5: 添加加载状态和错误处理

## 中优先级任务

- [x] Task 3: Mock 数据标识机制
  - [x] SubTask 3.1: 定义 Mock 数据响应格式 (添加 `isMock` 字段)
  - [x] SubTask 3.2: 修改所有 API 路由返回 Mock 标识
  - [x] SubTask 3.3: 创建前端数据源提示组件
  - [x] SubTask 3.4: 在关键页面添加数据来源提示

- [x] Task 4: 可靠性评分 Mock 支持
  - [x] SubTask 4.1: 添加 `useMock` 查询参数支持
  - [x] SubTask 4.2: 实现开发环境默认 Mock 逻辑
  - [x] SubTask 4.3: 确保生产环境强制使用数据库
  - [x] SubTask 4.4: 添加环境检测和日志

- [x] Task 5: 偏差分析 Mock 优化
  - [x] SubTask 5.1: 添加明确的 Mock 模式标识
  - [x] SubTask 5.2: 在前端显示数据来源警告
  - [x] SubTask 5.3: 优化 Mock 数据生成逻辑

## 低优先级任务

- [ ] Task 6: 数据源监控和告警
  - [ ] SubTask 6.1: 添加数据源健康检查端点
  - [ ] SubTask 6.2: 实现 Mock 数据使用率监控
  - [ ] SubTask 6.3: 添加数据源切换告警

- [ ] Task 7: 文档和注释
  - [ ] SubTask 7.1: 更新 API 文档
  - [ ] SubTask 7.2: 添加 Mock 数据使用说明
  - [ ] SubTask 7.3: 更新开发者指南

# Task Dependencies

- [Task 2] 依赖 [Task 1] - 协议比较需要协议详情数据
- [Task 3] 应在 [Task 1, 2, 4, 5] 之前完成 - Mock 标识是基础设施
- [Task 6] 依赖 [Task 3] - 监控需要 Mock 标识机制
