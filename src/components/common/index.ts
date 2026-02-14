// Common Components - 通用组件导出
// ==================== 核心组件 ====================
export { ClientComponentsWrapper } from './ClientComponentsWrapper';

// ==================== 加载状态 ====================
export { DynamicLoading, createLoadingComponent, type LoadingType } from './DynamicLoading';
export { ChartCard, ChartCardSkeleton } from './ChartCard';

// ==================== 数据展示 ====================
export {
  StatCard,
  StatCardSkeleton,
  StatCardGroup,
  DashboardStatsSection,
} from './StatCard';

export type {
  StatCardProps,
  StatCardColor,
  StatCardVariant,
  StatCardSize,
  StatCardStatus,
  TrendData,
  SparklineData,
  StatCardAction,
  EnhancedStatCardProps,
} from './StatCard';

// ==================== 页面布局 ====================
export {
  PageHeader,
  PageHeaderSkeleton,
  DashboardPageHeader,
  DashboardPageHeaderSkeleton,
  type BreadcrumbItem,
  type PageHeaderProps,
  type DashboardPageHeaderProps,
} from './PageHeader';
export { EnhancedSidebar as Sidebar, defaultNavConfig } from './EnhancedSidebar';

// ==================== 交互反馈 ====================
export { CopyButton } from './CopyButton';
export { ToastContainer, useToast } from './DashboardToast';

// ==================== 空状态 ====================
export {
  EmptyState,
  EmptySearchState,
  EmptySecurityState,
  EmptyAnomalyState,
  EmptyDeviationState,
  EmptyErrorState,
  EmptyAlertsState,
  EmptyWatchlistState,
  EmptyDashboardState,
  EmptyProtocolsState,
  EmptyPriceDataState,
  EmptyEventsState,
  EmptyFirstItemState,
} from './EmptyState';

// ==================== 数据刷新 ====================
export { AutoRefreshControl } from './AutoRefreshControl';
export {
  DataFreshnessIndicator,
  DataFreshnessBadge,
  useDataFreshness,
} from './DataFreshnessIndicator';

// ==================== 表单输入 ====================
export { RecipientInput } from './RecipientInput';

// ==================== 国际化 ====================
export { LanguageSwitcher } from './LanguageSwitcher';

// ==================== 性能优化 ====================
export { ResourceHints } from './ResourceHints';

// ==================== 布局 ====================
export { ResponsiveGrid, DashboardGrid } from './Layout';

// ==================== 动画 ====================
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

// ==================== 其他 ====================
export { HoverCard } from './PageTransitions';
