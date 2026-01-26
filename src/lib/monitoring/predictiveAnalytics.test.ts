import { describe, it, expect, beforeEach } from 'vitest';
import {
  PredictiveAnalyticsEngine,
  predictiveAnalytics,
} from './predictiveAnalytics';

describe('PredictiveAnalyticsEngine', () => {
  let engine: PredictiveAnalyticsEngine;

  beforeEach(() => {
    engine = new PredictiveAnalyticsEngine();
  });

  describe('extractFeatures', () => {
    it('should extract basic statistical features', () => {
      const data = [
        { timestamp: 1, value: 10 },
        { timestamp: 2, value: 20 },
        { timestamp: 3, value: 30 },
        { timestamp: 4, value: 40 },
        { timestamp: 5, value: 50 },
      ];

      const features = engine.extractFeatures(data);

      expect(features.mean).toBe(30);
      expect(features.min).toBe(10);
      expect(features.max).toBe(50);
      expect(features.stdDev).toBeGreaterThan(0);
    });

    it('should handle empty data', () => {
      const features = engine.extractFeatures([]);

      expect(features.mean).toBe(0);
      expect(features.stdDev).toBe(0);
    });

    it('should handle single data point', () => {
      const features = engine.extractFeatures([{ timestamp: 1, value: 100 }]);

      expect(features.mean).toBe(100);
      expect(features.stdDev).toBe(0);
    });

    it('should calculate trend correctly', () => {
      const data = [
        { timestamp: 1, value: 10 },
        { timestamp: 2, value: 20 },
        { timestamp: 3, value: 30 },
        { timestamp: 4, value: 40 },
        { timestamp: 5, value: 50 },
      ];

      const features = engine.extractFeatures(data);

      expect(features.trend).toBeGreaterThan(0);
    });

    it('should detect negative trend', () => {
      const data = [
        { timestamp: 1, value: 50 },
        { timestamp: 2, value: 40 },
        { timestamp: 3, value: 30 },
        { timestamp: 4, value: 20 },
        { timestamp: 5, value: 10 },
      ];

      const features = engine.extractFeatures(data);

      expect(features.trend).toBeLessThan(0);
    });
  });

  describe('predictDisputeProbability', () => {
    it('should return valid probability between 0 and 1', () => {
      const input = {
        historicalData: [
          { timestamp: Date.now() - 86400000 * 7, value: 0.1, metadata: { disputeRate: 0.05 } },
          { timestamp: Date.now() - 86400000 * 6, value: 0.2, metadata: { disputeRate: 0.06 } },
          { timestamp: Date.now() - 86400000 * 5, value: 0.15, metadata: { disputeRate: 0.04 } },
          { timestamp: Date.now() - 86400000 * 4, value: 0.25, metadata: { disputeRate: 0.07 } },
          { timestamp: Date.now() - 86400000 * 3, value: 0.18, metadata: { disputeRate: 0.05 } },
          { timestamp: Date.now() - 86400000 * 2, value: 0.22, metadata: { disputeRate: 0.06 } },
          { timestamp: Date.now() - 86400000, value: 0.19, metadata: { disputeRate: 0.05 } },
        ],
        currentValue: 0.2,
        timeWindow: 7,
      };

      const result = engine.predictDisputeProbability(input);

      expect(result.prediction).toBeGreaterThanOrEqual(0);
      expect(result.prediction).toBeLessThanOrEqual(1);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should include risk level in result', () => {
      const input = {
        historicalData: [
          { timestamp: Date.now(), value: 0.5, metadata: { disputeRate: 0.5 } },
        ],
        currentValue: 0.5,
      };

      const result = engine.predictDisputeProbability(input);

      expect(['low', 'medium', 'high']).toContain(result.riskLevel);
    });

    it('should include recommendations', () => {
      const input = {
        historicalData: [
          { timestamp: Date.now(), value: 0.5, metadata: { disputeRate: 0.5 } },
        ],
        currentValue: 0.5,
      };

      const result = engine.predictDisputeProbability(input);

      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should include impact factors', () => {
      const input = {
        historicalData: [
          { timestamp: Date.now(), value: 0.3, metadata: { disputeRate: 0.1 } },
        ],
        currentValue: 0.3,
      };

      const result = engine.predictDisputeProbability(input);

      expect(result.factors).toBeInstanceOf(Array);
      expect(result.factors.length).toBeGreaterThan(0);
      expect(result.factors[0]).toHaveProperty('name');
      expect(result.factors[0]).toHaveProperty('impact');
      expect(result.factors[0]).toHaveProperty('description');
    });
  });

  describe('predictSettlementOutcome', () => {
    it('should return valid probability', () => {
      const data = {
        bondAmount: 5000,
        livenessPeriod: 86400 * 2,
        marketVolatility: 0.2,
        historicalAccuracy: 0.9,
        disputerActivity: 5,
      };

      const result = engine.predictSettlementOutcome(data);

      expect(result.prediction).toBeGreaterThanOrEqual(0);
      expect(result.prediction).toBeLessThanOrEqual(1);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should factor in historical accuracy', () => {
      const highAccuracy = engine.predictSettlementOutcome({
        bondAmount: 5000,
        livenessPeriod: 86400,
        marketVolatility: 0.2,
        historicalAccuracy: 0.95,
        disputerActivity: 5,
      });

      const lowAccuracy = engine.predictSettlementOutcome({
        bondAmount: 5000,
        livenessPeriod: 86400,
        marketVolatility: 0.2,
        historicalAccuracy: 0.5,
        disputerActivity: 5,
      });

      expect(highAccuracy.prediction).toBeGreaterThan(lowAccuracy.prediction);
    });

    it('should factor in market volatility negatively', () => {
      const lowVolatility = engine.predictSettlementOutcome({
        bondAmount: 5000,
        livenessPeriod: 86400,
        marketVolatility: 0.1,
        historicalAccuracy: 0.8,
        disputerActivity: 5,
      });

      const highVolatility = engine.predictSettlementOutcome({
        bondAmount: 5000,
        livenessPeriod: 86400,
        marketVolatility: 0.8,
        historicalAccuracy: 0.8,
        disputerActivity: 5,
      });

      expect(lowVolatility.prediction).toBeGreaterThan(highVolatility.prediction);
    });
  });

  describe('detectAnomalies', () => {
    it('should return empty array for insufficient data', () => {
      const anomalies = engine.detectAnomalies([
        { timestamp: 1, value: 10 },
        { timestamp: 2, value: 20 },
      ]);

      expect(anomalies).toEqual([]);
    });

    it('should detect spike anomalies', () => {
      const data = [
        ...Array.from({ length: 10 }, (_, i) => ({ timestamp: i, value: 100 })),
        { timestamp: 11, value: 1000 },
      ];

      const anomalies = engine.detectAnomalies(data);

      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].anomalyType).toBe('spike');
      expect(anomalies[0].severity).toBeDefined();
    });

    it('should detect drop anomalies', () => {
      const data = [
        ...Array.from({ length: 10 }, (_, i) => ({ timestamp: i, value: 100 })),
        { timestamp: 11, value: 5 },
      ];

      const anomalies = engine.detectAnomalies(data);

      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].anomalyType).toBe('drop');
    });

    it('should not flag normal variations as anomalies', () => {
      const data = Array.from({ length: 20 }, (_, i) => ({
        timestamp: i,
        value: 100 + Math.sin(i) * 5,
      }));

      const anomalies = engine.detectAnomalies(data);

      expect(anomalies.length).toBe(0);
    });
  });

  describe('assessRisk', () => {
    it('should calculate overall risk score', () => {
      const data = {
        disputeRate: [0.05, 0.04, 0.06, 0.05, 0.04],
        assertionVolume: [50, 60, 55, 70, 65],
        errorRate: [0.01, 0.02, 0.01, 0.02, 0.01],
        syncLatency: [1000, 1200, 1100, 1300, 1150],
        livenessScore: [0.95, 0.94, 0.96, 0.95, 0.95],
      };

      const result = engine.assessRisk(data);

      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(1);
      expect(['low', 'medium', 'high', 'critical']).toContain(result.riskLevel);
    });

    it('should include risk factors', () => {
      const data = {
        disputeRate: [0.05],
        assertionVolume: [50],
        errorRate: [0.01],
        syncLatency: [1000],
        livenessScore: [0.95],
      };

      const result = engine.assessRisk(data);

      expect(result.factors).toBeInstanceOf(Array);
      expect(result.factors.length).toBe(5);
      expect(result.factors[0]).toHaveProperty('name');
      expect(result.factors[0]).toHaveProperty('score');
      expect(result.factors[0]).toHaveProperty('weight');
      expect(result.factors[0]).toHaveProperty('description');
    });

    it('should generate recommendations', () => {
      const data = {
        disputeRate: [0.05],
        assertionVolume: [50],
        errorRate: [0.01],
        syncLatency: [1000],
        livenessScore: [0.95],
      };

      const result = engine.assessRisk(data);

      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should identify critical risk level', () => {
      const data = {
        disputeRate: [0.8, 0.85, 0.9],
        assertionVolume: [5, 3, 2],
        errorRate: [0.3, 0.35, 0.4],
        syncLatency: [50000, 60000, 70000],
        livenessScore: [0.3, 0.25, 0.2],
      };

      const result = engine.assessRisk(data);

      expect(result.riskLevel).toBe('critical');
    });
  });

  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(predictiveAnalytics).toBeInstanceOf(PredictiveAnalyticsEngine);
    });
  });

  describe('usePredictiveAnalytics Hook', () => {
    it('should return predictive analytics methods', () => {
      const { predictDisputeProbability, predictSettlementOutcome, detectAnomalies, assessRisk } =
        predictiveAnalytics;

      expect(typeof predictDisputeProbability).toBe('function');
      expect(typeof predictSettlementOutcome).toBe('function');
      expect(typeof detectAnomalies).toBe('function');
      expect(typeof assessRisk).toBe('function');
    });
  });
});

