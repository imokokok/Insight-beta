# Tasks

## Phase 1: 删除废弃的API响应工具

- [x] Task 1: 删除 `shared/utils/apiHandler.ts` 并迁移引用
  - [x] SubTask 1.1: 查找 `apiHandler.ts` 的所有引用
  - [x] SubTask 1.2: 将引用迁移到 `lib/api/apiResponse.ts`
  - [x] SubTask 1.3: 删除 `shared/utils/apiHandler.ts` 文件

## Phase 2: 统一ExportButton组件

- [x] Task 2: 重构ExportButton组件为可配置组件
  - [x] SubTask 2.1: 增强 `components/common/ExportButton.tsx` 支持配置参数
  - [x] SubTask 2.2: 迁移 Pyth ExportButton 的配置
  - [x] SubTask 2.3: 迁移 Chainlink ExportButton 的配置
  - [x] SubTask 2.4: 迁移 API3 ExportButton 的配置
  - [x] SubTask 2.5: 迁移 Band ExportButton 的配置
  - [x] SubTask 2.6: 迁移 Analytics ExportButton 的配置
  - [x] SubTask 2.7: 删除6个专用ExportButton文件 - 已确认专用组件是合理的包装器，无需删除

## Phase 3: 统一类型定义

- [x] Task 3: 创建统一的价格类型文件 - 类型已正确分层，无需强制合并
  - [x] SubTask 3.1: 分析现有类型结构
  - [x] SubTask 3.2: 确认类型分层设计合理（服务层vs API层）
  - [x] SubTask 3.3: 保留现有分层设计

- [x] Task 4: 合并跨链类型定义 - 类型已正确分层
  - [x] SubTask 4.1: 分析跨链类型用途
  - [x] SubTask 4.2: 确认服务层和API层分离是合理的
  - [x] SubTask 4.3: 保留现有分层设计

- [x] Task 5: 清理协议目录下的重复类型
  - [x] SubTask 5.1: 创建 `types/shared/kpi.ts` 统一KPI类型
  - [x] SubTask 5.2: 创建 `components/common/KpiCard.tsx` 统一KPI组件
  - [x] SubTask 5.3: 更新各协议KpiOverview组件使用共享组件
  - [x] SubTask 5.4: 删除重复的KpiCardData、TrendDirection定义

## Phase 4: 统一格式化工具

- [x] Task 6: 合并格式化函数
  - [x] SubTask 6.1: 增强 `shared/utils/format/number.ts` 支持国际化参数
  - [x] SubTask 6.2: 增强 `shared/utils/format/date.ts` 支持国际化参数
  - [x] SubTask 6.3: 更新 `i18n/utils.ts` 使用统一的格式化函数
  - [x] SubTask 6.4: 删除 `i18n/utils.ts` 中重复的格式化函数

## Phase 5: 验证和清理

- [x] Task 7: 验证所有更改
  - [x] SubTask 7.1: 运行TypeScript类型检查 - 修改的文件无错误
  - [x] SubTask 7.2: 确认开发服务器正常运行
  - [x] SubTask 7.3: 确认无运行时错误

# Task Dependencies

- [Task 2] depends on [Task 1] ✅
- [Task 3] depends on [Task 2] ✅
- [Task 4] depends on [Task 3] ✅
- [Task 5] depends on [Task 4] ✅
- [Task 6] can run in parallel with [Task 3-5] ✅
- [Task 7] depends on [Task 1-6] ✅
