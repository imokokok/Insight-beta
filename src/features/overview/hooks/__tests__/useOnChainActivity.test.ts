/**
 * useOnChainActivity Hook 测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

import { useOnChainActivity } from '../useOnChainActivity';

// Mock fetch
global.fetch = vi.fn();

describe('useOnChainActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should fetch and return on-chain activity data', async () => {
    const mockChainlinkStats = {
      data: {
        stats: {
          totalFeeds: 350,
          activeNodes: 1000,
          avgLatency: 500,
        },
      },
    };

    const mockPythStats = {
      data: {
        stats: {
          totalFeeds: 130,
          publishers: 80,
          avgLatency: 400,
        },
      },
    };

    (global.fetch as vi.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockChainlinkStats,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPythStats,
      });

    const { result } = renderHook(() => useOnChainActivity());

    // 初始状态应该是 loading
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();

    // 等待数据加载完成
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // 验证返回的数据
    expect(result.current.data).toBeDefined();
    expect(result.current.data?.dailyData).toHaveLength(7);
    expect(result.current.data?.stats).toBeDefined();
    expect(result.current.error).toBeNull();

    // 验证统计数据
    const stats = result.current.data?.stats;
    expect(stats?.chainlink.activeFeeds).toBe(350);
    expect(stats?.pyth.activeFeeds).toBe(130);
    expect(stats?.aggregated.totalActiveFeeds).toBe(480);
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as vi.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useOnChainActivity());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // 即使出错，也应该有降级数据
    expect(result.current.data).toBeDefined();
    expect(result.current.data?.dailyData).toHaveLength(7);
  });

  it('should use cached data when available', async () => {
    const cachedData = {
      dailyData: [
        { date: 'Jan 1', timestamp: 1234567890, updates: 1000, activeFeeds: 50 },
      ],
      stats: {
        chainlink: { totalUpdates: 1000, activeFeeds: 50, avgLatency: 100 },
        pyth: { totalUpdates: 200, activeFeeds: 10, avgLatency: 100 },
        aggregated: { totalUpdates: 1200, totalActiveFeeds: 60 },
      },
      lastUpdated: new Date().toISOString(),
    };

    localStorage.setItem(
      'onchain_activity_data',
      JSON.stringify({ data: cachedData, timestamp: Date.now() })
    );

    const { result } = renderHook(() => useOnChainActivity());

    // 应该立即使用缓存数据，不等待 API 调用
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data?.dailyData[0].date).toBe('Jan 1');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should refresh data when refresh is called', async () => {
    const mockStats = {
      data: {
        stats: { totalFeeds: 100, activeNodes: 500, avgLatency: 300 },
      },
    };

    (global.fetch as vi.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockStats,
    });

    const { result } = renderHook(() => useOnChainActivity());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const firstData = result.current.data;

    // 调用 refresh
    await result.current.refresh();

    // 验证数据被重新获取
    expect(global.fetch).toHaveBeenCalledTimes(4); // 初始 2 次 + refresh 2 次
  });
});
