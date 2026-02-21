// Common Components - 通用组件导出
// ==================== 核心组件 ====================
export { ClientComponentsWrapper } from './ClientComponentsWrapper';

// ==================== 内容容器 ====================
export { ContentGroup, ContentSection, ContentGrid } from './ContentGroup';
export type { ContentGroupProps, ContentSectionProps, ContentGridProps } from './ContentGroup';

// ==================== 加载状态 ====================
export { DynamicLoading, createLoadingComponent, type LoadingType } from './DynamicLoading';
export { ChartCard, ChartCardSkeleton } from './ChartCard';
export { ChartFullscreen, ChartFullscreenButton } from './ChartFullscreen';
export type { ChartFullscreenProps } from './ChartFullscreen';
export { ExportButton, escapeCSV, escapeXML, downloadFile } from './ExportButton';
export type {
  ExportButtonProps,
  ExportConfig,
  ChartExportButtonProps,
  DataExportButtonProps,
} from './ExportButton';

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

export {
  TrendIndicator,
  TrendIndicatorCompact,
  TrendIndicatorBadge,
  type Trend,
  type TrendIndicatorProps,
} from './TrendIndicator';

// ==================== 新显示组件 ====================
export { StatsBar, type StatsBarProps, type StatsBarItem, type ProgressSegment } from './StatsBar';
export { FeatureTags, type FeatureTagsProps, type FeatureTag } from './FeatureTags';
export { Gauge, type GaugeProps } from './Gauge';
export { GaugeGroup, type GaugeGroupProps } from './GaugeGroup';
export {
  CompactList,
  DualColumnList,
  type CompactListProps,
  type CompactListItem,
  type DualColumnListProps,
} from './CompactList';

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

// ==================== 协议健康状态 ====================
export { ProtocolHealthBadge } from './ProtocolHealthBadge';
export type { ProtocolHealthBadgeProps, ProtocolHealthStatus } from './ProtocolHealthBadge';

// ==================== 其他 ====================
export { HoverCard } from './PageTransitions';

// ==================== 表格组件 ====================
export {
  SortableTableHeader,
  type SortState,
  type SortableTableHeaderProps,
} from './SortableTableHeader';
