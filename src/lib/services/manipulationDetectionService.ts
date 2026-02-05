import { ManipulationDetector } from '@/lib/security/manipulationDetector';
import { logger } from '@/lib/logger';
import type { ManipulationDetectionConfig, DetectionMetrics } from '@/lib/types/security/detection';
import type { OracleProtocol, SupportedChain } from '@/lib/types';

export interface DetectionServiceConfig {
  detection: ManipulationDetectionConfig;
  alertChannels: {
    email?: boolean;
    webhook?: boolean;
    slack?: boolean;
    telegram?: boolean;
  };
  autoBlockSuspiciousFeeds: boolean;
  notificationCooldownMs: number;
}

const DEFAULT_SERVICE_CONFIG: DetectionServiceConfig = {
  detection: {
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
  },
  alertChannels: {
    email: true,
    webhook: true,
    slack: false,
    telegram: false,
  },
  autoBlockSuspiciousFeeds: false,
  notificationCooldownMs: 300000,
};

export class ManipulationDetectionService {
  private detector: ManipulationDetector;
  private config: DetectionServiceConfig;
  private isRunning = false;
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private metrics: DetectionMetrics = {
    totalDetections: 0,
    detectionsByType: {},
    detectionsBySeverity: {},
    falsePositives: 0,
    averageConfidence: 0,
    lastDetectionTime: undefined,
  };

  constructor(config: Partial<DetectionServiceConfig> = {}) {
    this.config = { ...DEFAULT_SERVICE_CONFIG, ...config };
    this.detector = new ManipulationDetector(this.config.detection);
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Manipulation Detection Service...');
    logger.info('Manipulation Detection Service initialized');
  }

  async startMonitoring(
    protocol: OracleProtocol,
    symbol: string,
    chain: SupportedChain,
    intervalMs: number = 10000,
  ): Promise<void> {
    const feedKey = `${protocol}:${chain}:${symbol}`;

    if (this.monitoringIntervals.has(feedKey)) {
      logger.warn('Already monitoring feed', { feedKey });
      return;
    }

    logger.info('Starting manipulation monitoring', { feedKey });

    const interval = setInterval(async () => {
      try {
        await this.checkFeed(protocol, symbol, chain);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Error checking feed', { feedKey, error: errorMessage });
      }
    }, intervalMs);

    this.monitoringIntervals.set(feedKey, interval);
    this.isRunning = true;
  }

  stopMonitoring(protocol: OracleProtocol, symbol: string, chain: SupportedChain): void {
    const feedKey = `${protocol}:${chain}:${symbol}`;
    const interval = this.monitoringIntervals.get(feedKey);

    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(feedKey);
      logger.info('Stopped monitoring feed', { feedKey });
    }

    if (this.monitoringIntervals.size === 0) {
      this.isRunning = false;
    }
  }

  stopAllMonitoring(): void {
    this.monitoringIntervals.forEach((interval, feedKey) => {
      clearInterval(interval);
      logger.info('Stopped monitoring feed', { feedKey });
    });
    this.monitoringIntervals.clear();
    this.isRunning = false;
    logger.info('Stopped all monitoring');
  }

  isMonitoring(): boolean {
    return this.isRunning;
  }

  getActiveMonitors(): string[] {
    return Array.from(this.monitoringIntervals.keys());
  }

  getMetrics(): DetectionMetrics {
    const detectorMetrics = this.detector.getMetrics();
    return {
      ...this.metrics,
      ...detectorMetrics,
    };
  }

  private async checkFeed(
    protocol: OracleProtocol,
    symbol: string,
    chain: SupportedChain,
  ): Promise<void> {
    // Placeholder for actual feed checking logic
    logger.debug('Checking feed', { protocol, symbol, chain });
  }
}

export const manipulationDetectionService = new ManipulationDetectionService();
