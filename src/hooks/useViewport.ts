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
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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


