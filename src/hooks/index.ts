// Hooks - 自定义 React Hooks
// 所有自定义 hooks 从这里统一导出

// ==================== 核心 Hooks ====================
export { useWebSocket } from './useWebSocket';
export { useDebounce } from './useDebounce';
export { useAutoRefresh } from './use-auto-refresh';

// ==================== 交互优化 Hooks ====================
export {
  useKeyboardShortcuts,
  useCommonShortcuts,
  ShortcutHelpPanel,
  type ShortcutGroup,
} from './useKeyboardShortcuts';

export {
  usePageOptimizations,
  useDataFetching,
} from './usePageOptimizations';

// ==================== 其他 Hooks ====================
export { useViewport } from './useViewport';
export { useMediaQuery } from './useMediaQuery';
export { usePerformance } from './usePerformance';
