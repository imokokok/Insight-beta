'use client';

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

import { TableHead } from '@/components/ui';
import { cn } from '@/shared/utils';

export interface SortState {
  key: string;
  direction: 'asc' | 'desc';
}

export interface SortableTableHeaderProps {
  children: React.ReactNode;
  sortKey: string;
  currentSort: SortState | null;
  onSort: (key: string) => void;
  className?: string;
}

export function SortableTableHeader({
  children,
  sortKey,
  currentSort,
  onSort,
  className,
}: SortableTableHeaderProps) {
  const isActive = currentSort?.key === sortKey;
  const direction = isActive ? currentSort.direction : null;

  const SortIcon = () => {
    if (!isActive) {
      return <ArrowUpDown className="ml-1 h-4 w-4 opacity-40" />;
    }
    return direction === 'asc' ? (
      <ArrowUp className="ml-1 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-1 h-4 w-4" />
    );
  };

  return (
    <TableHead
      className={cn(
        'cursor-pointer select-none transition-colors hover:bg-muted/50',
        isActive && 'font-semibold text-foreground',
        className,
      )}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center">
        {children}
        <SortIcon />
      </div>
    </TableHead>
  );
}
