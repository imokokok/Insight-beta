// Enhanced UI Components
// 统一的 UI 组件导出

// Buttons - 统一版（合并了 button 和 button-enhanced）
export { Button, IconButton, ActionButtonGroup, buttonVariants, type ButtonProps } from './button';

// Cards - 统一版（合并了 card 和 card-enhanced）
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardEnhanced,
} from './card';

// Tooltips
export { TooltipEnhanced } from './tooltip-enhanced';

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

// Enhanced Skeletons - 增强版骨架屏
export {
  Skeleton as EnhancedSkeleton,
  SkeletonContainer,
  CardSkeleton as EnhancedCardSkeleton,
  StatCardSkeleton as EnhancedStatCardSkeleton,
  ChartSkeleton as EnhancedChartSkeleton,
  ListItemSkeleton as EnhancedListItemSkeleton,
  TableSkeleton,
  TextSkeleton as EnhancedTextSkeleton,
  AvatarSkeleton as EnhancedAvatarSkeleton,
  ButtonSkeleton as EnhancedButtonSkeleton,
  PageSkeleton as EnhancedPageSkeleton,
  DashboardSkeleton as EnhancedDashboardSkeleton,
  PriceCardSkeleton as EnhancedPriceCardSkeleton,
  ProtocolCardSkeleton as EnhancedProtocolCardSkeleton,
  LoadingSpinner,
  LoadingOverlay,
} from './enhanced-skeleton';

// Enhanced Empty States - 增强版空状态
export {
  EnhancedEmptyState,
  EmptySearchState,
  EmptyDataState,
  EmptySecurityState,
  EmptyAnomalyState,
  EmptyChartState,
  EmptyAlertsState,
  EmptyWatchlistState,
  EmptyErrorState,
  EmptyConnectionState,
  EmptyDashboardState,
  EmptyProtocolsState,
  EmptyPriceDataState,
  EmptyEventsState,
  EmptyFirstItemState,
} from './enhanced-empty-state';

// 响应式组件
export { ResponsiveContainer, Show, Hide } from './ResponsiveContainer';
