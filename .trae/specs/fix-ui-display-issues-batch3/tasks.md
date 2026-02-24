# Tasks

## 高优先级任务

- [x] Task 1: 修复 AnimatedNumber 差异显示溢出
  - [x] SubTask 1.1: 为差异徽章添加 max-w-[120px] truncate

- [x] Task 2: 修复 AppLayout 搜索按钮溢出
  - [x] SubTask 2.1: 为 kbd 元素添加 hidden sm:flex

- [x] Task 3: 修复 VirtualTableToolbar 搜索框溢出
  - [x] SubTask 3.1: 将 w-64 改为 w-full sm:w-64

- [x] Task 4: 修复 ComparisonControls 按钮宽度
  - [x] SubTask 4.1: 为按钮添加 min-w-[44px] 确保触摸友好

- [x] Task 5: 修复 ChainStatusOverview 链名溢出
  - [x] SubTask 5.1: 添加 min-w-0 和 truncate 处理长链名

- [x] Task 6: 修复 DeviationDistributionChart 标签重叠
  - [x] SubTask 6.1: 优化 X轴标签显示，添加 tickFormatter 截断

- [x] Task 7: 修复 ConfidenceIntervalChart 标签重叠
  - [x] SubTask 7.1: 添加 interval="preserveStartEnd"

## 中优先级任务

- [x] Task 8: 修复 ChartToolbar Zoom 百分比溢出
  - [x] SubTask 8.1: 添加 truncate 类

- [x] Task 9: 修复 EnhancedSidebar Badge 挤压
  - [x] SubTask 9.1: 为 Badge 添加 flex-shrink-0

- [x] Task 10: 修复 FavoritesPanel 时间显示溢出
  - [x] SubTask 10.1: 为时间显示添加 truncate 类

- [x] Task 11: 修复 LanguageSwitcher 标签溢出
  - [x] SubTask 11.1: 添加 max-w-[80px] truncate 类

- [x] Task 12: 修复 TimeRangeSelector 自定义时间溢出
  - [x] SubTask 12.1: 添加 max-w-[120px] truncate 类

- [x] Task 13: 修复 AlertActionButtons 标题溢出
  - [x] SubTask 13.1: 添加 truncate max-w-[200px] 类

- [x] Task 14: 修复 AlertBatchActions 文本溢出
  - [x] SubTask 14.1: 为父容器添加 min-w-0 和 truncate

- [x] Task 15: 修复 ResponseTimeStats 时间显示溢出
  - [x] SubTask 15.1: 添加 truncate 类

- [x] Task 16: 修复 LiquidityAnalysis 链名溢出
  - [x] SubTask 16.1: 为文本容器添加 min-w-0 truncate

- [x] Task 17: 修复 RiskScore 因素名称溢出
  - [x] SubTask 17.1: 为名称添加 truncate max-w-[100px]

- [x] Task 18: 修复 HeartbeatMonitor Feed名称溢出
  - [x] SubTask 18.1: 添加 max-w-[200px] 和 truncate

- [x] Task 19: 修复 OcrRoundMonitor 节点名溢出
  - [x] SubTask 19.1: 为父容器添加 min-w-0

## 低优先级任务

- [x] Task 20: 修复 CorrelationMatrix 链名显示
  - [x] SubTask 20.1: 添加 title 属性显示完整名称

- [x] Task 21: 修复 AddressExplorer 地址容器
  - [x] SubTask 21.1: 为父容器添加 min-w-0

- [x] Task 22: 修复 AssertionList ID显示溢出
  - [x] SubTask 22.1: 添加 truncate 类

- [x] Task 23: 修复 SyncStatus z-index
  - [x] SubTask 23.1: 将 z-50 改为 z-[60]

- [x] Task 24: 修复 GlobalSearch z-index
  - [x] SubTask 24.1: 将 z-50 改为 z-[60]

- [x] Task 25: 修复 MarketStats 间距不一致
  - [x] SubTask 25.1: 统一使用 gap-4

- [x] Task 26: 修复 ConnectWallet 间距
  - [x] SubTask 26.1: 确保图标和文本间距一致

- [x] Task 27: 修复 TrendDetails 交互状态
  - [x] SubTask 27.1: 添加 hover 状态和 transition

- [x] Task 28: 运行 lint 和类型检查验证修改

# Task Dependencies

- [Task 28] depends on [Task 1-27]
- [Task 1, Task 2, Task 3, Task 4, Task 5, Task 6, Task 7] 可以并行执行（高优先级）
- [Task 8-19] 可以并行执行（中优先级）
- [Task 20-27] 可以并行执行（低优先级）
