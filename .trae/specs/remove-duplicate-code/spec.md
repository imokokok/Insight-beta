# 删除重复无用代码规范

## Why

项目中存在大量重复和无用的代码，包括重复的API响应格式、组件内重复定义的工具函数、重复的类型定义等。这些重复代码增加了维护成本，降低了代码可读性，并可能导致不一致的行为。

## What Changes

- **统一API响应格式**: 将所有直接使用 `NextResponse.json()` 的路由改为使用 `ok()/error()` 辅助函数
- **删除组件内重复的工具函数**: 删除组件内重新定义的 `formatPrice`、`formatLatency` 等函数，统一使用共享实现
- **合并重复类型定义**: 合并 `DashboardStats` 等重复定义的类型
- **统一Mock数据管理**: 创建集中的 mock 数据服务
- **简化工具函数导出链**: 删除中间层重新导出文件
- **合并功能重叠的Hooks**: 统一数据获取方式

## Impact

- Affected specs: API路由、组件、类型系统、工具函数
- Affected code:
  - `src/app/api/` 目录下多个路由文件
  - `src/features/oracle/*/components/` 目录下多个组件
  - `src/features/alerts/hooks/` 目录下的hooks
  - `src/shared/utils/format/` 相关文件
  - `src/types/` 和 `src/features/*/types/` 目录下的类型文件

## ADDED Requirements

### Requirement: 统一API响应格式

系统 SHALL 在所有API路由中使用统一的响应格式辅助函数 `ok()` 和 `error()`。

#### Scenario: API响应格式统一

- **WHEN** API路由返回成功响应
- **THEN** 使用 `ok(data)` 函数返回统一格式的响应
- **WHEN** API路由返回错误响应
- **THEN** 使用 `error(code, message, status)` 函数返回统一格式的错误响应

### Requirement: 集中管理工具函数

系统 SHALL 在共享位置集中定义和导出工具函数，组件 SHALL 直接从共享位置导入使用。

#### Scenario: 工具函数使用

- **WHEN** 组件需要使用 `formatPrice` 或 `formatLatency` 函数
- **THEN** 从 `@/shared/utils/format` 导入，而非在组件内重新定义

### Requirement: 类型定义去重

系统 SHALL 避免重复定义相同的类型接口。

#### Scenario: 类型定义

- **WHEN** 定义新的类型接口
- **THEN** 检查是否已存在相同或相似的类型定义
- **IF** 存在相似类型
- **THEN** 使用继承或组合扩展，而非重新定义

## MODIFIED Requirements

### Requirement: Mock数据管理

原有的分散Mock数据函数 SHALL 被集中的Mock数据服务替代。

### Requirement: Hooks数据获取

功能重叠的Hooks SHALL 被合并为统一的实现。

## REMOVED Requirements

### Requirement: 组件内工具函数定义

**Reason**: 工具函数应在共享位置统一定义，避免重复和维护困难
**Migration**: 删除组件内的工具函数定义，改为从共享位置导入

### Requirement: 重复的类型定义

**Reason**: 相同类型应只定义一次，避免不一致
**Migration**: 删除重复定义，保留最完整的版本
