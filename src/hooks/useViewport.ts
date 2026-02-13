'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface ViewportState {
  width: number;
  height: number;
}

const SSR_DEFAULT_WIDTH = 1024;
const SSR_DEFAULT_HEIGHT = 768;

function getInitialViewportState(): ViewportState {
  if (typeof window === 'undefined') {
    return {
      width: SSR_DEFAULT_WIDTH,
      height: SSR_DEFAULT_HEIGHT,
    };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

/**
 * Viewport 管理 Hook
 */
export function useViewport() {
  const [state, setState] = useState<ViewportState>(getInitialViewportState);
  const rafIdRef = useRef<number>(0);

  const updateViewport = useCallback(() => {
    if (typeof window === 'undefined') return;

    setState({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    updateViewport();

    const handleResize = () => {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(updateViewport);
    };

    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(rafIdRef.current);
    };
  }, [updateViewport]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    root.style.setProperty('--viewport-width', `${state.width}px`);
    root.style.setProperty('--viewport-height', `${state.height}px`);
    root.style.setProperty('--vh', `${state.height * 0.01}px`);
  }, [state.width, state.height]);

  return state;
}
