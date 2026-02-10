'use client';

import React from 'react';

import { useIsMobile } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

import { Card, CardContent } from './card';

/**
 * 响应式表格组件
 *
 * 桌面端显示表格，移动端自动转为卡片列表
 *
 * @example
 * <ResponsiveTable
 *   columns={[
 *     { key: 'name', title: '名称', width: '30%' },
 *     { key: 'status', title: '状态', render: (v) => <Badge>{v}</Badge> },
 *     { key: 'time', title: '时间' },
 *   ]}
 *   data={data}
 *   keyExtractor={(item) => item.id}
 * />
 */

export interface Column<T> {
  key: string;
  title: string;
  width?: string;
  render?: (value: unknown, record: T) => React.ReactNode;
  mobileRender?: (record: T) => React.ReactNode;
  hideOnMobile?: boolean;
}

interface ResponsiveTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  className?: string;
  emptyText?: string;
  loading?: boolean;
  onRowClick?: (record: T) => void;
  rowClassName?: string;
}

export function ResponsiveTable<T>({
  columns,
  data,
  keyExtractor,
  className,
  emptyText = '暂无数据',
  loading = false,
  onRowClick,
  rowClassName,
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();

  if (loading) {
    return <TableSkeleton columns={columns.length} isMobile={isMobile} />;
  }

  if (data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/50">
        <p className="text-sm text-gray-400">{emptyText}</p>
      </div>
    );
  }

  // 移动端：卡片列表
  if (isMobile) {
    return (
      <div className={cn('space-y-3', className)}>
        {data.map((record) => (
          <MobileCard
            key={keyExtractor(record)}
            record={record}
            columns={columns}
            onClick={() => onRowClick?.(record)}
          />
        ))}
      </div>
    );
  }

  // 桌面端：表格
  return (
    <div className={cn('overflow-x-auto rounded-lg border border-gray-200', className)}>
      <table className="w-full text-sm">
        <thead className="bg-gray-50/80">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left font-medium text-gray-600"
                style={{ width: col.width }}
              >
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((record) => (
            <tr
              key={keyExtractor(record)}
              className={cn(
                'bg-white transition-colors hover:bg-gray-50/50',
                onRowClick && 'cursor-pointer',
                rowClassName,
              )}
              onClick={() => onRowClick?.(record)}
            >
              {columns.map((col) => {
                const value = (record as Record<string, unknown>)[col.key];
                return (
                  <td key={col.key} className="px-4 py-3">
                    {col.render ? col.render(value, record) : String(value ?? '-')}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * 移动端卡片
 */
function MobileCard<T>({
  record,
  columns,
  onClick,
}: {
  record: T;
  columns: Column<T>[];
  onClick?: () => void;
}) {
  // 第一列作为主标题
  const primaryColumn = columns[0];
  const primaryValue = primaryColumn
    ? (record as Record<string, unknown>)[primaryColumn.key]
    : null;

  // 其余列作为详情
  const detailColumns = columns.slice(1).filter((col) => !col.hideOnMobile);

  return (
    <Card
      className={cn(
        'overflow-hidden transition-all hover:shadow-md',
        onClick && 'cursor-pointer active:scale-[0.98]',
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* 主标题区域 */}
        {primaryColumn && (
          <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-2">
            <span className="font-medium text-gray-900">
              {primaryColumn.render
                ? primaryColumn.render(primaryValue, record)
                : String(primaryValue ?? '-')}
            </span>
          </div>
        )}

        {/* 详情区域 */}
        <div className="space-y-2">
          {detailColumns.map((col) => {
            const value = (record as Record<string, unknown>)[col.key];
            return (
              <div key={col.key} className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{col.title}</span>
                <span className="font-medium text-gray-700">
                  {col.mobileRender
                    ? col.mobileRender(record)
                    : col.render
                      ? col.render(value, record)
                      : String(value ?? '-')}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 骨架屏
 */
function TableSkeleton({ columns, isMobile }: { columns: number; isMobile: boolean }) {
  if (isMobile) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-lg border border-gray-100 bg-white p-4">
            <div className="mb-3 h-5 w-1/3 animate-pulse rounded bg-gray-200" />
            <div className="space-y-2">
              {[...Array(columns - 1)].map((_, j) => (
                <div key={j} className="flex items-center justify-between">
                  <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
                  <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <div className="bg-gray-50/80 px-4 py-3">
        <div className="flex gap-4">
          {[...Array(columns)].map((_, i) => (
            <div key={i} className="h-4 flex-1 animate-pulse rounded bg-gray-200" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-gray-100 bg-white px-4 py-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-4 py-3">
            {[...Array(columns)].map((_, j) => (
              <div key={j} className="h-4 flex-1 animate-pulse rounded bg-gray-100" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
