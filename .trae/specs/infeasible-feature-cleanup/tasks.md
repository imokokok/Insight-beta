# Tasks

## Task 1: 转型 OEV 组件为价格更新监控

- [x] Task 1.1: 创建新的 PriceUpdateMonitor 组件
  - 移除 OEV 金额相关展示（totalOev, oevAmount, avgOevPerEvent）
  - 移除按 dAPI 分布的 OEV 价值饼图
  - 移除按链分布的 OEV 价值条形图
  - 移除 OEV 趋势折线图
  - 保留价格更新事件列表
  - 新增更新频率统计卡片
  - 新增更新延迟监控展示

- [x] Task 1.2: 更新 API3 页面引用
  - 更新 src/app/oracle/api3/page.tsx 导入
  - 更新 Tab 标签和描述

- [x] Task 1.3: 更新 OEV API 路由
  - 修改 /api/oracle/api3/oev/route.ts 返回结构
  - 移除 oevAmount 字段
  - 新增更新频率统计字段

- [x] Task 1.4: 删除旧 OevOverview 组件
  - 确认新组件工作正常后删除 OevOverview.tsx

## Task 2: 转型流动性组件为链状态概览

- [x] Task 2.1: 创建新的 ChainStatusOverview 组件
  - 移除流动性金额展示（totalLiquidity, avgLiquidity）
  - 移除流动性分布条形图
  - 移除 TVL、交易量等 mock 数据展示
  - 保留链健康状态展示
  - 新增链响应时间监控
  - 新增数据新鲜度展示

- [x] Task 2.2: 更新跨链页面引用
  - 更新 src/features/cross-chain/components/index.ts 导出
  - 更新 CrossChainOverview.tsx 中的引用

- [x] Task 2.3: 更新流动性 API 路由
  - 修改 /api/cross-chain/liquidity/route.ts 返回结构
  - 移除流动性金额 mock 数据
  - 新增链状态相关字段

- [x] Task 2.4: 删除旧 LiquidityDistribution 组件
  - 确认新组件工作正常后删除 LiquidityDistribution.tsx

## Task 3: 更新类型定义

- [x] Task 3.1: 更新 API3 类型定义
  - 更新 src/features/oracle/api3/types/api3.ts
  - 移除 OEV 相关类型
  - 新增价格更新监控类型

- [x] Task 3.2: 更新跨链类型定义
  - 更新 src/features/cross-chain/types/index.ts
  - 移除流动性相关类型
  - 新增链状态类型

## Task 4: 更新国际化文件

- [x] Task 4.1: 更新中文国际化
  - 更新 api3 相关翻译
  - 更新 cross-chain 相关翻译

- [x] Task 4.2: 更新英文国际化
  - 更新 api3 相关翻译
  - 更新 cross-chain 相关翻译

## Task 5: 验证和测试

- [x] Task 5.1: 运行类型检查
  - npm run typecheck

- [x] Task 5.2: 运行 lint 检查
  - npm run lint

- [x] Task 5.3: 手动测试页面功能
  - 测试 API3 价格更新监控页面
  - 测试跨链链状态概览页面

# Task Dependencies

- Task 1.2 依赖 Task 1.1
- Task 1.4 依赖 Task 1.1, 1.2, 1.3
- Task 2.2 依赖 Task 2.1
- Task 2.4 依赖 Task 2.1, 2.2, 2.3
- Task 3 可与 Task 1, 2 并行
- Task 4 依赖 Task 1, 2, 3
- Task 5 依赖所有前置任务
