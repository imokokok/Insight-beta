/**
 * 监控服务 - 负责管理价格源的监控任务
 *
 * 单一职责：管理监控生命周期（启动、停止、调度）
 */

import { logger } from '@/lib/logger';
import type { OracleProtocol, SupportedChain } from '@/lib/types';

export interface MonitoringTask {
  protocol: OracleProtocol;
  symbol: string;
  chain: SupportedChain;
  intervalMs: number;
  intervalId: NodeJS.Timeout;
  lastCheckTime: number;
}

export interface MonitoringStats {
  totalTasks: number;
  activeTasks: number;
  lastCheckTimes: Record<string, number>;
}

export type FeedCheckCallback = (
  protocol: OracleProtocol,
  symbol: string,
  chain: SupportedChain,
) => Promise<void>;

export class MonitoringService {
  private tasks: Map<string, MonitoringTask> = new Map();
  private isRunning = false;

  startMonitoring(
    protocol: OracleProtocol,
    symbol: string,
    chain: SupportedChain,
    intervalMs: number,
    checkCallback: FeedCheckCallback,
  ): void {
    const feedKey = this.createFeedKey(protocol, symbol, chain);

    if (this.tasks.has(feedKey)) {
      logger.warn('Already monitoring feed', { feedKey });
      return;
    }

    logger.info('Starting manipulation monitoring', { feedKey, intervalMs });

    const intervalId = setInterval(async () => {
      try {
        const task = this.tasks.get(feedKey);
        if (task) {
          task.lastCheckTime = Date.now();
        }
        await checkCallback(protocol, symbol, chain);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Error checking feed', { feedKey, error: errorMessage });
      }
    }, intervalMs);

    const task: MonitoringTask = {
      protocol,
      symbol,
      chain,
      intervalMs,
      intervalId,
      lastCheckTime: Date.now(),
    };

    this.tasks.set(feedKey, task);
    this.isRunning = true;
  }

  stopMonitoring(protocol: OracleProtocol, symbol: string, chain: SupportedChain): void {
    const feedKey = this.createFeedKey(protocol, symbol, chain);
    const task = this.tasks.get(feedKey);

    if (task) {
      clearInterval(task.intervalId);
      this.tasks.delete(feedKey);
      logger.info('Stopped monitoring feed', { feedKey });
    }

    if (this.tasks.size === 0) {
      this.isRunning = false;
    }
  }

  stopAllMonitoring(): void {
    this.tasks.forEach((task, feedKey) => {
      clearInterval(task.intervalId);
      logger.info('Stopped monitoring feed', { feedKey });
    });
    this.tasks.clear();
    this.isRunning = false;
    logger.info('Stopped all monitoring');
  }

  isMonitoring(): boolean {
    return this.isRunning;
  }

  getActiveMonitors(): string[] {
    return Array.from(this.tasks.keys());
  }

  getStats(): MonitoringStats {
    const now = Date.now();
    const activeTasks = Array.from(this.tasks.values()).filter(
      (task) => now - task.lastCheckTime < task.intervalMs * 2,
    ).length;

    const lastCheckTimes: Record<string, number> = {};
    this.tasks.forEach((task, key) => {
      lastCheckTimes[key] = task.lastCheckTime;
    });

    return {
      totalTasks: this.tasks.size,
      activeTasks,
      lastCheckTimes,
    };
  }

  private createFeedKey(protocol: OracleProtocol, symbol: string, chain: SupportedChain): string {
    return `${protocol}:${chain}:${symbol}`;
  }
}
