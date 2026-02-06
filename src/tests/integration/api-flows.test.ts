/**
 * API Flows Integration Tests - API 流程集成测试
 *
 * 测试 API 端点的集成和响应格式
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { fetchApiData, ApiClientError } from '@/lib/utils/api';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API Flows Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Oracle API Endpoints', () => {
    it('should fetch unified oracle stats successfully', async () => {
      const mockStats = {
        totalProtocols: 10,
        totalPriceFeeds: 150,
        supportedChains: 15,
        avgUpdateLatency: 500,
        lastUpdated: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, data: mockStats }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const result = await fetchApiData('/api/oracle/unified/stats');

      expect(result).toEqual(mockStats);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/oracle/unified/stats'),
        expect.any(Object),
      );
    });

    it('should fetch price feeds with filters', async () => {
      const mockFeeds = {
        data: [
          {
            id: 'eth-usd-chainlink',
            symbol: 'ETH/USD',
            protocol: 'chainlink',
            price: 3500.5,
            timestamp: Date.now(),
            confidence: 0.95,
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 100,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, data: mockFeeds }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const result = await fetchApiData('/api/oracle/unified/feeds?protocol=chainlink&page=1');

      expect(result).toEqual(mockFeeds);
    });

    it('should handle API errors with proper error codes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({
          ok: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: 'Feed not found',
          },
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      await expect(fetchApiData('/api/oracle/unified/feeds/invalid-id')).rejects.toThrow(
        ApiClientError,
      );
    });

    it('should handle rate limiting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({
          ok: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Rate limit exceeded',
            retryAfter: 60,
          },
        }),
        headers: new Headers({
          'content-type': 'application/json',
          'retry-after': '60',
        }),
      });

      await expect(fetchApiData('/api/oracle/unified/feeds')).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(fetchApiData('/api/oracle/unified/stats')).rejects.toThrow();
    });
  });

  describe('Price Comparison API', () => {
    it('should fetch cross-protocol price comparison', async () => {
      const mockComparison = {
        symbol: 'ETH/USD',
        comparisons: [
          {
            protocol: 'chainlink',
            price: 3500.5,
            timestamp: Date.now(),
            latency: 100,
          },
          {
            protocol: 'pyth',
            price: 3501.2,
            timestamp: Date.now(),
            latency: 50,
          },
        ],
        deviation: {
          absolute: 0.7,
          percentage: 0.02,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, data: mockComparison }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const result = await fetchApiData('/api/oracle/comparison/ETH/USD');

      expect(result).toEqual(mockComparison);
    });

    it('should detect price anomalies', async () => {
      const mockAnomalies = {
        symbol: 'ETH/USD',
        anomalyDetected: true,
        severity: 'high',
        details: {
          maxDeviation: 5.5,
          protocols: ['chainlink', 'pyth', 'band'],
          recommendedAction: 'investigate',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, data: mockAnomalies }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const result = await fetchApiData('/api/oracle/comparison/ETH/USD/anomaly');

      expect(result).toEqual(mockAnomalies);
    });
  });

  describe('Watchlist API', () => {
    it('should create watchlist item', async () => {
      const newItem = {
        symbol: 'BTC/USD',
        protocol: 'chainlink',
        targetPrice: 70000,
        alertThreshold: 5,
      };

      const mockResponse = {
        id: 'watch-123',
        ...newItem,
        createdAt: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, data: mockResponse }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const result = await fetchApiData('/api/watchlist', {
        method: 'POST',
        body: JSON.stringify(newItem),
      });

      expect(result).toEqual(mockResponse);
    });

    it('should update watchlist item', async () => {
      const updateData = {
        targetPrice: 75000,
        alertThreshold: 3,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          data: {
            id: 'watch-123',
            symbol: 'BTC/USD',
            ...updateData,
            updatedAt: new Date().toISOString(),
          },
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const result = await fetchApiData('/api/watchlist/watch-123', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      expect(result).toMatchObject({ targetPrice: 75000 });
    });

    it('should delete watchlist item', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, data: { success: true } }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const result = await fetchApiData('/api/watchlist/watch-123', {
        method: 'DELETE',
      });

      expect(result).toEqual({ success: true });
    });
  });

  describe('Alert API', () => {
    it('should fetch active alerts', async () => {
      const mockAlerts = {
        alerts: [
          {
            id: 'alert-1',
            type: 'price_deviation',
            severity: 'high',
            symbol: 'ETH/USD',
            message: 'Price deviation > 5% detected',
            createdAt: new Date().toISOString(),
            acknowledged: false,
          },
        ],
        total: 1,
        unacknowledged: 1,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, data: mockAlerts }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const result = await fetchApiData('/api/alerts?status=active');

      expect(result).toEqual(mockAlerts);
    });

    it('should acknowledge alert', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          data: {
            id: 'alert-1',
            acknowledged: true,
            acknowledgedAt: new Date().toISOString(),
          },
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const result = await fetchApiData('/api/alerts/alert-1/acknowledge', {
        method: 'POST',
      });

      expect(result).toMatchObject({ acknowledged: true });
    });
  });

  describe('Request Configuration', () => {
    it('should handle request timeout', async () => {
      mockFetch.mockImplementationOnce(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 100)),
      );

      await expect(fetchApiData('/api/oracle/unified/stats', {}, 50)).rejects.toThrow();
    });

    it('should include proper headers in requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, data: {} }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      await fetchApiData('/api/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      );
    });
  });

  describe('Error Transformation', () => {
    it('should transform HTTP errors to ApiClientError', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid parameters',
            details: { field: 'symbol', issue: 'required' },
          },
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      await expect(fetchApiData('/api/oracle/unified/feeds')).rejects.toThrow(ApiClientError);
    });

    it('should handle server errors (5xx)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({
          ok: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Internal server error',
          },
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      await expect(fetchApiData('/api/oracle/unified/stats')).rejects.toThrow();
    });
  });
});
