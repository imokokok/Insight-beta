/**
 * StatCard Components - Unified Export
 *
 * 统计卡片组件统一导出
 * - StatCard (原 EnhancedStatCard，功能更丰富)
 * - StatCardGroup
 * - DashboardStatsSection
 */

// 主组件导出 (功能最丰富的版本)
export {
  EnhancedStatCard as StatCard,
  EnhancedStatCard, // 向后兼容
  StatCardGroup,
  DashboardStatsSection,
} from './EnhancedStatCard';

// 基础版本组件 (功能较少)
export {
  StatCard as StatCardSimple,
  StatCardSkeleton,
  StatCardGroup as StatCardGroupSimple,
} from './StatCard';

// 类型导出
export type {
  EnhancedStatCardProps as StatCardProps, // 主组件类型
  StatCardVariant as StatCardVariant, // 统一使用增强版的变体
  StatCardSize,
  StatCardStatus,
  StatCardColor,
  TrendData,
  SparklineData,
  StatCardAction,
  EnhancedStatCardProps, // 向后兼容
} from './EnhancedStatCard';

// 基础版本类型 (仅用于简单版)

export type { StatCardVariant as StatCardVariantSimple } from './StatCard';