describe('Prediction Result Structure', () => {
  it('should have required properties', () => {
    const engine = new PredictiveAnalyticsEngine();
    const result = engine.predictDisputeProbability({
      historicalData: [{ timestamp: Date.now(), value: 0.5, metadata: { disputeRate: 0.1 } }],
      currentValue: 0.5,
    });

    expect(result).toHaveProperty('prediction');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('trend');
    expect(result).toHaveProperty('factors');
    expect(result).toHaveProperty('riskLevel');
    expect(result).toHaveProperty('recommendations');
    expect(result).toHaveProperty('timestamp');
  });

  it('should have valid trend values', () => {
    const engine = new PredictiveAnalyticsEngine();

    const increasing = engine.predictDisputeProbability({
      historicalData: Array.from({ length: 10 }, (_, i) => ({
        timestamp: i,
        value: 0.1 + i * 0.01,
        metadata: { disputeRate: 0.05 + i * 0.01 },
      })),
      currentValue: 0.2,
    });

    const decreasing = engine.predictDisputeProbability({
      historicalData: Array.from({ length: 10 }, (_, i) => ({
        timestamp: i,
        value: 0.2 - i * 0.01,
        metadata: { disputeRate: 0.1 - i * 0.01 },
      })),
      currentValue: 0.1,
    });

    expect(['increasing', 'decreasing', 'stable']).toContain(increasing.trend);
    expect(['increasing', 'decreasing', 'stable']).toContain(decreasing.trend);
  });
});

