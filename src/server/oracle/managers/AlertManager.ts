/**
 * Alert Manager
 * Handles alert rule engine and alert checking
 */

import { logger } from '@/lib/logger';
import type { OracleProtocol, SupportedChain } from '@/lib/types/unifiedOracleTypes';
import { AlertRuleEngine } from '@/server/alerts/alertRuleEngine';
import { query } from '@/server/db';

export class AlertManager {
  private alertRuleEngine: AlertRuleEngine;
  private alertCheckInterval?: NodeJS.Timeout;
  private readonly intervalMs: number;

  constructor(intervalMs: number) {
    this.intervalMs = intervalMs;
    this.alertRuleEngine = new AlertRuleEngine();
  }

  /**
   * Start alert engine
   */
  async start(): Promise<void> {
    try {
      // Load alert rules
      await this.alertRuleEngine.loadRules();
      logger.info('Alert rules loaded', {
        count: this.alertRuleEngine.getRuleCount(),
      });

      // Start periodic checking
      this.alertCheckInterval = setInterval(() => {
        this.checkAlerts();
      }, this.intervalMs);

      logger.info('Alert engine started');
    } catch (error) {
      logger.error('Failed to start alert engine', { error });
      throw error;
    }
  }

  /**
   * Stop alert engine
   */
  stop(): void {
    if (this.alertCheckInterval) {
      clearInterval(this.alertCheckInterval);
      this.alertCheckInterval = undefined;
      logger.info('Alert engine stopped');
    }
  }

  /**
   * Check alerts against current price data
   */
  private async checkAlerts(): Promise<void> {
    try {
      const priceData = await query(`
        SELECT DISTINCT ON (symbol) 
          symbol,
          price,
          protocol,
          chain,
          timestamp
        FROM unified_price_feeds
        ORDER BY symbol, timestamp DESC
      `);

      // Evaluate rules for each price
      for (const row of priceData.rows) {
        const context = {
          symbol: row.symbol,
          price: parseFloat(row.price),
          protocol: row.protocol as OracleProtocol,
          chain: row.chain as SupportedChain,
          timestamp: new Date(row.timestamp),
        };

        await this.alertRuleEngine.evaluateAllRules(context);
      }
    } catch (error) {
      logger.error('Alert check failed', { error });
    }
  }

  /**
   * Get rule count
   */
  getRuleCount(): number {
    return this.alertRuleEngine.getRuleCount();
  }

  /**
   * Check if alert engine is running
   */
  isRunning(): boolean {
    return !!this.alertCheckInterval;
  }
}
