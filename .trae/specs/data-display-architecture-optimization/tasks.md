# Tasks

- [x] Task 1: 添加顶部KPI快速概览条
  - [x] SubTask 1.1: 创建 `KPIOverviewBar` 组件
  - [x] SubTask 1.2: 在Dashboard页面集成KPI概览条
  - [x] SubTask 1.3: 添加点击跳转到详情区域功能

- [x] Task 2: 实现图表全屏查看功能
  - [x] SubTask 2.1: 创建 `ChartFullscreen` 组件包装器
  - [x] SubTask 2.2: 为 `ChartCard` 组件添加全屏按钮
  - [x] SubTask 2.3: 实现全屏模式切换逻辑

- [x] Task 3: 实现协议对比功能
  - [x] SubTask 3.1: 创建 `ProtocolCompare` 组件
  - [x] SubTask 3.2: 实现协议选择器（支持多选）
  - [x] SubTask 3.3: 创建对比表格和图表组件
  - [x] SubTask 3.4: 在Comparison页面集成对比功能

- [x] Task 4: 添加收藏夹功能
  - [x] SubTask 4.1: 创建 `FavoritesContext` 上下文
  - [x] SubTask 4.2: 创建 `FavoritesPanel` 侧边栏组件
  - [x] SubTask 4.3: 为交易对卡片添加收藏按钮
  - [x] SubTask 4.4: 实现本地存储持久化

- [x] Task 5: 实现图表导出功能
  - [x] SubTask 5.1: 创建 `ChartExport` 工具函数
  - [x] SubTask 5.2: 为图表添加导出按钮（PNG/SVG/CSV）
  - [x] SubTask 5.3: 添加水印和时间戳

- [x] Task 6: 数据表格行详情展开
  - [x] SubTask 6.1: 为 `VirtualTable` 添加行展开功能
  - [x] SubTask 6.2: 创建行详情面板组件
  - [x] SubTask 6.3: 集成历史趋势迷你图

# Task Dependencies

- [Task 2] 可独立执行
- [Task 4] 可独立执行
- [Task 5] 可独立执行
- [Task 1] 优先级最高，应优先执行
- [Task 3] 依赖 [Task 1] 完成
- [Task 6] 可与 [Task 1] 并行执行
