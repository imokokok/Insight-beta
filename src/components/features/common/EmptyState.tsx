'use client';

import type { ReactNode } from 'react';
import { Inbox, Search, AlertCircle, Box } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type EmptyStateVariant = 'default' | 'search' | 'error' | 'data';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  variant?: EmptyStateVariant;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const variantConfig: Record<
  EmptyStateVariant,
  {
    icon: ReactNode;
    defaultTitle: string;
    defaultDescription: string;
  }
> = {
  default: {
    icon: <Inbox className="h-12 w-12" />,
    defaultTitle: 'No items found',
    defaultDescription: 'There are no items to display at the moment.',
  },
  search: {
    icon: <Search className="h-12 w-12" />,
    defaultTitle: 'No results found',
    defaultDescription: 'Try adjusting your search or filters to find what you are looking for.',
  },
  error: {
    icon: <AlertCircle className="h-12 w-12" />,
    defaultTitle: 'Something went wrong',
    defaultDescription: 'An error occurred while loading the data. Please try again.',
  },
  data: {
    icon: <Box className="h-12 w-12" />,
    defaultTitle: 'No data available',
    defaultDescription: 'There is no data available for the selected criteria.',
  },
};

export function EmptyState({
  title,
  description,
  icon,
  variant = 'default',
  action,
  className,
}: EmptyStateProps) {
  const config = variantConfig[variant];

  return (
    <div
      className={cn('flex flex-col items-center justify-center px-4 py-12 text-center', className)}
    >
      <div className="text-muted-foreground/50 mb-4">{icon || config.icon}</div>
      <h3 className="text-foreground mb-2 text-lg font-semibold">{title || config.defaultTitle}</h3>
      <p className="text-muted-foreground mb-6 max-w-sm text-sm">
        {description || config.defaultDescription}
      </p>
      {action && (
        <Button onClick={action.onClick} variant="outline">
          {action.label}
        </Button>
      )}
    </div>
  );
}

// 预定义的空状态
export function EmptySearchState({
  searchTerm,
  onClear,
}: {
  searchTerm: string;
  onClear: () => void;
}) {
  return (
    <EmptyState
      variant="search"
      title={`No results for "${searchTerm}"`}
      description="Try adjusting your search terms or filters."
      action={{ label: 'Clear search', onClick: onClear }}
    />
  );
}

export function EmptyDataState({
  message = 'No data available',
  onRefresh,
}: {
  message?: string;
  onRefresh?: () => void;
}) {
  return (
    <EmptyState
      variant="data"
      title={message}
      action={onRefresh ? { label: 'Refresh', onClick: onRefresh } : undefined}
    />
  );
}

export function ErrorState({ error, onRetry }: { error?: string; onRetry: () => void }) {
  return (
    <EmptyState
      variant="error"
      title="Error loading data"
      description={error || 'An unexpected error occurred.'}
      action={{ label: 'Try again', onClick: onRetry }}
    />
  );
}
