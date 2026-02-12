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

  /**
   * 检查单个价格源是否被操纵
   *
   * TODO: 实现实际的检测逻辑
   * - 获取当前价格数据
   * - 与参考价格比较
   * - 检测异常偏差
   * - 记录检测结果
   * - 触发告警（如果需要）
   *
   * @param protocol - 预言机协议
   * @param symbol - 价格符号
   * @param chain - 区块链
   */
  private async checkFeed(
    protocol: OracleProtocol,
    symbol: string,
    chain: SupportedChain,
  ): Promise<void> {
    logger.debug('Checking feed', { protocol, symbol, chain });
    // TODO: 实现实际的检测逻辑
    // 1. 获取当前价格数据
    // 2. 与参考价格比较
    // 3. 检测异常偏差
    // 4. 记录检测结果
    // 5. 触发告警（如果需要）
  }
}

export const manipulationDetectionService = new ManipulationDetectionService();
