/**
 * Hooks Index - 全局 Hooks 导出
 *
 * 架构说明：
 * - 本文件导出全局通用的 hooks
 * - 业务相关的 hooks 从 features/[domain]/hooks/ 导出
 * - 使用 Feature-Based 结构，避免重复
 *
 * 分组：
 * - 核心 Hooks      : 基础功能
 * - 交互优化 Hooks  : 键盘快捷键、页面优化
 * - 响应式 Hooks   : 视口、媒体查询
 * - 性能 Hooks     : 性能监控
 * - UI Hooks       : 列表、无限滚动
 * - 业务 Hooks     : 从 features 重新导出
 */

// ==================== 核心 Hooks ====================
export { useWebSocket, type WebSocketOptions, type WebSocketState } from './useWebSocket';

export { useDebounce } from './useDebounce';
export { useAutoRefresh } from './useAutoRefresh';
export { useDataCache } from './useDataCache';

export { usePageOptimizations } from './usePageOptimizations';

// ==================== 响应式 Hooks ====================

export {
  useMediaQuery,
  useIsLargeScreen,
  useIsMobile,
} from './useMediaQuery';

// ==================== 无障碍 Hooks ====================
export { useReducedMotion } from './useReducedMotion';

// ==================== UI Hooks ====================
export { useInfiniteList, type BaseResponse } from './useUI';

// ==================== 用户 Hooks ====================
export { useUserStats, useAdminSession } from './useUser';

// ==================== 钱包 Hooks ====================
export { useBalance, useSwitchChainWithFeedback } from '@/features/wallet/hooks/useWallet';

// ==================== Admin Hooks ====================
export {
  useAdminToken,
  type UseAdminTokenOptions,
  type UseAdminTokenReturn,
} from './useAdminToken';

// ==================== Query Hooks ====================
export { useQuery, type UseQueryOptions, type UseQueryReturn } from './useQuery';

// ==================== SWR 配置 Hooks ====================
export { createSWRConfig, createSWRInfiniteConfig, REALTIME_CONFIG } from './useSWRConfig';

// ==================== 业务 Hooks (从 features 重新导出) ====================

// Oracle Hooks
export { useOracleData, useOracleFilters } from '@/features/oracle/hooks';

// Gas Price Hooks
export {
  useGasPrice,
  useGasPrices,
  useGasPriceHistory,
  useGasPriceStatistics,
  useGasPriceTrend,
  useGasPriceHealth,
  type GasPriceData,
  type GasPriceHistoryEntry,
  type GasPriceStatistics,
  type GasPriceTrend,
  type ProviderHealth,
  type GasPriceHealthResponse,
} from '@/features/gas/hooks';

// Comparison Hooks
export {
  useHeatmapData,
  useLatencyData,
  useCostData,
  useRealtimeData,
  useComparisonData,
} from '@/features/comparison/hooks';

// Cross Chain Hooks
export {
  useCrossChainComparison,
  useCrossChainArbitrage,
  useCrossChainAlerts,
  useCrossChainDashboard,
  useCrossChainHistory,
  type CrossChainComparisonData,
  type CrossChainComparisonResult,
  type CrossChainArbitrageOpportunity,
  type CrossChainArbitrageSummary,
  type CrossChainArbitrageResponse,
  type CrossChainDeviationAlert,
  type CrossChainDeviationAlertsResponse,
  type CrossChainDashboardData,
  type CrossChainDashboardResponse,
  type CrossChainHistoricalDataPoint,
  type CrossChainHistoricalSummary,
  type CrossChainHistoricalResponse,
} from '@/features/cross-chain/hooks';

// ==================== Dashboard Hooks ====================
export {
  useDashboardShortcuts,
  useAutoRefresh as useAutoRefreshWithCountdown,
} from '@/features/dashboard/hooks';
