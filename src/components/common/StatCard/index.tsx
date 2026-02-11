/**
 * StatCard Components - Unified Export
 *
 * 统计卡片组件统一导出
 * - 原有 StatCard 组件
 * - 新增 EnhancedStatCard 组件
 */

// 原有组件导出
export {
  StatCard,
  StatCardSkeleton,
  StatCardGroup,
} from './StatCard';

export type {
  StatCardProps,
  StatCardColor,
  StatCardVariant,
} from './StatCard';

// 新增增强组件导出
export {
  EnhancedStatCard,
  StatCardGroup as EnhancedStatCardGroup,
  DashboardStatsSection,
} from './EnhancedStatCard';

export type {
  EnhancedStatCardProps,
  StatCardVariant as EnhancedStatCardVariant,
  StatCardSize,
  StatCardStatus,
  TrendData,
  SparklineData,
  StatCardAction,
} from './EnhancedStatCard';
