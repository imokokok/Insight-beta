# Tasks

## Phase 1: 翻译文件准备

- [x] Task 1: 更新通用翻译文件 (common.ts)
  - [x] SubTask 1.1: 添加 common.status.\* 状态翻译
  - [x] SubTask 1.2: 添加 common.error.\* 错误翻译
  - [x] SubTask 1.3: 添加 common.kpi.\* 和其他通用翻译
  - [x] SubTask 1.4: 同步更新 en/zh 两个语言文件

- [x] Task 2: 更新 Chainlink 翻译文件 (chainlink.ts)
  - [x] SubTask 2.1: 添加 tabs.\* 导航标签翻译
  - [x] SubTask 2.2: 添加 overview.\* 概览页面翻译
  - [x] SubTask 2.3: 添加 features.\* 特性翻译
  - [x] SubTask 2.4: 添加 feedStatus._ 和 nodeStatus._ 状态翻译
  - [x] SubTask 2.5: 同步更新 en/zh 两个语言文件

- [x] Task 3: 创建 Band 翻译文件 (band.ts)
  - [x] SubTask 3.1: 添加 tabs.\* 导航标签翻译
  - [x] SubTask 3.2: 添加 overview.\* 概览页面翻译
  - [x] SubTask 3.3: 添加 features.\* 特性翻译
  - [x] SubTask 3.4: 添加 bridgeStatus._, bridgeList._ 等翻译
  - [x] SubTask 3.5: 添加 oracleScripts.\* 表格翻译
  - [x] SubTask 3.6: 同步更新 en/zh 两个语言文件

- [x] Task 4: 更新 API3 翻译文件 (api3.ts)
  - [x] SubTask 4.1: 添加 overview.\* 概览页面翻译
  - [x] SubTask 4.2: 添加 alertConfig.\* 配置面板翻译
  - [x] SubTask 4.3: 同步更新 en/zh 两个语言文件

- [x] Task 5: 创建 Pyth 翻译文件 (pyth.ts)
  - [x] SubTask 5.1: 添加 overview.\* 概览页面翻译
  - [x] SubTask 5.2: 添加 publisher.\* 发布者监控翻译
  - [x] SubTask 5.3: 同步更新 en/zh 两个语言文件

- [x] Task 6: 更新 Explore 翻译文件 (explore.ts)
  - [x] SubTask 6.1: 添加 trending.\* 热门交易对翻译
  - [x] SubTask 6.2: 添加 sort.\* 排序选择器翻译
  - [x] SubTask 6.3: 同步更新 en/zh 两个语言文件

- [x] Task 7: 更新 Cross-chain 翻译文件 (cross-chain.ts)
  - [x] SubTask 7.1: 添加 priceStatus.\* 价格状态翻译
  - [x] SubTask 7.2: 添加 liquidity.\* 流动性分析翻译
  - [x] SubTask 7.3: 同步更新 en/zh 两个语言文件

- [x] Task 8: 更新 Protocol 翻译文件 (protocol.ts)
  - [x] SubTask 8.1: 添加 stats.\* 统计翻译
  - [x] SubTask 8.2: 添加 error.\* 错误翻译
  - [x] SubTask 8.3: 同步更新 en/zh 两个语言文件

- [x] Task 9: 更新 Comparison 翻译文件 (comparison.ts)
  - [x] SubTask 9.1: 添加 controls.\* 控制按钮翻译
  - [x] SubTask 9.2: 同步更新 en/zh 两个语言文件

## Phase 2: 组件国际化改造

- [x] Task 10: 国际化 Chainlink 页面组件
  - [x] SubTask 10.1: 替换 Tab 导航硬编码标签
  - [x] SubTask 10.2: 替换 KPI 标签硬编码
  - [x] SubTask 10.3: 替换概览页面硬编码文本
  - [x] SubTask 10.4: 替换状态显示硬编码

- [x] Task 11: 国际化 Band 页面组件
  - [x] SubTask 11.1: 替换 Tab 导航硬编码标签
  - [x] SubTask 11.2: 替换 Oracle 脚本描述硬编码
  - [x] SubTask 11.3: 替换数据桥和 IBC 相关硬编码

- [x] Task 12: 国际化 API3 页面组件
  - [x] SubTask 12.1: 替换概览页面硬编码文本
  - [x] SubTask 12.2: 替换 AlertConfigPanel placeholder

- [x] Task 13: 国际化 Pyth 页面组件
  - [x] SubTask 13.1: 替换概览页面硬编码文本
  - [x] SubTask 13.2: 替换 Publisher Monitor placeholder

- [x] Task 14: 国际化 Protocol 页面组件
  - [x] SubTask 14.1: 替换错误标题硬编码
  - [x] SubTask 14.2: 替换内容标题硬编码

- [x] Task 15: 国际化 Alerts 页面组件
  - [x] SubTask 15.1: 替换健康状态标签硬编码
  - [x] SubTask 15.2: 替换系统状态标签

- [x] Task 16: 国际化 Explore 页面组件
  - [x] SubTask 16.1: 替换热门交易对错误和空状态文本
  - [x] SubTask 16.2: 替换排序选择器 placeholder
  - [x] SubTask 16.3: 替换滚动按钮 aria-label

- [x] Task 17: 国际化 Cross-chain 组件
  - [x] SubTask 17.1: 替换 CrossChainOverview 标题
  - [x] SubTask 17.2: 替换 CrossChainComparison 标题
  - [x] SubTask 17.3: 替换 LiquidityAnalysis placeholder

- [x] Task 18: 国际化 Comparison 组件
  - [x] SubTask 18.1: 替换移动端按钮标签

- [x] Task 19: 国际化通用组件
  - [x] SubTask 19.1: 更新 KpiCard 较上期标签
  - [x] SubTask 19.2: 更新 AppLayout 搜索 aria-label

- [x] Task 20: 移除 HeartbeatMonitor fallback 硬编码
  - [x] SubTask 20.1: 移除所有 `|| '硬编码文本'` fallback
  - [x] SubTask 20.2: 确保翻译文件中有对应的 key

## Phase 3: 验证与清理

- [x] Task 21: 运行翻译覆盖率测试
  - [x] SubTask 21.1: 执行类型检查验证
  - [x] SubTask 21.2: 修复缺失的翻译 key

- [x] Task 22: 手动验证国际化效果
  - [x] SubTask 22.1: 类型检查通过
  - [x] SubTask 22.2: 确认无遗漏的硬编码文本

# Task Dependencies

- Task 10-20 依赖 Task 1-9（翻译文件准备完成后才能进行组件改造）
- Task 21-22 依赖 Task 10-20（所有组件改造完成后才能验证）
- Task 1-9 可以并行执行
- Task 10-20 可以并行执行（不同模块之间）
