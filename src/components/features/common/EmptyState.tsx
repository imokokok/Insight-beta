/**
 * Empty State Component
 *
 * 空状态组件 - 用于无数据时展示
 */

import type { ReactNode } from 'react';

import { Search, ShieldCheck, Brain, BarChart3 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  children?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      {Icon && (
        <div className="mb-4 rounded-full bg-gray-100 p-4">
          <Icon className="h-12 w-12 text-gray-400" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-gray-500">{description}</p>}
      {children && <div className="mt-4">{children}</div>}
      {action && (
        <Button onClick={action.onClick} className="mt-4" variant="outline">
          {action.label}
        </Button>
      )}
    </div>
  );
}

// 预定义的空状态场景

export function EmptySearchState({
  searchTerm,
  onClear,
  className,
}: {
  searchTerm?: string;
  onClear?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={Search}
      title={searchTerm ? `No results for "${searchTerm}"` : 'No results found'}
      description="Try adjusting your search or filters to find what you're looking for."
      className={className}
      action={
        onClear
          ? {
              label: 'Clear filters',
              onClick: onClear,
            }
          : undefined
      }
    />
  );
}

export function EmptySecurityState({
  onRefresh,
  className,
}: {
  onRefresh?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={ShieldCheck}
      title="No Detections Found"
      description="Great news! No suspicious activities have been detected. The system is actively monitoring and will alert you immediately when threats are identified."
      className={className}
      action={
        onRefresh
          ? {
              label: 'Refresh',
              onClick: onRefresh,
            }
          : undefined
      }
    />
  );
}

export function EmptyAnomalyState({
  onRefresh,
  className,
}: {
  onRefresh?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={Brain}
      title="No Anomalies Detected"
      description="ML models are actively monitoring price feeds. When anomalies are detected, they will appear here with detailed analysis and confidence scores."
      className={className}
      action={
        onRefresh
          ? {
              label: 'Refresh',
              onClick: onRefresh,
            }
          : undefined
      }
    />
  );
}

export function EmptyDeviationState({
  onRefresh,
  className,
}: {
  onRefresh?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={BarChart3}
      title="No Deviation Data"
      description="Price deviation analysis will appear here once data is collected. This helps identify when different oracle protocols report significantly different prices."
      className={className}
      action={
        onRefresh
          ? {
              label: 'Refresh',
              onClick: onRefresh,
            }
          : undefined
      }
    />
  );
}

export function EmptyErrorState({
  error,
  onRetry,
  className,
}: {
  error?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={Search}
      title="Failed to load data"
      description={error || 'Something went wrong while loading the data. Please try again.'}
      className={className}
      action={
        onRetry
          ? {
              label: 'Try again',
              onClick: onRetry,
            }
          : undefined
      }
    />
  );
}
