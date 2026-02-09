// ============================================================================
// Hooks 统一导出
// ============================================================================

// Oracle 相关
export { useOracleData, useOracleFilters } from './useOracle';

// Alerts 相关
export {
  useOracleIncidents,
  useOracleRisks,
  useOracleOpsMetrics,
  type UseOracleIncidentsReturn,
  type UseOracleRisksReturn,
  type UseOracleOpsMetricsReturn,
} from './useAlerts';

// User 相关
export { useUserStats, useWatchlist, useAdminSession } from './useUser';

// Wallet 相关
export { useBalance, useSwitchChainWithFeedback } from './useWallet';

// UI 相关
export { useInfiniteList, useDebounce, useDebouncedCallback, type BaseResponse } from './useUI';

// 预加载
export { usePreload, useComponentPreload } from './usePreload';

// 其他 Hooks (保持独立)
export { useDisputes } from './useDisputes';
export { useWebSocket } from './useWebSocket';
export { useDataRefresh } from './useDataRefresh';
export { useDashboardShortcuts, useAutoRefresh, useDataCache } from './useDashboard';

// LocalStorage
export { useLocalStorage } from './useLocalStorage';

// 通用 Hooks
export {
  useMediaQuery,
  useBreakpoint,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  useScreenSize,
  type Breakpoint,
} from './useMediaQuery';
export { usePrevious, usePreviousDistinct } from './usePrevious';
export { useToggle, useToggleArray } from './useToggle';
