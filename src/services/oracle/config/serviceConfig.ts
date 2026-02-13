/**
 * Unified Oracle Service Configuration
 */

import type { ServiceConfig } from '@/features/oracle/services/types/serviceTypes';

export const DEFAULT_SERVICE_CONFIG: ServiceConfig = {
  aggregationIntervalMs: 30000, // 30 seconds
  healthCheckIntervalMs: 60000, // 1 minute
  alertCheckIntervalMs: 60000, // 1 minute
  defaultSymbols: ['ETH/USD', 'BTC/USD', 'LINK/USD', 'MATIC/USD', 'AVAX/USD'],
  autoStartSync: true,
};

export function getServiceConfig(): ServiceConfig {
  return {
    aggregationIntervalMs: parseInt(
      process.env.AGGREGATION_INTERVAL_MS || String(DEFAULT_SERVICE_CONFIG.aggregationIntervalMs),
      10,
    ),
    healthCheckIntervalMs: parseInt(
      process.env.HEALTH_CHECK_INTERVAL_MS || String(DEFAULT_SERVICE_CONFIG.healthCheckIntervalMs),
      10,
    ),
    alertCheckIntervalMs: parseInt(
      process.env.ALERT_CHECK_INTERVAL_MS || String(DEFAULT_SERVICE_CONFIG.alertCheckIntervalMs),
      10,
    ),
    defaultSymbols:
      process.env.DEFAULT_SYMBOLS?.split(',') || DEFAULT_SERVICE_CONFIG.defaultSymbols,
    autoStartSync: process.env.AUTO_START_SYNC !== 'false',
  };
}
