'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface ViewportState {
  width: number;
  height: number;
  visualHeight: number;
  isKeyboardOpen: boolean;
  isWalletPopupOpen: boolean;
}

interface ViewportOptions {
  onKeyboardOpen?: () => void;
  onKeyboardClose?: () => void;
  onWalletPopupOpen?: () => void;
  onWalletPopupClose?: () => void;
}

/**
 * Viewport 管理 Hook
 * 处理移动端键盘弹出、钱包弹窗等场景下的视口变化
 */
export function useViewport(options: ViewportOptions = {}) {
  const [state, setState] = useState<ViewportState>({
    width: 0,
    height: 0,
    visualHeight: 0,
    isKeyboardOpen: false,
    isWalletPopupOpen: false,
  });

  const prevVisualHeightRef = useRef(0);
  const stableHeightRef = useRef(0);
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateViewport = useCallback(() => {
    if (typeof window === 'undefined') return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // 使用 visualViewport API 获取可视区域高度（更精确）
    const visualHeight = window.visualViewport?.height || height;
    
    // 检测键盘是否打开（视觉高度明显小于窗口高度）
    const heightDiff = height - visualHeight;
    const isKeyboardOpen = heightDiff > 150 && width < 768; // 移动端且高度差大于150px
    
    // 检测钱包弹窗（通过高度变化和焦点变化综合判断）
    const isWalletPopupOpen = detectWalletPopup(height, visualHeight, isKeyboardOpen);

    setState((prev) => {
      const newState = {
        width,
        height,
        visualHeight,
        isKeyboardOpen,
        isWalletPopupOpen,
      };

      // 触发回调
      if (!prev.isKeyboardOpen && isKeyboardOpen) {
        options.onKeyboardOpen?.();
      } else if (prev.isKeyboardOpen && !isKeyboardOpen) {
        options.onKeyboardClose?.();
      }

      if (!prev.isWalletPopupOpen && isWalletPopupOpen) {
        options.onWalletPopupOpen?.();
      } else if (prev.isWalletPopupOpen && !isWalletPopupOpen) {
        options.onWalletPopupClose?.();
      }

      return newState;
    });

    prevVisualHeightRef.current = visualHeight;
  }, [options]);

  // 检测钱包弹窗的启发式算法
  function detectWalletPopup(
    windowHeight: number,
    visualHeight: number,
    isKeyboardOpen: boolean
  ): boolean {
    // 如果键盘已打开，不太可能是钱包弹窗
    if (isKeyboardOpen) return false;

    // 检测是否有固定元素被隐藏（某些钱包会隐藏固定定位元素）
    const fixedElements = document.querySelectorAll('[data-wallet-detect]');
    if (fixedElements.length > 0) {
      const visibleFixed = Array.from(fixedElements).filter(
        (el) => (el as HTMLElement).offsetParent !== null
      );
      if (visibleFixed.length < fixedElements.length) {
        return true;
      }
    }

    // 检测视口高度的突然变化（钱包弹窗通常会导致高度变化）
    const heightDiff = Math.abs(windowHeight - visualHeight);
    const isHeightChanged = heightDiff > 50 && heightDiff < 300;

    // 检测页面是否失去焦点（钱包弹窗通常会导致失焦）
    const isDocumentHidden = document.hidden;

    return isHeightChanged || isDocumentHidden;
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 初始化
    updateViewport();
    stableHeightRef.current = window.innerHeight;

    // 监听 resize 事件
    const handleResize = () => {
      // 防抖处理
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
      
      checkTimeoutRef.current = setTimeout(() => {
        updateViewport();
      }, 100);
    };

    // 监听 visualViewport 变化（更精确）
    const handleVisualViewportChange = () => {
      updateViewport();
    };

    // 监听页面可见性变化（检测钱包弹窗）
    const handleVisibilityChange = () => {
      updateViewport();
      
      // 页面重新可见时，强制更新
      if (!document.hidden) {
        setTimeout(updateViewport, 100);
      }
    };

    // 监听焦点变化（检测钱包弹窗）
    const handleFocus = () => {
      setTimeout(updateViewport, 100);
    };

    const handleBlur = () => {
      updateViewport();
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.visualViewport?.addEventListener('resize', handleVisualViewportChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('resize', handleVisualViewportChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, [updateViewport]);

  // 设置 CSS 变量供全局使用
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    root.style.setProperty('--viewport-width', `${state.width}px`);
    root.style.setProperty('--viewport-height', `${state.height}px`);
    root.style.setProperty('--visual-height', `${state.visualHeight}px`);
    root.style.setProperty('--keyboard-height', `${state.height - state.visualHeight}px`);
    
    // 设置 100vh 的替代方案（解决移动端 100vh 问题）
    root.style.setProperty('--vh', `${state.visualHeight * 0.01}px`);
  }, [state.width, state.height, state.visualHeight]);

  return state;
}

/**
 * 使用固定高度的 Hook
 * 解决移动端 100vh 问题
 */
export function useFixedHeight() {
  const [height, setHeight] = useState<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateHeight = () => {
      // 使用 visualViewport 高度或 window 高度
      const vh = window.visualViewport?.height || window.innerHeight;
      setHeight(vh);
      
      // 设置 CSS 变量
      document.documentElement.style.setProperty('--fixed-vh', `${vh}px`);
    };

    updateHeight();
    
    window.addEventListener('resize', updateHeight, { passive: true });
    window.visualViewport?.addEventListener('resize', updateHeight);

    return () => {
      window.removeEventListener('resize', updateHeight);
      window.visualViewport?.removeEventListener('resize', updateHeight);
    };
  }, []);

  return height;
}

