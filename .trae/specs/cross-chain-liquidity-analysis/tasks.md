# 链间流动性深度分析 - 实施计划（分解和优先级任务列表）

## [ ] Task 1: 更新类型定义
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 扩展现有的 `Liquidity` 相关类型定义
  - 添加流动性深度数据类型
  - 添加滑点估算相关类型
  - 添加历史流动性趋势数据类型
- **Acceptance Criteria Addressed**: [AC-1, AC-2, AC-4, AC-5, AC-6]
- **Test Requirements**:
  - `programmatic` TR-1.1: 类型定义完整且无TypeScript错误
  - `human-judgement` TR-1.2: 类型定义清晰，符合项目现有风格
- **Notes**: 参考现有 `ArbitrageOpportunity` 和 `ChainLiquidity` 类型的结构

## [ ] Task 2: 创建流动性分析API路由
- **Priority**: P0
- **Depends On**: Task 1
- **Description**: 
  - 将 `/api/cross-chain/arbitrage` 路由改造为 `/api/cross-chain/liquidity`
  - 实现模拟数据生成函数
  - 支持按资产和链筛选
  - 返回概览统计、各链流动性数据、深度数据等
- **Acceptance Criteria Addressed**: [AC-1, AC-2, AC-3]
- **Test Requirements**:
  - `programmatic` TR-2.1: API返回200状态码
  - `programmatic` TR-2.2: API响应符合类型定义
  - `programmatic` TR-2.3: 筛选参数正常工作
- **Notes**: 参考现有套利API的中间件和错误处理模式

## [ ] Task 3: 更新Hook
- **Priority**: P0
- **Depends On**: Task 2
- **Description**: 
  - 将 `useArbitrage` Hook 重命名和改造为 `useLiquidityAnalysis`
  - 更新数据获取逻辑
  - 支持筛选参数传递
- **Acceptance Criteria Addressed**: [AC-1, AC-2, AC-3]
- **Test Requirements**:
  - `programmatic` TR-3.1: Hook正常加载数据
  - `programmatic` TR-3.2: 筛选参数正确传递给API
- **Notes**: 保持与现有Hook一致的SWR使用模式

## [ ] Task 4: 创建流动性分析主组件
- **Priority**: P0
- **Depends On**: Task 3
- **Description**: 
  - 创建 `LiquidityAnalysis` 组件替代 `ArbitrageOpportunityList`
  - 展示概览统计卡片
  - 展示各链流动性列表
  - 实现筛选控件
- **Acceptance Criteria Addressed**: [AC-1, AC-2, AC-3, AC-7]
- **Test Requirements**:
  - `programmatic` TR-4.1: 组件正常渲染无错误
  - `human-judgement` TR-4.2: UI符合现有设计风格
- **Notes**: 复用现有Card、Badge等UI组件

## [ ] Task 5: 创建流动性深度图表组件
- **Priority**: P1
- **Depends On**: Task 4
- **Description**: 
  - 使用Recharts创建订单簿深度图表
  - 支持交互式悬停查看详情
  - 展示买单和卖单深度
- **Acceptance Criteria Addressed**: [AC-4]
- **Test Requirements**:
  - `human-judgement` TR-5.1: 图表正确渲染
  - `human-judgement` TR-5.2: 交互体验流畅
- **Notes**: 参考项目中其他图表组件的实现

## [ ] Task 6: 创建滑点估算器组件
- **Priority**: P1
- **Depends On**: Task 4
- **Description**: 
  - 创建交易金额输入控件
  - 实现滑点计算逻辑
  - 展示不同链上的滑点对比
- **Acceptance Criteria Addressed**: [AC-5]
- **Test Requirements**:
  - `programmatic` TR-6.1: 滑点计算正确
  - `human-judgement` TR-6.2: 界面直观易用
- **Notes**: 使用模拟的滑点计算公式

## [ ] Task 7: 创建历史趋势图表组件
- **Priority**: P1
- **Depends On**: Task 4
- **Description**: 
  - 创建历史流动性趋势图表
  - 支持时间范围选择
  - 展示多条链的对比趋势
- **Acceptance Criteria Addressed**: [AC-6]
- **Test Requirements**:
  - `human-judgement` TR-7.1: 趋势图表正确渲染
  - `human-judgement` TR-7.2: 时间范围选择功能正常
- **Notes**: 使用Recharts的LineChart组件

## [ ] Task 8: 更新跨链概览页面
- **Priority**: P0
- **Depends On**: Task 4
- **Description**: 
  - 更新 `CrossChainOverview` 组件
  - 移除套利相关代码
  - 集成新的流动性分析组件
- **Acceptance Criteria Addressed**: [AC-7]
- **Test Requirements**:
  - `programmatic` TR-8.1: 页面正常加载无错误
  - `human-judgement` TR-8.2: 布局合理美观
- **Notes**: 保持页面其他功能不变

## [ ] Task 9: 更新类型导出和索引文件
- **Priority**: P0
- **Depends On**: Task 1
- **Description**: 
  - 更新 `src/features/cross-chain/types/index.ts`
  - 更新 `src/features/cross-chain/index.ts`
  - 更新组件索引文件
- **Acceptance Criteria Addressed**: [AC-7]
- **Test Requirements**:
  - `programmatic` TR-9.1: 所有导出正确
  - `programmatic` TR-9.2: 无导入错误
- **Notes**: 保持向后兼容性（可选）

## [ ] Task 10: 清理和重构
- **Priority**: P2
- **Depends On**: Task 8
- **Description**: 
  - 移除不再使用的套利相关代码
  - 清理测试文件（或更新为流动性测试）
  - 代码格式化和lint检查
- **Acceptance Criteria Addressed**: [AC-7]
- **Test Requirements**:
  - `programmatic` TR-10.1: 无lint错误
  - `human-judgement` TR-10.2: 代码整洁
- **Notes**: 可以保留套利代码作为历史参考（注释掉）
