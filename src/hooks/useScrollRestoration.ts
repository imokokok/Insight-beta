/**
 * Scroll Restoration Hook - 滚动恢复 Hook
 *
 * 用于在路由切换时恢复滚动位置
 * - 保存滚动位置
 * - 恢复滚动位置
 * - 支持锚点跳转
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';

import { usePathname } from 'next/navigation';

interface ScrollPosition {
  x: number;
  y: number;
  timestamp: number;
}

interface UseScrollRestorationOptions {
  /** 是否启用滚动恢复 */
  enabled?: boolean;
  /** 保存滚动位置的延迟（毫秒） */
  saveDelay?: number;
  /** 最大保存的滚动位置数量 */
  maxEntries?: number;
  /** 是否支持锚点跳转 */
  enableAnchorScroll?: boolean;
  /** 锚点跳转行为 */
  anchorScrollBehavior?: ScrollBehavior;
}

const STORAGE_KEY = 'scroll-positions';
const DEFAULT_OPTIONS: Required<UseScrollRestorationOptions> = {
  enabled: true,
  saveDelay: 100,
  maxEntries: 50,
  enableAnchorScroll: true,
  anchorScrollBehavior: 'smooth',
};

/**
 * 滚动恢复 Hook
 */
export function useScrollRestoration(options: UseScrollRestorationOptions = {}) {
  const { enabled, saveDelay, maxEntries, enableAnchorScroll, anchorScrollBehavior } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const pathname = usePathname();
  const scrollPositions = useRef<Map<string, ScrollPosition>>(new Map());
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isNavigatingBackRef = useRef(false);

  // 从 sessionStorage 加载保存的滚动位置
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const positions = JSON.parse(saved) as Record<string, ScrollPosition>;
        Object.entries(positions).forEach(([key, value]) => {
          scrollPositions.current.set(key, value);
        });
      }
    } catch {
      // 忽略解析错误
    }
  }, [enabled]);

  // 保存滚动位置到 sessionStorage
  const saveToStorage = useCallback(() => {
    if (typeof window === 'undefined') return;

    const positions: Record<string, ScrollPosition> = {};
    scrollPositions.current.forEach((value, key) => {
      positions[key] = value;
    });

    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
    } catch {
      // 存储空间不足时清理旧数据
      const entries = Array.from(scrollPositions.current.entries());
      if (entries.length > maxEntries) {
        // 保留最新的条目
        const sorted = entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
        scrollPositions.current = new Map(sorted.slice(0, maxEntries));
        saveToStorage();
      }
    }
  }, [maxEntries]);

  // 保存当前滚动位置
  const saveScrollPosition = useCallback(() => {
    if (!enabled || typeof window === 'undefined') return;

    const position: ScrollPosition = {
      x: window.scrollX,
      y: window.scrollY,
      timestamp: Date.now(),
    };

    scrollPositions.current.set(pathname, position);
    saveToStorage();
  }, [pathname, enabled, saveToStorage]);

  // 恢复滚动位置
  const restoreScrollPosition = useCallback(
    (path: string) => {
      if (!enabled || typeof window === 'undefined') return;

      const position = scrollPositions.current.get(path);
      if (position) {
        window.scrollTo({
          left: position.x,
          top: position.y,
          behavior: 'auto',
        });
      }
    },
    [enabled],
  );

  // 处理锚点跳转
  const scrollToAnchor = useCallback(
    (anchor: string) => {
      if (!enabled || !enableAnchorScroll || typeof window === 'undefined') return;

      const element = document.getElementById(anchor);
      if (element) {
        element.scrollIntoView({
          behavior: anchorScrollBehavior,
          block: 'start',
        });
        return true;
      }
      return false;
    },
    [enabled, enableAnchorScroll, anchorScrollBehavior],
  );

  // 监听滚动事件
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleScroll = () => {
      // 防抖保存
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        saveScrollPosition();
      }, saveDelay);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [enabled, saveDelay, saveScrollPosition]);

  // 监听路由变化
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // 检查是否有锚点
    const hash = window.location.hash.slice(1);
    if (hash && enableAnchorScroll) {
      // 延迟执行以确保 DOM 已渲染
      setTimeout(() => {
        scrollToAnchor(hash);
      }, 100);
      return;
    }

    // 恢复滚动位置
    if (isNavigatingBackRef.current) {
      restoreScrollPosition(pathname);
      isNavigatingBackRef.current = false;
    }

    // 保存当前路径的滚动位置
    return () => {
      saveScrollPosition();
    };
  }, [
    pathname,
    enabled,
    enableAnchorScroll,
    scrollToAnchor,
    restoreScrollPosition,
    saveScrollPosition,
  ]);

  // 监听浏览器后退/前进按钮
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handlePopState = () => {
      isNavigatingBackRef.current = true;
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [enabled]);

  // 页面卸载前保存
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleBeforeUnload = () => {
      saveScrollPosition();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [enabled, saveScrollPosition]);

  return {
    saveScrollPosition,
    restoreScrollPosition,
    scrollToAnchor,
    getSavedPosition: (path: string) => scrollPositions.current.get(path),
    clearSavedPositions: () => {
      scrollPositions.current.clear();
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    },
  };
}

/**
 * 平滑滚动到元素
 */
export function scrollToElement(
  elementId: string,
  options: {
    behavior?: ScrollBehavior;
    block?: ScrollLogicalPosition;
    inline?: ScrollLogicalPosition;
    offset?: number;
  } = {},
): boolean {
  const { behavior = 'smooth', offset = 0 } = options;

  if (typeof window === 'undefined') return false;

  const element = document.getElementById(elementId);
  if (!element) return false;

  const elementPosition = element.getBoundingClientRect().top + window.scrollY;
  const offsetPosition = elementPosition - offset;

  window.scrollTo({
    top: offsetPosition,
    behavior,
  });

  return true;
}

/**
 * 滚动到顶部
 */
export function scrollToTop(behavior: ScrollBehavior = 'smooth'): void {
  if (typeof window === 'undefined') return;

  window.scrollTo({
    top: 0,
    left: 0,
    behavior,
  });
}

/**
 * 滚动到底部
 */
export function scrollToBottom(behavior: ScrollBehavior = 'smooth'): void {
  if (typeof window === 'undefined') return;

  window.scrollTo({
    top: document.documentElement.scrollHeight,
    left: 0,
    behavior,
  });
}

/**
 * 检查元素是否在视口内
 */
export function isElementInViewport(element: Element, threshold: number = 0): boolean {
  if (typeof window === 'undefined') return false;

  const rect = element.getBoundingClientRect();
  const windowHeight = window.innerHeight || document.documentElement.clientHeight;
  const windowWidth = window.innerWidth || document.documentElement.clientWidth;

  return (
    rect.top >= -threshold &&
    rect.left >= 0 &&
    rect.bottom <= windowHeight + threshold &&
    rect.right <= windowWidth
  );
}

const scrollRestorationExports = {
  useScrollRestoration,
  scrollToElement,
  scrollToTop,
  scrollToBottom,
  isElementInViewport,
};

export default scrollRestorationExports;
