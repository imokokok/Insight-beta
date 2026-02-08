'use client';

import type { ReactNode } from 'react';

import { RefreshCw, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { DataFreshnessIndicator } from './DataFreshnessIndicator';

export type RefreshStatus = 'idle' | 'loading' | 'success' | 'error';

interface RefreshableCardProps {
  title: string;
  children: ReactNode;
  lastUpdated: Date | null;
  status: RefreshStatus;
  onRefresh?: () => void;
  className?: string;
  headerClassName?: string;
  showRefreshButton?: boolean;
  error?: Error | null;
}

export function RefreshableCard({
  title,
  children,
  lastUpdated,
  status,
  onRefresh,
  className,
  headerClassName,
  showRefreshButton = true,
  error,
}: RefreshableCardProps) {
  const isLoading = status === 'loading';
  const isError = status === 'error';

  return (
    <Card className={cn('relative', className)}>
      <CardHeader
        className={cn('flex flex-row items-center justify-between pb-2', headerClassName)}
      >
        <CardTitle className="text-lg">{title}</CardTitle>
        <div className="flex items-center gap-2">
          <DataFreshnessIndicator lastUpdated={lastUpdated} />
          {showRefreshButton && onRefresh && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isError && error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>Failed to load: {error.message}</span>
          </div>
        )}
        {children}
      </CardContent>
    </Card>
  );
}
