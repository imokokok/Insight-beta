# 删除重复无用代码 Checklist

## 类型定义统一

- [x] AlertRuleRow 接口已提取到共享模块 `@/types/database/alert`
- [x] rowToAlertRule 函数已提取到共享模块
- [x] `src/app/api/alerts/rules/route.ts` 已更新使用共享模块
- [x] `src/app/api/alerts/rules/[id]/route.ts` 已更新使用共享模块
- [x] shortenAddress 函数已删除，所有调用已替换为 truncateAddress
- [x] AlertSeverity 和 AlertStatus 类型统一从 `@/types/common/status` 导出
- [x] Incident 类型重复定义已删除

## 工具函数统一

- [x] truncateAddress 函数是唯一的地址截断函数
- [x] 格式化函数统一到 `@/shared/utils/format`
- [x] i18n/utils.ts 中的格式化函数调用共享实现

## 组件和配置清理

- [x] 重复的 exportConfig 文件已删除（保留 exportConfig.ts，简化 ExportButton.tsx）
- [x] ExportButton 组件使用统一实现
- [x] KpiOverview 组件系列已重构为使用通用组件

## API 响应函数

- [ ] API 响应函数统一使用 `ok()` 和 `error()` (跳过 - 风险较高)
- [ ] `apiSuccess()` 和 `apiError()` 已删除 (跳过 - 风险较高)

## 验证

- [x] 所有 TypeScript 类型检查通过
- [ ] 所有测试通过
- [x] 无运行时错误
- [x] 导入路径正确
