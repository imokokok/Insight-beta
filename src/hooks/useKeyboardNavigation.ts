/**
 * ============================================================================
 * Keyboard Navigation Hook
 * ============================================================================
 *
 * 提供完整的键盘导航功能：
 * - 焦点管理
 * - 快捷键绑定
 * - 导航历史
 * - 无障碍支持
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';

// ============================================================================
// Types
// ============================================================================

export type NavigationDirection = 'up' | 'down' | 'left' | 'right' | 'home' | 'end';

export type KeyBinding = {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  handler: (e: KeyboardEvent) => void;
  description?: string;
  scope?: string;
};

export interface KeyboardNavigationOptions {
  /** 是否启用箭头键导航 */
  enableArrowKeys?: boolean;
  /** 是否启用 Home/End 键 */
  enableHomeEndKeys?: boolean;
  /** 是否启用 Enter/Space 激活 */
  enableActivation?: boolean;
  /** 是否启用 Escape 关闭 */
  enableEscape?: boolean;
  /** 是否启用 Tab 导航 */
  enableTab?: boolean;
  /** 是否循环导航 */
  loop?: boolean;
  /** 垂直或水平布局 */
  orientation?: 'vertical' | 'horizontal' | 'both';
  /** 初始焦点索引 */
  initialIndex?: number;
  /** 子元素选择器 */
  itemSelector?: string;
  /** 容器 Ref */
  containerRef?: React.RefObject<HTMLElement | null>;
}

export interface KeyboardNavigationReturn {
  /** 当前焦点索引 */
  focusedIndex: number;
  /** 设置焦点索引 */
  setFocusedIndex: (index: number) => void;
  /** 焦点元素 Ref */
  focusedElementRef: React.RefObject<HTMLElement | null>;
  /** 导航处理器 */
  handlers: {
    onKeyDown: (e: React.KeyboardEvent) => void;
    onFocus: (e: React.FocusEvent) => void;
    onBlur: (e: React.FocusEvent) => void;
  };
  /** 导航方法 */
  navigate: (direction: NavigationDirection) => void;
  /** 激活当前项 */
  activate: () => void;
  /** 重置焦点 */
  reset: () => void;
  /** 获取所有可聚焦元素 */
  getFocusableElements: () => HTMLElement[];
}

// ============================================================================
// Hook
// ============================================================================

const defaultOptions: Omit<Required<KeyboardNavigationOptions>, 'containerRef'> & {
  containerRef: React.RefObject<HTMLElement | null>;
} = {
  enableArrowKeys: true,
  enableHomeEndKeys: true,
  enableActivation: true,
  enableEscape: true,
  enableTab: true,
  loop: true,
  orientation: 'vertical',
  initialIndex: -1,
  itemSelector: '[data-nav-item]',
  containerRef: { current: null },
};

export function useKeyboardNavigation(
  options: KeyboardNavigationOptions = {},
): KeyboardNavigationReturn {
  const opts = { ...defaultOptions, ...options };

  const [focusedIndex, setFocusedIndex] = useState(opts.initialIndex);
  const focusedElementRef = useRef<HTMLElement | null>(null);
  const fallbackRef = useRef<HTMLElement | null>(null);
  const containerRef = opts.containerRef || fallbackRef;
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 获取所有可导航的元素
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    return Array.from(containerRef.current.querySelectorAll(opts.itemSelector)) as HTMLElement[];
  }, [containerRef, opts.itemSelector]);

  // 导航到指定索引
  const navigateToIndex = useCallback(
    (index: number) => {
      const elements = getFocusableElements();
      if (elements.length === 0) return;

      let newIndex = index;
      if (opts.loop) {
        newIndex = ((index % elements.length) + elements.length) % elements.length;
      } else {
        newIndex = Math.max(0, Math.min(index, elements.length - 1));
      }

      setFocusedIndex(newIndex);
      elements[newIndex]?.focus();
      focusedElementRef.current = elements[newIndex] ?? null;
    },
    [getFocusableElements, opts.loop],
  );

  // 方向导航
  const navigate = useCallback(
    (direction: NavigationDirection) => {
      const elements = getFocusableElements();
      if (elements.length === 0) return;

      let newIndex = focusedIndex;

      switch (direction) {
        case 'up':
        case 'left':
          newIndex = focusedIndex - 1;
          break;
        case 'down':
        case 'right':
          newIndex = focusedIndex + 1;
          break;
        case 'home':
          newIndex = 0;
          break;
        case 'end':
          newIndex = elements.length - 1;
          break;
      }

      navigateToIndex(newIndex);
    },
    [focusedIndex, getFocusableElements, navigateToIndex],
  );

  // 激活当前项
  const activate = useCallback(() => {
    const elements = getFocusableElements();
    const element = elements[focusedIndex];
    if (element) {
      element.click();
    }
  }, [focusedIndex, getFocusableElements]);

  // 重置焦点
  const reset = useCallback(() => {
    setFocusedIndex(opts.initialIndex);
    focusedElementRef.current = null;
  }, [opts.initialIndex]);

  // 键盘事件处理
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const { key } = e;

      // Tab 导航
      if (key === 'Tab' && !opts.enableTab) {
        e.preventDefault();
        return;
      }

      // Escape 关闭
      if (key === 'Escape' && opts.enableEscape) {
        reset();
        return;
      }

      // 激活
      if ((key === 'Enter' || key === ' ') && opts.enableActivation) {
        e.preventDefault();
        activate();
        return;
      }

      // 箭头键导航
      if (opts.enableArrowKeys) {
        const isVertical = opts.orientation === 'vertical' || opts.orientation === 'both';
        const isHorizontal = opts.orientation === 'horizontal' || opts.orientation === 'both';

        if (key === 'ArrowUp' && isVertical) {
          e.preventDefault();
          navigate('up');
          return;
        }
        if (key === 'ArrowDown' && isVertical) {
          e.preventDefault();
          navigate('down');
          return;
        }
        if (key === 'ArrowLeft' && isHorizontal) {
          e.preventDefault();
          navigate('left');
          return;
        }
        if (key === 'ArrowRight' && isHorizontal) {
          e.preventDefault();
          navigate('right');
          return;
        }
      }

      // Home/End 键
      if (opts.enableHomeEndKeys) {
        if (key === 'Home') {
          e.preventDefault();
          navigate('home');
          return;
        }
        if (key === 'End') {
          e.preventDefault();
          navigate('end');
          return;
        }
      }
    },
    [activate, navigate, opts, reset],
  );

  // 焦点事件处理
  const handleFocus = useCallback(
    (e: React.FocusEvent) => {
      const elements = getFocusableElements();
      const index = elements.indexOf(e.target as HTMLElement);
      if (index !== -1) {
        setFocusedIndex(index);
        focusedElementRef.current = e.target as HTMLElement;
      }
    },
    [getFocusableElements],
  );

  const handleBlur = useCallback(
    (_e: React.FocusEvent) => {
      // 延迟检查，确保不是移动到容器内的其他元素
      blurTimeoutRef.current = setTimeout(() => {
        if (!containerRef.current?.contains(document.activeElement)) {
          setFocusedIndex(-1);
        }
      }, 0);
    },
    [containerRef],
  );

  // 清理定时器
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  return {
    focusedIndex,
    setFocusedIndex: navigateToIndex,
    focusedElementRef,
    handlers: {
      onKeyDown: handleKeyDown,
      onFocus: handleFocus,
      onBlur: handleBlur,
    },
    navigate,
    activate,
    reset,
    getFocusableElements,
  };
}

