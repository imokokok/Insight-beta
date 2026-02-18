# Tasks

## 高优先级任务

- [ ] Task 1: 实现真实数据源集成
  - [ ] SubTask 1.1: 创建后端 API 路由 `/api/oracle/analytics/disputes`
  - [ ] SubTask 1.2: 集成预言机数据源（UMA、Optimism Oracle 等）
  - [ ] SubTask 1.3: 实现数据缓存策略
  - [ ] SubTask 1.4: 更新前端 Hook 调用真实 API

- [ ] Task 2: 添加测试覆盖
  - [ ] SubTask 2.1: 为 `useDisputeAnalytics` Hook 编写单元测试
  - [ ] SubTask 2.2: 为关键组件编写快照测试（DisputeList、DisputeDetailPanel）
  - [ ] SubTask 2.3: 为图表组件编写测试
  - [ ] SubTask 2.4: 设置 CI 测试流程

- [ ] Task 3: 添加错误边界
  - [ ] SubTask 3.1: 实现 ErrorBoundary 组件
  - [ ] SubTask 3.2: 包裹仲裁分析页面
  - [ ] SubTask 3.3: 添加友好的错误恢复界面

## 中优先级任务

- [ ] Task 4: 性能优化
  - [ ] SubTask 4.1: 实现虚拟滚动（react-window）
  - [ ] SubTask 4.2: 优化筛选算法性能
  - [ ] SubTask 4.3: 添加数据分页功能
  - [ ] SubTask 4.4: 优化图表渲染性能

- [ ] Task 5: 增强筛选功能
  - [ ] SubTask 5.1: 添加保证金金额范围筛选
  - [ ] SubTask 5.2: 实现自定义时间范围选择器
  - [ ] SubTask 5.3: 添加多条件组合筛选
  - [ ] SubTask 5.4: 实现筛选条件保存和恢复

- [ ] Task 6: 数据对比功能
  - [ ] SubTask 6.1: 实现时间段对比功能
  - [ ] SubTask 6.2: 实现协议对比功能
  - [ ] SubTask 6.3: 展示环比、同比数据
  - [ ] SubTask 6.4: 添加对比图表可视化

## 低优先级任务

- [ ] Task 7: 实时数据推送
  - [ ] SubTask 7.1: 实现 WebSocket 连接
  - [ ] SubTask 7.2: 实时更新争议状态
  - [ ] SubTask 7.3: 推送新争议通知
  - [ ] SubTask 7.4: 添加实时连接状态指示器

- [ ] Task 8: 数据可视化增强
  - [ ] SubTask 8.1: 添加更多图表类型（如热力图、散点图）
  - [ ] SubTask 8.2: 实现图表交互功能（缩放、拖拽）
  - [ ] SubTask 8.3: 添加数据钻取功能
  - [ ] SubTask 8.4: 支持图表导出为图片

- [ ] Task 9: 用户个性化
  - [ ] SubTask 9.1: 保存用户筛选偏好到本地存储
  - [ ] SubTask 9.2: 实现自定义仪表板布局
  - [ ] SubTask 9.3: 添加争议收藏功能
  - [ ] SubTask 9.4: 实现自定义提醒规则

# Task Dependencies

- [Task 2] 依赖 [Task 1] - 测试需要真实数据源
- [Task 4] 依赖 [Task 1] - 性能优化需要真实数据测试
- [Task 5] 可与 [Task 4] 并行
- [Task 6] 依赖 [Task 5] - 数据对比需要增强筛选功能
- [Task 7] 依赖 [Task 1] - 实时推送需要真实数据源
- [Task 8] 可与 [Task 6] 并行
- [Task 9] 可与 [Task 8] 并行
