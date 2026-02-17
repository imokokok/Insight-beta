# Tasks

- [x] Task 1: 删除空模块文件
  - [x] SubTask 1.1: 删除 `src/features/common/index.ts` 空模块文件

- [x] Task 2: 清理已弃用的重导出文件并更新导入路径
  - [x] SubTask 2.1: 删除 `src/lib/api/openapi.ts`，更新导入到 `@/lib/api/openapi/index`
  - [x] SubTask 2.2: 删除 `src/shared/utils/format.ts`，更新导入到 `@/shared/utils/format/index`
  - [x] SubTask 2.3: 删除 `src/types/oracle/chain.ts`，更新导入到 `@/types/chains`

- [x] Task 3: 删除未使用的类型定义文件
  - [x] SubTask 3.1: 删除 `src/features/oracle/analytics/anomalies/types/anomalies.ts`
  - [x] SubTask 3.2: 删除 `src/features/oracle/monitoring/types/monitoring.ts`
  - [x] SubTask 3.3: 删除 `src/features/oracle/services/types/serviceTypes.ts`

- [x] Task 4: 删除未使用的组件文件
  - [x] SubTask 4.1: 删除 `src/features/assertion/components/CommonParamsInputs.tsx`
  - [x] SubTask 4.2: 删除 `src/features/assertion/components/EventParamsInputs.tsx`
  - [x] SubTask 4.3: 更新 `src/features/assertion/components/index.ts` 移除相关导出

- [x] Task 5: 验证构建和测试
  - [x] SubTask 5.1: 运行 TypeScript 类型检查确保无错误
  - [x] SubTask 5.2: 运行 ESLint 检查确保无错误
  - [x] SubTask 5.3: 运行测试确保所有测试通过

# Task Dependencies
- [Task 2] depends on [Task 1] (先删除空模块，再处理重导出)
- [Task 4] depends on [Task 3] (先删除类型，再删除组件)
- [Task 5] depends on [Task 1, Task 2, Task 3, Task 4] (所有清理完成后验证)
