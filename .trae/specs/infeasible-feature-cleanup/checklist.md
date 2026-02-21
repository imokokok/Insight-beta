# 不可行功能代码清理检查清单

## OEV → 价格更新监控检查

### 组件转型检查

- [x] PriceUpdateMonitor 组件已创建
- [x] 移除了 OEV 金额展示（totalOev, oevAmount, avgOevPerEvent）
- [x] 移除了按 dAPI 分布的 OEV 价值饼图
- [x] 移除了按链分布的 OEV 价值条形图
- [x] 移除了 OEV 趋势折线图
- [x] 保留了价格更新事件列表
- [x] 新增了更新频率统计卡片
- [x] 新增了更新延迟监控展示

### API 转型检查

- [x] OEV API 不再返回 oevAmount 字段
- [x] OEV API 返回更新频率统计字段

### 页面引用检查

- [x] API3 页面已更新导入
- [x] Tab 标签已更新为"价格更新监控"

### 清理检查

- [x] 旧 OevOverview.tsx 已删除

## 流动性 → 链状态概览检查

### 组件转型检查

- [x] ChainStatusOverview 组件已创建
- [x] 移除了流动性金额展示（totalLiquidity, avgLiquidity）
- [x] 移除了流动性分布条形图
- [x] 移除了 TVL、交易量等 mock 数据展示
- [x] 保留了链健康状态展示
- [x] 新增了链响应时间监控
- [x] 新增了数据新鲜度展示

### API 转型检查

- [x] 流动性 API 不再返回流动性金额 mock 数据
- [x] 流动性 API 返回链状态相关字段

### 页面引用检查

- [x] 跨链页面已更新导入
- [x] CrossChainOverview 已更新引用

### 清理检查

- [x] 旧 LiquidityDistribution.tsx 已删除

## 类型定义检查

- [x] API3 类型定义已更新
- [x] 跨链类型定义已更新
- [x] 无残留的 OEV 金额类型
- [x] 无残留的流动性金额类型

## 国际化检查

- [x] 中文 api3 翻译已更新
- [x] 中文 cross-chain 翻译已更新
- [x] 英文 api3 翻译已更新
- [x] 英文 cross-chain 翻译已更新

## 验证检查

- [x] npm run typecheck 通过
- [x] npm run lint 通过
- [x] API3 价格更新监控页面正常显示
- [x] 跨链链状态概览页面正常显示
