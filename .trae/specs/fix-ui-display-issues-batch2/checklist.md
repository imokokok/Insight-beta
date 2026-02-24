# Checklist

## 高优先级修复

### ChartCard 组件

- [x] CardTitle 文字正确截断
- [x] 操作按钮不会被压缩

### CompactList 组件

- [x] item.label 正确截断
- [x] item.value 正确截断
- [x] 中间内容区正确收缩

### AlertHeatmap 组件

- [x] SVG 在小屏幕上不溢出
- [x] 使用响应式宽度

### CrossChainComparisonCard 组件

- [x] 网格布局响应式正确
- [x] 表头响应式处理

### GaugeGroup 组件

- [x] 移动端单列显示

### AlertTrendChart 组件

- [x] 内部元素不溢出
- [x] 响应式间距正确

### VirtualTableHeader 组件

- [x] 表头不溢出容器

### DapiList 组件

- [x] 表格响应式处理

## 中优先级修复

### AlertGroup 组件

- [x] group.label 正确截断
- [x] flex 布局不溢出

### NotificationChannels 组件

- [x] channel.description 正确截断

### PublisherMonitor 组件

- [x] publisher.name 正确截断

### TrendingFeedCard 组件

- [x] 内容不溢出容器

### FeedDetail 组件

- [x] 标题区不溢出
- [x] 价格显示正确

### BridgeStatusCard 组件

- [x] 网格最小宽度正确

### TrendList 和 AnomalyList 组件

- [x] 统计卡片不溢出
- [x] 模态框响应式宽度

### z-index 层级

- [x] 模态框 z-index 为 60
- [x] 下拉菜单 z-index 为 55
- [x] 无遮挡问题

## 低优先级修复

### 间距一致性

- [x] GaugeGroup 响应式间距
- [x] OperatorList 基础网格

### 固定宽度修复

- [x] MobileNav 响应式宽度
- [x] QuickSearch 响应式宽度
- [x] MiniChart 响应式尺寸

### 其他问题

- [x] EnhancedStatCard value 截断
- [x] VirtualList 响应式高度

## 验证

- [x] 运行 `npm run lint` 无错误（只有预先存在的警告）
- [x] 运行 `npm run typecheck` 无新增错误（预先存在的错误在未修改的文件中）
- [x] 开发服务器正常运行
