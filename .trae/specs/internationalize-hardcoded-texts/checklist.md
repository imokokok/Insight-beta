# 国际化硬编码文本处理 Checklist

## 翻译文件完整性

- [x] common.ts 中英文翻译完整且一致
- [x] chainlink.ts 中英文翻译完整且一致
- [x] band.ts 中英文翻译完整且一致
- [x] api3.ts 中英文翻译完整且一致
- [x] pyth.ts 中英文翻译完整且一致
- [x] explore.ts 中英文翻译完整且一致
- [x] cross-chain.ts 中英文翻译完整且一致
- [x] protocol.ts 中英文翻译完整且一致
- [x] comparison.ts 中英文翻译完整且一致

## 组件国际化

### Chainlink 页面

- [x] Tab 导航标签使用 t() 函数
- [x] KPI 标签使用 t() 函数
- [x] 概览页面文本使用 t() 函数
- [x] 状态显示使用 t() 函数
- [x] 无硬编码 fallback 文本

### Band 页面

- [x] Tab 导航标签使用 t() 函数
- [x] Oracle 脚本描述使用 t() 函数
- [x] 数据桥相关文本使用 t() 函数
- [x] IBC 状态文本使用 t() 函数
- [x] 无硬编码 fallback 文本

### API3 页面

- [x] 概览页面文本使用 t() 函数
- [x] AlertConfigPanel placeholder 使用 t() 函数
- [x] 无硬编码 fallback 文本

### Pyth 页面

- [x] 概览页面文本使用 t() 函数
- [x] Publisher Monitor placeholder 使用 t() 函数
- [x] 无硬编码 fallback 文本

### Protocol 页面

- [x] 错误标题使用 t() 函数
- [x] 内容标题使用 t() 函数
- [x] 无硬编码 fallback 文本

### Alerts 页面

- [x] 健康状态标签使用 t() 函数
- [x] 系统状态标签使用 t() 函数
- [x] 无硬编码 fallback 文本

### Explore 页面

- [x] 热门交易对错误/空状态使用 t() 函数
- [x] 排序选择器 placeholder 使用 t() 函数
- [x] 滚动按钮 aria-label 使用 t() 函数
- [x] 无硬编码 fallback 文本

### Cross-chain 组件

- [x] CrossChainOverview 标题使用 t() 函数
- [x] CrossChainComparison 标题使用 t() 函数
- [x] LiquidityAnalysis placeholder 使用 t() 函数
- [x] 无硬编码 fallback 文本

### Comparison 组件

- [x] 移动端按钮标签使用 t() 函数
- [x] 无硬编码 fallback 文本

### 通用组件

- [x] KpiCard 较上期标签使用 t() 函数
- [x] AppLayout 搜索 aria-label 使用 t() 函数
- [x] 无硬编码 fallback 文本

## 功能验证

- [x] 类型检查通过
- [x] 语言切换功能正常
- [x] 所有页面中英文显示正确
- [x] 无控制台翻译 key 缺失警告
- [x] 无硬编码中英文字符串残留
