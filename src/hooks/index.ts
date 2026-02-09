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

// 图标交互
export {
  useIconInteraction,
  type IconAnimation,
  type IconInteractionState,
  type IconInteractionOptions,
  type IconInteractionReturn,
} from './useIconInteraction';

// 键盘导航
export {
  useKeyboardNavigation,
  useGlobalShortcuts,
  useFocusTrap,
  useNavigationHistory,
  type NavigationDirection,
  type KeyBinding,
  type KeyboardNavigationOptions,
  type KeyboardNavigationReturn,
} from './useKeyboardNavigation';

// 应用快捷键
export { useAppShortcuts, type AppShortcutsConfig } from './useAppShortcuts';

// 其他 Hooks (保持独立)
export { useDisputes } from './useDisputes';
export { usePreload, useComponentPreload } from './usePreload';
export { useWebSocket, useWebSocketChannel } from './useWebSocket';
export { useDataRefresh, useMultipleDataRefresh } from './useDataRefresh';
export { useDashboardShortcuts, useAutoRefresh, useDataCache } from './useDashboard';
