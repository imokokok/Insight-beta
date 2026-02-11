/**
 * Animated Container Component
 *
 * 动画容器组件
 * - 页面加载动画
 * - 列表项依次进入动画
 * - 悬停效果
 */

import React, { memo } from 'react';

import { cn } from '@/lib/utils';

interface AnimatedContainerProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
}

/**
 * 页面加载动画容器
 */
export const AnimatedContainer = memo(function AnimatedContainer({
  children,
  className,
  delay = 0,
  direction = 'up',
}: AnimatedContainerProps) {
  const directionClasses = {
    up: 'animate-in fade-in slide-in-from-bottom-4',
    down: 'animate-in fade-in slide-in-from-top-4',
    left: 'animate-in fade-in slide-in-from-right-4',
    right: 'animate-in fade-in slide-in-from-left-4',
  };

  return (
    <div
      className={cn(directionClasses[direction], 'fill-mode-forwards duration-500', className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
});

// Note: StaggerContainerProps interface reserved for future use
// interface StaggerContainerProps {
//   children: React.ReactNode;
//   className?: string;
//   staggerDelay?: number;
// }

// ============================================================================
// Stagger Container - 列表项依次进入动画容器
// ============================================================================

interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}

export const StaggerContainer = memo(function StaggerContainer({
  children,
  className,
}: StaggerContainerProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {children}
    </div>
  );
});

// ============================================================================
// Hover Card - 悬停效果卡片
// ============================================================================

interface HoverCardProps {
  children: React.ReactNode;
  hoverScale?: boolean;
  hoverShadow?: boolean;
  hoverBorder?: boolean;
  className?: string;
}

export const HoverCard = memo(function HoverCard({
  children,
  hoverScale = false,
  hoverShadow = true,
  hoverBorder = false,
  className,
}: HoverCardProps) {
  return (
    <div
      className={cn(
        'transition-all duration-200',
        hoverScale && 'hover:scale-[1.02]',
        hoverShadow && 'hover:shadow-md',
        hoverBorder && 'hover:border-gray-300',
        className
      )}
    >
      {children}
    </div>
  );
});


