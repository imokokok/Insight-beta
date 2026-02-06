import { logger } from '@/lib/logger';
import type { OracleProtocol, SupportedChain } from '@/lib/types';
import type { DetectionMetrics } from '@/lib/types/security/detection';

import { MetricsService } from './detection/metricsService';
import { MonitoringService } from './detection/monitoringService';

export class ManipulationDetectionService {
  private monitoringService: MonitoringService;
  private metricsService: MetricsService;

  constructor() {
    this.monitoringService = new MonitoringService();
    this.metricsService = new MetricsService();
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
    this.monitoringService.startMonitoring(
      protocol,
      symbol,
      chain,
      intervalMs,
      this.checkFeed.bind(this),
    );
  }

  stopMonitoring(protocol: OracleProtocol, symbol: string, chain: SupportedChain): void {
    this.monitoringService.stopMonitoring(protocol, symbol, chain);
  }

  stopAllMonitoring(): void {
    this.monitoringService.stopAllMonitoring();
  }

  isMonitoring(): boolean {
    return this.monitoringService.isMonitoring();
  }

  getActiveMonitors(): string[] {
    return this.monitoringService.getActiveMonitors();
  }

  getMetrics(): DetectionMetrics {
    return this.metricsService.getMetrics();
  }

  private async checkFeed(
    protocol: OracleProtocol,
    symbol: string,
    chain: SupportedChain,
  ): Promise<void> {
    logger.debug('Checking feed', { protocol, symbol, chain });
  }
}

export const manipulationDetectionService = new ManipulationDetectionService();
