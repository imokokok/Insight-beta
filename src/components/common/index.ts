// Common Components - 通用组件
// 这些组件在多个功能模块中被复用

// ==================== 基础/核心组件 ====================
export { ErrorBoundary } from './ErrorBoundary';
export { ClientComponentsWrapper } from './ClientComponentsWrapper';
export { ServiceWorkerRegister } from './ServiceWorkerRegister';

// ==================== 加载/骨架屏组件 ====================
export { DynamicLoading, createLoadingComponent, type LoadingType } from './DynamicLoading';

// 骨架屏组件已统一迁移到 @/components/ui/skeleton
// 请从 @/components/ui/skeleton 导入 Skeleton 相关组件

// ==================== 性能优化组件 ====================
export { PreloadLink } from './PreloadLink';
export { ResourceHints } from './ResourceHints';
export { ResourcePreloader } from './ResourcePreloader';

// ==================== 动画组件 ====================
export {
  AnimatedContainer,
  StaggerContainer,
  HoverCard,
  SlideIn,
  FadeIn,
} from './AnimatedContainer';

// ==================== 数据展示组件 ====================
// 统一版 StatCard - 合并了原 StatCard、EnhancedStatCard、StatCardEnhanced
export {
  StatCard,
  StatCardSkeleton,
  StatCardGroup,
  type StatCardProps,
  type StatCardColor,
  type StatCardVariant,
} from './StatCard';

export { ChartCard, ChartCardSkeleton } from './ChartCard';

// ==================== 页面布局组件 ====================
export { PageHeader, PageHeaderSkeleton } from './PageHeader';
export { Sidebar } from './Sidebar';

// ==================== 交互组件 ====================
export { CopyButton } from './CopyButton';
export { Tooltip, ContextualHelp, ContextualHelpPanel, HelpIcon } from './Tooltip';

// ==================== 反馈/通知组件 ====================
export { ToastContainer, useToast, type ToastType } from './DashboardToast';

// ==================== 统一版空状态组件 ====================
// 合并了 EmptyState 和 EmptyStateEnhanced
export {
  // 基础版本
  EmptyState,
  EmptySearchState,
  EmptySecurityState,
  EmptyAnomalyState,
  EmptyDeviationState,
  EmptyErrorState,
  // 增强版本
  EmptyStateEnhanced,
  EmptyAlertsState,
  EmptyWatchlistState,
  EmptySearchStateEnhanced,
  EmptySecurityStateEnhanced,
  EmptyAnomalyStateEnhanced,
  EmptyDeviationStateEnhanced,
  EmptyDashboardState,
  EmptyProtocolsState,
  EmptyPriceDataState,
  EmptyEventsState,
  EmptyFirstItemState,
  EmptyErrorStateEnhanced,
} from './EmptyState';

// ==================== 刷新/数据新鲜度组件 ====================
export { RefreshIndicator, LastUpdated } from './RefreshIndicator';
export { RefreshableCard } from './RefreshableCard';
export { AutoRefreshControl } from './AutoRefreshControl';
export {
  DataFreshnessIndicator,
  DataFreshnessBadge,
  useDataFreshness,
} from './DataFreshnessIndicator';

// ==================== 输入组件 ====================
export { RecipientInput } from './RecipientInput';

// ==================== 审计/日志组件 ====================
export { AuditLogViewer } from './AuditLogViewer';

// ==================== 国际化组件 ====================
export { LanguageSwitcher } from './LanguageSwitcher';

// ==================== 移动端优化组件 ====================
export { MobileBottomNav } from './MobileBottomNav';
export {
  MobileImage,
  ResponsiveImage,
  Avatar,
  ImageGallery,
} from './MobileImage';
