// Common Components - 通用组件
// 这些组件在多个功能模块中被复用

// ==================== 基础/核心组件 ====================
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
export {
  PageHeader,
  PageHeaderSkeleton,
  DashboardPageHeader,
  DashboardPageHeaderSkeleton,
  type BreadcrumbItem,
  type PageHeaderProps,
  type DashboardPageHeaderProps,
} from './PageHeader';
export { EnhancedSidebar, defaultNavConfig } from './EnhancedSidebar';

// ==================== 交互组件 ====================
export { CopyButton } from './CopyButton';

// ==================== 反馈/通知组件 ====================
export { ToastContainer, useToast } from './DashboardToast';

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
  EmptyAlertsState,
  EmptyWatchlistState,
  EmptyDashboardState,
  EmptyProtocolsState,
  EmptyPriceDataState,
  EmptyEventsState,
  EmptyFirstItemState,
} from './EmptyState';

// ==================== 刷新/数据新鲜度组件 ====================
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

// ==================== 响应式组件 ====================
export {
  Show,
  ResponsiveContainer,
  ResponsiveGrid,
  DesktopOnly,
  ResponsiveStack,
} from './Responsive';

// ==================== 布局组件 ====================
export {
  ResponsiveGrid as LayoutGrid,
  DashboardGrid,
} from './Layout';

// ==================== 动画容器组件 ====================
export {
  ScrollReveal,
  PageTransition,
  StaggerContainer,
  StaggerItem,
  FadeIn,
  AnimatedList,
  AnimatedGrid,
  AnimatedGridItem,
} from './AnimatedContainer';

// ==================== 页面转场动画组件 ====================
export {
  HoverCard,
  StaggerContainer as StaggerContainerWithDelay,
  StaggerItem as StaggerItemWithDirection,
  AnimatedList as AnimatedListWithKey,
  AnimatedGrid as AnimatedGridWithKey,
  CountUp,
  SkeletonPulse,
  LoadingPlaceholder,
  ScrollReveal as ScrollRevealWithDirection,
  Parallax,
  RippleButton,
} from './PageTransitions';
