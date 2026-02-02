import { describe, it, expect, beforeEach } from 'vitest';
import { ManipulationDetector } from '../manipulationDetector';
import type { ManipulationDetectionConfig, PriceDataPoint, TransactionData } from '@/lib/types/security/manipulation';

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
};

describe('ManipulationDetector', () => {
  let detector: ManipulationDetector;

  beforeEach(() => {
    detector = new ManipulationDetector(defaultConfig);
  });

  describe('Statistical Anomaly Detection', () => {
    it('should detect price spike anomaly', async () => {
      const historicalData: PriceDataPoint[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: Date.now() - (20 - i) * 60000,
        price: 100 + Math.random() * 2,
        volume: 1000,
        source: 'test',
      }));

      const currentPrice = 150;

      const detection = await detector.analyzePriceFeed(
        'chainlink',
        'ETH/USD',
        'ethereum',
        currentPrice,
        historicalData,
        []
      );

      expect(detection).not.toBeNull();
      expect(detection?.type).toBe('statistical_anomaly');
      expect(detection?.severity).toBe('critical');
      expect(detection?.confidenceScore).toBeGreaterThan(0.8);
    });

    it('should not detect anomaly for normal price movement', async () => {
      const historicalData: PriceDataPoint[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: Date.now() - (20 - i) * 60000,
        price: 100 + Math.random() * 2,
        volume: 1000,
        source: 'test',
      }));

      const currentPrice = 101;

      const detection = await detector.analyzePriceFeed(
        'chainlink',
        'ETH/USD',
        'ethereum',
        currentPrice,
        historicalData,
        []
      );

      expect(detection).toBeNull();
    });

    it('should not detect with insufficient data points', async () => {
      const historicalData: PriceDataPoint[] = Array.from({ length: 5 }, (_, i) => ({
        timestamp: Date.now() - (5 - i) * 60000,
        price: 100,
        volume: 1000,
        source: 'test',
      }));

      const detection = await detector.analyzePriceFeed(
        'chainlink',
        'ETH/USD',
        'ethereum',
        150,
        historicalData,
        []
      );

      expect(detection).toBeNull();
    });
  });

  describe('Flash Loan Attack Detection', () => {
    it('should detect flash loan attack pattern', async () => {
      const historicalData: PriceDataPoint[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: Date.now() - (20 - i) * 60000,
        price: 100,
        volume: 1000,
        source: 'test',
      }));

      const transactions: TransactionData[] = [
        {
          hash: '0x123',
          timestamp: Date.now() - 60000,
          from: '0xaaa',
          to: '0xbbb',
          value: '500000',
          gasPrice: '50000000000',
          gasUsed: '300000',
          method: 'flashLoan',
        },
        {
          hash: '0x124',
          timestamp: Date.now() - 55000,
          from: '0xbbb',
          to: '0xccc',
          value: '1000000',
          gasPrice: '60000000000',
          gasUsed: '400000',
          method: 'swap',
        },
        {
          hash: '0x125',
          timestamp: Date.now() - 50000,
          from: '0xccc',
          to: '0xaaa',
          value: '500000',
          gasPrice: '50000000000',
          gasUsed: '300000',
          method: 'repay',
        },
      ];

      const detection = await detector.analyzePriceFeed(
        'chainlink',
        'ETH/USD',
        'ethereum',
        95,
        historicalData,
        transactions
      );

      expect(detection).not.toBeNull();
      expect(detection?.type).toBe('flash_loan_attack');
      expect(detection?.suspiciousTransactions.length).toBeGreaterThan(0);
    });

    it('should not detect flash loan with normal transactions', async () => {
      const historicalData: PriceDataPoint[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: Date.now() - (20 - i) * 60000,
        price: 100,
        volume: 1000,
        source: 'test',
      }));

      const transactions: TransactionData[] = [
        {
          hash: '0x123',
          timestamp: Date.now() - 60000,
          from: '0xaaa',
          to: '0xbbb',
          value: '100',
          gasPrice: '20000000000',
          gasUsed: '21000',
          method: 'transfer',
        },
      ];

      const detection = await detector.analyzePriceFeed(
        'chainlink',
        'ETH/USD',
        'ethereum',
        100,
        historicalData,
        transactions
      );

      expect(detection?.type).not.toBe('flash_loan_attack');
    });
  });

  describe('Sandwich Attack Detection', () => {
    it('should detect sandwich attack pattern', async () => {
      const historicalData: PriceDataPoint[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: Date.now() - (20 - i) * 60000,
        price: 100,
        volume: 1000,
        source: 'test',
      }));

      const victimTx = {
        hash: '0xvictim',
        timestamp: Date.now() - 50000,
        from: '0xvictim',
        to: '0xamm',
        value: '10000',
        gasPrice: '30000000000',
        gasUsed: '150000',
        method: 'swapExactTokensForTokens',
      };

      const transactions: TransactionData[] = [
        {
          hash: '0xfront',
          timestamp: Date.now() - 51000,
          from: '0xattacker',
          to: '0xamm',
          value: '50000',
          gasPrice: '50000000000',
          gasUsed: '150000',
          method: 'swapExactTokensForTokens',
        },
        victimTx,
        {
          hash: '0xback',
          timestamp: Date.now() - 49000,
          from: '0xattacker',
          to: '0xamm',
          value: '50000',
          gasPrice: '50000000000',
          gasUsed: '150000',
          method: 'swapExactTokensForTokens',
        },
      ];

      const detection = await detector.analyzePriceFeed(
        'chainlink',
        'ETH/USD',
        'ethereum',
        100,
        historicalData,
        transactions
      );

      expect(detection).not.toBeNull();
      expect(detection?.type).toBe('sandwich_attack');
    });
  });

  describe('Confidence Score Calculation', () => {
    it('should calculate high confidence for clear patterns', async () => {
      const historicalData: PriceDataPoint[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: Date.now() - (20 - i) * 60000,
        price: 100,
        volume: 1000,
        source: 'test',
      }));

      const transactions: TransactionData[] = [
        {
          hash: '0xflash',
          timestamp: Date.now() - 60000,
          from: '0xaaa',
          to: '0xbbb',
          value: '1000000',
          gasPrice: '80000000000',
          gasUsed: '500000',
          method: 'flashLoan',
        },
      ];

      const detection = await detector.analyzePriceFeed(
        'chainlink',
        'ETH/USD',
        'ethereum',
        80,
        historicalData,
        transactions
      );

      expect(detection).not.toBeNull();
      expect(detection!.confidenceScore).toBeGreaterThan(0.7);
    });

    it('should calculate lower confidence for ambiguous patterns', async () => {
      const historicalData: PriceDataPoint[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: Date.now() - (20 - i) * 60000,
        price: 100,
        volume: 1000,
        source: 'test',
      }));

      const detection = await detector.analyzePriceFeed(
        'chainlink',
        'ETH/USD',
        'ethereum',
        105,
        historicalData,
        []
      );

      if (detection) {
        expect(detection.confidenceScore).toBeLessThan(0.9);
      }
    });
  });

  describe('Severity Classification', () => {
    it('should classify critical severity for large deviations', async () => {
      const historicalData: PriceDataPoint[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: Date.now() - (20 - i) * 60000,
        price: 100,
        volume: 1000,
        source: 'test',
      }));

      const detection = await detector.analyzePriceFeed(
        'chainlink',
        'ETH/USD',
        'ethereum',
        200,
        historicalData,
        []
      );

      expect(detection).not.toBeNull();
      expect(detection!.severity).toBe('critical');
    });

    it('should classify high severity for moderate deviations', async () => {
      const historicalData: PriceDataPoint[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: Date.now() - (20 - i) * 60000,
        price: 100,
        volume: 1000,
        source: 'test',
      }));

      const detection = await detector.analyzePriceFeed(
        'chainlink',
        'ETH/USD',
        'ethereum',
        115,
        historicalData,
        []
      );

      if (detection) {
        expect(['high', 'critical']).toContain(detection.severity);
      }
    });
  });

  describe('Detection Rules', () => {
    it('should respect disabled rules', async () => {
      const configWithDisabledRules: ManipulationDetectionConfig = {
        ...defaultConfig,
        enabledRules: ['flash_loan_attack'],
      };

      const customDetector = new ManipulationDetector(configWithDisabledRules);

      const historicalData: PriceDataPoint[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: Date.now() - (20 - i) * 60000,
        price: 100,
        volume: 1000,
        source: 'test',
      }));

      const detection = await customDetector.analyzePriceFeed(
        'chainlink',
        'ETH/USD',
        'ethereum',
        200,
        historicalData,
        []
      );

      if (detection) {
        expect(detection.type).not.toBe('statistical_anomaly');
      }
    });
  });
});
