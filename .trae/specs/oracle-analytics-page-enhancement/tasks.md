# Tasks

## 阶段一：核心筛选功能（P0）

- [x] Task 1: 实现时间范围选择器
  - [x] SubTask 1.1: 创建 `TimeRangeSelector.tsx` 组件，支持预设选项（1h、6h、24h、7d、30d）
  - [x] SubTask 1.2: 实现自定义时间范围选择功能
  - [x] SubTask 1.3: 创建 `useTimeRange.ts` hook 管理时间范围状态
  - [x] SubTask 1.4: 更新 `useDeviationAnalytics.ts` 支持时间范围参数

- [x] Task 2: 实现协议筛选功能
  - [x] SubTask 2.1: 创建 `ProtocolFilter.tsx` 组件，支持多选
  - [x] SubTask 2.2: 创建 `useProtocolFilter.ts` hook 管理协议筛选状态
  - [x] SubTask 2.3: 更新 API 调用支持协议筛选参数
  - [x] SubTask 2.4: 在概览 Tab 增加协议筛选器

## 阶段二：数据导出增强（P1）

- [x] Task 3: 增强数据导出功能
  - [x] SubTask 3.1: 创建 `ExportButton.tsx` 组件，支持格式选择
  - [x] SubTask 3.2: 实现 CSV 格式导出功能
  - [x] SubTask 3.3: 实现 Excel 格式导出功能（使用 xlsx 库）
  - [x] SubTask 3.4: 添加导出进度提示

## 阶段三：数据可视化增强（P1）

- [x] Task 4: 添加偏差热力图
  - [x] SubTask 4.1: 创建 `DeviationHeatmap.tsx` 组件
  - [x] SubTask 4.2: 实现交易对与时间维度的热力图展示
  - [x] SubTask 4.3: 添加热力图交互（悬停显示详情、点击钻取）

- [x] Task 5: 增强图表交互
  - [x] SubTask 5.1: 为 `DeviationDistributionChart` 添加缩放功能
  - [x] SubTask 5.2: 为 `DeviationTrendChart` 添加数据点详情弹窗
  - [x] SubTask 5.3: 实现图表数据区域选择功能

## 阶段四：用户体验优化（P1）

- [x] Task 6: 实现新手引导系统
  - [x] SubTask 6.1: 创建 `WelcomeGuide.tsx` 组件
  - [x] SubTask 6.2: 实现首次访问检测和引导展示
  - [x] SubTask 6.3: 创建 `HelpTooltip.tsx` 组件用于指标说明
  - [x] SubTask 6.4: 为关键指标添加帮助提示

- [x] Task 7: 优化页面布局
  - [x] SubTask 7.1: 在页面顶部增加关键指标概览卡片
  - [x] SubTask 7.2: 增加快速操作按钮区域
  - [x] SubTask 7.3: 优化 Tab 切换的视觉反馈
  - [x] SubTask 7.4: 添加面包屑导航

## 阶段五：数据钻取功能（P1）

- [x] Task 8: 实现数据钻取功能
  - [x] SubTask 8.1: 为趋势列表添加展开详情功能
  - [x] SubTask 8.2: 实现交易对历史偏差曲线详情视图
  - [x] SubTask 8.3: 为异常列表添加完整上下文信息展示
  - [x] SubTask 8.4: 实现数据点点击跳转详情页

## 阶段六：移动端优化（P2）

- [x] Task 9: 优化移动端体验
  - [x] SubTask 9.1: 优化图表触摸交互（滑动、缩放）
  - [x] SubTask 9.2: 优化列表卡片式布局
  - [x] SubTask 9.3: 增大移动端触摸目标大小
  - [x] SubTask 9.4: 优化移动端筛选器交互

## 阶段七：验证和测试

- [x] Task 10: 验证功能完整性
  - [x] SubTask 10.1: 运行完整的测试套件
  - [x] SubTask 10.2: 运行类型检查
  - [x] SubTask 10.3: 运行 ESLint 检查
  - [x] SubTask 10.4: 验证构建成功
  - [x] SubTask 10.5: 进行跨浏览器兼容性测试

# Task Dependencies
- [Task 2] depends on [Task 1] (筛选功能依赖时间范围)
- [Task 4] depends on [Task 1] (热力图依赖时间范围)
- [Task 5] depends on [Task 4] (图表增强依赖热力图基础)
- [Task 6] depends on [Task 1-5] (引导系统在功能完成后)
- [Task 7] depends on [Task 6] (布局优化配合引导系统)
- [Task 8] depends on [Task 7] (数据钻取依赖布局优化)
- [Task 9] depends on [Task 1-8] (移动端优化在功能完成后)
- [Task 10] depends on [Task 1-9] (最终验证)
