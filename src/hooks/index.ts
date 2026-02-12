// ==================== 核心 Hooks ====================
export { useWebSocket } from './useWebSocket';
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

export {
  usePageOptimizations,
} from './usePageOptimizations';

// ==================== 其他 Hooks ====================
export { useViewport } from './useViewport';
export { 
  useMediaQuery,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  useIsLargeScreen,
  useDeviceType,
  useViewportSize,
} from './useMediaQuery';
export { useWebVitals, useLongTaskMonitor } from './usePerformance';

// ==================== 无障碍 Hooks ====================
export { useReducedMotion } from './useReducedMotion';

// ==================== UI Hooks ====================
export { useInfiniteList } from './useUI';
export type { BaseResponse } from './useUI';

// ==================== 用户 Hooks ====================
export { useUserStats, useWatchlist, useAdminSession } from './useUser';

// ==================== 钱包 Hooks ====================
export { useBalance, useSwitchChainWithFeedback } from './useWallet';

// ==================== Oracle Hooks ====================
export { useOracleData, useOracleFilters } from './useOracle';
export { useDisputes } from './useDisputes';

// ==================== Admin Hooks ====================
export { useAdminToken } from './useAdminToken';
export type { UseAdminTokenOptions, UseAdminTokenReturn } from './useAdminToken';

// ==================== Alert Hooks ====================
export { useOracleIncidents, useOracleRisks, useOracleOpsMetrics } from './useAlerts';
export type { UseOracleIncidentsReturn, UseOracleRisksReturn, UseOracleOpsMetricsReturn } from './useAlerts';

// ==================== Query Hooks ====================
export { useQuery } from './useQuery';
export type { UseQueryOptions, UseQueryReturn } from './useQuery';

// ==================== Dashboard Hooks ====================
export { useAutoRefresh as useAutoRefreshWithInterval, useDataCache, useDashboardShortcuts } from './useDashboard';

// Legacy alias for backwards compatibility
export { useAutoRefresh as useAutoRefreshLegacy } from './useDashboard';