# 项目代码全面审查与整理 - 验证清单

## 依赖管理

- [x] `uuid` 已添加到 `dependencies`
- [x] `swagger-ui-react` 已从 `dependencies` 移除
- [x] `npm install` 执行无错误
- [x] 无未使用的依赖

## 代码重复消除

### fetcher 函数统一

- [x] `useCrossChain.ts` 使用统一的 `fetchApiData`
- [x] `useArbitrage.ts` 使用统一的 `fetchApiData`
- [x] `useAlertHistory.ts` 使用统一的 `fetchApiData`
- [x] `useDataDiscovery.ts` 使用统一的 `fetchApiData`
- [x] `useGlobalSearch.ts` 使用统一的 `fetchApiData`
- [x] `useMarketOverview.ts` 使用统一的 `fetchApiData`
- [x] `useAlerts.ts` 使用统一的 `fetchApiData`
- [x] 无重复的 fetcher 函数定义

### 组件合并

- [x] `HelpTooltip` 共享组件已创建
- [x] `deviation` 模块使用共享 `HelpTooltip`
- [x] `disputes` 模块使用共享 `HelpTooltip`
- [x] 原有重复的 `HelpTooltip` 文件已删除
- [x] `WelcomeGuideBase` 组件已创建
- [x] `deviation` 模块使用 `WelcomeGuideBase`
- [x] `disputes` 模块使用 `WelcomeGuideBase`
- [x] 原有重复的 `WelcomeGuide` 文件已精简
- [x] 泛型 `ExportButton<T>` 组件已创建
- [x] `deviation` 模块使用泛型 `ExportButton`
- [x] `disputes` 模块使用泛型 `ExportButton`
- [x] 原有重复的 `ExportButton` 文件已精简

## 类型定义整理

- [x] `oracleTypes.ts` 和 `unifiedOracleTypes.ts` 重叠分析完成
- [x] 类型迁移计划已制定（建议分阶段执行，风险中等）
- [ ] 类型已迁移到 `types/oracle/` 目录（待后续执行）
- [ ] 所有导入路径已更新（待后续执行）
- [ ] 废弃的类型文件已处理（待后续执行）

## 服务层优化

- [x] `features/alerts/services` 已审查并删除（空洞文件）
- [x] `features/dashboard/services` 已审查并删除（空洞文件）
- [x] `features/cross-chain/services` 已审查并删除（空洞文件）
- [x] 无空洞的服务文件

## 测试组织

- [x] `useWallet.test.tsx` 已移动到正确位置
- [x] 其他测试文件位置已检查
- [x] 测试正常运行

## 最终验证

- [x] `npm run typecheck` 通过（0 错误）
- [x] `npm run lint` 通过（0 警告）
- [x] `npm run build` 成功
- [x] 修改的测试文件通过
- [x] 所有功能正常工作
- [x] 无新增 bug
