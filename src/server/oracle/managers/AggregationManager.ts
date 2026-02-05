/**
 * Price Aggregation Manager
 * Handles price aggregation tasks
 */

import { logger } from '@/lib/logger';
import { priceAggregationEngine } from '../priceAggregationService';
import { priceStreamManager } from '@/server/websocket/priceStream';
import type { AggregationResult } from '../types/serviceTypes';

export class AggregationManager {
  private aggregationInterval?: NodeJS.Timeout;
  private readonly defaultSymbols: string[];
  private readonly intervalMs: number;

  constructor(defaultSymbols: string[], intervalMs: number) {
    this.defaultSymbols = defaultSymbols;
    this.intervalMs = intervalMs;
  }

  /**
   * Start aggregation tasks
   */
  start(): void {
    logger.info('Starting price aggregation task');

    // Immediate execution
    this.runAggregation();

    // Set up interval
    this.aggregationInterval = setInterval(() => {
      this.runAggregation();
    }, this.intervalMs);
  }

  /**
   * Stop aggregation tasks
   */
  stop(): void {
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
      this.aggregationInterval = undefined;
      logger.info('Aggregation task stopped');
    }
  }

  /**
   * Run aggregation for specific symbols
   */
  async aggregate(symbols?: string[]): Promise<AggregationResult[]> {
    const targetSymbols = symbols || this.defaultSymbols;

    try {
      const results = await priceAggregationEngine.aggregateMultipleSymbols(targetSymbols);

      logger.debug(`Aggregated ${results.length} symbols`, {
        symbols: results.map((r) => r.symbol),
      });

      return results.map((result) => ({
        symbol: result.symbol,
        prices: (result.prices || []).map((p) => ({
          protocol: String(p.protocol),
          price: p.price,
          timestamp:
            typeof p.timestamp === 'string' ? new Date(p.timestamp).getTime() : p.timestamp,
        })),
        aggregatedPrice: result.avgPrice || result.medianPrice || 0,
        deviation: result.maxDeviation || 0,
      }));
    } catch (error) {
      logger.error('Price aggregation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Execute aggregation and broadcast results
   */
  private async runAggregation(): Promise<void> {
    try {
      logger.debug('Running price aggregation...');

      const results = await this.aggregate();

      // Broadcast to WebSocket clients
      for (const comparison of results) {
        priceStreamManager.broadcast({
          type: 'price_update',
          data: {
            symbol: comparison.symbol,
            chain: 'ethereum' as import('@/lib/types/unifiedOracleTypes').SupportedChain,
            price: comparison.aggregatedPrice,
            timestamp: Date.now(),
            source: 'uma' as import('@/lib/types/unifiedOracleTypes').OracleProtocol,
          },
        });
      }
    } catch (error) {
      logger.error('Price aggregation task failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Check if aggregation is running
   */
  isRunning(): boolean {
    return !!this.aggregationInterval;
  }
}
