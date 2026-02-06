/**
 * Health Check Manager
 * Monitors service health and sync status
 */

import { logger } from '@/lib/logger';
import { query } from '@/server/db';
import { priceStreamManager } from '@/server/websocket/priceStream';

import type { HealthCheckResult } from '../types/serviceTypes';

export class HealthCheckManager {
  private healthCheckInterval?: NodeJS.Timeout;
  private readonly intervalMs: number;

  constructor(intervalMs: number) {
    this.intervalMs = intervalMs;
  }

  /**
   * Start health checks
   */
  start(callback?: (result: HealthCheckResult) => void): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck(callback);
    }, this.intervalMs);
  }

  /**
   * Stop health checks
   */
  stop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
      logger.info('Health check stopped');
    }
  }

  /**
   * Perform a single health check
   */
  async performHealthCheck(
    callback?: (result: HealthCheckResult) => void,
  ): Promise<HealthCheckResult> {
    try {
      const streamStats = priceStreamManager.getStats();

      const result: HealthCheckResult = {
        wsClients: streamStats.totalClients,
        wsSubscriptions: streamStats.totalSubscriptions,
        activeSyncs: 0, // Will be set by caller
        isRunning: true,
      };

      logger.debug('Health check', {
        wsClients: result.wsClients,
        wsSubscriptions: result.wsSubscriptions,
      });

      // Check for unhealthy instances
      const unhealthyInstances = await this.checkUnhealthyInstances();
      if (unhealthyInstances.length > 0) {
        result.unhealthyInstances = unhealthyInstances;
        logger.warn('Unhealthy sync instances detected', {
          count: unhealthyInstances.length,
          instances: unhealthyInstances,
        });
      }

      if (callback) {
        callback(result);
      }

      return result;
    } catch (error) {
      logger.error('Health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Check for unhealthy sync instances
   */
  private async checkUnhealthyInstances(): Promise<string[]> {
    try {
      const result = await query(
        `SELECT instance_id, status, consecutive_failures 
         FROM unified_sync_state 
         WHERE status IN ('error', 'stalled') 
           AND consecutive_failures > 3`,
      );

      return result.rows.map((r) => r.instance_id);
    } catch (error) {
      logger.error('Failed to check unhealthy instances', { error });
      return [];
    }
  }

  /**
   * Check if health check is running
   */
  isRunning(): boolean {
    return !!this.healthCheckInterval;
  }
}
