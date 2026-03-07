/**
 * Responsive Components - Web Only Version
 *
 * 简化的响应式组件库 - 仅支持桌面端
 */

'use client';

import type { ReactNode } from 'react';

import { cn } from '@/shared/utils';

import { ResponsiveGrid } from './Layout';

// ============================================================================
// Types
// ============================================================================

interface ResponsiveProps {
  children: ReactNode;
  className?: string;
}

interface ResponsiveStackProps {
  children: ReactNode;
  className?: string;
  direction?: 'row' | 'column';
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
}

// ============================================================================
// Re-export ResponsiveGrid from Layout
// ============================================================================

export { ResponsiveGrid };

// ============================================================================
// Responsive Stack - 堆叠布局
// ============================================================================

export function ResponsiveStack({
  children,
  className,
  direction = 'row',
  gap = 'md',
  align = 'stretch',
  justify = 'start',
}: ResponsiveStackProps) {
  const gapClasses = {
    none: 'gap-0',
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  };

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  };

  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
  };

  return (
    <div
      className={cn(
        'flex',
        direction === 'column' ? 'flex-col' : 'flex-row',
        gapClasses[gap],
        alignClasses[align],
        justifyClasses[justify],
        className,
      )}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Responsive Table - 表格
// ============================================================================

interface ResponsiveTableProps {
  children: ReactNode;
  className?: string;
  scrollable?: boolean;
}

export function ResponsiveTable({ children, className, scrollable = true }: ResponsiveTableProps) {
  if (scrollable) {
    return (
      <div className="w-full overflow-x-auto">
        <table className={cn('w-full', className)}>{children}</table>
      </div>
    );
  }

  return <table className={cn('w-full', className)}>{children}</table>;
}

// ============================================================================
// Container - 容器
// ============================================================================

export function Container({ children, className }: ResponsiveProps) {
  return <div className={cn('container mx-auto px-4', className)}>{children}</div>;
}
