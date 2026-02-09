/**
 * useViewMode Hook
 *
 * 管理普通/专业视图模式的状态
 * 支持全局设置和按页面设置
 */

'use client';

import { useCallback, useEffect, useState } from 'react';

import type { ViewMode } from '@/components/ui/view-mode-toggle';

const STORAGE_KEY_GLOBAL = 'oracle-monitor-view-mode';
const STORAGE_KEY_PREFIX = 'oracle-monitor-view-mode-';

interface UseViewModeOptions {
  /** 页面 ID，用于独立存储 */
  pageId?: string;
  /** 默认值 */
  defaultMode?: ViewMode;
}

interface UseViewModeReturn {
  /** 当前模式 */
  mode: ViewMode;
  /** 设置当前模式 */
  setMode: (mode: ViewMode) => void;
  /** 全局模式 */
  globalMode: ViewMode;
  /** 设置全局模式 */
  setGlobalMode: (mode: ViewMode) => void;
  /** 是否使用页面独立设置 */
  isPageSpecific: boolean;
  /** 切换是否使用页面独立设置 */
  setIsPageSpecific: (value: boolean) => void;
  /** 切换模式 */
  toggle: () => void;
}

/**
 * 视图模式管理 Hook
 *
 * @example
 * // 全局模式
 * const { mode, setMode } = useViewMode();
 *
 * // 页面独立模式
 * const { mode, setMode } = useViewMode({ pageId: 'alerts' });
 *
 * // 带默认值
 * const { mode, setMode } = useViewMode({ defaultMode: 'dense' });
 */
export function useViewMode(options: UseViewModeOptions = {}): UseViewModeReturn {
  const { pageId, defaultMode = 'normal' } = options;

  // 全局模式
  const [globalMode, setGlobalModeState] = useState<ViewMode>(defaultMode);

  // 页面独立模式
  const [pageMode, setPageModeState] = useState<ViewMode | null>(null);

  // 是否使用页面独立设置
  const [isPageSpecific, setIsPageSpecific] = useState(false);

  // 从 localStorage 读取初始值
  useEffect(() => {
    try {
      // 读取全局设置
      const storedGlobal = localStorage.getItem(STORAGE_KEY_GLOBAL);
      if (storedGlobal === 'normal' || storedGlobal === 'dense') {
        setGlobalModeState(storedGlobal);
      }

      // 如果有 pageId，读取页面独立设置
      if (pageId) {
        const storedPage = localStorage.getItem(`${STORAGE_KEY_PREFIX}${pageId}`);
        if (storedPage === 'normal' || storedPage === 'dense') {
          setPageModeState(storedPage);
          setIsPageSpecific(true);
        }
      }
    } catch {
      // localStorage 不可用，使用默认值
    }
  }, [pageId]);

  // 当前实际使用的模式
  const mode = isPageSpecific && pageMode !== null ? pageMode : globalMode;

  // 设置全局模式
  const setGlobalMode = useCallback((newMode: ViewMode) => {
    setGlobalModeState(newMode);
    try {
      localStorage.setItem(STORAGE_KEY_GLOBAL, newMode);
    } catch {
      // 忽略 localStorage 错误
    }
  }, []);

  // 设置页面模式
  const setMode = useCallback(
    (newMode: ViewMode) => {
      if (isPageSpecific && pageId) {
        setPageModeState(newMode);
        try {
          localStorage.setItem(`${STORAGE_KEY_PREFIX}${pageId}`, newMode);
        } catch {
          // 忽略 localStorage 错误
        }
      } else {
        setGlobalMode(newMode);
      }
    },
    [isPageSpecific, pageId, setGlobalMode],
  );

  // 切换是否使用页面独立设置
  const setIsPageSpecificValue = useCallback(
    (value: boolean) => {
      setIsPageSpecific(value);
      if (!value && pageId) {
        // 切换到全局模式时，清除页面独立设置
        try {
          localStorage.removeItem(`${STORAGE_KEY_PREFIX}${pageId}`);
        } catch {
          // 忽略 localStorage 错误
        }
        setPageModeState(null);
      }
    },
    [pageId],
  );

  // 切换模式
  const toggle = useCallback(() => {
    setMode(mode === 'normal' ? 'dense' : 'normal');
  }, [mode, setMode]);

  return {
    mode,
    setMode,
    globalMode,
    setGlobalMode,
    isPageSpecific,
    setIsPageSpecific: setIsPageSpecificValue,
    toggle,
  };
}

/**
 * 简化的视图模式 Hook
 * 只返回当前模式和设置方法
 */
export function useSimpleViewMode(
  pageId?: string,
  defaultMode: ViewMode = 'normal',
): [ViewMode, (mode: ViewMode) => void] {
  const { mode, setMode } = useViewMode({ pageId, defaultMode });
  return [mode, setMode];
}
