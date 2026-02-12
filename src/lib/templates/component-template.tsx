/**
 * Component Template - 组件文档注释模板
 *
 * 创建新组件时请复制此模板
 */

// ============================================================================
// 组件名称
// ============================================================================

/**
 * StatCard - 数据统计卡片
 *
 * ## 概述
 * 用于展示关键指标数据的卡片组件，支持趋势显示、图标、动画效果。
 *
 * ## 使用场景
 * - Dashboard 页面展示关键指标
 * - 数据列表中的统计摘要
 * - 实时数据监控
 *
 * ## 组件分类
 * - Category: Data Display
 * - 位置: `components/common/`
 *
 * ## 使用示例
 * ```tsx
 * import { StatCard } from '@/components/common';
 *
 * <StatCard
 *   title="Total Users"
 *   value="1,234"
 *   trend={{ direction: 'up', percentage: 12.5 }}
 *   icon={Users}
 * />
 * ```
 */

// ============================================================================
// Props 接口
// ============================================================================

import type { ReactNode } from 'react';

import type { LucideIcon } from 'lucide-react';

export interface ComponentNameProps {
  /** 卡片标题 */
  title: string;

  /** 卡片数值 */
  value: string | number;

  /** 趋势信息 */
  trend?: {
    /** 趋势方向 */
    direction: 'up' | 'down' | 'neutral';
    /** 变化百分比 */
    percentage?: number;
    /** 自定义趋势标签 */
    label?: string;
  };

  /** 图标 */
  icon?: LucideIcon;

  /** 组件变体 */
  variant?: 'default' | 'compact' | 'featured';

  /** 颜色主题 */
  color?: 'default' | 'primary' | 'success' | 'warning' | 'error';

  /** 点击事件 */
  onClick?: () => void;

  /** 加载状态 */
  isLoading?: boolean;

  /** 额外的 className */
  className?: string;

  /** 子元素 */
  children?: ReactNode;
}

// ============================================================================
// 相关组件
// ============================================================================

/**
 * 相关组件:
 * - `StatCardGroup` - 卡片分组容器
 * - `StatCardSkeleton` - 加载骨架屏
 * - `EnhancedStatCard` - 增强版卡片
 */
