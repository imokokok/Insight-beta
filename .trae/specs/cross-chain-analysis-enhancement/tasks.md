# Tasks

## 阶段一：图表组件实现（P0）

- [x] Task 1: 实现价格趋势图表组件
  - [x] SubTask 1.1: 检查项目图表库依赖，确定使用 Recharts 或 ECharts
  - [x] SubTask 1.2: 实现 `CrossChainPriceChart.tsx`，支持多链价格折线图
  - [x] SubTask 1.3: 添加图例切换功能，支持显示/隐藏特定链
  - [x] SubTask 1.4: 添加数据点悬停 Tooltip，显示详细价格信息
  - [x] SubTask 1.5: 支持图表缩放和拖动功能

- [x] Task 2: 实现偏差分析图表组件
  - [x] SubTask 2.1: 实现 `CrossChainDeviationChart.tsx`，展示偏差随时间变化
  - [x] SubTask 2.2: 添加阈值线标注（警告/严重）
  - [x] SubTask 2.3: 高亮显示异常偏差点
  - [x] SubTask 2.4: 支持偏差范围选择和放大

- [x] Task 3: 实现链对比柱状图组件
  - [x] SubTask 3.1: 检查现有 `CrossChainComparisonBar.tsx` 实现状态
  - [x] SubTask 3.2: 实现各链价格柱状图，标注均价线
  - [x] SubTask 3.3: 添加颜色编码区分高于/低于均价
  - [x] SubTask 3.4: 支持点击柱形显示详情

## 阶段二：套利机会分析（P1）

- [x] Task 4: 实现套利机会 API
  - [x] SubTask 4.1: 创建 `/api/cross-chain/arbitrage/route.ts`
  - [x] SubTask 4.2: 定义套利机会数据类型
  - [x] SubTask 4.3: 实现套利机会计算逻辑（基于价格差异）
  - [x] SubTask 4.4: 添加费用估算和风险评估

- [x] Task 5: 实现套利机会 UI 组件
  - [x] SubTask 5.1: 创建 `ArbitrageOpportunityList.tsx` 组件
  - [x] SubTask 5.2: 创建 `ArbitrageDetail.tsx` 详情组件
  - [x] SubTask 5.3: 创建 `useArbitrage.ts` hook
  - [x] SubTask 5.4: 在 Overview 页面集成套利机会展开功能

## 阶段三：跨链桥监控（P1）

- [x] Task 6: 实现跨链桥状态 API
  - [x] SubTask 6.1: 创建 `/api/cross-chain/bridges/route.ts`
  - [x] SubTask 6.2: 定义跨链桥状态数据类型
  - [x] SubTask 6.3: 集成主流跨链桥状态数据（Multichain、Stargate、LayerZero、Wormhole）
  - [x] SubTask 6.4: 添加延迟和费用监控数据

- [x] Task 7: 实现跨链桥监控 UI 组件
  - [x] SubTask 7.1: 创建 `BridgeStatusCard.tsx` 组件
  - [x] SubTask 7.2: 创建 `BridgeDetail.tsx` 详情组件
  - [x] SubTask 7.3: 创建 `useBridgeStatus.ts` hook
  - [x] SubTask 7.4: 在 Overview 页面添加跨链桥状态区域

## 阶段四：价格相关性分析（P2）

- [ ] Task 8: 实现价格相关性矩阵
  - [ ] SubTask 8.1: 创建 `/api/cross-chain/correlation/route.ts`
  - [ ] SubTask 8.2: 实现链间价格相关性计算
  - [ ] SubTask 8.3: 创建 `CorrelationMatrix.tsx` 组件
  - [ ] SubTask 8.4: 创建 `useCorrelation.ts` hook
  - [ ] SubTask 8.5: 在 Comparison 页面集成相关性矩阵

## 阶段四：价格相关性分析（P2）

- [x] Task 8: 实现价格相关性矩阵
  - [x] SubTask 8.1: 创建 `/api/cross-chain/correlation/route.ts`
  - [x] SubTask 8.2: 实现链间价格相关性计算
  - [x] SubTask 8.3: 创建 `CorrelationMatrix.tsx` 组件
  - [x] SubTask 8.4: 创建 `useCorrelation.ts` hook
  - [x] SubTask 8.5: 在 Comparison 页面集成相关性矩阵

## 阶段五：流动性分析（P2）

- [x] Task 9: 实现跨链流动性分析
  - [x] SubTask 9.1: 创建 `/api/cross-chain/liquidity/route.ts`
  - [x] SubTask 9.2: 定义流动性数据类型
  - [x] SubTask 9.3: 创建 `LiquidityDistribution.tsx` 组件
  - [x] SubTask 9.4: 创建 `useLiquidity.ts` hook
  - [x] SubTask 9.5: 在 Overview 页面添加流动性分布概览

## 阶段六：风险评分系统（P2）

- [x] Task 10: 实现跨链风险评分
  - [x] SubTask 10.1: 定义风险评分算法（基于价格偏差、流动性、桥状态）
  - [x] SubTask 10.2: 创建 `RiskScore.tsx` 组件
  - [x] SubTask 10.3: 在套利机会详情中集成风险评分
  - [x] SubTask 10.4: 在价格对比卡片中添加风险指示

## 阶段七：UI 优化和集成

- [x] Task 11: 优化 Overview 页面布局
  - [x] SubTask 11.1: 重构统计卡片布局，支持展开/收起
  - [x] SubTask 11.2: 集成套利机会详情展开功能
  - [x] SubTask 11.3: 集成跨链桥状态监控区域
  - [x] SubTask 11.4: 优化移动端响应式布局

- [x] Task 12: 优化 Comparison 页面
  - [x] SubTask 12.1: 集成价格趋势图表
  - [x] SubTask 12.2: 集成链对比柱状图
  - [x] SubTask 12.3: 集成价格相关性矩阵
  - [ ] SubTask 12.4: 添加跳转到 Oracle Comparison 热力图的链接

- [x] Task 13: 优化 History 页面
  - [x] SubTask 13.1: 集成价格趋势图表
  - [x] SubTask 13.2: 集成偏差分析图表
  - [ ] SubTask 13.3: 添加数据导出功能（CSV、JSON）
  - [ ] SubTask 13.4: 优化图表交互体验

## 阶段八：验证和测试

- [ ] Task 14: 验证功能完整性
  - [ ] SubTask 14.1: 运行完整的测试套件
  - [ ] SubTask 14.2: 运行类型检查
  - [ ] SubTask 14.3: 运行 ESLint 检查
  - [ ] SubTask 14.4: 验证构建成功
  - [ ] SubTask 14.5: 进行跨浏览器兼容性测试

# Task Dependencies
- [Task 2] depends on [Task 1] (偏差图表依赖价格图表基础)
- [Task 3] depends on [Task 1] (柱状图依赖图表库选择)
- [Task 5] depends on [Task 4] (UI 组件依赖 API)
- [Task 7] depends on [Task 6] (UI 组件依赖 API)
- [Task 8] depends on [Task 1] (相关性矩阵依赖价格数据)
- [Task 9] depends on [Task 6] (流动性分析依赖桥数据)
- [Task 10] depends on [Task 4, Task 6, Task 9] (风险评分依赖多个数据源)
- [Task 11] depends on [Task 5, Task 7] (Overview 集成依赖组件完成)
- [Task 12] depends on [Task 1, Task 2, Task 3, Task 8] (Comparison 集成依赖图表完成)
- [Task 13] depends on [Task 1, Task 2] (History 集成依赖图表完成)
- [Task 14] depends on [Task 1-13] (最终验证)
