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

const SSR_DEFAULT_WIDTH = 1024;
const SSR_DEFAULT_HEIGHT = 768;

function getInitialViewportState(): ViewportState {
  if (typeof window === 'undefined') {
    return {
      width: SSR_DEFAULT_WIDTH,
      height: SSR_DEFAULT_HEIGHT,
      visualHeight: SSR_DEFAULT_HEIGHT,
      isKeyboardOpen: false,
      isWalletPopupOpen: false,
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const visualHeight = window.visualViewport?.height || height;

  return {
    width,
    height,
    visualHeight,
    isKeyboardOpen: false,
    isWalletPopupOpen: false,
  };
}

/**
 * Viewport 管理 Hook
 * 处理移动端键盘弹出、钱包弹窗等场景下的视口变化
 */
export function useViewport(options: ViewportOptions = {}) {
  const [state, setState] = useState<ViewportState>(getInitialViewportState);

  const prevVisualHeightRef = useRef(0);
  const stableHeightRef = useRef(0);
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafIdRef = useRef<number>(0);

  const updateViewport = useCallback(() => {
    if (typeof window === 'undefined') return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const visualHeight = window.visualViewport?.height || height;
    const heightDiff = height - visualHeight;
    const isKeyboardOpen = heightDiff > 150 && width < 768;
    const isWalletPopupOpen = detectWalletPopup(height, visualHeight, isKeyboardOpen);

    setState((prev) => {
      const newState = {
        width,
        height,
        visualHeight,
        isKeyboardOpen,
        isWalletPopupOpen,
      };

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

  function detectWalletPopup(
    windowHeight: number,
    visualHeight: number,
    isKeyboardOpen: boolean,
  ): boolean {
    if (isKeyboardOpen) return false;

    const fixedElements = document.querySelectorAll('[data-wallet-detect]');
    if (fixedElements.length > 0) {
      const visibleFixed = Array.from(fixedElements).filter(
        (el) => (el as HTMLElement).offsetParent !== null,
      );
      if (visibleFixed.length < fixedElements.length) {
        return true;
      }
    }

    const heightDiff = Math.abs(windowHeight - visualHeight);
    const isHeightChanged = heightDiff > 50 && heightDiff < 300;
    const isDocumentHidden = document.hidden;

    return isHeightChanged || isDocumentHidden;
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;

    updateViewport();
    stableHeightRef.current = window.innerHeight;

    const handleResize = () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }

      checkTimeoutRef.current = setTimeout(() => {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = requestAnimationFrame(updateViewport);
      }, 100);
    };

    const handleVisualViewportChange = () => {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(updateViewport);
    };

    const handleVisibilityChange = () => {
      updateViewport();

      if (!document.hidden) {
        setTimeout(updateViewport, 100);
      }
    };

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
      cancelAnimationFrame(rafIdRef.current);
    };
  }, [updateViewport]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    root.style.setProperty('--viewport-width', `${state.width}px`);
    root.style.setProperty('--viewport-height', `${state.height}px`);
    root.style.setProperty('--visual-height', `${state.visualHeight}px`);
    root.style.setProperty('--keyboard-height', `${state.height - state.visualHeight}px`);
    root.style.setProperty('--vh', `${state.visualHeight * 0.01}px`);
  }, [state.width, state.height, state.visualHeight]);

  return state;
}
