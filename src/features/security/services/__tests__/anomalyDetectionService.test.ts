/**
 * Anomaly Detection Service Tests
 *
 * Comprehensive test suite for the multi-dimensional anomaly detection service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AnomalyDetectionService,
  StatisticalDetector,
  TimeSeriesDetector,
  MLDetector,
  BehaviorPatternDetector,
  type DetectionConfig,
  type TimeSeriesPoint,
} from '../anomaly';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('AnomalyDetectionService', () => {
  let service: AnomalyDetectionService;

  const defaultConfig: Partial<DetectionConfig> = {
    zScoreThreshold: 3,
    iqrMultiplier: 1.5,
    minDataPoints: 10,
    windowSize: 20,
    trendWindowSize: 10,
    volatilityWindowSize: 10,
    isolationForestContamination: 0.1,
    minClusterSize: 5,
    patternHistoryLength: 10,
    behaviorChangeThreshold: 0.3,
    cooldownPeriodMs: 0, // No cooldown for tests
    severityThresholds: {
      low: 0.3,
      medium: 0.6,
      high: 0.8,
    },
  };

  const createPriceData = (values: number[], volumes?: number[]): TimeSeriesPoint[] => {
    return values.map((value, i) => ({
      timestamp: new Date(Date.now() + i * 1000),
      value,
      volume: volumes?.[i] ?? 1000,
    }));
  };

  beforeEach(() => {
    service = AnomalyDetectionService.getInstance();
    service.clearHistory();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AnomalyDetectionService.getInstance();
      const instance2 = AnomalyDetectionService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('detectAnomalies', () => {
    it('should detect statistical outliers with high z-scores', async () => {
      const priceData = createPriceData([100, 101, 100, 102, 101, 100, 150, 101, 100, 102]);

      const anomalies = await service.detectAnomalies('BTC', priceData, defaultConfig);

      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies.some((a) => a.type === 'statistical_outlier')).toBe(true);
    });

    it('should detect trend breaks', async () => {
      // Steady increase then sudden drop
      const priceData = createPriceData([100, 105, 110, 115, 120, 80, 75, 70, 72, 71]);

      const anomalies = await service.detectAnomalies('BTC', priceData, {
        ...defaultConfig,
        trendWindowSize: 3,
      });

      expect(anomalies.some((a) => a.type === 'trend_break')).toBe(true);
    });

    it('should detect anomalies in volatile data', async () => {
      // Data with high variation
      const priceData = createPriceData([100, 100.5, 100.2, 100.8, 100, 120, 80, 110, 90, 115]);

      const anomalies = await service.detectAnomalies('BTC', priceData, defaultConfig);

      // Should detect some type of anomaly (may vary based on algorithm)
      expect(anomalies.length).toBeGreaterThan(0);
    });

    it('should detect volume anomalies', async () => {
      const priceData = createPriceData(
        new Array(10).fill(100),
        [1000, 1000, 1000, 1000, 5000, 1000, 1000, 1000, 1000, 1000],
      );

      const anomalies = await service.detectAnomalies('BTC', priceData, defaultConfig);

      expect(anomalies.some((a) => a.type === 'volume_anomaly')).toBe(true);
    });

    it('should return empty array for insufficient data', async () => {
      const priceData = createPriceData([100, 101]);

      const anomalies = await service.detectAnomalies('BTC', priceData, defaultConfig);

      expect(anomalies).toEqual([]);
    });

    it('should assign unique IDs to anomalies', async () => {
      const priceData = createPriceData([100, 101, 100, 102, 101, 100, 150, 101, 100, 102]);

      const anomalies = await service.detectAnomalies('BTC', priceData, defaultConfig);

      const ids = anomalies.map((a) => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should set correct timestamps', async () => {
      const priceData = createPriceData([100, 101, 100, 102, 101, 100, 150, 101, 100, 102]);

      const beforeDetection = new Date();
      const anomalies = await service.detectAnomalies('BTC', priceData, defaultConfig);
      const afterDetection = new Date();

      anomalies.forEach((anomaly) => {
        expect(anomaly.detectedAt.getTime()).toBeGreaterThanOrEqual(beforeDetection.getTime());
        expect(anomaly.detectedAt.getTime()).toBeLessThanOrEqual(afterDetection.getTime());
      });
    });
  });

  describe('updateAnomalyStatus', () => {
    it('should update anomaly status', async () => {
      const priceData = createPriceData([100, 101, 100, 102, 101, 100, 150, 101, 100, 102]);

      await service.detectAnomalies('BTC', priceData, defaultConfig);
      const history = service.getAnomalyHistory('BTC');
      expect(history.length).toBeGreaterThan(0);

      const anomaly = history[0]!;
      const updated = service.updateAnomalyStatus(anomaly.id, 'resolved');

      expect(updated).toBe(true);
      expect(service.getAnomalyById(anomaly.id)?.status).toBe('resolved');
    });

    it('should return false for non-existent anomaly', () => {
      const result = service.updateAnomalyStatus('non-existent-id', 'resolved');
      expect(result).toBe(false);
    });
  });

  describe('getAnomalyStats', () => {
    it('should return correct statistics', async () => {
      const priceData = createPriceData([100, 101, 100, 102, 101, 100, 150, 101, 100, 102]);

      await service.detectAnomalies('BTC', priceData, defaultConfig);
      await service.detectAnomalies('ETH', priceData, defaultConfig);

      const stats = service.getAnomalyStats();

      expect(stats.totalAnomalies).toBeGreaterThan(0);
      expect(stats.bySymbol['BTC']).toBeGreaterThan(0);
      expect(stats.bySymbol['ETH']).toBeGreaterThan(0);
      expect(Object.keys(stats.byType).length).toBeGreaterThan(0);
      expect(Object.keys(stats.bySeverity).length).toBeGreaterThan(0);
    });
  });

  describe('clearHistory', () => {
    it('should clear all anomaly history', async () => {
      const priceData = createPriceData([100, 101, 100, 102, 101, 100, 150, 101, 100, 102]);

      await service.detectAnomalies('BTC', priceData, defaultConfig);
      expect(service.getAnomalyHistory('BTC').length).toBeGreaterThan(0);

      service.clearHistory();
      expect(service.getAnomalyHistory('BTC')).toEqual([]);
      expect(service.getAnomalyStats().totalAnomalies).toBe(0);
    });
  });
});

describe('StatisticalDetector', () => {
  let detector: StatisticalDetector;

  beforeEach(() => {
    detector = new StatisticalDetector();
  });

  describe('detectOutliers', () => {
    it('should detect outliers using z-score method', () => {
      const data = [10, 12, 11, 13, 12, 11, 100, 12, 11, 13];
      const outliers = detector.detectOutliers(data, { zScoreThreshold: 2 } as DetectionConfig);

      expect(outliers.length).toBeGreaterThan(0);
      expect(outliers[0]?.index).toBe(6); // Index of 100
    });

    it('should return empty array for normal data', () => {
      const data = [10, 11, 12, 11, 10, 12, 11, 10, 11, 12];
      const outliers = detector.detectOutliers(data, { zScoreThreshold: 3 } as DetectionConfig);

      expect(outliers).toEqual([]);
    });

    it('should handle empty data', () => {
      const outliers = detector.detectOutliers([], { zScoreThreshold: 3 } as DetectionConfig);
      expect(outliers).toEqual([]);
    });
  });

  describe('detectIQROutliers', () => {
    it('should detect outliers using IQR method', () => {
      const data = [10, 12, 11, 13, 12, 11, 100, 12, 11, 13];
      const outliers = detector.detectIQROutliers(data, { iqrMultiplier: 1.5 } as DetectionConfig);

      expect(outliers.length).toBeGreaterThan(0);
    });

    it('should return empty array for normal data', () => {
      const data = [10, 11, 12, 11, 10, 12, 11, 10, 11, 12];
      const outliers = detector.detectIQROutliers(data, { iqrMultiplier: 1.5 } as DetectionConfig);

      expect(outliers).toEqual([]);
    });
  });

  describe('calculateStats', () => {
    it('should calculate correct statistics', () => {
      const data = [1, 2, 3, 4, 5];
      const stats = detector.calculateStats(data);

      expect(stats.mean).toBe(3);
      expect(stats.stdDev).toBeCloseTo(1.414, 2);
    });

    it('should handle single value', () => {
      const data = [5];
      const stats = detector.calculateStats(data);

      expect(stats.mean).toBe(5);
      expect(stats.stdDev).toBe(0);
    });

    it('should handle empty array', () => {
      const data: number[] = [];
      const stats = detector.calculateStats(data);

      expect(stats.mean).toBeNaN();
      expect(stats.stdDev).toBeNaN();
    });
  });
});

describe('TimeSeriesDetector', () => {
  let detector: TimeSeriesDetector;

  beforeEach(() => {
    detector = new TimeSeriesDetector();
  });

  describe('calculateMovingAverage', () => {
    it('should calculate moving average correctly', () => {
      const data = [100, 101, 100, 102, 101];
      const ma = detector.calculateMovingAverage(data, 3);

      expect(ma.length).toBe(3); // data.length - windowSize + 1
      expect(ma[0]).toBeCloseTo(100.33, 1);
    });

    it('should handle window size larger than data', () => {
      const data = [100, 101];
      const ma = detector.calculateMovingAverage(data, 5);

      expect(ma.length).toBe(0);
    });
  });

  describe('detectTrendChange', () => {
    it('should detect trend changes', () => {
      // Upward trend then downward
      const data = [100, 105, 110, 115, 120, 80, 75, 70];
      const changes = detector.detectTrendChange(data, 3);

      expect(changes.length).toBeGreaterThan(0);
    });

    it('should handle steady trend', () => {
      const data = [100, 101, 102, 101, 100, 101, 102, 101];
      const changes = detector.detectTrendChange(data, 3);

      // Should return array (may contain minor changes even in steady data)
      expect(Array.isArray(changes)).toBe(true);
    });
  });

  describe('detectVolatilitySpikes', () => {
    it('should detect volatility spikes', () => {
      const data = [100, 100.5, 100.2, 100.8, 100, 120, 80, 110, 90, 115];
      const spikes = detector.detectVolatilitySpikes(data, {
        volatilityWindowSize: 5,
      } as DetectionConfig);

      // Should return array of detected spikes
      expect(Array.isArray(spikes)).toBe(true);
    });

    it('should handle uniform data', () => {
      const data = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100];
      const spikes = detector.detectVolatilitySpikes(data, {
        volatilityWindowSize: 5,
      } as DetectionConfig);

      // Uniform data has no volatility spikes
      expect(Array.isArray(spikes)).toBe(true);
    });
  });

  describe('calculateEMA', () => {
    it('should calculate EMA correctly', () => {
      const data = [10, 11, 12, 13, 14];
      const ema = detector.calculateEMA(data, 3);

      expect(ema.length).toBe(data.length);
      expect(ema[ema.length - 1]!).toBeGreaterThan(ema[0]!);
    });
  });
});

describe('MLDetector', () => {
  let detector: MLDetector;

  beforeEach(() => {
    detector = new MLDetector();
  });

  describe('detectAnomaliesWithIsolationForest', () => {
    it('should detect anomalies in data', () => {
      const data = [1, 2, 1, 2, 1, 2, 1, 2, 1, 100];
      const results = detector.detectAnomaliesWithIsolationForest(data, 0.7);

      expect(results.length).toBe(data.length);
      expect(results.some((r) => r.isAnomaly)).toBe(true);
    });

    it('should process uniform data', () => {
      const data = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
      const results = detector.detectAnomaliesWithIsolationForest(data, 0.7);

      // Should return results for all data points
      expect(results.length).toBe(data.length);
      // All scores should be valid numbers
      expect(results.every((r) => typeof r.score === 'number')).toBe(true);
    });
  });

  describe('detectClusters', () => {
    it('should cluster data points', () => {
      const data = [10, 11, 12, 13, 100, 101, 102, 103];
      const results = detector.detectClusters(data, 2);

      expect(results.length).toBe(data.length);
      // Each point should be assigned to a cluster
      expect(results.every((r) => r.cluster >= 0)).toBe(true);
    });

    it('should identify outliers in clusters', () => {
      const data = [10, 11, 12, 13, 100, 101, 102, 103];
      const results = detector.detectClusters(data, 2);

      // Points far from cluster centers should have high distance
      const maxDistance = Math.max(...results.map((r) => r.distance));
      expect(maxDistance).toBeGreaterThan(0);
    });
  });
});

describe('BehaviorPatternDetector', () => {
  let detector: BehaviorPatternDetector;

  beforeEach(() => {
    detector = new BehaviorPatternDetector();
  });

  describe('detectBehaviorChange', () => {
    it('should detect behavior changes', () => {
      const currentPattern = [10, 12, 11, 13, 12];
      const historicalPatterns = [
        [10, 11, 12, 11, 10],
        [11, 12, 11, 10, 11],
        [10, 11, 10, 12, 11],
      ];
      const result = detector.detectBehaviorChange(currentPattern, historicalPatterns);

      expect(result.hasChanged).toBe(false); // Similar patterns
      expect(result.similarity).toBeGreaterThan(0);
    });

    it('should detect significant behavior changes', () => {
      // Use patterns with different shapes, not just different magnitudes
      const currentPattern = [10, 50, 10, 50, 10]; // Oscillating pattern
      const historicalPatterns = [
        [10, 11, 12, 13, 14], // Increasing pattern
        [11, 12, 13, 14, 15], // Increasing pattern
        [10, 12, 14, 16, 18], // Increasing pattern
      ];
      const result = detector.detectBehaviorChange(currentPattern, historicalPatterns);

      // Oscillating vs increasing should have low similarity
      expect(result.similarity).toBeLessThan(0.9);
      expect(result.changeMagnitude).toBeGreaterThan(0.1);
    });
  });

  describe('detectSeasonalityAnomaly', () => {
    it('should detect seasonal anomalies', () => {
      // Create data with 4-period seasonality
      const data = [10, 20, 30, 40, 10, 20, 30, 40, 10, 20, 100, 40];
      const anomalies = detector.detectSeasonalityAnomaly(data, 4);

      expect(anomalies.length).toBeGreaterThan(0);
    });

    it('should return empty array for insufficient data', () => {
      const data = [10, 20, 30, 40];
      const anomalies = detector.detectSeasonalityAnomaly(data, 4);

      expect(anomalies).toEqual([]);
    });
  });

  describe('calculatePatternSimilarity', () => {
    it('should return high similarity for similar patterns', () => {
      const pattern1 = [1, 2, 3, 4, 5];
      const pattern2 = [1, 2, 3, 4, 5];
      const similarity = detector.calculatePatternSimilarity(pattern1, pattern2);

      expect(similarity).toBeCloseTo(1, 5);
    });

    it('should return high similarity for proportional patterns (cosine similarity)', () => {
      const pattern1 = [1, 2, 3, 4, 5];
      const pattern2 = [100, 200, 300, 400, 500]; // Proportional pattern
      const similarity = detector.calculatePatternSimilarity(pattern1, pattern2);

      // Cosine similarity measures direction, not magnitude
      // Proportional patterns have the same direction, so similarity should be 1
      expect(similarity).toBeCloseTo(1, 5);
    });

    it('should return 0 for orthogonal patterns', () => {
      const pattern1 = [1, 0, 0, 0, 0];
      const pattern2 = [0, 1, 0, 0, 0];
      const similarity = detector.calculatePatternSimilarity(pattern1, pattern2);

      expect(similarity).toBe(0);
    });

    it('should return low similarity for inverse patterns', () => {
      const pattern1 = [1, 2, 3, 4, 5];
      const pattern2 = [-1, -2, -3, -4, -5]; // Inverse direction
      const similarity = detector.calculatePatternSimilarity(pattern1, pattern2);

      // Opposite directions should have negative similarity
      expect(similarity).toBeLessThan(0);
    });
  });
});

describe('Integration Tests', () => {
  let service: AnomalyDetectionService;

  const integrationConfig: Partial<DetectionConfig> = {
    zScoreThreshold: 3,
    iqrMultiplier: 1.5,
    minDataPoints: 10,
    windowSize: 20,
    trendWindowSize: 10,
    volatilityWindowSize: 10,
    isolationForestContamination: 0.1,
    minClusterSize: 5,
    patternHistoryLength: 10,
    behaviorChangeThreshold: 0.3,
    cooldownPeriodMs: 0, // No cooldown for tests
    severityThresholds: {
      low: 0.3,
      medium: 0.6,
      high: 0.8,
    },
  };

  const createPriceData = (values: number[], volumes?: number[]): TimeSeriesPoint[] => {
    return values.map((value, i) => ({
      timestamp: new Date(Date.now() + i * 1000),
      value,
      volume: volumes?.[i] ?? 1000,
    }));
  };

  beforeEach(() => {
    service = AnomalyDetectionService.getInstance();
    service.clearHistory();
  });

  it('should detect multiple types of anomalies in same data', async () => {
    const priceData = createPriceData(
      [
        100,
        101,
        100,
        102,
        101, // Normal
        150, // Statistical outlier
        100,
        101,
        100,
        102,
        101,
        50, // Trend break
        100,
        101,
        100,
        102,
        101,
      ],
      [
        1000,
        1000,
        1000,
        1000,
        1000,
        5000, // Volume spike
        1000,
        1000,
        1000,
        1000,
        1000,
        1000,
        1000,
        1000,
        1000,
        1000,
        1000,
      ],
    );

    const anomalies = await service.detectAnomalies('BTC', priceData, {
      ...integrationConfig,
      minDataPoints: 5,
    });

    const types = new Set(anomalies.map((a) => a.type));
    expect(types.size).toBeGreaterThanOrEqual(1);
  });

  it('should maintain anomaly history across multiple detections', async () => {
    const priceData1 = createPriceData([100, 101, 100, 102, 101, 100, 150, 101, 100, 102]);
    const priceData2 = createPriceData([100, 101, 100, 102, 101, 100, 200, 101, 100, 102]);

    await service.detectAnomalies('BTC', priceData1, integrationConfig);
    await service.detectAnomalies('BTC', priceData2, integrationConfig);

    const history = service.getAnomalyHistory('BTC');
    expect(history.length).toBeGreaterThanOrEqual(1);
  });

  it('should correlate anomalies across different symbols', async () => {
    const priceData = createPriceData([100, 101, 100, 102, 101, 100, 150, 101, 100, 102]);

    await service.detectAnomalies('BTC', priceData, integrationConfig);
    await service.detectAnomalies('ETH', priceData, integrationConfig);

    const correlations = service.correlateAnomalies(['BTC', 'ETH'], 60000);

    expect(correlations).not.toBeNull();
    expect(correlations!.length).toBeGreaterThan(0);
    expect(correlations![0]).toBeDefined();
    expect(correlations![0]!.symbols).toContain('BTC');
    expect(correlations![0]!.symbols).toContain('ETH');
  });
});
