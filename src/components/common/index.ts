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
export { ResourceHints } from './ResourceHints';
export { ResourcePreloader } from './ResourcePreloader';



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
export { EnhancedSidebar, defaultNavConfig } from './EnhancedSidebar';

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

// ==================== 动画空状态组件 ====================
export {
  AnimatedEmptyState,
  GuidedEmptyState,
  OnboardingEmptyState,
  EmptySearchState as AnimatedEmptySearchState,
  EmptyNotificationsState,
  EmptyWalletState,
  EmptyDataState,
  EmptySecurityState as AnimatedEmptySecurityState,
  EmptyWatchlistState as AnimatedEmptyWatchlistState,
} from './AnimatedEmptyState';

// ==================== 刷新/数据新鲜度组件 ====================
export { RefreshIndicator, LastUpdated } from './RefreshIndicator';
export { RefreshableCard } from './RefreshableCard';
export { AutoRefreshControl } from './AutoRefreshControl';
export {
  DataFreshnessIndicator,
  DataFreshnessBadge,
  useDataFreshness,
} from './DataFreshnessIndicator';

// ==================== 熔断/回退数据指示器 ====================
export {
  CircuitBreakerFallbackIndicator,
  type FallbackDataStatus,
  type CircuitBreakerFallbackIndicatorProps,
} from './CircuitBreakerFallbackIndicator';

// ==================== 输入组件 ====================
export { RecipientInput } from './RecipientInput';

// ==================== 审计/日志组件 ====================
export { AuditLogViewer } from './AuditLogViewer';

// ==================== 国际化组件 ====================
export { LanguageSwitcher } from './LanguageSwitcher';

// ==================== 移动端优化组件 ====================
export { MobileBottomNav } from './MobileBottomNav';

// ==================== 响应式组件 ====================
export {
  Show,
  Hide,
  ResponsiveContainer,
  ResponsiveGrid,
  ResponsiveText,
  ResponsivePadding,
  MobileOnly,
  TabletOnly,
  DesktopOnly,
  NotMobile,
  NotDesktop,
  ResponsiveStack,
  ResponsiveImage,
  ResponsiveTable,
  TouchOnly,
  MouseOnly,
  ReducedMotion,
  NoReducedMotion,
} from './Responsive';

// ==================== 布局组件 ====================
export {
  Container,
  ResponsiveGrid as LayoutGrid,
  DensityLayout,
  Stack,
  Row,
  SidebarLayout,
  SplitLayout,
  PageLayout,
  DashboardGrid,
  ContentSection,
  Spacer,
  Inset,
  DensityProvider,
  useDensity,
} from './Layout';

// ==================== 动画容器组件 ====================
export {
  AnimatedContainer,
  AnimatedItem,
  ScrollReveal,
  PageTransition,
  StaggerContainer,
  StaggerItem,
  HoverScale,
  FadeIn,
  SlideIn,
  ScaleIn,
  AnimatedList,
  AnimatedGrid,
  AnimatedGridItem,
  PresenceAnimation,
  NumberCounter,
} from './AnimatedContainer';
