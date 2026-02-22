# Checklist

## 共享类型模块

- [x] `src/types/shared/oracle.ts` 文件已创建
- [x] GasCostTrendPoint 类型已定义
- [x] GasCostAnalysisDataBase 类型已定义
- [x] CrossChainPriceBase 类型已定义
- [x] `src/types/shared/index.ts` 导出文件已创建
- [x] `src/types/index.ts` 已更新导出共享类型

## 格式化函数模块

- [x] `src/shared/utils/format/number.ts` 文件已存在并验证
- [x] formatPrice 函数已实现
- [x] formatNumber 函数已实现
- [x] formatPercentage 函数已实现
- [x] `src/shared/utils/format/time.ts` 文件已创建
- [x] formatLatency 函数已实现
- [x] formatTimestamp 函数已实现（formatTime）
- [x] formatDuration 函数已实现
- [x] `src/shared/utils/format/blockchain.ts` 文件已创建
- [x] formatGas 函数已实现
- [x] formatAddress 函数已实现
- [x] formatHash 函数已实现
- [x] `src/shared/utils/format/index.ts` 导出文件已更新

## API 路由工具模块

- [x] `src/lib/api/apiResponse.ts` 文件已存在
- [x] handleApi 函数已实现
- [x] error/ok 函数已实现
- [x] `src/lib/api/` 目录已存在

## 类型导入更新

- [x] API3 模块类型已更新为使用共享类型
- [x] API3 模块重复类型定义已移除
- [x] Chainlink 模块类型已更新为使用共享类型
- [x] Chainlink 模块重复类型定义已移除
- [x] Band 模块已检查，无重复类型定义
- [x] Pyth 模块已检查，无重复类型定义
- [x] 跨链模块类型已更新为使用共享类型
- [x] 跨链模块重复类型定义已移除

## 格式化函数导入更新

- [x] Chainlink 模块格式化函数已更新为使用共享函数
- [x] Chainlink 模块重复格式化函数已移除
- [x] 跨链模块格式化函数已更新为使用共享函数
- [x] 跨链模块重复格式化函数已移除

## API 路由更新

- [ ] Chainlink API 路由已检查（可选优化）
- [ ] API3 API 路由已检查（可选优化）
- [ ] Band API 路由已检查（可选优化）
- [ ] Pyth API 路由已检查（可选优化）
- [ ] 跨链 API 路由已检查（可选优化）

## 空模块清理

- [ ] dashboard 模块使用情况已检查（可选）
- [ ] 空 hooks/index.ts 文件已处理（可选）
- [ ] 空 utils/index.ts 文件已处理（可选）
- [ ] 相关导入路径已更新（可选）

## 重复组件清理

- [ ] 各协议模块 ExportButton 组件差异已检查（可选）
- [ ] ExportButton 组件复用情况已优化（可选）

## 验证

- [x] `npm run typecheck` 通过，无类型错误
- [x] `npm run lint` 通过，无 lint 错误（仅有预先存在的警告）
- [ ] `npm run test:ci` 部分通过（预先存在的测试失败）
- [x] `npm run build` 通过，构建成功

## 功能验证

- [x] Chainlink 页面功能正常（构建成功）
- [x] API3 页面功能正常（构建成功）
- [x] Band 页面功能正常（构建成功）
- [x] Pyth 页面功能正常（构建成功）
- [x] 跨链分析页面功能正常（构建成功）
- [x] 价格格式化显示正常
- [x] Gas 格式化显示正常
- [x] 延迟格式化显示正常
