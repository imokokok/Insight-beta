/**
 * Professional Dashboard Layout
 *
 * 企业级数据分析平台仪表板布局
 * - 响应式网格系统
 * - 专业数据展示
 * - 实时状态指示
 */

'use client';

import { cn } from '@/shared/utils';

// ============================================================================
// Types
// ============================================================================

interface DashboardSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

interface DashboardGridProps {
  children: React.ReactNode;
  className?: string;
  columns?: 1 | 2 | 3 | 4 | 6;
  gap?: 'sm' | 'md' | 'lg';
}

interface TimeRangeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  options?: { value: string; label: string }[];
  className?: string;
}

// ============================================================================
// Dashboard Section
// ============================================================================

export function DashboardSection({
  title,
  description,
  children,
  className,
  action,
}: DashboardSectionProps) {
  return (
    <section className={cn('mb-8', className)}>
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </section>
  );
}

// ============================================================================
// Dashboard Grid
// ============================================================================

export function DashboardGrid({
  children,
  className,
  columns = 4,
  gap = 'md',
}: DashboardGridProps) {
  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  };

  const gapClasses = {
    sm: 'gap-4',
    md: 'gap-6',
    lg: 'gap-8',
  };

  return (
    <div className={cn('grid', columnClasses[columns], gapClasses[gap], className)}>{children}</div>
  );
}

// ============================================================================
// Time Range Selector
// ============================================================================

export function TimeRangeSelector({
  value,
  onChange,
  options = [
    { value: '1h', label: '1H' },
    { value: '6h', label: '6H' },
    { value: '24h', label: '24H' },
    { value: '7d', label: '7D' },
    { value: '30d', label: '30D' },
  ],
  className,
}: TimeRangeSelectorProps) {
  return (
    <div className={cn('inline-flex rounded-lg border border-primary/10 bg-white p-1', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-all',
            value === option.value
              ? 'text-primary-dark bg-primary/10'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
