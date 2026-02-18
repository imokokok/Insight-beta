import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useFavorites } from '../useFavorites';

import type { FavoriteItem } from '../../types';

const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('useFavorites', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty favorites', () => {
    const { result } = renderHook(() => useFavorites());

    expect(result.current.favorites).toEqual([]);
  });

  it('should load favorites from localStorage', () => {
    const storedFavorites: FavoriteItem[] = [
      { id: 'btc-usd', type: 'feed', symbol: 'BTC/USD', addedAt: '2024-01-01T00:00:00.000Z' },
    ];

    mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify(storedFavorites));

    const { result } = renderHook(() => useFavorites());

    expect(result.current.favorites).toEqual(storedFavorites);
  });

  it('should add a favorite', () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.addFavorite({
        id: 'btc-usd',
        type: 'feed',
        symbol: 'BTC/USD',
      });
    });

    expect(result.current.favorites).toHaveLength(1);
    expect(result.current.favorites[0]?.id).toBe('btc-usd');
    expect(result.current.favorites[0]?.addedAt).toBeDefined();
  });

  it('should not add duplicate favorites', () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.addFavorite({
        id: 'btc-usd',
        type: 'feed',
        symbol: 'BTC/USD',
      });
    });

    act(() => {
      result.current.addFavorite({
        id: 'btc-usd',
        type: 'feed',
        symbol: 'BTC/USD',
      });
    });

    expect(result.current.favorites).toHaveLength(1);
  });

  it('should remove a favorite', () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.addFavorite({
        id: 'btc-usd',
        type: 'feed',
        symbol: 'BTC/USD',
      });
    });

    expect(result.current.favorites).toHaveLength(1);

    act(() => {
      result.current.removeFavorite('btc-usd');
    });

    expect(result.current.favorites).toHaveLength(0);
  });

  it('should check if item is favorite', () => {
    const { result } = renderHook(() => useFavorites());

    expect(result.current.isFavorite('btc-usd')).toBe(false);

    act(() => {
      result.current.addFavorite({
        id: 'btc-usd',
        type: 'feed',
        symbol: 'BTC/USD',
      });
    });

    expect(result.current.isFavorite('btc-usd')).toBe(true);
  });

  it('should clear all favorites', () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.addFavorite({
        id: 'btc-usd',
        type: 'feed',
        symbol: 'BTC/USD',
      });
      result.current.addFavorite({
        id: 'eth-usd',
        type: 'feed',
        symbol: 'ETH/USD',
      });
    });

    expect(result.current.favorites).toHaveLength(2);

    act(() => {
      result.current.clearFavorites();
    });

    expect(result.current.favorites).toHaveLength(0);
  });

  it('should save favorites to localStorage', () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.addFavorite({
        id: 'btc-usd',
        type: 'feed',
        symbol: 'BTC/USD',
      });
    });

    expect(mockLocalStorage.setItem).toHaveBeenCalled();
    const savedData = JSON.parse(mockLocalStorage.setItem.mock.calls[0]?.[1] || '[]');
    expect(savedData).toHaveLength(1);
    expect(savedData[0].id).toBe('btc-usd');
  });

  it('should handle localStorage errors on load', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockLocalStorage.getItem.mockImplementationOnce(() => {
      throw new Error('Storage error');
    });

    const { result } = renderHook(() => useFavorites());

    expect(result.current.favorites).toEqual([]);
    consoleSpy.mockRestore();
  });

  it('should handle localStorage errors on save', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockLocalStorage.setItem.mockImplementationOnce(() => {
      throw new Error('Storage error');
    });

    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.addFavorite({
        id: 'btc-usd',
        type: 'feed',
        symbol: 'BTC/USD',
      });
    });

    consoleSpy.mockRestore();
  });
});
