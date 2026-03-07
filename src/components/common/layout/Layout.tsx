/**
 * Layout Components
 *
 * 布局组件库
 * - 响应式容器
 * - 信息密度控制
 * - 网格布局
 * - 间距系统
 */

'use client';

import type { ReactNode } from 'react';
import React from 'react';

import { GRID_COLUMNS, GRID_GAPS, RESPONSIVE_PADDING } from '@/lib/design-system/tokens/layout';
import { cn } from '@/shared/utils';

// ============================================================================
// Container
// ============================================================================

interface ContainerProps {
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: boolean;
}

export function Container({ children, className, size = 'xl', padding = true }: ContainerProps) {
  const sizeClasses = {
    sm: 'max-w-[640px]',
    md: 'max-w-[768px]',
    lg: 'max-w-[1024px]',
    xl: 'max-w-[1280px]',
    '2xl': 'max-w-[1536px]',
    full: 'max-w-full',
  };

  return (
    <div
      className={cn(
        'mx-auto w-full',
        sizeClasses[size],
        padding && RESPONSIVE_PADDING.page,
        className,
      )}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Responsive Grid
// ============================================================================

interface ResponsiveGridProps {
  children: ReactNode;
  className?: string;
  columns?: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 12;
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  responsive?: boolean;
}

export function ResponsiveGrid({
  children,
  className,
  columns = 4,
  gap = 'lg',
  responsive = true,
}: ResponsiveGridProps) {
  return (
    <div
      className={cn(
        'grid',
        responsive ? GRID_COLUMNS[columns] : `grid-cols-${columns}`,
        GRID_GAPS[gap],
        className,
      )}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Stack (Vertical Layout)
// ============================================================================

interface StackProps {
  children: ReactNode;
  className?: string;
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
}

export function Stack({
  children,
  className,
  gap = 'md',
  align = 'stretch',
  justify = 'start',
}: StackProps) {
  const gapClasses = {
    none: 'gap-0',
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
    '2xl': 'gap-12',
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
    evenly: 'justify-evenly',
  };

  return (
    <div
      className={cn(
        'flex flex-col',
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
// Row (Horizontal Layout)
// ============================================================================

interface RowProps {
  children: ReactNode;
  className?: string;
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: boolean;
}

export function Row({
  children,
  className,
  gap = 'md',
  align = 'center',
  justify = 'start',
  wrap = false,
}: RowProps) {
  const gapClasses = {
    none: 'gap-0',
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
    '2xl': 'gap-12',
  };

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
    baseline: 'items-baseline',
  };

  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
    evenly: 'justify-evenly',
  };

  return (
    <div
      className={cn(
        'flex flex-row',
        gapClasses[gap],
        alignClasses[align],
        justifyClasses[justify],
        wrap && 'flex-wrap',
        className,
      )}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Sidebar Layout
// ============================================================================

interface SidebarLayoutProps {
  children: ReactNode;
  sidebar: ReactNode;
  className?: string;
  sidebarWidth?: string;
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  collapseBreakpoint?: 'sm' | 'md' | 'lg' | 'xl';
}

export function SidebarLayout({
  children,
  sidebar,
  className,
  sidebarWidth = '280px',
  gap = 'lg',
  collapseBreakpoint = 'lg',
}: SidebarLayoutProps) {
  const gapClasses = {
    none: 'gap-0',
    xs: 'gap-2',
    sm: 'gap-4',
    md: 'gap-6',
    lg: 'gap-8',
    xl: 'gap-12',
  };

  const collapseClasses = {
    sm: 'sm:grid-cols-[280px_1fr]',
    md: 'md:grid-cols-[280px_1fr]',
    lg: 'lg:grid-cols-[280px_1fr]',
    xl: 'xl:grid-cols-[280px_1fr]',
  };

  return (
    <div
      className={cn(
        'grid grid-cols-1',
        gapClasses[gap],
        collapseClasses[collapseBreakpoint],
        className,
      )}
      style={{ '--sidebar-width': sidebarWidth } as React.CSSProperties}
    >
      <aside className="order-2 lg:order-1">{sidebar}</aside>
      <main className="order-1 min-w-0 lg:order-2">{children}</main>
    </div>
  );
}

// ============================================================================
// Split Layout
// ============================================================================

interface SplitLayoutProps {
  children: ReactNode;
  secondary: ReactNode;
  className?: string;
  ratio?: '1:1' | '1:2' | '2:1' | '1:3' | '3:1';
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  direction?: 'horizontal' | 'vertical';
  responsive?: boolean;
}

export function SplitLayout({
  children,
  secondary,
  className,
  ratio = '1:1',
  gap = 'lg',
  direction = 'horizontal',
  responsive: _responsive = true,
}: SplitLayoutProps) {
  const ratioClasses = {
    '1:1': 'grid-cols-1 lg:grid-cols-2',
    '1:2': 'grid-cols-1 lg:grid-cols-[1fr_2fr]',
    '2:1': 'grid-cols-1 lg:grid-cols-[2fr_1fr]',
    '1:3': 'grid-cols-1 lg:grid-cols-[1fr_3fr]',
    '3:1': 'grid-cols-1 lg:grid-cols-[3fr_1fr]',
  };

  const gapClasses = {
    none: 'gap-0',
    xs: 'gap-2',
    sm: 'gap-4',
    md: 'gap-6',
    lg: 'gap-8',
    xl: 'gap-12',
  };

  return (
    <div
      className={cn(
        'grid',
        direction === 'horizontal' ? ratioClasses[ratio] : 'grid-rows-2',
        gapClasses[gap],
        className,
      )}
    >
      <div className="min-w-0">{children}</div>
      <div className="min-w-0">{secondary}</div>
    </div>
  );
}

// ============================================================================
// Page Layout
// ============================================================================

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
  header?: ReactNode;
  footer?: ReactNode;
  sidebar?: ReactNode;
  fullWidth?: boolean;
}

export function PageLayout({
  children,
  className,
  header,
  footer,
  sidebar,
  fullWidth = false,
}: PageLayoutProps) {
  return (
    <div className={cn('flex min-h-screen flex-col', className)}>
      {header && <header className="flex-shrink-0">{header}</header>}

      <div className="flex flex-1">
        {sidebar && <aside className="hidden w-64 flex-shrink-0 lg:block">{sidebar}</aside>}

        <main className={cn('flex-1', !fullWidth && 'container mx-auto', RESPONSIVE_PADDING.page)}>
          {children}
        </main>
      </div>

      {footer && <footer className="flex-shrink-0">{footer}</footer>}
    </div>
  );
}

// ============================================================================
// Dashboard Grid
// ============================================================================

interface DashboardGridProps {
  children: ReactNode;
  className?: string;
  columns?: 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
}

export function DashboardGrid({
  children,
  className,
  columns = 4,
  gap = 'md',
}: DashboardGridProps) {
  const columnClasses = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  };

  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
  };

  return (
    <div className={cn('grid', columnClasses[columns], gapClasses[gap], className)}>{children}</div>
  );
}

// ============================================================================
// Spacer
// ============================================================================

interface SpacerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  axis?: 'horizontal' | 'vertical';
  className?: string;
}

export function Spacer({ size = 'md', axis = 'vertical', className }: SpacerProps) {
  const sizeClasses = {
    xs: axis === 'vertical' ? 'h-1' : 'w-1',
    sm: axis === 'vertical' ? 'h-2' : 'w-2',
    md: axis === 'vertical' ? 'h-4' : 'w-4',
    lg: axis === 'vertical' ? 'h-6' : 'w-6',
    xl: axis === 'vertical' ? 'h-8' : 'w-8',
    '2xl': axis === 'vertical' ? 'h-12' : 'w-12',
  };

  return <div className={cn(sizeClasses[size], className)} />;
}

// ============================================================================
// Inset
// ============================================================================

interface InsetProps {
  children: ReactNode;
  className?: string;
  size?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export function Inset({ children, className, size = 'md' }: InsetProps) {
  const sizeClasses = {
    none: 'p-0',
    xs: 'p-2',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
  };

  return <div className={cn(sizeClasses[size], className)}>{children}</div>;
}
