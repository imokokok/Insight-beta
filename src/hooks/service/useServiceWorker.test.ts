import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useServiceWorker,
  useOfflineStatus,
  useCachedData,
} from '@/hooks/service/useServiceWorker';

describe('useServiceWorker', () => {
  const originalServiceWorker = navigator.serviceWorker;

  beforeEach(() => {
    Object.defineProperty(navigator, 'serviceWorker', {
      writable: true,
      configurable: true,
      value: {
        register: vi.fn().mockResolvedValue({
          addEventListener: vi.fn(),
          waiting: null,
          installing: null,
        }),
      } as unknown as ServiceWorkerContainer,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'serviceWorker', {
      writable: true,
      configurable: true,
      value: originalServiceWorker,
    });
    vi.clearAllMocks();
  });

  it('should detect service worker support', () => {
    const { result } = renderHook(() => useServiceWorker());
    expect(result.current.isSupported).toBe(true);
  });
});

describe('useOfflineStatus', () => {
  const originalOnline = navigator.onLine;

  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: originalOnline,
    });
  });

  it('should return true when online', () => {
    const { result } = renderHook(() => useOfflineStatus());
    expect(result.current).toBe(true);
  });

  it('should return false when offline', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: false,
    });

    const { result } = renderHook(() => useOfflineStatus());
    expect(result.current).toBe(false);
  });
});

describe('useCachedData', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should return initial state', () => {
    const fetcher = vi.fn().mockResolvedValue({ data: 'test' });

    const { result } = renderHook(() => useCachedData('test-key', fetcher, 60000));

    expect(result.current).toBeDefined();
  });
});