// ============================================================================
// 全局快捷键 Hook
// ============================================================================

export interface UseGlobalShortcutsOptions {
  /** 快捷键绑定 */
  bindings: KeyBinding[];
  /** 是否启用 */
  enabled?: boolean;
  /** 阻止默认行为的键 */
  preventDefaultKeys?: string[];
}

export function useGlobalShortcuts(options: UseGlobalShortcutsOptions) {
  const { bindings, enabled = true, preventDefaultKeys = [] } = options;

  const bindingsRef = useRef(bindings);
  bindingsRef.current = bindings;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 忽略在输入框中的键盘事件
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const { key, ctrlKey, altKey, shiftKey, metaKey } = e;

      // 检查是否有匹配的绑定
      const matchedBinding = bindingsRef.current.find((binding) => {
        return (
          binding.key.toLowerCase() === key.toLowerCase() &&
          !!binding.ctrl === ctrlKey &&
          !!binding.alt === altKey &&
          !!binding.shift === shiftKey &&
          !!binding.meta === metaKey
        );
      });

      if (matchedBinding) {
        if (preventDefaultKeys.includes(key)) {
          e.preventDefault();
        }
        matchedBinding.handler(e);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, preventDefaultKeys]);

  // 获取快捷键帮助信息
  const getShortcutsHelp = useMemo(() => {
    return bindings.map((binding) => ({
      shortcut: [
        binding.ctrl && 'Ctrl',
        binding.alt && 'Alt',
        binding.shift && 'Shift',
        binding.meta && 'Cmd',
        binding.key,
      ]
        .filter(Boolean)
        .join('+'),
      description: binding.description || '',
      scope: binding.scope || 'global',
    }));
  }, [bindings]);

  return { getShortcutsHelp };
}

// ============================================================================
// 焦点陷阱 Hook (用于 Modal/Dialog)
// ============================================================================

export interface UseFocusTrapOptions {
  /** 是否激活 */
  isActive: boolean;
  /** 容器 Ref */
  containerRef: React.RefObject<HTMLElement | null>;
  /** 初始焦点元素选择器 */
  initialFocusSelector?: string;
  /** 返回焦点元素 */
  returnFocusElement?: HTMLElement | null;
}

export function useFocusTrap(options: UseFocusTrapOptions) {
  const { isActive, containerRef, initialFocusSelector, returnFocusElement } = options;
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    // 保存之前的焦点元素
    previousActiveElement.current = document.activeElement as HTMLElement;

    // 设置初始焦点
    if (containerRef.current) {
      const initialFocus = initialFocusSelector
        ? (containerRef.current.querySelector(initialFocusSelector) as HTMLElement)
        : (containerRef.current.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          ) as HTMLElement);

      initialFocus?.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const container = containerRef.current;
      if (!container) return;

      const focusableElements = Array.from(
        container.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ) as HTMLElement[];

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement && lastElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement && firstElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // 恢复之前的焦点
      if (returnFocusElement) {
        returnFocusElement.focus();
      } else if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isActive, containerRef, initialFocusSelector, returnFocusElement]);
}
