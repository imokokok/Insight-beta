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

interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}

/**
 * 交错动画容器 - 子元素依次进入
 */
export const StaggerContainer = memo(function StaggerContainer({
  children,
  className,
  staggerDelay = 50,
}: StaggerContainerProps) {
  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <div
          className="animate-in fade-in slide-in-from-left-2 fill-mode-forwards duration-300"
          style={{ animationDelay: `${index * staggerDelay}ms` }}
        >
          {child}
        </div>
      ))}
    </div>
  );
});

interface HoverCardProps {
  children: React.ReactNode;
  className?: string;
  hoverScale?: boolean;
  hoverShadow?: boolean;
  hoverBorder?: boolean;
}

/**
 * 悬停效果卡片
 */
export const HoverCard = memo(function HoverCard({
  children,
  className,
  hoverScale = true,
  hoverShadow = true,
  hoverBorder = true,
}: HoverCardProps) {
  return (
    <div
      className={cn(
        'transition-all duration-300',
        hoverScale && 'hover:scale-[1.02]',
        hoverShadow && 'hover:shadow-lg',
        hoverBorder && 'hover:border-primary/50',
        className,
      )}
    >
      {children}
    </div>
  );
});

interface SlideInProps {
  children: React.ReactNode;
  className?: string;
  direction?: 'left' | 'right';
  show: boolean;
}

/**
 * 滑入滑出组件
 */
export const SlideIn = memo(function SlideIn({
  children,
  className,
  direction = 'right',
  show,
}: SlideInProps) {
  return (
    <div
      className={cn(
        'transition-all duration-300',
        show
          ? 'translate-x-0 opacity-100'
          : direction === 'right'
            ? 'translate-x-4 opacity-0'
            : '-translate-x-4 opacity-0',
        className,
      )}
    >
      {children}
    </div>
  );
});

interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

/**
 * 淡入组件
 */
export const FadeIn = memo(function FadeIn({ children, className, delay = 0 }: FadeInProps) {
  return (
    <div
      className={cn('animate-in fade-in fill-mode-forwards duration-500', className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
});
