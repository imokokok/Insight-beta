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

// Dashboard hooks (包含旧版 useAutoRefresh，保持向后兼容)
export {
  useDashboardShortcuts,
  useAutoRefresh as useAutoRefreshLegacy,
  useDataCache,
} from './useDashboard';

// 自动刷新 Hook (新的实现 - 推荐用于新页面)
export { useAutoRefresh, useSimpleAutoRefresh } from './use-auto-refresh';

// 视图模式 Hook
export { useViewMode, useSimpleViewMode } from './use-view-mode';

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
