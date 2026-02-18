// Common Components - 通用组件导出
// ==================== 核心组件 ====================
export { ClientComponentsWrapper } from './ClientComponentsWrapper';

// ==================== 加载状态 ====================
export { DynamicLoading, createLoadingComponent, type LoadingType } from './DynamicLoading';
export { ChartCard, ChartCardSkeleton } from './ChartCard';
export { ChartFullscreen, ChartFullscreenButton } from './ChartFullscreen';
export type { ChartFullscreenProps } from './ChartFullscreen';
export { ExportButton } from './ExportButton';
export type { ExportButtonProps } from './ExportButton';

// ==================== 数据展示 ====================
export { StatCard, StatCardSkeleton, StatCardGroup, DashboardStatsSection } from './StatCard';

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

export {
  SummaryStatsBase,
  type StatItemBase,
  type SummaryStatsBaseProps,
} from './SummaryStatsBase';

export {
  KPIOverviewBar,
  type KPIItem,
  type KPITrend,
  type KPIColor,
  type KPIOverviewBarProps,
} from './KPIOverviewBar';

// ==================== 页面布局 ====================
export {
  PageHeader,
  PageHeaderSkeleton,
  DashboardPageHeader,
  DashboardPageHeaderSkeleton,
  DynamicPageHeader,
  type BreadcrumbItem as PageHeaderBreadcrumbItem,
  type PageHeaderProps,
  type DashboardPageHeaderProps,
  type DynamicPageHeaderProps,
} from './PageHeader';
export {
  Breadcrumb,
  BreadcrumbWithActions,
  type BreadcrumbItem,
  type BreadcrumbProps,
  type BreadcrumbWithActionsProps,
} from './Breadcrumb';
export { EnhancedSidebar as Sidebar, defaultNavConfig } from './EnhancedSidebar';
export { MobileNavProvider, MobileMenuButton, MobileSidebar, useMobileNav } from './MobileNav';
export { AppLayout } from './AppLayout';
export { QuickSearch, useQuickSearch } from './QuickSearch';

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
export { PullToRefresh, type PullToRefreshProps } from './PullToRefresh';

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

// ==================== 时间范围选择器 ====================
export {
  TimeRangeSelector,
  type TimeRangeSelectorProps,
  type TimeRange,
  type TimeRangePreset,
} from './TimeRangeSelector';

// ==================== 其他 ====================
export { HoverCard } from './PageTransitions';
