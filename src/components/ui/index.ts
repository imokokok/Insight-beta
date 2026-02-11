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
  InteractiveStatCard,
  ExpandableCard,
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

// 响应式组件
export { ResponsiveContainer, Show, Hide } from './ResponsiveContainer';

// 响应式表格
export { ResponsiveTable, type Column as ResponsiveTableColumn } from './ResponsiveTable';

// 移动端优化组件
export {
  MobileTable,
  DataCard,
  ListItem,
} from './MobileTable';

export {
  MobileInput,
  MobileSearchInput,
  MobileSelect,
  MobileTagInput,
  MobileSlider,
  MobileSwitch,
  FormSection,
  FormActions,
} from './MobileForm';
