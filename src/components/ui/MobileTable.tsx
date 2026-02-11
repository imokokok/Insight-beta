'use client';

import React, { useState } from 'react';

import { ChevronDown, ChevronUp, Filter, Search } from 'lucide-react';

import { useIsMobile } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

import { Button } from './button';
import { Input } from './input';

interface Column<T> {
  key: string;
  title: string;
  render?: (item: T) => React.ReactNode;
  width?: string;
  sortable?: boolean;
  hidden?: boolean | 'mobile' | 'desktop';
}

interface MobileTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  expandable?: boolean;
  renderExpanded?: (item: T) => React.ReactNode;
  className?: string;
  emptyText?: string;
  searchable?: boolean;
  searchKeys?: (keyof T)[];
  filterable?: boolean;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

/**
 * 移动端优化的表格组件
 * 在移动端显示为卡片列表，桌面端显示为表格
 */
export function MobileTable<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  expandable = false,
  renderExpanded,
  className,
  emptyText = '暂无数据',
  searchable = false,
  searchKeys,
  filterable = false,
  title,
  subtitle,
  action,
}: MobileTableProps<T>) {
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  // 过滤数据
  const filteredData = React.useMemo(() => {
    if (!searchQuery || !searchKeys) return data;

    return data.filter((item) =>
      searchKeys.some((key) => {
        const value = item[key];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(searchQuery.toLowerCase());
        }
        if (typeof value === 'number') {
          return value.toString().includes(searchQuery);
        }
        return false;
      })
    );
  }, [data, searchQuery, searchKeys]);

  // 排序数据
  const sortedData = React.useMemo(() => {
    if (!sortConfig) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = (a as Record<string, unknown>)[sortConfig.key];
      const bValue = (b as Record<string, unknown>)[sortConfig.key];

      // 处理 null/undefined 值
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      // 处理字符串比较
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }

      // 处理数字比较
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      }

      return 0;
    });
  }, [filteredData, sortConfig]);

  // 切换展开状态
  const toggleExpanded = (key: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // 处理排序
  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key, direction: 'asc' };
    });
  };

  // 获取可见列
  const visibleColumns = columns.filter((col) => {
    if (col.hidden === true) return false;
    if (col.hidden === 'mobile' && isMobile) return false;
    if (col.hidden === 'desktop' && !isMobile) return false;
    return true;
  });

  // 主要列（移动端显示）
  const primaryColumns = visibleColumns.slice(0, 2);
  const secondaryColumns = visibleColumns.slice(2);

  if (sortedData.length === 0) {
    return (
      <div className={cn('rounded-xl border border-gray-100 bg-white p-8 text-center', className)}>
        <p className="text-sm text-gray-500">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* 标题栏 */}
      {(title || subtitle || action || searchable || filterable) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title && <h3 className="text-base font-semibold text-gray-800">{title}</h3>}
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            {searchable && (
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="搜索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            )}
            {filterable && (
              <Button variant="outline" size="icon" className="shrink-0">
                <Filter className="h-4 w-4" />
              </Button>
            )}
            {action}
          </div>
        </div>
      )}

      {/* 移动端：卡片列表 */}
      {isMobile ? (
        <div className="space-y-3">
          {sortedData.map((item) => {
            const key = keyExtractor(item);
            const isExpanded = expandedRows.has(key);

            return (
              <div
                key={key}
                className={cn(
                  'rounded-xl border border-gray-100 bg-white p-4 transition-all',
                  onRowClick && 'cursor-pointer active:bg-gray-50',
                  isExpanded && 'ring-1 ring-purple-500'
                )}
                onClick={() => onRowClick?.(item)}
              >
                {/* 主要信息 */}
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    {primaryColumns.map((col) => (
                      <div key={col.key} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{col.title}</span>
                        <div className="flex-1 text-sm font-medium text-gray-800">
                          {col.render ? col.render(item) : (item as Record<string, unknown>)[col.key] as React.ReactNode}
                        </div>
                      </div>
                    ))}
                  </div>
                  {(expandable || secondaryColumns.length > 0) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpanded(key);
                      }}
                      className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </button>
                  )}
                </div>

                {/* 展开详情 */}
                {isExpanded && (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    {secondaryColumns.length > 0 && (
                      <div className="grid grid-cols-2 gap-3">
                        {secondaryColumns.map((col) => (
                          <div key={col.key}>
                            <span className="text-xs text-gray-400">{col.title}</span>
                            <div className="mt-0.5 text-sm text-gray-800">
                              {col.render ? col.render(item) : (item as Record<string, unknown>)[col.key] as React.ReactNode}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {renderExpanded && (
                      <div className="mt-3">{renderExpanded(item)}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* 桌面端：表格 */
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {visibleColumns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-left text-xs font-semibold text-gray-600',
                      col.sortable && 'cursor-pointer hover:bg-gray-100',
                      col.width
                    )}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.title}
                      {col.sortable && sortConfig?.key === col.key && (
                        <span className="text-purple-600">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
                {expandable && <th className="w-10 px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedData.map((item) => {
                const key = keyExtractor(item);
                const isExpanded = expandedRows.has(key);

                return (
                  <React.Fragment key={key}>
                    <tr
                      className={cn(
                        'bg-white transition-colors',
                        onRowClick && 'cursor-pointer hover:bg-gray-50'
                      )}
                      onClick={() => onRowClick?.(item)}
                    >
                      {visibleColumns.map((col) => (
                        <td key={col.key} className="px-4 py-3">
                          <div className="text-sm text-gray-800">
                            {col.render ? col.render(item) : (item as Record<string, unknown>)[col.key] as React.ReactNode}
                          </div>
                        </td>
                      ))}
                      {expandable && (
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpanded(key);
                            }}
                            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                      )}
                    </tr>
                    {isExpanded && renderExpanded && (
                      <tr>
                        <td
                          colSpan={visibleColumns.length + (expandable ? 1 : 0)}
                          className="bg-gray-50 px-4 py-4"
                        >
                          {renderExpanded(item)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 数据计数 */}
      <div className="text-right text-xs text-gray-400">
        共 {sortedData.length} 条记录
      </div>
    </div>
  );
}

/**
 * 移动端数据卡片
 * 用于简单的键值对展示
 */
interface DataCardProps {
  title?: React.ReactNode;
  subtitle?: string;
  data: { label: string; value: React.ReactNode; highlight?: boolean }[];
  action?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function DataCard({
  title,
  subtitle,
  data,
  action,
  onClick,
  className,
}: DataCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-100 bg-white p-4',
        onClick && 'cursor-pointer active:bg-gray-50',
        className
      )}
      onClick={onClick}
    >
      {(title || subtitle || action) && (
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {title && <div className="font-medium text-gray-800">{title}</div>}
            {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {data.map((item, index) => (
          <div key={index}>
            <div className="text-xs text-gray-400">{item.label}</div>
            <div
              className={cn(
                'mt-0.5 text-sm',
                item.highlight ? 'font-semibold text-purple-700' : 'text-gray-800'
              )}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 移动端列表项
 */
interface ListItemProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  value?: React.ReactNode;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function ListItem({
  icon,
  title,
  subtitle,
  value,
  badge,
  action,
  onClick,
  className,
}: ListItemProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3',
        onClick && 'cursor-pointer active:bg-gray-50',
        className
      )}
      onClick={onClick}
    >
      {icon && (
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-50">
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="truncate font-medium text-gray-800">{title}</div>
          {badge}
        </div>
        {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
      </div>
      {(value || action) && (
        <div className="flex flex-shrink-0 items-center gap-2">
          {value && <div className="text-sm font-medium text-gray-800">{value}</div>}
          {action}
        </div>
      )}
    </div>
  );
}
