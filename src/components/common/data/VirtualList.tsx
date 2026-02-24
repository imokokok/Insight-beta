'use client';

import { useRef, useState, useEffect, useMemo } from 'react';

import { cn } from '@/shared/utils';

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  containerHeight: number;
  className?: string;
  overscan?: number;
  onEndReached?: () => void;
  endReachedThreshold?: number;
}

export function VirtualList<T>({
  items,
  renderItem,
  itemHeight,
  containerHeight,
  className,
  overscan = 5,
  onEndReached,
  endReachedThreshold = 200,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const totalHeight = items.length * itemHeight;

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight) + overscan * 2;
    const endIndex = Math.min(items.length, startIndex + visibleCount);

    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rafId: number;
    let lastScrollTop = 0;

    const handleScroll = () => {
      if (rafId) return;

      rafId = requestAnimationFrame(() => {
        const newScrollTop = container.scrollTop;
        if (newScrollTop !== lastScrollTop) {
          lastScrollTop = newScrollTop;
          setScrollTop(newScrollTop);

          if (onEndReached) {
            const remainingScroll = totalHeight - newScrollTop - containerHeight;
            if (remainingScroll < endReachedThreshold) {
              onEndReached();
            }
          }
        }
        rafId = 0;
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [totalHeight, containerHeight, endReachedThreshold, onEndReached]);

  const visibleItems = useMemo(() => {
    const { startIndex, endIndex } = visibleRange;
    return items.slice(startIndex, endIndex).map((item, index) => ({
      item,
      index: startIndex + index,
    }));
  }, [items, visibleRange]);

  const offsetY = visibleRange.startIndex * itemHeight;

  return (
    <div
      ref={containerRef}
      className={cn('overflow-auto', className)}
      style={{ height: containerHeight }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            top: offsetY,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map(({ item, index }) => (
            <div key={index} style={{ height: itemHeight }}>
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
