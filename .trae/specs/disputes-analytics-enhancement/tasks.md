# Tasks

## P0 - 核心功能

- [x] Task 1: 实现时间范围选择器
  - [x] SubTask 1.1: 复用 deviation 组件的 TimeRangeSelector
  - [x] SubTask 1.2: 在 useDisputeAnalytics hook 中集成时间范围筛选逻辑
  - [x] SubTask 1.3: 更新 DisputeContent 组件添加时间范围选择器 UI

- [x] Task 2: 实现协议和链筛选功能
  - [x] SubTask 2.1: 创建 ProtocolChainFilter 组件，支持多协议、多链同时筛选
  - [x] SubTask 2.2: 在 useDisputeAnalytics hook 中添加协议和链筛选状态
  - [x] SubTask 2.3: 更新 filteredDisputes 逻辑，支持协议和链筛选
  - [x] SubTask 2.4: 更新 DisputeContent 组件添加协议/链筛选器 UI

- [x] Task 3: 实现争议详情弹窗/面板
  - [x] SubTask 3.1: 创建 DisputeDetailPanel 组件，展示完整争议信息
  - [x] SubTask 3.2: 添加争议时间线展示（提议→争议→解决）
  - [x] SubTask 3.3: 添加地址和交易哈希的区块浏览器跳转链接
  - [x] SubTask 3.4: 在 DisputeContent 中集成详情面板

## P1 - 重要功能

- [x] Task 4: 实现争议结果分布可视化
  - [x] SubTask 4.1: 创建 DisputeResultChart 组件（环形图）
  - [x] SubTask 4.2: 展示活跃/成功/失败争议分布
  - [x] SubTask 4.3: 支持按协议查看分布
  - [x] SubTask 4.4: 在概览 Tab 中集成图表

- [x] Task 5: 实现保证金分析图表
  - [x] SubTask 5.1: 创建 BondDistributionChart 组件
  - [x] SubTask 5.2: 展示不同金额区间的争议数量分布
  - [x] SubTask 5.3: 添加保证金趋势变化图
  - [x] SubTask 5.4: 在概览 Tab 中集成图表

- [x] Task 6: 增强仲裁者排行榜
  - [x] SubTask 6.1: 创建 DisputerRankingChart 组件，可视化展示排名
  - [x] SubTask 6.2: 添加排名趋势指示器（上升/下降）
  - [x] SubTask 6.3: 创建 DisputerDetailPanel 组件，展示仲裁者详细分析
  - [x] SubTask 6.4: 添加仲裁者成功率趋势图
  - [x] SubTask 6.5: 添加常参与协议分布图

- [x] Task 7: 实现多格式数据导出
  - [x] SubTask 7.1: 复用 deviation 组件的 ExportButton
  - [x] SubTask 7.2: 添加 CSV 格式导出支持
  - [x] SubTask 7.3: 添加 Excel 格式导出支持
  - [x] SubTask 7.4: 更新 handleExport 函数支持格式选择

## P2 - 增强功能

- [x] Task 8: 实现新手引导系统
  - [x] SubTask 8.1: 创建 WelcomeGuide 组件
  - [x] SubTask 8.2: 实现首次访问检测逻辑
  - [x] SubTask 8.3: 创建 HelpTooltip 组件
  - [x] SubTask 8.4: 为关键指标添加帮助提示

- [x] Task 9: 实现争议预测分析
  - [x] SubTask 9.1: 在争议趋势图中添加预测线
  - [x] SubTask 9.2: 实现基于历史数据的简单预测算法
  - [x] SubTask 9.3: 添加预测置信区间展示

## P3 - UI 优化

- [x] Task 10: 页面布局优化
  - [x] SubTask 10.1: 优化页面顶部布局，增加关键洞察卡片
  - [x] SubTask 10.2: 优化移动端响应式布局
  - [x] SubTask 10.3: 优化 Tab 切换的视觉反馈

# Task Dependencies
- [Task 3] depends on [Task 2] (详情面板需要显示筛选后的数据)
- [Task 4] depends on [Task 1] (图表需要根据时间范围筛选数据)
- [Task 5] depends on [Task 1] (图表需要根据时间范围筛选数据)
- [Task 6] depends on [Task 1] (排行榜需要根据时间范围筛选数据)
- [Task 7] can run in parallel with other tasks
- [Task 8] can run in parallel with other tasks
- [Task 9] depends on [Task 4] (预测需要历史趋势数据)
