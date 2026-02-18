# 死代码清理 - Verification Checklist

## Hooks 清理检查

- [x] src/hooks/useWebSocket.ts 已删除
- [x] src/hooks/useSSE.ts 已删除
- [x] src/hooks/useQuery.ts 已删除
- [x] src/hooks/useAdminToken.ts 已删除
- [x] src/features/explore/hooks/usePreferences.ts 已删除
- [x] src/features/oracle/hooks/useOracle.ts 已删除
- [x] src/features/oracle/hooks/usePlatformStats.ts 已删除
- [x] src/features/dashboard/hooks/useDashboard.ts 已删除
- [x] 各 hooks/index.ts 文件已更新，移除已删除 hook 的导出

## 目录清理检查

- [x] src/features/protocol/ 整个目录已删除

## 组件清理检查（高优先级）

- [x] src/components/security/ThreatLevelBadge.tsx 已删除（重复）
- [x] src/components/dashboard/ProfessionalDashboard.tsx 已删除
- [x] src/components/charts/EnhancedChartComponents.tsx 已恢复（实际被使用）
- [x] 相关 index.ts 文件已更新

## 组件清理检查（中优先级）

- [x] src/features/cross-chain/components/CrossChainDashboardCard.tsx 已删除
- [x] src/features/oracle/components/ProtocolHealthGrid.tsx 已删除
- [x] src/features/oracle/components/ProtocolSidebar.tsx 已删除
- [x] src/features/oracle/components/Leaderboard.tsx 已删除
- [x] src/features/oracle/components/PriceFeedList.tsx 已删除
- [x] src/features/oracle/dashboard/components/HealthStatusBadge.tsx 已删除
- [x] src/features/explore/components/FavoritesList.tsx 已删除
- [x] src/features/dashboard/components/KPICards.tsx 已删除
- [x] src/features/dashboard/components/ProtocolBadge.tsx 已删除
- [x] src/features/dashboard/components/QuickActionsPanel.tsx 已删除
- [x] 各 components/index.ts 文件已更新

## 工具函数清理检查

- [x] src/lib/analytics/deviation.ts 已删除
- [x] lib/analytics/index.ts 已更新（文件不存在，无需更新）

## 类型定义清理检查

- [x] CrossChainAnalysisType 已从 crossChainAnalysisTypes.ts 移除
- [x] CrossChainArbitrageOpportunity 已从 crossChainAnalysisTypes.ts 移除
- [x] CrossProtocolComparison 已从 unifiedOracleTypes.ts 移除

## 重复组件清理检查

- [x] src/components/security/ThreatLevelBadge.tsx 已删除
- [x] src/components/security/index.ts 已更新
- [x] src/features/security/components/ThreatLevelBadge.tsx 保留并正常工作

## 最终验证检查

- [x] npm run typecheck 通过（0 错误）
- [x] npm run lint 通过（无新增警告，仅 4 个可接受的警告）
- [x] npm run build 成功
- [x] 开发服务器正常运行
