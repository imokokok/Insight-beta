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
      return <ArrowUpDown className="ml-1 h-4 w-4 opacity-40 transition-opacity duration-150" />;
    }
    return direction === 'asc' ? (
      <ArrowUp className="ml-1 h-4 w-4 rotate-0 transition-transform duration-200" />
    ) : (
      <ArrowDown className="ml-1 h-4 w-4 rotate-0 transition-transform duration-200" />
    );
  };

  return (
    <TableHead
      className={cn(
        'cursor-pointer select-none transition-colors duration-150',
        'hover:bg-muted/50',
        isActive && 'bg-muted/30 font-semibold text-foreground',
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
