# 检查清单

## Phase 1: 共享组件

- [x] TopStatusBar 共享组件已创建并可正常工作
- [x] Chainlink dashboard 使用共享 TopStatusBar 组件
- [x] Pyth dashboard 使用共享 TopStatusBar 组件
- [x] API3 dashboard 使用共享 TopStatusBar 组件
- [x] Band dashboard 使用共享 TopStatusBar 组件
- [x] 旧的 TopStatusBar 组件文件已删除

- [x] KpiOverview 组件已使用共享 KpiGrid 组件（无需重构）

## Phase 2: 类型统一

- [x] AlertSeverity 类型仅从 `@/types/common/status` 导出
- [x] AlertStatus 类型仅从 `@/types/common/status` 导出
- [x] SupportedChain 类型从 `@/types/chains` 导出
- [x] ChainInfo 类型已统一（constants.ts 从 types/chains 导入）
- [x] OracleProtocol 相关类型从 `@/types/oracle/protocol` 导出
- [ ] 价格相关类型整合（延后处理）
- [x] 所有文件的导入路径已更新

## Phase 3: 缓存模块

- [x] 缓存模块分析完成 - 职责不同，无需整合

## Phase 4: 验证

- [x] `npm run lint` 通过（仅预先存在的警告）
- [x] TopStatusBar 相关代码无类型错误
- [ ] `npm run typecheck` 存在预先存在的错误（与本次重构无关）
- [ ] 开发服务器测试（需要用户验证）
