// Common Components - 通用组件
// 这些组件在多个功能模块中被复用

// 基础组件
export { DynamicLoading, createLoadingComponent, type LoadingType } from './DynamicLoading';
export { PreloadLink } from './PreloadLink';
export { ErrorBoundary } from './ErrorBoundary';
export { ResourceHints } from './ResourceHints';
export { ServiceWorkerRegister } from './ServiceWorkerRegister';

// 从 features/common 移动过来的通用组件
export { AnimatedContainer } from './AnimatedContainer';
export { AuditLogViewer } from './AuditLogViewer';
export { AutoRefreshControl } from './AutoRefreshControl';
export { ChartCard } from './ChartCard';
export { ClientComponentsWrapper } from './ClientComponentsWrapper';
export { CopyButton } from './CopyButton';
export { ToastContainer, useToast, type ToastType } from './DashboardToast';
export { DataFreshnessIndicator } from './DataFreshnessIndicator';
export {
  EmptyState,
  EmptySearchState,
  EmptySecurityState,
  EmptyAnomalyState,
  EmptyDeviationState,
  EmptyErrorState,
} from './EmptyState';
export { EnhancedStatCard } from './EnhancedStatCard';
export { LanguageSwitcher } from './LanguageSwitcher';
export { PageHeader, PageHeaderSkeleton } from './PageHeader';
export { RecipientInput } from './RecipientInput';
export { RefreshableCard } from './RefreshableCard';
export { RefreshIndicator } from './RefreshIndicator';
export { ResourcePreloader } from './ResourcePreloader';
export { Sidebar } from './Sidebar';
export { SkeletonCard, SkeletonStatCard, SkeletonList, SkeletonChart } from './SkeletonCard';
export { StatCard, StatCardSkeleton, StatCardGroup } from './StatCard';
export { Tooltip } from './Tooltip';
export { WebVitalsMonitor } from './WebVitalsMonitor';
