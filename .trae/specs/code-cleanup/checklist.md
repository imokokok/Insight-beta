# 代码清理优化 - Verification Checklist

## 类型错误修复检查

- [ ] src/features/oracle/services/**tests**/priceDeviationAnalytics.test.ts 中的 2 个类型错误已修复
- [ ] src/hooks/**tests**/useAutoRefresh.test.ts 中的 9 个类型错误已修复
- [ ] npm run typecheck 显示 0 错误

## ESLint 警告修复检查

- [ ] 可自动修复的 40 个 ESLint 警告已通过 eslint --fix 修复
- [ ] 剩余的手动修复警告已处理
- [ ] npm run lint 警告数 < 10
- [ ] import 顺序已统一
- [ ] type-only imports 已正确使用
- [ ] 没有滥用 any 类型（已替换为合适的类型定义）

## TODO/FIXME 检查

- [ ] 所有 TODO 和 FIXME 注释已检查
- [ ] 每个注释都有明确的处理（已完成、已创建 issue 或已添加注释说明保留原因）

## 重复组件检查

- [ ] 重复组件已分析
- [ ] 已决定是合并、删除还是保留
- [ ] 没有功能重复的冗余组件

## 未使用翻译检查

- [ ] 未使用翻译键已验证
- [ ] 删除的翻译键确认确实未使用
- [ ] 保留的翻译键有充分理由

## 最终验证检查

- [ ] npm run typecheck 通过
- [ ] npm run lint 警告在可接受范围内
- [ ] npm run build 成功构建
- [ ] 没有引入新的功能 bug
- [ ] 所有现有功能正常工作
