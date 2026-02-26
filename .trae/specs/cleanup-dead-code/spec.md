# 清理项目冗余代码 Spec

## Why

项目中存在一些需要清理的代码，包括调试语句、eslint-disable 注释等，这些代码会影响代码质量和可维护性。

## What Changes

- 删除/替换 7 处 `console.error` 调试语句，改用统一的 logger
- 检查并修复 2 处 `eslint-disable` 注释对应的依赖问题
- 保留测试文件中的 mock 数据（用于开发和测试）

## Impact

- Affected specs: 无
- Affected code:
  - `src/app/oracle/band/page.tsx`
  - `src/features/oracle/band/components/PriceTrendTab.tsx`
  - `src/features/oracle/band/components/QualityAnalysisTab.tsx`
  - `src/features/cross-chain/components/OracleCrossChainComparison.tsx`
  - `src/features/oracle/band/components/PriceComparisonTab.tsx`
  - `src/hooks/useFullscreen.ts`
  - `src/features/alerts/hooks/useAlertsPage.ts`
  - `src/components/common/feedback/ErrorHandler.tsx`

## ADDED Requirements

### Requirement: 统一错误日志记录

系统 SHALL 使用统一的 logger 模块记录错误，而非直接使用 `console.error`。

#### Scenario: 错误发生时

- **WHEN** 组件或 hook 中发生错误
- **THEN** 系统使用 `logger.error()` 记录错误信息

### Requirement: 避免 eslint-disable 注释

系统 SHALL 尽量避免使用 `eslint-disable` 注释，通过正确声明依赖项来解决问题。

#### Scenario: useEffect 依赖

- **WHEN** useEffect 需要依赖某个函数
- **THEN** 使用 `useCallback` 包装函数或正确声明依赖项

## 项目代码质量评估

### ✅ 无需删除的代码

1. **Logger 模块中的 console 调用** - 正常业务逻辑
2. **测试文件中的 console 输出** - 测试报告输出
3. **JSDoc 注释中的示例代码** - 文档示例
4. **测试文件中的 @ts-expect-error** - 用于测试无效输入
5. **Mock 数据文件** - 用于开发和测试环境
6. ****mocks** 目录** - 测试 mock 数据

### ✅ 未发现的问题

1. 无大段被注释的代码块
2. 无 TODO/FIXME/HACK 注释
3. 无测试文件中的 `.skip`/`.only`
4. 无 `debugger;` 语句
5. 无 `@ts-ignore` 或 `@ts-nocheck`
6. 无 `as any` 类型断言
7. 无空的导出文件

### ⚠️ 需要处理的代码

| 类型                   | 数量 | 严重程度 |
| ---------------------- | ---- | -------- |
| console.error 调试语句 | 7 处 | 中       |
| eslint-disable 注释    | 2 处 | 低       |
