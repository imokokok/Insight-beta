'use client';

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

// xs: 475px
export function useIsXs(): boolean {
  return useMediaQuery('(max-width: 474px)');
}

// sm: 640px
export function useIsSm(): boolean {
  return useMediaQuery('(max-width: 639px)');
}

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

// 2xl: 1536px
export function useIsLargeScreen(): boolean {
  return useMediaQuery('(min-width: 1280px)');
}

export function useIsXl(): boolean {
  return useMediaQuery('(min-width: 1280px)');
}

export function useIs2xl(): boolean {
  return useMediaQuery('(min-width: 1536px)');
}

/**
 * 获取当前设备类型
 */
export type DeviceType = 'xs' | 'sm' | 'mobile' | 'tablet' | 'desktop' | 'xl' | '2xl';

export function useDeviceType(): DeviceType {
  const isXs = useIsXs();
  const isSm = useIsSm();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isXl = useIsXl();
  const is2xl = useIs2xl();

  if (isXs) return 'xs';
  if (isSm) return 'sm';
  if (isMobile) return 'mobile';
  if (isTablet) return 'tablet';
  if (is2xl) return '2xl';
  if (isXl) return 'xl';
  return 'desktop';
}

/**
 * 屏幕方向 Hook
 */
export function useOrientation(): 'portrait' | 'landscape' {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  useEffect(() => {
    const updateOrientation = () => {
      setOrientation(
        window.matchMedia('(orientation: portrait)').matches ? 'portrait' : 'landscape'
      );
    };

    updateOrientation();

    const mediaQuery = window.matchMedia('(orientation: portrait)');
    mediaQuery.addEventListener('change', updateOrientation);

    return () => {
      mediaQuery.removeEventListener('change', updateOrientation);
    };
  }, []);

  return orientation;
}

/**
 * 触摸设备检测
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(
      'ontouchstart' in window || 
      navigator.maxTouchPoints > 0 ||
      // @ts-expect-error - msMaxTouchPoints is for IE
      navigator.msMaxTouchPoints > 0
    );
  }, []);

  return isTouch;
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

/**
 * 安全区域 Hook (用于刘海屏手机)
 */
export function useSafeAreaInsets(): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  const [insets, setInsets] = useState({ top: 0, right: 0, bottom: 0, left: 0 });

  useEffect(() => {
    // 检查是否支持 CSS env() 变量
    const checkSafeArea = () => {
      const styles = getComputedStyle(document.documentElement);
      const top = parseInt(styles.getPropertyValue('--sat') || '0', 10);
      const right = parseInt(styles.getPropertyValue('--sar') || '0', 10);
      const bottom = parseInt(styles.getPropertyValue('--sab') || '0', 10);
      const left = parseInt(styles.getPropertyValue('--sal') || '0', 10);
      
      setInsets({ top, right, bottom, left });
    };

    checkSafeArea();
  }, []);

  return insets;
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
