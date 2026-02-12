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
import React, { createContext, useContext } from 'react';

import type {
  Density} from '@/lib/design-system/tokens/layout';
import {
  DENSITY_CONFIG,
  GRID_COLUMNS,
  GRID_GAPS,
  RESPONSIVE_PADDING,
  getDensityConfig,
} from '@/lib/design-system/tokens/layout';
import { cn } from '@/shared/utils';

// ============================================================================
// Density Context
// ============================================================================

interface DensityContextType {
  density: Density;
  config: ReturnType<typeof getDensityConfig>;
}

const DensityContext = createContext<DensityContextType>({
  density: 'normal',
  config: DENSITY_CONFIG.normal,
});

export function useDensity() {
  return useContext(DensityContext);
}

interface DensityProviderProps {
  children: ReactNode;
  density?: Density;
}

export function DensityProvider({ children, density = 'normal' }: DensityProviderProps) {
  const config = getDensityConfig(density);

  return (
    <DensityContext.Provider value={{ density, config }}>
      {children}
    </DensityContext.Provider>
  );
}

// ============================================================================
// Container
// ============================================================================

interface ContainerProps {
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: boolean;
}

export function Container({
  children,
  className,
  size = 'xl',
  padding = true,
}: ContainerProps) {
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
        className
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
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Density Layout
// ============================================================================

interface DensityLayoutProps {
  children: ReactNode;
  className?: string;
  density?: Density;
}

export function DensityLayout({
  children,
  className,
  density = 'normal',
}: DensityLayoutProps) {
  const config = getDensityConfig(density);

  return (
    <DensityProvider density={density}>
      <div
        className={cn('density-layout', className)}
        style={{
          '--density-spacing-xs': config.spacing.xs,
          '--density-spacing-sm': config.spacing.sm,
          '--density-spacing-md': config.spacing.md,
          '--density-spacing-lg': config.spacing.lg,
          '--density-spacing-xl': config.spacing.xl,
          '--density-padding-card': config.padding.card,
          '--density-padding-section': config.padding.section,
          '--density-padding-page': config.padding.page,
          '--density-gap-card': config.gap.card,
          '--density-gap-section': config.gap.section,
          '--density-gap-grid': config.gap.grid,
          '--density-font-xs': config.fontSize.xs,
          '--density-font-sm': config.fontSize.sm,
          '--density-font-base': config.fontSize.base,
          '--density-font-lg': config.fontSize.lg,
          '--density-font-xl': config.fontSize.xl,
          '--density-line-tight': config.lineHeight.tight,
          '--density-line-normal': config.lineHeight.normal,
          '--density-line-relaxed': config.lineHeight.relaxed,
        } as React.CSSProperties}
      >
        {children}
      </div>
    </DensityProvider>
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
        className
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
        className
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
        className
      )}
      style={{ '--sidebar-width': sidebarWidth } as React.CSSProperties}
    >
      <aside className="order-2 lg:order-1">{sidebar}</aside>
      <main className="order-1 lg:order-2 min-w-0">{children}</main>
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
        className
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
    <div className={cn('min-h-screen flex flex-col', className)}>
      {header && <header className="flex-shrink-0">{header}</header>}

      <div className="flex-1 flex">
        {sidebar && (
          <aside className="hidden lg:block w-64 flex-shrink-0">{sidebar}</aside>
        )}

        <main
          className={cn(
            'flex-1',
            !fullWidth && 'container mx-auto',
            RESPONSIVE_PADDING.page
          )}
        >
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
    <div className={cn('grid', columnClasses[columns], gapClasses[gap], className)}>
      {children}
    </div>
  );
}

// ============================================================================
// Content Section
// ============================================================================

interface ContentSectionProps {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
  density?: Density;
}

export function ContentSection({
  children,
  className,
  title,
  description,
  actions,
  density = 'normal',
}: ContentSectionProps) {
  const config = getDensityConfig(density);

  return (
    <section
      className={cn('content-section', className)}
      style={{
        padding: config.padding.section,
        marginBottom: config.spacing.lg,
      }}
    >
      {(title || description || actions) && (
        <div
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4"
          style={{ marginBottom: config.spacing.md }}
        >
          <div>
            {title && (
              <h2
                className="font-semibold text-gray-900"
                style={{
                  fontSize: config.fontSize.lg,
                  lineHeight: config.lineHeight.tight,
                }}
              >
                {title}
              </h2>
            )}
            {description && (
              <p
                className="text-gray-500 mt-1"
                style={{
                  fontSize: config.fontSize.sm,
                  lineHeight: config.lineHeight.normal,
                }}
              >
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
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
