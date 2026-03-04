'use client';

import type { ReactNode } from 'react';

import { GAP_CLASSES } from '@/lib/design-system/tokens/layout';
import { cn } from '@/shared/utils';

import { Container, ResponsiveGrid } from './Layout';

// ============================================================================
// Types
// ============================================================================

interface ResponsiveStackProps {
  children: ReactNode;
  className?: string;
  direction?: 'row' | 'column';
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
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
        GAP_CLASSES[gap],
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

export { Container };
