# Tasks

## 高优先级任务

- [x] Task 1: 修复 ChartCard 组件文字溢出
  - [x] SubTask 1.1: 为 CardTitle 添加 truncate 类
  - [x] SubTask 1.2: 为操作按钮添加 shrink-0

- [x] Task 2: 修复 CompactList 组件溢出
  - [x] SubTask 2.1: 为 item.label 添加 truncate 处理
  - [x] SubTask 2.2: 为 item.value 添加 truncate 处理
  - [x] SubTask 2.3: 为中间内容区添加 min-w-0 flex-1

- [x] Task 3: 修复 AlertHeatmap SVG 溢出
  - [x] SubTask 3.1: 添加 max-w-full overflow-x-auto
  - [x] SubTask 3.2: 改用响应式宽度

- [x] Task 4: 修复 CrossChainComparisonCard 响应式布局
  - [x] SubTask 4.1: 将 grid-cols-4 改为 grid-cols-2 sm:grid-cols-4
  - [x] SubTask 4.2: 为表头添加响应式处理

- [x] Task 5: 修复 GaugeGroup 响应式布局
  - [x] SubTask 5.1: 添加 grid-cols-1 作为基础

- [x] Task 6: 修复 AlertTrendChart 响应式问题
  - [x] SubTask 6.1: 为内部元素添加 min-w-0
  - [x] SubTask 6.2: 调整间距为 gap-2 sm:gap-4

- [x] Task 7: 修复 VirtualTableHeader 溢出
  - [x] SubTask 7.1: 添加 overflow-x-auto 或响应式隐藏列

- [x] Task 8: 修复 DapiList 表格溢出
  - [x] SubTask 8.1: 添加响应式隐藏或横向滚动

## 中优先级任务

- [x] Task 9: 修复 AlertGroup 组件溢出
  - [x] SubTask 9.1: 为 group.label 添加 truncate
  - [x] SubTask 9.2: 添加 flex-wrap 或 min-w-0

- [x] Task 10: 修复 NotificationChannels 文字溢出
  - [x] SubTask 10.1: 为 channel.description 添加 truncate

- [x] Task 11: 修复 PublisherMonitor 文字溢出
  - [x] SubTask 11.1: 为 publisher.name 添加 truncate

- [x] Task 12: 修复 TrendingFeedCard 溢出
  - [x] SubTask 12.1: 为父容器添加 min-w-0

- [x] Task 13: 修复 FeedDetail 标题区溢出
  - [x] SubTask 13.1: 添加 flex-wrap 或响应式隐藏部分元素
  - [x] SubTask 13.2: 为价格显示添加 truncate

- [x] Task 14: 修复 BridgeStatusCard 响应式
  - [x] SubTask 14.1: 添加 minmax 限制最小宽度

- [x] Task 15: 修复 TrendList 和 AnomalyList 响应式
  - [x] SubTask 15.1: 为统计卡片内容添加 min-w-0
  - [x] SubTask 15.2: 为模态框添加响应式宽度

- [x] Task 16: 修复 z-index 层级问题
  - [x] SubTask 16.1: 模态框统一使用 z-[60]
  - [x] SubTask 16.2: 下拉菜单使用 z-[55]

## 低优先级任务

- [x] Task 17: 修复间距不一致问题
  - [x] SubTask 17.1: GaugeGroup 使用响应式间距
  - [x] SubTask 17.2: OperatorList 添加 grid-cols-1 基础

- [x] Task 18: 修复固定宽度问题
  - [x] SubTask 18.1: MobileNav 侧边栏改为响应式宽度
  - [x] SubTask 18.2: QuickSearch 搜索框改为响应式宽度
  - [x] SubTask 18.3: MiniChart 改为响应式尺寸

- [x] Task 19: 修复其他显示问题
  - [x] SubTask 19.1: EnhancedStatCard value 添加 truncate
  - [x] SubTask 19.2: VirtualList 支持响应式高度

- [x] Task 20: 运行 lint 和类型检查验证修改

# Task Dependencies

- [Task 20] depends on [Task 1-19]
- [Task 1, Task 2, Task 3, Task 4, Task 5, Task 6, Task 7, Task 8] 可以并行执行（高优先级）
- [Task 9-16] 可以并行执行（中优先级）
- [Task 17-19] 可以并行执行（低优先级）
