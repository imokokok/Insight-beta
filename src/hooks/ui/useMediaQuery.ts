'use client';

import { useState, useEffect } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

interface UseMediaQueryReturn {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  deviceType: DeviceType;
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
}

export function useMediaQuery(): UseMediaQueryReturn {
  const [state, setState] = useState<UseMediaQueryReturn>(() => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    deviceType: 'desktop',
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
    orientation: 'portrait',
  }));

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateState = (): void => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isMobile = width < 640;
      const isTablet = width >= 640 && width < 1024;
      const isDesktop = width >= 1024;
      const orientation = width > height ? 'landscape' : 'portrait';

      setState({
        isMobile,
        isTablet,
        isDesktop,
        deviceType: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
        width,
        height,
        orientation,
      });
    };

    updateState();

    window.addEventListener('resize', updateState, { passive: true });
    window.addEventListener('orientationchange', updateState);

    return () => {
      window.removeEventListener('resize', updateState);
      window.removeEventListener('orientationchange', updateState);
    };
  }, []);

  return state;
}

export function useBreakpoint<K extends keyof typeof breakpoints>(breakpoint: K): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const query = window.matchMedia(breakpoints[breakpoint]);
    setMatches(query.matches);

    const handler = (e: MediaQueryListEvent): void => {
      setMatches(e.matches);
    };

    query.addEventListener('change', handler);
    return () => query.removeEventListener('change', handler);
  }, [breakpoint]);

  return matches;
}

export function useTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isTouchDevice =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      ((navigator as Navigator & { msMaxTouchPoints?: number }).msMaxTouchPoints ?? 0) > 0;

    setIsTouch(isTouchDevice);
  }, []);

  return isTouch;
}

export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent): void => {
      setReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return reducedMotion;
}

export function useColorScheme(): 'light' | 'dark' {
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent): void => {
      setColorScheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return colorScheme;
}

export function useNetworkStatus(): {
  online: boolean;
  effectiveType: string | null;
  downlink: number | null;
} {
  const [status, setStatus] = useState<{
    online: boolean;
    effectiveType: string | null;
    downlink: number | null;
  }>({
    online: true,
    effectiveType: null,
    downlink: null,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateStatus = (): void => {
      const nav = navigator as Navigator & {
        connection?: {
          effectiveType: string;
          downlink: number;
        };
      };
      const connection = nav.connection;

      setStatus({
        online: navigator.onLine,
        effectiveType: connection?.effectiveType || null,
        downlink: connection?.downlink || null,
      });
    };

    updateStatus();

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    if ('connection' in navigator) {
      const nav = navigator as Navigator & {
        connection?: {
          addEventListener: (event: string, handler: () => void) => void;
        };
      };
      nav.connection?.addEventListener('change', updateStatus);
    }

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  return status;
}

const breakpoints = {
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  '2xl': '(min-width: 1536px)',
};

export { breakpoints };
export default useMediaQuery;
