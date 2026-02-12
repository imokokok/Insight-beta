// ==================== 核心 Hooks ====================
export { useWebSocket, type WebSocketOptions, type WebSocketState } from './useWebSocket';

export { useDebounce } from './useDebounce';
export { useAutoRefresh } from './useAutoRefresh';
export { useAutoRefreshWithStats } from './useAutoRefreshWithStats';

// ==================== 交互优化 Hooks ====================
export {
  useKeyboardShortcuts,
  useCommonShortcuts,
  ShortcutHelpPanel,
  type ShortcutGroup,
} from './useKeyboardShortcuts';

export { usePageOptimizations } from './usePageOptimizations';

// ==================== 响应式 Hooks ====================
export { useViewport } from './useViewport';

export {
  useMediaQuery,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  useIsLargeScreen,
  useDeviceType,
  useViewportSize,
  type DeviceType,
} from './useMediaQuery';

// ==================== 性能监控 Hooks ====================
export { useWebVitals, useLongTaskMonitor } from './usePerformance';

// ==================== 无障碍 Hooks ====================
export { useReducedMotion } from './useReducedMotion';

// ==================== UI Hooks ====================
export { useInfiniteList, type BaseResponse } from './useUI';

// ==================== 用户 Hooks ====================
export { useUserStats, useWatchlist, useAdminSession } from './useUser';

// ==================== 钱包 Hooks ====================
export { useBalance, useSwitchChainWithFeedback } from './useWallet';

// ==================== Oracle Hooks ====================
export { useOracleData, useOracleFilters } from './useOracle';

export { useDisputes } from './useDisputes';

// ==================== Gas Price Hooks ====================
export {
  useGasPrice,
  useGasPrices,
  useGasPriceHistory,
  useGasPriceStatistics,
  useGasPriceTrend,
  useGasPriceHealth,
  useWarmupGasCache,
  type GasPriceData,
  type GasPriceHistoryEntry,
  type GasPriceStatistics,
  type GasPriceTrend,
  type ProviderHealth,
  type GasPriceHealthResponse,
} from './useGasPrice';

// ==================== Comparison Hooks ====================
export {
  useHeatmapData,
  useLatencyData,
  useCostData,
  useRealtimeData,
  useComparisonData,
} from './useComparison';

// ==================== Cross Chain Hooks ====================
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
} from './useCrossChain';

// ==================== Admin Hooks ====================
export {
  useAdminToken,
  type UseAdminTokenOptions,
  type UseAdminTokenReturn,
} from './useAdminToken';

// ==================== Alert Hooks ====================
export {
  useOracleIncidents,
  useOracleRisks,
  useOracleOpsMetrics,
  type UseOracleIncidentsReturn,
  type UseOracleRisksReturn,
  type UseOracleOpsMetricsReturn,
} from './useAlerts';

// ==================== Query Hooks ====================
export { useQuery, type UseQueryOptions, type UseQueryReturn } from './useQuery';

// ==================== SWR 配置 Hooks ====================
export { createSWRConfig, createSWRInfiniteConfig, REALTIME_CONFIG } from './useSWRConfig';

// ==================== Dashboard Hooks ====================
export {
  useAutoRefresh as useAutoRefreshWithInterval,
  useDataCache,
  useDashboardShortcuts,
} from './useDashboard';

// Legacy alias for backwards compatibility
export { useAutoRefresh as useAutoRefreshLegacy } from './useDashboard';
