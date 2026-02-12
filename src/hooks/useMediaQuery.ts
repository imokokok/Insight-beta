'use client';

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';

/**
 * 媒体查询 Hook - 用于响应式设计
 *
 * @example
 * const isMobile = useMediaQuery('(max-width: 768px)');
 * const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
 * const isDesktop = useMediaQuery('(min-width: 1025px)');
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);

    // 初始检查
    setMatches(media.matches);

    // 监听变化
    const listener = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    media.addEventListener('change', listener);

    return () => {
      media.removeEventListener('change', listener);
    };
  }, [query]);

  return matches;
}

/**
 * 预设的断点 Hook - 与 Tailwind 配置保持一致
 */

// md: 768px
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}

// lg: 1024px
export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
}

// xl: 1280px
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}

/**
 * 视口尺寸 Hook
 */
export function useViewportSize(): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateSize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return size;
}

// 设备类型
export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'large';

/**
 * 大屏幕检测 Hook (xl: 1280px+)
 */
export function useIsLargeScreen(): boolean {
  return useMediaQuery('(min-width: 1280px)');
}

/**
 * 获取设备类型
 */
export function useDeviceType(): DeviceType {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isLarge = useIsLargeScreen();

  if (isMobile) return 'mobile';
  if (isTablet) return 'tablet';
  if (isLarge) return 'large';
  return 'desktop';
}

/**
 * 移动端手势 Hook
 */
interface SwipeState {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface SwipeCallbacks {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
}

export function useSwipe(elementRef: React.RefObject<HTMLElement | null>, callbacks: SwipeCallbacks) {
  const [swipeState, setSwipeState] = useState<SwipeState>({
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
  });

  const { onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold = 50 } = callbacks;

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    
    setSwipeState(prev => ({
      ...prev,
      startX: touch.clientX,
      startY: touch.clientY,
    }));
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    setSwipeState(prev => {
      const touch = e.changedTouches[0];
      if (!touch) return prev;
      
      const endX = touch.clientX;
      const endY = touch.clientY;
      
      const diffX = endX - prev.startX;
      const diffY = endY - prev.startY;

      // 水平滑动
      if (Math.abs(diffX) > Math.abs(diffY)) {
        if (Math.abs(diffX) > threshold) {
          if (diffX > 0) {
            onSwipeRight?.();
          } else {
            onSwipeLeft?.();
          }
        }
      } else {
        // 垂直滑动
        if (Math.abs(diffY) > threshold) {
          if (diffY > 0) {
            onSwipeDown?.();
          } else {
            onSwipeUp?.();
          }
        }
      }

      return { ...prev, endX, endY };
    });
  }, [threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [elementRef, handleTouchStart, handleTouchEnd]);

  return swipeState;
}
