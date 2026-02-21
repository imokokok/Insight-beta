// Enhanced UI Components
// 统一的 UI 组件导出

// Buttons - 统一版（合并了 button 和 button-enhanced）
export { Button, buttonVariants, type ButtonProps } from './Button';

// Cards - 统一版（合并了 card 和 card-enhanced）
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardEnhanced } from './Card';

// Badges - 统一版
export { Badge, StatusBadge, badgeVariants, type BadgeProps, type StatusType } from './Badge';

// Checkbox
export { Checkbox, type CheckboxProps } from './Checkbox';

// Skeletons - 统一版
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
  SkeletonContainer,
  TableSkeleton,
  LoadingSpinner,
  LoadingOverlay,
  SkeletonList,
  AlertListSkeleton,
} from './Skeleton';

// Enhanced Empty States - 增强版空状态（直接从common导入）
export {
  EnhancedEmptyState,
  EmptySearchState,
  EmptyDataState,
  EmptySecurityState,
  EmptyAnomalyState,
  EmptyAlertsState,
  EmptyErrorState,
  EmptyConnectionState,
  EmptyDashboardState,
  EmptyProtocolsState,
  EmptyPriceDataState,
  EmptyEventsState,
  EmptyFirstItemState,
} from '@/components/common/EmptyState';

// Refresh Indicator
export { RefreshIndicator } from './RefreshIndicator';

// Alert
export { Alert, AlertTitle, AlertDescription } from './Alert';

// Dropdown Menu
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from './DropdownMenu';

// Input
export { Input, type InputProps } from './Input';

// Label
export { Label, type LabelProps } from './Label';

// Popover
export { Popover, PopoverTrigger, PopoverContent } from './Popover';

// Progress
export { Progress } from './Progress';

// Scroll Area
export { ScrollArea, ScrollBar } from './ScrollArea';

// Select
export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './Select';

// Separator
export { Separator } from './Separator';

// Switch
export { Switch } from './Switch';

// Table
export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './Table';

// Tabs
export { Tabs, TabsList, TabsTrigger, TabsContent, type TabsProps } from './Tabs';

// Toast
export { useToast, type Toast, type ToastType } from './Toast';

// Tooltip
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './Tooltip';

// Enhanced Input
export { EnhancedInput, type EnhancedInputProps } from './EnhancedInput';

// Error Banner
export { ErrorBanner } from './ErrorBanner';
export type { ErrorBannerProps } from './ErrorBanner';
