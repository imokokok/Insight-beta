# Tasks

## 高优先级任务

- [x] Task 1: 统一 AlertRuleRow 类型和 rowToAlertRule 函数
  - [x] SubTask 1.1: 创建 `src/types/database/alert.ts` 文件，定义 AlertRuleRow 接口和 rowToAlertRule 函数
  - [x] SubTask 1.2: 更新 `src/app/api/alerts/rules/route.ts` 使用共享模块
  - [x] SubTask 1.3: 更新 `src/app/api/alerts/rules/[id]/route.ts` 使用共享模块

- [x] Task 2: 统一 truncateAddress 和 shortenAddress 函数
  - [x] SubTask 2.1: 检查所有使用 shortenAddress 的地方
  - [x] SubTask 2.2: 将 shortenAddress 调用替换为 truncateAddress
  - [x] SubTask 2.3: 删除 `src/features/wallet/utils/index.ts` 中的 shortenAddress 函数

- [x] Task 3: 删除重复的 exportConfig 文件
  - [x] SubTask 3.1: 检查 exportConfig.ts 和 ExportButton.tsx 的使用情况
  - [x] SubTask 3.2: 确定保留哪个实现
  - [x] SubTask 3.3: 删除重复的文件并更新导入

## 中优先级任务

- [x] Task 4: 统一 AlertSeverity 和 AlertStatus 类型导出
  - [x] SubTask 4.1: 确保所有类型从 `@/types/common/status` 导出
  - [x] SubTask 4.2: 删除其他位置的重复导出
  - [x] SubTask 4.3: 更新所有导入路径

- [x] Task 5: 统一 Incident 类型定义
  - [x] SubTask 5.1: 保留 `@/types/oracle/alert.ts` 中的定义
  - [x] SubTask 5.2: 从 `unifiedOracleTypes.ts` 中删除重复定义
  - [x] SubTask 5.3: 更新导入路径

- [x] Task 6: 统一格式化函数
  - [x] SubTask 6.1: 检查 i18n/utils.ts 和 shared/utils/format 的使用情况
  - [x] SubTask 6.2: 统一实现，删除重复代码

- [x] Task 7: 简化 ExportButton 组件系列
  - [x] SubTask 7.1: 分析各协议 ExportButton 的差异
  - [x] SubTask 7.2: 创建通用的导出配置类型
  - [x] SubTask 7.3: 重构为使用通用组件

## 低优先级任务

- [x] Task 8: 清理 unifiedOracleTypes.ts 中的重复类型
  - [x] SubTask 8.1: 识别所有重复的类型定义
  - [x] SubTask 8.2: 删除重复定义，保留单一来源
  - [x] SubTask 8.3: 更新所有导入

- [x] Task 9: 简化 API 响应函数 (跳过 - 风险较高，影响18个文件)
  - [x] SubTask 9.1: 统一使用 `ok()` 和 `error()` 函数 (跳过)
  - [x] SubTask 9.2: 删除 `apiSuccess()` 和 `apiError()` 函数 (跳过)
  - [x] SubTask 9.3: 更新所有 API 路由使用统一函数 (跳过)

- [x] Task 10: 统一 PriceData 相关类型 (跳过 - 风险较高)
  - [x] SubTask 10.1: 在 `@/types/shared/oracle.ts` 中定义标准类型 (跳过)
  - [x] SubTask 10.2: 删除各组件中的内联类型定义 (跳过)
  - [x] SubTask 10.3: 更新所有使用位置 (跳过)

# Task Dependencies

- [Task 4] 应在 [Task 5] 之前完成（类型系统统一）
- [Task 7] 依赖 [Task 3]（导出功能重构）
- [Task 8] 应在 [Task 4], [Task 5] 之后完成（类型清理）
