/**
 * Responsive Components - Web Only Version
 *
 * 简化的响应式组件库 - 仅支持桌面端
 */

'use client';

import type { ReactNode } from 'react';

import { cn } from '@/shared/utils';

// ============================================================================
// Types
// ============================================================================

interface ResponsiveProps {
  children: ReactNode;
  className?: string;
}

interface ResponsiveGridProps {
  children: ReactNode;
  className?: string;
  columns?: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 12;
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
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
// Responsive Grid - 网格布局
// ============================================================================

export function ResponsiveGrid({
  children,
  className,
  columns = 4,
  gap = 'md',
}: ResponsiveGridProps) {
  const gridColsClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
    8: 'grid-cols-8',
    12: 'grid-cols-12',
  }[columns];

  const gapClass = {
    none: 'gap-0',
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
    '2xl': 'gap-12',
  }[gap];

  return <div className={cn('grid', gridColsClass, gapClass, className)}>{children}</div>;
}

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
