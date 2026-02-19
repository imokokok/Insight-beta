/**
 * Design System Exports - 统一导出所有设计系统相关的内容
 *
 * 这个文件作为单一入口点，统一导出：
 * - 颜色常量
 * - 状态类型
 * - 设计令牌
 *
 * 使用方式：
 * import { StatusType, STATUS_COLORS, STATUS_THEME_COLORS } from '@/lib/design-system';
 */

// 颜色令牌 - 从 design-system/tokens/colors 导出
export {
  SEMANTIC_COLORS,
  BRAND_COLORS,
  NEUTRAL_COLORS,
  STATUS_COLORS,
  COMPONENT_COLORS,
  PROTOCOL_COLORS,
  CHAIN_COLORS,
  CHART_COLORS,
  MONITOR_STATUS_COLORS,
  SEVERITY_COLORS,
  RISK_COLORS,
  STATUS_THEME_COLORS,
  HEALTH_COLORS,
  type SemanticColor,
  type BrandColor,
  type StatusColor,
  type ComponentColor,
  type ProtocolColor,
  type ChainColor,
  type MonitorStatus,
  type SeverityColor,
  type RiskColor,
  type StatusThemeColor,
  type HealthColor,
  getStatusColor,
  getProtocolColor,
  getSeverityColor,
  getRiskColor,
  getHealthColor,
} from './tokens/colors';

// 状态类型 - 从 types/common/status 导出
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
  StatusType,
  AlertSeverity,
} from '../../types/common/status';

// 响应式设计
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

// 布局
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
