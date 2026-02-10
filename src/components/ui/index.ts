// Enhanced UI Components
// 统一的 UI 组件导出

// Buttons
export { ButtonEnhanced, buttonVariants, type ButtonProps } from './button-enhanced';

// Cards
export { CardEnhanced } from './card-enhanced';

// Tooltips
export { TooltipEnhanced } from './tooltip-enhanced';

// Badges - 统一版
export { Badge, StatusBadge, badgeVariants, type BadgeProps, type StatusType } from './badge';

// Skeletons
export {
  Skeleton,
  CardSkeleton,
  StatCardSkeleton,
  ChartSkeleton,
  PageSkeleton,
} from './skeleton-enhanced';

// Re-export original components
export { Button, buttonVariants as baseButtonVariants } from './button';
export { Card, CardHeader, CardTitle, CardDescription, CardContent } from './card';
