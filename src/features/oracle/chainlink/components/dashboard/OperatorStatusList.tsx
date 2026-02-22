import * as React from 'react';

import { cn } from '@/shared/utils';

import { StatusIndicator } from './StatusIndicator';

export interface OperatorStatusListProps {
  operators: Array<{
    name: string;
    online: boolean;
    reliabilityScore: number;
  }>;
  maxVisible?: number;
  onViewAll?: () => void;
  loading?: boolean;
}

function getReliabilityColor(score: number): string {
  if (score >= 95) return 'text-[#22C55E]';
  if (score >= 80) return 'text-[#F59E0B]';
  return 'text-[#EF4444]';
}

function getReliabilityBg(score: number): string {
  if (score >= 95) return 'bg-[#22C55E]/10';
  if (score >= 80) return 'bg-[#F59E0B]/10';
  return 'bg-[#EF4444]/10';
}

function OperatorStatusItem({
  name,
  online,
  reliabilityScore,
}: {
  name: string;
  online: boolean;
  reliabilityScore: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <StatusIndicator status={online ? 'healthy' : 'critical'} size="sm" pulse={online} />
        <span className="truncate text-sm font-medium text-foreground">{name}</span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'rounded px-1.5 py-0.5 font-mono text-xs font-medium',
            getReliabilityBg(reliabilityScore),
            getReliabilityColor(reliabilityScore),
          )}
        >
          {reliabilityScore.toFixed(1)}%
        </span>
        <span
          className={cn(
            'rounded px-1.5 py-0.5 text-xs',
            online ? 'bg-[#22C55E]/10 text-[#22C55E]' : 'bg-[#EF4444]/10 text-[#EF4444]',
          )}
        >
          {online ? '在线' : '离线'}
        </span>
      </div>
    </div>
  );
}

function OperatorStatusSkeleton() {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 animate-pulse rounded-full bg-muted/50" />
        <div className="h-4 w-24 animate-pulse rounded bg-muted/30" />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-5 w-12 animate-pulse rounded bg-muted/30" />
        <div className="h-5 w-10 animate-pulse rounded bg-muted/30" />
      </div>
    </div>
  );
}

const OperatorStatusList = React.memo(function OperatorStatusList({
  operators,
  maxVisible = 5,
  onViewAll,
  loading = false,
}: OperatorStatusListProps) {
  const visibleOperators = operators.slice(0, maxVisible);
  const hasMore = operators.length > maxVisible;
  const onlineCount = operators.filter((op) => op.online).length;

  return (
    <div className="rounded border border-border/30 bg-card/60 p-3 backdrop-blur-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">节点运营商</h3>
        <span className="text-xs text-muted-foreground">
          {onlineCount}/{operators.length} 在线
        </span>
      </div>

      <div className="divide-y divide-border/20">
        {loading
          ? Array.from({ length: maxVisible }).map((_, i) => <OperatorStatusSkeleton key={i} />)
          : visibleOperators.map((operator, index) => (
              <OperatorStatusItem
                key={`${operator.name}-${index}`}
                name={operator.name}
                online={operator.online}
                reliabilityScore={operator.reliabilityScore}
              />
            ))}
      </div>

      {hasMore && onViewAll && (
        <button
          onClick={onViewAll}
          className={cn(
            'mt-2 w-full rounded py-1.5 text-xs font-medium text-muted-foreground',
            'hover:bg-muted/20 hover:text-foreground',
            'transition-colors duration-200',
          )}
        >
          查看全部 ({operators.length - maxVisible} 个更多)
        </button>
      )}
    </div>
  );
});

OperatorStatusList.displayName = 'OperatorStatusList';

export { OperatorStatusList };
