import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useGlobalSearch } from '../useGlobalSearch';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useGlobalSearch', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty results when query is empty', () => {
    const { result } = renderHook(() => useGlobalSearch(''));

    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
    expect(result.current.total).toBe(0);
  });

  it('should return empty results when query is less than 2 characters', () => {
    const { result } = renderHook(() => useGlobalSearch('a'));

    expect(result.current.query).toBe('a');
    expect(result.current.results).toEqual([]);
  });

  it('should clear search', () => {
    const { result } = renderHook(() => useGlobalSearch('btc'));

    act(() => {
      result.current.clearSearch();
    });

    expect(result.current.query).toBe('');
  });

  it('should set query directly', () => {
    const { result } = renderHook(() => useGlobalSearch(''));

    act(() => {
      result.current.search('eth');
    });

    expect(result.current.query).toBe('eth');
  });

  it('should have correct initial state', () => {
    const { result } = renderHook(() => useGlobalSearch(''));

    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  it('should have refresh function', () => {
    const { result } = renderHook(() => useGlobalSearch(''));

    expect(typeof result.current.refresh).toBe('function');
  });

  it('should have debouncedQuery', () => {
    const { result } = renderHook(() => useGlobalSearch('test'));

    expect(result.current.debouncedQuery).toBe('test');
  });
});
