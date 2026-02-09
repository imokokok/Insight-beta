'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
  className?: string;
}

export function DashboardLayout({ children, className }: DashboardLayoutProps) {
  return (
    <div className={cn('min-h-screen bg-background', className)}>
      <div className="container mx-auto p-4 lg:p-6">
        {children}
      </div>
    </div>
  );
}

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
}

export function DashboardHeader({ title, subtitle, children, className }: DashboardHeaderProps) {
  return (
    <div className={cn('mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

interface DashboardGridProps {
  children: ReactNode;
  className?: string;
  columns?: 1 | 2 | 3 | 4 | 6;
}

export function DashboardGrid({ children, className, columns = 4 }: DashboardGridProps) {
  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  };

  return (
    <div className={cn('grid gap-4', columnClasses[columns], className)}>
      {children}
    </div>
  );
}

interface DashboardSectionProps {
  title?: string;
  children: ReactNode;
  className?: string;
  fullWidth?: boolean;
}

export function DashboardSection({ title, children, className, fullWidth }: DashboardSectionProps) {
  return (
    <section className={cn('space-y-4', fullWidth && 'lg:col-span-full', className)}>
      {title && <h2 className="text-lg font-semibold">{title}</h2>}
      {children}
    </section>
  );
}

interface DashboardCardProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function DashboardCard({ children, className, noPadding }: DashboardCardProps) {
  return (
    <div className={cn(
      'rounded-xl border bg-card text-card-foreground shadow-sm',
      !noPadding && 'p-6',
      className
    )}>
      {children}
    </div>
  );
}

interface DashboardStatsRowProps {
  children: ReactNode;
  className?: string;
}

export function DashboardStatsRow({ children, className }: DashboardStatsRowProps) {
  return (
    <div className={cn(
      'grid gap-4 grid-cols-2 lg:grid-cols-4',
      className
    )}>
      {children}
    </div>
  );
}

interface DashboardMainContentProps {
  children: ReactNode;
  className?: string;
  sidebar?: ReactNode;
}

export function DashboardMainContent({ children, className, sidebar }: DashboardMainContentProps) {
  return (
    <div className={cn(
      'grid gap-6',
      sidebar ? 'lg:grid-cols-3' : 'grid-cols-1',
      className
    )}>
      <div className={sidebar ? 'lg:col-span-2' : ''}>
        {children}
      </div>
      {sidebar && (
        <div className="space-y-6">
          {sidebar}
        </div>
      )}
    </div>
  );
}
