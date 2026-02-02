import { describe, it, expect, beforeEach } from 'vitest';
import { ManipulationDetector } from '../manipulationDetector';
import type { ManipulationDetectionConfig } from '@/lib/types/security/detection';

const defaultConfig: ManipulationDetectionConfig = {
  zScoreThreshold: 3,
  minConfidenceScore: 0.7,
  timeWindowMs: 300000,
  minDataPoints: 10,
  flashLoanMinAmountUsd: 100000,
  sandwichProfitThresholdUsd: 1000,
  liquidityChangeThreshold: 0.3,
  maxPriceDeviationPercent: 5,
  correlationThreshold: 0.8,
  enabledRules: [
    'statistical_anomaly',
    'flash_loan_attack',
    'sandwich_attack',
    'liquidity_manipulation',
  ],
  alertChannels: {
    email: true,
    webhook: true,
    slack: false,
    telegram: false,
  },
  autoBlockSuspiciousFeeds: false,
  notificationCooldownMs: 300000,
};

describe('ManipulationDetector', () => {
  let detector: ManipulationDetector;

  beforeEach(() => {
    detector = new ManipulationDetector(defaultConfig);
  });

  describe('Basic functionality', () => {
    it('should create detector with default config', () => {
      expect(detector).toBeDefined();
    });

    it('should return empty detection history initially', () => {
      const history = detector.getDetectionHistory();
      expect(history).toEqual([]);
    });

    it('should return zero metrics initially', () => {
      const metrics = detector.getMetrics();
      expect(metrics.totalDetections).toBe(0);
      expect(metrics.averageConfidence).toBe(0);
    });
  });

  describe('Configuration', () => {
    it('should accept custom configuration', () => {
      const customConfig: ManipulationDetectionConfig = {
        ...defaultConfig,
        zScoreThreshold: 2,
        minConfidenceScore: 0.5,
      };
      const customDetector = new ManipulationDetector(customConfig);
      expect(customDetector).toBeDefined();
    });

    it('should work with partial configuration', () => {
      const partialConfig: Partial<ManipulationDetectionConfig> = {
        zScoreThreshold: 4,
      };
      const partialDetector = new ManipulationDetector(partialConfig);
      expect(partialDetector).toBeDefined();
    });
  });

  describe('Detection rules', () => {
    it('should have enabled rules in config', () => {
      expect(defaultConfig.enabledRules).toContain('statistical_anomaly');
      expect(defaultConfig.enabledRules).toContain('flash_loan_attack');
      expect(defaultConfig.enabledRules).toContain('sandwich_attack');
      expect(defaultConfig.enabledRules).toContain('liquidity_manipulation');
    });

    it('should have alert channels configured', () => {
      expect(defaultConfig.alertChannels.email).toBe(true);
      expect(defaultConfig.alertChannels.webhook).toBe(true);
      expect(defaultConfig.alertChannels.slack).toBe(false);
      expect(defaultConfig.alertChannels.telegram).toBe(false);
    });
  });
});
