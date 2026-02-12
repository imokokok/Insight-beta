/**
 * Design System Exports - 统一导出所有设计系统相关的内容
 *
 * 这个文件作为单一入口点，统一导出：
 * - 颜色常量
 * - 状态类型
 * - 设计令牌
 *
 * 使用方式：
 * import { StatusType, statusColors, STATUS_THEME_COLORS } from '@/lib/design-system';
 */

export {
  themeColors,
  statCardColors,
  statusColors,
  trendColors,
  priorityColors,
} from '../constants/colors';
export type { ThemeColor, StatusType, PriorityLevel } from '../constants/colors';

export { colors } from '../utils/colors';
export type { ColorKeys } from '../utils/colors';

export {
  STATUS_COLORS,
  STATUS_THEME_COLORS,
  RISK_COLORS,
  SEVERITY_COLORS,
} from '../../types/common/status';
export type {
  EntityStatus,
  HealthStatus,
  SeverityLevel,
  AlertStatus,
  SyncStatus,
  RiskLevel,
  DisputeStatus,
  AssertionStatus,
  VotingStatus,
} from '../../types/common/status';

export {
  BREAKPOINTS,
  BREAKPOINT_DESCRIPTIONS,
  RESPONSIVE_RANGES,
  CONTAINER_SIZES,
  CONTAINER_BREAKPOINTS,
  RESPONSIVE_PATTERNS,
  TOUCH_MEDIA_QUERIES,
  MOTION_MEDIA_QUERIES,
  COLOR_SCHEME_MEDIA_QUERIES,
  PRINT_MEDIA_QUERIES,
  CONTRAST_MEDIA_QUERIES,
  type Breakpoint,
  type ResponsiveRange,
  getBreakpointValue,
  getCurrentBreakpoint,
  matchesBreakpoint,
  getResponsiveRange,
  createMediaQuery,
  getResponsiveGridCols,
  getResponsiveGap,
  getResponsivePadding,
  getResponsiveFontSize,
  type ResponsiveValue,
  resolveResponsiveValue,
  createContainerQuery,
  getContainerBreakpoint,
} from './tokens/responsive';

export {
  CONTAINER_WIDTHS,
  MAX_WIDTHS,
  GRID_COLUMNS,
  GRID_GAPS,
  DENSITY_CONFIG,
  CARD_SIZES,
  SECTION_SPACING,
  RESPONSIVE_PADDING,
  LAYOUT_PATTERNS,
  Z_INDEX,
  SAFE_AREA,
  ASPECT_RATIOS,
  type Density,
  getGridCols,
  getDensityConfig,
  getCardSize,
} from './tokens/layout';

export * from './tokens/spacing';
export * from './tokens/typography';
export * from './tokens/animation';
export * from './tokens/visualization';
