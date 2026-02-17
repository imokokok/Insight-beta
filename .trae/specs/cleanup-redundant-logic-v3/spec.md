# 清理项目冗余逻辑 V3 Spec

## Why
项目中仍存在一些重复的常量定义、验证函数、模拟数据生成逻辑，以及未使用的依赖和空目录，这些冗余增加了维护成本。需要进一步清理以提高代码整洁度。

## What Changes
- 统一重复的常量定义 (`VALID_SYMBOLS`)
- 统一重复的验证函数 (`validateSymbol`)
- 统一重复的模拟数据生成函数
- 清理空的 feature 组件目录
- 移除未使用的依赖
- 统一 API 响应格式

## Impact
- Affected specs: 无影响（这些是代码重构，不改变功能）
- Affected code:
  - `src/app/api/cross-chain/comparison/route.ts` - 删除重复常量和函数
  - `src/app/api/cross-chain/history/route.ts` - 删除重复常量和函数
  - `src/app/api/oracle/analytics/deviation/route.ts` - 删除重复模拟数据函数
  - `src/features/oracle/services/priceDeviationAnalytics.ts` - 删除重复模拟数据函数
  - `src/features/security/components/` - 删除空目录
  - `src/app/api/comparison/heatmap/route.ts` - 统一响应格式
  - `src/app/api/oracle/stats/route.ts` - 统一响应格式
  - `package.json` - 移除未使用依赖

## ADDED Requirements

### Requirement: 统一重复的常量定义
系统 SHALL 将分散的常量定义统一到单一位置。

#### Scenario: 统一 VALID_SYMBOLS 常量
- **WHEN** 多个文件中存在相同的常量定义
- **THEN** 提取到 `src/config/constants.ts`，其他文件从该处导入

### Requirement: 统一重复的验证函数
系统 SHALL 将重复的验证函数统一到单一位置。

#### Scenario: 统一 validateSymbol 函数
- **WHEN** 多个 API 路由中存在相同的验证函数
- **THEN** 提取到 `src/lib/api/validation/` 目录，其他文件从该处导入

### Requirement: 统一模拟数据生成函数
系统 SHALL 将重复的模拟数据生成函数统一到单一位置。

#### Scenario: 统一 generateMockData 函数
- **WHEN** 多个文件中存在相似的模拟数据生成逻辑
- **THEN** 提取到 `src/shared/utils/mockData.ts`，其他文件从该处导入

### Requirement: 清理空的 feature 组件目录
系统 SHALL 删除没有实际组件的空目录。

#### Scenario: 删除 security/components 空目录
- **WHEN** feature 目录下只有重导出文件，没有实际组件
- **THEN** 删除该目录，更新导入路径

### Requirement: 统一 API 响应格式
系统 SHALL 统一所有 API 路由的响应格式。

#### Scenario: 使用统一的响应辅助函数
- **WHEN** API 路由直接使用 `NextResponse.json()`
- **THEN** 改为使用 `apiSuccess()` 和 `apiError()` 辅助函数

### Requirement: 移除未使用的依赖
系统 SHALL 移除 package.json 中未被使用的依赖。

#### Scenario: 移除未使用的 npm 包
- **WHEN** 依赖在代码中未被 import
- **THEN** 从 package.json 中移除该依赖

## MODIFIED Requirements
无

## REMOVED Requirements
无