/**
 * 检测软键盘状态的 Hook
 */
export function useKeyboardState() {
  const [isOpen, setIsOpen] = useState(false);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const windowHeight = window.innerHeight;
      const visualHeight = window.visualViewport?.height || windowHeight;
      const diff = windowHeight - visualHeight;
      
      // 键盘高度通常大于 150px
      const keyboardOpen = diff > 150;
      
      setIsOpen(keyboardOpen);
      setHeight(keyboardOpen ? diff : 0);
      
      // 设置 CSS 变量
      document.documentElement.style.setProperty('--keyboard-offset', `${diff}px`);
      document.documentElement.classList.toggle('keyboard-open', keyboardOpen);
    };

    handleResize();
    
    window.visualViewport?.addEventListener('resize', handleResize);
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return { isOpen, height };
}

/**
 * 移动端安全区域 Hook
 */
export function useSafeArea() {
  const [insets, setInsets] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateSafeArea = () => {
      // 使用 CSS env() 变量获取安全区域
      const styles = getComputedStyle(document.documentElement);
      
      setInsets({
        top: parseInt(styles.getPropertyValue('--sat') || '0', 10),
        right: parseInt(styles.getPropertyValue('--sar') || '0', 10),
        bottom: parseInt(styles.getPropertyValue('--sab') || '0', 10),
        left: parseInt(styles.getPropertyValue('--sal') || '0', 10),
      });
    };

    updateSafeArea();
    
    // 方向变化时更新
    window.addEventListener('orientationchange', updateSafeArea);
    
    return () => {
      window.removeEventListener('orientationchange', updateSafeArea);
    };
  }, []);

  return insets;
}

/**
 * 防止钱包弹窗导致页面滚动的 Hook
 */
export function usePreventWalletScroll() {
  const scrollPositionRef = useRef(0);

  const preventScroll = useCallback(() => {
    if (typeof document === 'undefined') return;
    
    // 保存当前滚动位置
    scrollPositionRef.current = window.scrollY;
    
    // 固定页面
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollPositionRef.current}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
  }, []);

  const restoreScroll = useCallback(() => {
    if (typeof document === 'undefined') return;
    
    // 恢复页面滚动
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    
    // 恢复滚动位置
    window.scrollTo(0, scrollPositionRef.current);
  }, []);

  return { preventScroll, restoreScroll };
}
