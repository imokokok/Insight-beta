import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { QueryResult, QueryResultRow } from '@/lib/database/db';

import { PriceDeviationAnalytics } from '../priceDeviationAnalytics';

vi.mock('@/lib/database/db', () => ({
  query: vi.fn(),
}));

vi.mock('../priceAggregation/utils', () => ({
  detectOutliers: vi.fn((deviations) => deviations.map((_: number, i: number) => i)),
}));

vi.mock('../priceAggregation/config', () => ({
  AGGREGATION_CONFIG: {
    outlierDetection: {
      method: 'threshold',
      threshold: 0.01,
    },
  },
}));

vi.mock('@/shared/utils/robustTrendAnalysis', () => ({
  robustTrendAnalysis: vi.fn(() => ({
    direction: 'stable' as const,
    strength: 0.5,
    intercept: 0.001,
    volatility: 0.002,
  })),
}));

vi.mock('@/shared/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('PriceDeviationAnalytics', () => {
  let service: PriceDeviationAnalytics;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PriceDeviationAnalytics({
      analysisWindowHours: 24,
      deviationThreshold: 0.01,
      minDataPoints: 10,
    });
  });

  describe('constructor', () => {
    it('should use default config when no config provided', () => {
      const defaultService = new PriceDeviationAnalytics();
      const config = defaultService.getConfig();
      expect(config.analysisWindowHours).toBe(24);
      expect(config.deviationThreshold).toBe(0.01);
      expect(config.minDataPoints).toBe(10);
    });

    it('should merge provided config with defaults', () => {
      const customService = new PriceDeviationAnalytics({
        analysisWindowHours: 48,
      });
      const config = customService.getConfig();
      expect(config.analysisWindowHours).toBe(48);
      expect(config.deviationThreshold).toBe(0.01);
    });
  });

  describe('updateConfig', () => {
    it('should update config values', () => {
      service.updateConfig({ deviationThreshold: 0.05 });
      const config = service.getConfig();
      expect(config.deviationThreshold).toBe(0.05);
    });
  });

  describe('getConfig', () => {
    it('should return a copy of the config', () => {
      const config1 = service.getConfig();
      const config2 = service.getConfig();
      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });

  describe('analyzeDeviationTrend', () => {
    it('should return correct structure for trend analysis', async () => {
      const { query } = await import('@/lib/database/db');
      vi.mocked(query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as QueryResult<QueryResultRow>);

      const result = await service.analyzeDeviationTrend('TEST/USD');

      expect(result.symbol).toBe('TEST/USD');
      expect(result.trendDirection).toBeDefined();
      expect(result.avgDeviation).toBeDefined();
      expect(result.recommendation).toBeDefined();
    });
  });

  describe('compareSymbols', () => {
    it('should compare multiple symbols and rank by deviation', async () => {
      const { query } = await import('@/lib/database/db');
      vi.mocked(query).mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as QueryResult<QueryResultRow>);

      const result = await service.compareSymbols(['BTC/USD', 'ETH/USD']);

      expect(result).toHaveLength(2);
      expect(result[0]?.rank).toBe(1);
      expect(result[1]?.rank).toBe(2);
    });
  });
});
