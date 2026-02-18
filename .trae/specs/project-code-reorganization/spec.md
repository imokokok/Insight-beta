# 项目代码全面审查与整理 Spec

## Why

项目经过一段时间的开发，积累了技术债务，需要进行全面审查和整理，以提升代码质量、可维护性和开发效率。

## What Changes

### 高优先级

- **修复依赖问题**：添加缺失的 `uuid` 依赖，移除未使用的 `swagger-ui-react`
- **消除代码重复**：合并重复的 `HelpTooltip`、`WelcomeGuide`、`ExportButton` 组件
- **统一 fetcher 函数**：将 7 处重复的 fetcher 函数统一使用 `fetchApiData`

### 中优先级

- **类型定义整理**：完成 `oracleTypes.ts` 到 `types/oracle/` 的迁移
- **服务层优化**：充实或移除空洞的 feature services
- **测试文件归位**：将测试文件移动到正确的模块位置

### 低优先级

- **明确 shared/lib 边界**：清晰划分职责
- **简化组件导出链**：统一导入路径

## Impact

- Affected specs: 无
- Affected code:
  - `package.json` - 依赖调整
  - `src/features/oracle/analytics/` - 组件合并
  - `src/features/*/hooks/` - fetcher 统一
  - `src/types/` - 类型整理
  - `src/features/*/services/` - 服务层优化

---

## ADDED Requirements

### Requirement: 依赖管理优化

系统 SHALL 确保所有依赖都被正确声明和使用。

#### Scenario: 缺失依赖修复

- **WHEN** 代码中使用了 `uuid` 包
- **THEN** `uuid` 应在 `dependencies` 中声明

#### Scenario: 未使用依赖移除

- **WHEN** `swagger-ui-react` 未被代码使用
- **THEN** 应从 `dependencies` 中移除

---

### Requirement: 代码重复消除

系统 SHALL 避免功能相同或相似的代码重复。

#### Scenario: HelpTooltip 组件合并

- **WHEN** `deviation` 和 `disputes` 模块都需要 HelpTooltip
- **THEN** 应提取到共享位置 `features/oracle/components/shared/HelpTooltip.tsx`

#### Scenario: WelcomeGuide 组件合并

- **WHEN** `deviation` 和 `disputes` 模块都需要 WelcomeGuide
- **THEN** 应创建可配置的 `WelcomeGuideBase` 组件

#### Scenario: ExportButton 组件合并

- **WHEN** `deviation` 和 `disputes` 模块都需要 ExportButton
- **THEN** 应创建泛型 `ExportButton<T>` 组件

#### Scenario: fetcher 函数统一

- **WHEN** 多个 hooks 需要数据获取功能
- **THEN** 应统一使用 `@/shared/utils/api` 中的 `fetchApiData`

---

### Requirement: 类型定义整理

系统 SHALL 保持类型定义的组织清晰和一致性。

#### Scenario: Oracle 类型迁移

- **WHEN** `oracleTypes.ts` 和 `unifiedOracleTypes.ts` 存在重叠
- **THEN** 应完成迁移到 `types/oracle/` 目录结构

---

### Requirement: 服务层优化

系统 SHALL 确保服务层有明确的职责和实现。

#### Scenario: 空洞服务处理

- **WHEN** feature services 目录只包含简单的 fetch 调用
- **THEN** 应充实业务逻辑或移除服务层

---

### Requirement: 测试组织规范

系统 SHALL 确保测试文件与被测试代码在同一模块内。

#### Scenario: 测试文件位置

- **WHEN** 测试 `features/wallet` 的功能
- **THEN** 测试文件应在 `features/wallet/hooks/__tests__/` 中

---

## MODIFIED Requirements

无

---

## REMOVED Requirements

无
