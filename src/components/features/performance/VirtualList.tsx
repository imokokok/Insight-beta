'use client';

import type { ReactNode, UIEvent } from 'react';
import { useState, useRef, useCallback, useMemo } from 'react';

import { cn } from '@/lib/utils';

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  itemHeight: number;
  overscan?: number;
  className?: string;
  containerHeight?: number | string;
  onScroll?: (scrollTop: number) => void;
  onEndReached?: () => void;
  endReachedThreshold?: number;
}

export function VirtualList<T>({
  items,
  renderItem,
  itemHeight,
  overscan = 5,
  className,
  containerHeight = '100%',
  onScroll,
  onEndReached,
  endReachedThreshold = 200,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeightValue, setContainerHeightValue] = useState(0);

  // 计算可见范围
  const { virtualItems, totalHeight } = useMemo(() => {
    const totalHeight = items.length * itemHeight;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeightValue / itemHeight) + overscan * 2;
    const endIndex = Math.min(items.length, startIndex + visibleCount);

    const virtualItems = items.slice(startIndex, endIndex).map((item, index) => ({
      item,
      index: startIndex + index,
      style: {
        position: 'absolute' as const,
        top: (startIndex + index) * itemHeight,
        height: itemHeight,
        left: 0,
        right: 0,
      },
    }));

    return { virtualItems, totalHeight };
  }, [items, itemHeight, scrollTop, containerHeightValue, overscan]);

  // 处理滚动事件
  const handleScroll = useCallback(
    (e: UIEvent<HTMLDivElement>) => {
      const newScrollTop = e.currentTarget.scrollTop;
      setScrollTop(newScrollTop);
      onScroll?.(newScrollTop);

      // 检查是否到达底部
      if (onEndReached) {
        const scrollHeight = e.currentTarget.scrollHeight;
        const clientHeight = e.currentTarget.clientHeight;
        const scrollBottom = scrollHeight - newScrollTop - clientHeight;

        if (scrollBottom < endReachedThreshold) {
          onEndReached();
        }
      }
    },
    [onScroll, onEndReached, endReachedThreshold],
  );

  // 测量容器高度
  const measureContainer = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      setContainerHeightValue(node.clientHeight);
      containerRef.current = node;
    }
  }, []);

  return (
    <div
      ref={measureContainer}
      className={cn('overflow-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {virtualItems.map(({ item, index, style }) => (
          <div key={index} style={style}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// 可变高度虚拟列表
interface VariableHeightVirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  getItemHeight: (item: T, index: number) => number;
  overscan?: number;
  className?: string;
  containerHeight?: number | string;
  onScroll?: (scrollTop: number) => void;
}

export function VariableHeightVirtualList<T>({
  items,
  renderItem,
  getItemHeight,
  overscan = 5,
  className,
  containerHeight = '100%',
  onScroll,
}: VariableHeightVirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeightValue, setContainerHeightValue] = useState(0);

  // 计算每个项目的偏移量和总高度
  const { virtualItems, totalHeight } = useMemo(() => {
    const itemMetadata: Array<{ index: number; offset: number; height: number }> = [];
    let totalHeight = 0;

    items.forEach((item, index) => {
      const height = getItemHeight(item, index);
      itemMetadata.push({ index, offset: totalHeight, height });
      totalHeight += height;
    });

    // 找到可见范围
    const startIndex = Math.max(
      0,
      itemMetadata.findIndex((meta) => meta.offset + meta.height > scrollTop) - overscan,
    );

    let endIndex = startIndex;
    let visibleHeight = 0;
    for (let i = startIndex; i < itemMetadata.length; i++) {
      const meta = itemMetadata[i];
      if (!meta) break;
      visibleHeight += meta.height;
      endIndex = i;
      if (visibleHeight > containerHeightValue + overscan * 100) break;
    }

    const virtualItems = itemMetadata
      .slice(startIndex, endIndex + 1)
      .map((meta) => {
        const item = items[meta.index];
        return item
          ? {
              item,
              index: meta.index,
              style: {
                position: 'absolute' as const,
                top: meta.offset,
                height: meta.height,
                left: 0,
                right: 0,
              },
            }
          : null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return { virtualItems, totalHeight };
  }, [items, getItemHeight, scrollTop, containerHeightValue, overscan]);

  const handleScroll = useCallback(
    (e: UIEvent<HTMLDivElement>) => {
      const newScrollTop = e.currentTarget.scrollTop;
      setScrollTop(newScrollTop);
      onScroll?.(newScrollTop);
    },
    [onScroll],
  );

  const measureContainer = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      setContainerHeightValue(node.clientHeight);
      containerRef.current = node;
    }
  }, []);

  return (
    <div
      ref={measureContainer}
      className={cn('overflow-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {virtualItems.map(({ item, index, style }) => (
          <div key={index} style={style}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// 虚拟表格
interface VirtualTableProps<T> {
  items: T[];
  columns: Array<{
    key: keyof T;
    title: string;
    width?: number;
    render?: (value: T[keyof T], row: T) => ReactNode;
  }>;
  rowHeight?: number;
  headerHeight?: number;
  overscan?: number;
  className?: string;
  containerHeight?: number | string;
  onRowClick?: (item: T, index: number) => void;
}

export function VirtualTable<T extends Record<string, unknown>>({
  items,
  columns,
  rowHeight = 48,
  headerHeight = 40,
  overscan = 5,
  className,
  containerHeight = '100%',
  onRowClick,
}: VirtualTableProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeightValue, setContainerHeightValue] = useState(0);

  const { virtualItems, totalHeight } = useMemo(() => {
    const totalHeight = items.length * rowHeight;
    const startIndex = Math.max(0, Math.floor((scrollTop - headerHeight) / rowHeight) - overscan);
    const visibleCount =
      Math.ceil((containerHeightValue - headerHeight) / rowHeight) + overscan * 2;
    const endIndex = Math.min(items.length, startIndex + visibleCount);

    const virtualItems = items.slice(startIndex, endIndex).map((item, index) => ({
      item,
      index: startIndex + index,
      style: {
        position: 'absolute' as const,
        top: headerHeight + (startIndex + index) * rowHeight,
        height: rowHeight,
        left: 0,
        right: 0,
      },
    }));

    return { virtualItems, totalHeight };
  }, [items, rowHeight, headerHeight, scrollTop, containerHeightValue, overscan]);

  const handleScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const measureContainer = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      setContainerHeightValue(node.clientHeight);
      containerRef.current = node;
    }
  }, []);

  return (
    <div
      ref={measureContainer}
      className={cn('overflow-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight + headerHeight, position: 'relative' }}>
        {/* Header */}
        <div
          className="bg-muted/50 sticky top-0 z-10 flex border-b font-medium"
          style={{ height: headerHeight }}
        >
          {columns.map((column) => (
            <div
              key={String(column.key)}
              className="flex items-center px-4"
              style={{ width: column.width, flex: column.width ? undefined : 1 }}
            >
              {column.title}
            </div>
          ))}
        </div>

        {/* Rows */}
        {virtualItems.map(({ item, index, style }) => (
          <div
            key={index}
            className={cn(
              'hover:bg-muted/30 flex border-b transition-colors',
              onRowClick && 'cursor-pointer',
            )}
            style={style}
            onClick={() => onRowClick?.(item, index)}
          >
            {columns.map((column) => {
              const value = item[column.key];
              const content = column.render ? column.render(value, item) : String(value);
              return (
                <div
                  key={String(column.key)}
                  className="flex items-center px-4"
                  style={{ width: column.width, flex: column.width ? undefined : 1 }}
                >
                  {content}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// 使用 react-virtuoso 的高级虚拟列表（如果已安装）
interface VirtuosoListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  containerHeight?: number | string;
  onEndReached?: () => void;
  overscan?: number;
}

// 这是一个包装组件，如果 react-virtuoso 已安装则使用它
export function VirtuosoList<T>({
  items,
  renderItem,
  className,
  containerHeight = '100%',
  onEndReached,
  overscan = 5,
}: VirtuosoListProps<T>) {
  // 检查 react-virtuoso 是否可用
  const [VirtuosoComponent, setVirtuosoComponent] = useState<React.ComponentType<{
    data: T[];
    itemContent: (index: number, item: T) => ReactNode;
    style: { height: number | string };
    className?: string;
    endReached?: () => void;
    overscan: number;
  }> | null>(null);

  // 动态导入 react-virtuoso

  const loadVirtuoso = useCallback(async () => {
    try {
      const { Virtuoso } = await import('react-virtuoso');
      setVirtuosoComponent(() => Virtuoso);
    } catch {
      // 如果 react-virtuoso 未安装，使用自定义实现
      setVirtuosoComponent(null);
    }
  }, []);

  // 只在客户端加载

  useMemo(() => {
    if (typeof window !== 'undefined') {
      loadVirtuoso();
    }
  }, [loadVirtuoso]);

  if (!VirtuosoComponent) {
    // 回退到自定义虚拟列表
    return (
      <VirtualList
        items={items}
        renderItem={renderItem}
        itemHeight={60}
        className={className}
        containerHeight={containerHeight}
        onEndReached={onEndReached}
        overscan={overscan}
      />
    );
  }

  return (
    <VirtuosoComponent
      data={items}
      itemContent={(index: number, item: T) => renderItem(item, index)}
      style={{ height: containerHeight }}
      className={className}
      endReached={onEndReached}
      overscan={overscan}
    />
  );
}
