'use client';

import { memo } from 'react';

import { cn } from '@/shared/utils';

export interface CompactListItem {
  label: string;
  value?: string;
  time?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  status?: 'default' | 'success' | 'warning' | 'error';
}

export interface CompactListProps {
  title?: string;
  icon?: React.ReactNode;
  items: CompactListItem[];
  maxItems?: number;
  className?: string;
  showBorder?: boolean;
}

const statusColors = {
  default: 'text-foreground',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
};

export const CompactList = memo(function CompactList({
  title,
  icon,
  items,
  maxItems,
  className,
  showBorder = true,
}: CompactListProps) {
  const displayItems = maxItems ? items.slice(0, maxItems) : items;

  return (
    <div
      className={cn(showBorder && 'rounded-xl border border-border/50 bg-card/30 p-4', className)}
    >
      {title && (
        <div className="mb-3 flex items-center gap-2">
          {icon && <span className="text-primary">{icon}</span>}
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
      )}
      <div className="space-y-2">
        {displayItems.map((item, index) => (
          <div
            key={index}
            onClick={item.onClick}
            className={cn(
              'flex items-center justify-between rounded-lg px-3 py-2 transition-colors',
              item.onClick && 'cursor-pointer hover:bg-muted/50',
            )}
          >
            <div className="flex items-center gap-2">
              {item.icon && (
                <span
                  className={cn('text-muted-foreground', statusColors[item.status || 'default'])}
                >
                  {item.icon}
                </span>
              )}
              <span className={cn('text-sm', statusColors[item.status || 'default'])}>
                {item.label}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {item.value && (
                <span className="text-sm font-medium text-foreground">{item.value}</span>
              )}
              {item.time && <span className="text-xs text-muted-foreground">{item.time}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export interface DualColumnListProps {
  leftTitle?: string;
  leftIcon?: React.ReactNode;
  leftItems: CompactListItem[];
  rightTitle?: string;
  rightIcon?: React.ReactNode;
  rightItems: CompactListItem[];
  className?: string;
}

export const DualColumnList = memo(function DualColumnList({
  leftTitle,
  leftIcon,
  leftItems,
  rightTitle,
  rightIcon,
  rightItems,
  className,
}: DualColumnListProps) {
  return (
    <div className={cn('rounded-xl border border-border/50 bg-card/30 p-4', className)}>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          {leftTitle && (
            <div className="mb-3 flex items-center gap-2">
              {leftIcon && <span className="text-primary">{leftIcon}</span>}
              <h3 className="text-sm font-semibold text-foreground">{leftTitle}</h3>
            </div>
          )}
          <div className="space-y-2">
            {leftItems.slice(0, 5).map((item, index) => (
              <div
                key={index}
                onClick={item.onClick}
                className={cn(
                  'flex items-center justify-between rounded-lg px-3 py-2 transition-colors',
                  item.onClick && 'cursor-pointer hover:bg-muted/50',
                )}
              >
                <span className={cn('text-sm', statusColors[item.status || 'default'])}>
                  {item.label}
                </span>
                {item.time && <span className="text-xs text-muted-foreground">{item.time}</span>}
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-border/30 pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0">
          {rightTitle && (
            <div className="mb-3 flex items-center gap-2">
              {rightIcon && <span className="text-primary">{rightIcon}</span>}
              <h3 className="text-sm font-semibold text-foreground">{rightTitle}</h3>
            </div>
          )}
          <div className="space-y-2">
            {rightItems.slice(0, 5).map((item, index) => (
              <div
                key={index}
                onClick={item.onClick}
                className={cn(
                  'flex items-center justify-between rounded-lg px-3 py-2 transition-colors',
                  item.onClick && 'cursor-pointer hover:bg-muted/50',
                )}
              >
                <span className={cn('text-sm', statusColors[item.status || 'default'])}>
                  {item.label}
                </span>
                {item.time && <span className="text-xs text-muted-foreground">{item.time}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

export default CompactList;