describe('Edge Cases', () => {
  it('should handle zero values', () => {
    const engine = new PredictiveAnalyticsEngine();

    const result = engine.predictDisputeProbability({
      historicalData: [
        { timestamp: 1, value: 0, metadata: { disputeRate: 0 } },
        { timestamp: 2, value: 0, metadata: { disputeRate: 0 } },
      ],
      currentValue: 0,
    });

    expect(result.prediction).toBeGreaterThanOrEqual(0);
  });

  it('should handle very high values', () => {
    const engine = new PredictiveAnalyticsEngine();

    const result = engine.predictDisputeProbability({
      historicalData: [
        { timestamp: 1, value: 1000, metadata: { disputeRate: 0.9 } },
        { timestamp: 2, value: 1000, metadata: { disputeRate: 0.9 } },
      ],
      currentValue: 1000,
    });

    expect(result.riskLevel).toBe('high');
  });

  it('should handle NaN values gracefully', () => {
    const engine = new PredictiveAnalyticsEngine();

    const features = engine.extractFeatures([
      { timestamp: 1, value: NaN },
      { timestamp: 2, value: NaN },
    ]);

    expect(features.mean).not.toBeNaN();
    expect(features.stdDev).not.toBeNaN();
  });

  it('should handle Infinity values', () => {
    const engine = new PredictiveAnalyticsEngine();

    const features = engine.extractFeatures([
      { timestamp: 1, value: Infinity },
      { timestamp: 2, value: 100 },
    ]);

    expect(features.mean).toBeDefined();
    expect(features.stdDev).toBeDefined();
    expect(typeof features.mean).toBe('number');
    expect(typeof features.stdDev).toBe('number');
  });
});
