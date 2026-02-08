'use client';

import type { ReactNode, ComponentType } from 'react';
import { memo, useMemo, useCallback } from 'react';

import { cn } from '@/lib/utils';

// 优化的列表项组件
interface OptimizedListItemProps {
  id: string | number;
  children: ReactNode;
  className?: string;
  onClick?: (id: string | number) => void;
  isSelected?: boolean;
}

export const OptimizedListItem = memo(function OptimizedListItem({
  id,
  children,
  className,
  onClick,
  isSelected,
}: OptimizedListItemProps) {
  const handleClick = useCallback(() => {
    onClick?.(id);
  }, [id, onClick]);

  return (
    <div
      className={cn('transition-colors duration-150', isSelected && 'bg-primary/10', className)}
      onClick={handleClick}
    >
      {children}
    </div>
  );
});

// 优化的表格行组件
interface OptimizedTableRowProps<T> {
  data: T;
  columns: Array<{
    key: keyof T;
    render?: (value: T[keyof T], row: T) => ReactNode;
  }>;
  className?: string;
  onClick?: (data: T) => void;
}

export function OptimizedTableRow<T extends Record<string, unknown>>({
  data,
  columns,
  className,
  onClick,
}: OptimizedTableRowProps<T>) {
  const handleClick = useCallback(() => {
    onClick?.(data);
  }, [data, onClick]);

  const cells = useMemo(() => {
    return columns.map((column, index) => {
      const value = data[column.key];
      const content = column.render ? column.render(value, data) : String(value);
      return (
        <td key={index} className="px-4 py-3">
          {content}
        </td>
      );
    });
  }, [data, columns]);

  return (
    <tr
      className={cn(
        'hover:bg-muted/50 border-b transition-colors',
        onClick && 'cursor-pointer',
        className,
      )}
      onClick={handleClick}
    >
      {cells}
    </tr>
  );
}

// 记忆化的表格行
export const MemoizedTableRow = memo(OptimizedTableRow) as <T extends Record<string, unknown>>(
  props: OptimizedTableRowProps<T>,
) => React.JSX.Element;

// 优化的卡片组件
interface OptimizedCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  isInteractive?: boolean;
}

export const OptimizedCard = memo(function OptimizedCard({
  children,
  className,
  onClick,
  isInteractive,
}: OptimizedCardProps) {
  return (
    <div
      className={cn(
        'bg-card rounded-xl border p-6 shadow-sm',
        isInteractive && 'cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
});

// 优化的徽章组件
interface OptimizedBadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  className?: string;
}

export const OptimizedBadge = memo(function OptimizedBadge({
  children,
  variant = 'default',
  className,
}: OptimizedBadgeProps) {
  const variantClasses = useMemo(() => {
    const classes = {
      default: 'bg-primary/10 text-primary',
      success: 'bg-emerald-100 text-emerald-700',
      warning: 'bg-amber-100 text-amber-700',
      error: 'bg-rose-100 text-rose-700',
      info: 'bg-blue-100 text-blue-700',
    };
    return classes[variant];
  }, [variant]);

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClasses,
        className,
      )}
    >
      {children}
    </span>
  );
});

// 高阶组件：添加性能优化
export function withPerformanceTracking<P extends object>(
  Component: ComponentType<P>,
  componentName: string,
): ComponentType<P> {
  return memo(function PerformanceTrackedComponent(props: P) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${componentName} rendered`);
    }
    return <Component {...props} />;
  });
}

// 优化的选择器组件
interface OptimizedSelectProps<T> {
  options: T[];
  value: T;
  onChange: (value: T) => void;
  getLabel: (option: T) => string;
  getValue: (option: T) => string;
  className?: string;
}

export function OptimizedSelect<T>({
  options,
  value,
  onChange,
  getLabel,
  getValue,
  className,
}: OptimizedSelectProps<T>) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selected = options.find((opt) => getValue(opt) === e.target.value);
      if (selected) {
        onChange(selected);
      }
    },
    [options, onChange, getValue],
  );

  const optionElements = useMemo(() => {
    return options.map((option) => (
      <option key={getValue(option)} value={getValue(option)}>
        {getLabel(option)}
      </option>
    ));
  }, [options, getLabel, getValue]);

  return (
    <select
      value={getValue(value)}
      onChange={handleChange}
      className={cn(
        'border-input bg-background rounded-lg border px-3 py-2 text-sm',
        'focus:ring-ring focus:outline-none focus:ring-2',
        className,
      )}
    >
      {optionElements}
    </select>
  );
}

// 记忆化的选择器
export const MemoizedSelect = memo(OptimizedSelect) as <T>(
  props: OptimizedSelectProps<T>,
) => React.JSX.Element;

// 优化的分页组件
interface OptimizedPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const OptimizedPagination = memo(function OptimizedPagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: OptimizedPaginationProps) {
  const pages = useMemo(() => {
    const result: (number | string)[] = [];
    const delta = 2;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        result.push(i);
      } else if (result[result.length - 1] !== '...') {
        result.push('...');
      }
    }

    return result;
  }, [currentPage, totalPages]);

  const handlePageClick = useCallback(
    (page: number) => {
      if (page !== currentPage && page >= 1 && page <= totalPages) {
        onPageChange(page);
      }
    },
    [currentPage, totalPages, onPageChange],
  );

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <button
        onClick={() => handlePageClick(currentPage - 1)}
        disabled={currentPage === 1}
        className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50"
      >
        Previous
      </button>

      {pages.map((page, index) =>
        page === '...' ? (
          <span key={index} className="px-2">
            ...
          </span>
        ) : (
          <button
            key={page}
            onClick={() => handlePageClick(page as number)}
            className={cn(
              'rounded-lg px-3 py-1 text-sm',
              currentPage === page ? 'bg-primary text-primary-foreground' : 'hover:bg-muted border',
            )}
          >
            {page}
          </button>
        ),
      )}

      <button
        onClick={() => handlePageClick(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
});

// 优化的骨架屏组件
interface OptimizedSkeletonProps {
  className?: string;
  count?: number;
}

export const OptimizedSkeleton = memo(function OptimizedSkeleton({
  className,
  count = 1,
}: OptimizedSkeletonProps) {
  const skeletons = useMemo(() => {
    return Array.from({ length: count }, (_, i) => (
      <div key={i} className={cn('bg-muted animate-pulse rounded-lg', className)} />
    ));
  }, [count, className]);

  return <>{skeletons}</>;
});
