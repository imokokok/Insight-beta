# Tasks

## Phase 1: 创建共享模块

- [x] Task 1: 创建共享类型模块
  - [x] SubTask 1.1: 创建 `src/types/shared/oracle.ts` 文件，定义 GasCostTrendPoint、GasCostAnalysisDataBase、CrossChainPriceBase 等共享类型
  - [x] SubTask 1.2: 创建 `src/types/shared/index.ts` 导出文件
  - [x] SubTask 1.3: 更新 `src/types/index.ts` 添加共享类型导出

- [x] Task 2: 创建统一格式化函数模块
  - [x] SubTask 2.1: 创建 `src/shared/utils/format/number.ts`，包含 formatPrice、formatNumber、formatPercentage 函数（已存在，已验证）
  - [x] SubTask 2.2: 创建 `src/shared/utils/format/time.ts`，包含 formatLatency、formatTimestamp、formatDuration 函数
  - [x] SubTask 2.3: 创建 `src/shared/utils/format/blockchain.ts`，包含 formatGas、formatAddress、formatHash 函数
  - [x] SubTask 2.4: 创建 `src/shared/utils/format/index.ts` 统一导出

- [x] Task 3: 创建 API 路由工具模块
  - [x] SubTask 3.1: 创建 `src/lib/api/routeUtils.ts`，包含 parseQueryParams、handleApiError、createJsonResponse 函数（已存在于 apiResponse.ts）
  - [x] SubTask 3.2: 创建 `src/lib/api/index.ts` 导出文件（已存在）

## Phase 2: 更新类型导入

- [x] Task 4: 更新 API3 模块类型
  - [x] SubTask 4.1: 修改 `src/features/oracle/api3/types/api3.ts`，导入并扩展共享类型
  - [x] SubTask 4.2: 移除 API3 模块中重复的类型定义
  - [x] SubTask 4.3: 更新 API3 模块中所有类型导入路径

- [x] Task 5: 更新 Chainlink 模块类型
  - [x] SubTask 5.1: 修改 `src/features/oracle/chainlink/types/chainlink.ts`，导入并扩展共享类型
  - [x] SubTask 5.2: 移除 Chainlink 模块中重复的类型定义
  - [x] SubTask 5.3: 更新 Chainlink 模块中所有类型导入路径

- [x] Task 6: 更新 Band 模块类型
  - [x] SubTask 6.1: 检查 `src/features/oracle/band/types/band.ts`，无重复类型定义，无需修改
  - [x] SubTask 6.2: 无需修改
  - [x] SubTask 6.3: 无需修改

- [x] Task 7: 更新 Pyth 模块类型
  - [x] SubTask 7.1: 检查 `src/features/oracle/pyth/types/pyth.ts`，无重复类型定义，无需修改
  - [x] SubTask 7.2: 无需修改
  - [x] SubTask 7.3: 无需修改

- [x] Task 8: 更新跨链模块类型
  - [x] SubTask 8.1: 修改 `src/features/cross-chain/types/index.ts`，导入并扩展共享类型
  - [x] SubTask 8.2: 更新 `src/types/crossChainAnalysisTypes.ts`，使用共享类型
  - [x] SubTask 8.3: 移除跨链模块中重复的类型定义

## Phase 3: 更新格式化函数导入

- [x] Task 9: 更新 Chainlink 模块格式化函数
  - [x] SubTask 9.1: 更新 `src/features/oracle/chainlink/components/dashboard/formatters.ts`，导入共享格式化函数
  - [x] SubTask 9.2: 移除 Chainlink 模块中重复的格式化函数定义
  - [x] SubTask 9.3: 更新所有使用格式化函数的组件导入路径

- [x] Task 10: 更新跨链模块格式化函数
  - [x] SubTask 10.1: 更新 `src/features/cross-chain/utils/format.ts`，导入共享格式化函数
  - [x] SubTask 10.2: 移除跨链模块中重复的格式化函数定义
  - [x] SubTask 10.3: 更新所有使用格式化函数的组件导入路径

## Phase 4: 更新 API 路由

- [ ] Task 11: 更新 Chainlink API 路由
  - [ ] SubTask 11.1: 更新 `src/app/api/oracle/chainlink/feeds/route.ts`，使用 API 工具函数
  - [ ] SubTask 11.2: 更新 `src/app/api/oracle/chainlink/stats/route.ts`，使用 API 工具函数
  - [ ] SubTask 11.3: 更新其他 Chainlink API 路由

- [ ] Task 12: 更新 API3 API 路由
  - [ ] SubTask 12.1: 更新 `src/app/api/oracle/api3/dapis/route.ts`，使用 API 工具函数
  - [ ] SubTask 12.2: 更新其他 API3 API 路由

- [ ] Task 13: 更新其他 API 路由
  - [ ] SubTask 13.1: 更新 Band API 路由
  - [ ] SubTask 13.2: 更新 Pyth API 路由
  - [ ] SubTask 13.3: 更新跨链 API 路由

## Phase 5: 清理空模块和重复代码

- [ ] Task 14: 清理 dashboard 模块
  - [ ] SubTask 14.1: 检查 `src/features/dashboard/` 模块的实际使用情况
  - [ ] SubTask 14.2: 如果为空，移除 `src/features/dashboard/hooks/index.ts`
  - [ ] SubTask 14.3: 如果为空，移除 `src/features/dashboard/utils/index.ts`
  - [ ] SubTask 14.4: 更新相关导入路径

- [ ] Task 15: 清理重复的 ExportButton 组件
  - [ ] SubTask 15.1: 检查各协议模块的 ExportButton 组件差异
  - [ ] SubTask 15.2: 如果差异小，统一使用 `src/components/common/ExportButton.tsx`
  - [ ] SubTask 15.3: 如果差异大，保留但确保复用基础组件

## Phase 6: 验证和测试

- [ ] Task 16: 类型检查
  - [ ] SubTask 16.1: 运行 `npm run typecheck` 确保无类型错误
  - [ ] SubTask 16.2: 修复所有类型错误

- [ ] Task 17: 代码检查
  - [ ] SubTask 17.1: 运行 `npm run lint` 确保无 lint 错误
  - [ ] SubTask 17.2: 修复所有 lint 错误

- [ ] Task 18: 测试验证
  - [ ] SubTask 18.1: 运行 `npm run test:ci` 确保所有测试通过
  - [ ] SubTask 18.2: 修复所有失败的测试

- [ ] Task 19: 构建验证
  - [ ] SubTask 19.1: 运行 `npm run build` 确保构建成功
  - [ ] SubTask 19.2: 修复所有构建错误

# Task Dependencies

- [Task 4, Task 5, Task 6, Task 7, Task 8] depend on [Task 1]
- [Task 9, Task 10] depend on [Task 2]
- [Task 11, Task 12, Task 13] depend on [Task 3]
- [Task 16, Task 17, Task 18, Task 19] depend on [Task 4, Task 5, Task 6, Task 7, Task 8, Task 9, Task 10, Task 11, Task 12, Task 13, Task 14, Task 15]

# Parallelizable Tasks

以下任务可以并行执行：

- Task 1, Task 2, Task 3（创建共享模块）
- Task 4, Task 5, Task 6, Task 7, Task 8（更新各模块类型）
- Task 9, Task 10（更新格式化函数）
- Task 11, Task 12, Task 13（更新 API 路由）
