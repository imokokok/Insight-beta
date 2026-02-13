/**
 * Unified Oracle Service Types
 * Extracted from unifiedService.ts for better modularity
 */

import type { SupportedChain } from '@/types/unifiedOracleTypes';

export interface ServiceConfig {
  aggregationIntervalMs: number;
  healthCheckIntervalMs: number;
  alertCheckIntervalMs: number;
  defaultSymbols: string[];
  autoStartSync: boolean;
}

export interface SyncManager {
  stopAllSync?: () => void;
  stop?: () => void;
}

export interface ServiceStatus {
  isRunning: boolean;
  wsStats: {
    totalClients: number;
    totalSubscriptions: number;
  };
  activeSyncs: number;
}

export interface ProtocolSyncConfig {
  instanceId: string;
  protocol: string;
  chain: SupportedChain;
  enabled: boolean;
}

export interface AggregationResult {
  symbol: string;
  prices: Array<{
    protocol: string;
    price: number;
    timestamp: number;
  }>;
  aggregatedPrice: number;
  deviation: number;
}

export interface HealthCheckResult {
  wsClients: number;
  wsSubscriptions: number;
  activeSyncs: number;
  isRunning: boolean;
  unhealthyInstances?: string[];
}

export interface AlertContext {
  symbol: string;
  price: number;
  protocol: string;
  chain: string;
  timestamp: Date;
}
