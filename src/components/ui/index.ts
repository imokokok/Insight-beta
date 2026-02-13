// Enhanced UI Components
// 统一的 UI 组件导出

// Buttons - 统一版（合并了 button 和 button-enhanced）
export { Button, buttonVariants, type ButtonProps } from './button';

// Cards - 统一版（合并了 card 和 card-enhanced）
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardEnhanced } from './card';

// Badges - 统一版
export { Badge, StatusBadge, badgeVariants, type BadgeProps, type StatusType } from './badge';

// Skeletons - 统一版（合并了 skeleton 和 skeleton-enhanced）
export {
  Skeleton,
  CardSkeleton,
  ListItemSkeleton,
  TableRowSkeleton,
  StatCardSkeleton,
  ChartSkeleton,
  TextSkeleton,
  AvatarSkeleton,
  ButtonSkeleton,
  PageSkeleton,
  DataTableSkeleton,
  DashboardSkeleton,
  PriceCardSkeleton,
  ProtocolCardSkeleton,
} from './skeleton';

// Enhanced Skeletons - 增强版骨架屏（保留实际使用的）
export {
  SkeletonContainer,
  TableSkeleton,
  LoadingSpinner,
  LoadingOverlay,
} from './EnhancedSkeleton';

// Enhanced Empty States - 增强版空状态（直接从common导入）
export {
  EnhancedEmptyState,
  EmptySearchState,
  EmptyDataState,
  EmptySecurityState,
  EmptyAnomalyState,
  EmptyAlertsState,
  EmptyWatchlistState,
  EmptyErrorState,
  EmptyConnectionState,
  EmptyDashboardState,
  EmptyProtocolsState,
  EmptyPriceDataState,
  EmptyEventsState,
  EmptyFirstItemState,
} from '@/components/common/EmptyState';

// 响应式组件
export { ResponsiveContainer, Show, Hide } from './ResponsiveContainer';

// Refresh Indicator
export { RefreshIndicator } from './RefreshIndicator';
