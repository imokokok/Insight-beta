# Tasks

- [x] Task 1: 删除未使用的 hooks
  - [x] SubTask 1.1: 删除 src/hooks/useWebSocket.ts
  - [x] SubTask 1.2: 删除 src/hooks/useSSE.ts
  - [x] SubTask 1.3: 删除 src/hooks/useQuery.ts
  - [x] SubTask 1.4: 删除 src/hooks/useAdminToken.ts
  - [x] SubTask 1.5: 删除 src/features/explore/hooks/usePreferences.ts
  - [x] SubTask 1.6: 删除 src/features/oracle/hooks/useOracle.ts
  - [x] SubTask 1.7: 删除 src/features/oracle/hooks/usePlatformStats.ts
  - [x] SubTask 1.8: 删除 src/features/dashboard/hooks/useDashboard.ts
  - [x] SubTask 1.9: 更新各 hooks/index.ts 文件，移除已删除 hook 的导出

- [x] Task 2: 删除整个 features/protocol 目录
  - [x] SubTask 2.1: 删除 src/features/protocol/ 整个目录

- [x] Task 3: 删除未使用的组件（高优先级）
  - [x] SubTask 3.1: 删除 src/components/security/ThreatLevelBadge.tsx（重复）
  - [x] SubTask 3.2: 删除 src/components/dashboard/ProfessionalDashboard.tsx
  - [x] SubTask 3.3: 删除 src/components/charts/EnhancedChartComponents.tsx（已恢复，实际被使用）
  - [x] SubTask 3.4: 更新相关 index.ts 文件

- [x] Task 4: 删除未使用的组件（中优先级）
  - [x] SubTask 4.1: 删除 src/features/cross-chain/components/CrossChainDashboardCard.tsx
  - [x] SubTask 4.2: 删除 src/features/oracle/components/ProtocolHealthGrid.tsx
  - [x] SubTask 4.3: 删除 src/features/oracle/components/ProtocolSidebar.tsx
  - [x] SubTask 4.4: 删除 src/features/oracle/components/Leaderboard.tsx
  - [x] SubTask 4.5: 删除 src/features/oracle/components/PriceFeedList.tsx
  - [x] SubTask 4.6: 删除 src/features/oracle/dashboard/components/HealthStatusBadge.tsx
  - [x] SubTask 4.7: 删除 src/features/explore/components/FavoritesList.tsx
  - [x] SubTask 4.8: 删除 src/features/dashboard/components/KPICards.tsx
  - [x] SubTask 4.9: 删除 src/features/dashboard/components/ProtocolBadge.tsx
  - [x] SubTask 4.10: 删除 src/features/dashboard/components/QuickActionsPanel.tsx
  - [x] SubTask 4.11: 更新各 components/index.ts 文件

- [x] Task 5: 删除未使用的工具函数
  - [x] SubTask 5.1: 删除 src/lib/analytics/deviation.ts
  - [x] SubTask 5.2: 更新 lib/analytics/index.ts（文件不存在，无需更新）

- [x] Task 6: 清理未使用的类型定义
  - [x] SubTask 6.1: 从 crossChainAnalysisTypes.ts 移除 CrossChainAnalysisType
  - [x] SubTask 6.2: 从 crossChainAnalysisTypes.ts 移除 CrossChainArbitrageOpportunity
  - [x] SubTask 6.3: 从 unifiedOracleTypes.ts 移除 CrossProtocolComparison

- [x] Task 7: 清理重复组件
  - [x] SubTask 7.1: 确认 src/features/security/components/ThreatLevelBadge.tsx 是保留版本
  - [x] SubTask 7.2: 删除 src/components/security/ThreatLevelBadge.tsx
  - [x] SubTask 7.3: 更新 src/components/security/index.ts

- [x] Task 8: 验证和测试
  - [x] SubTask 8.1: 运行 npm run typecheck 确保无类型错误
  - [x] SubTask 8.2: 运行 npm run lint 确保无新增警告
  - [x] SubTask 8.3: 运行 npm run build 确保构建成功
  - [x] SubTask 8.4: 运行 npm test 确保测试通过

# Task Dependencies

- [Task 8] depends on [Task 1, Task 2, Task 3, Task 4, Task 5, Task 6, Task 7]
- [Task 1, Task 2, Task 3, Task 4, Task 5, Task 6, Task 7] 可以并行执行
