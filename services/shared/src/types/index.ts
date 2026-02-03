/**
 * Shared types for all microservices
 */

export interface PriceData {
  symbol: string;
  price: number;
  timestamp: number;
  protocol: string;
  chain: string;
  confidence?: number;
  source?: string;
}

export interface SyncConfig {
  instanceId: string;
  protocol: string;
  chain: string;
  rpcUrl: string;
  intervalMs: number;
  symbols: string[];
  customConfig?: Record<string, unknown>;
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastSync: number;
  consecutiveFailures: number;
  syncCount: number;
  errorRate: number;
}

export interface AlertEvent {
  type: 'price_deviation' | 'stale_data' | 'service_down' | 'anomaly';
  symbol: string;
  protocol: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface ProtocolMessage {
  type: 'price_update' | 'health_check' | 'config_update' | 'sync_request';
  payload: unknown;
  timestamp: number;
  serviceId: string;
}

export type SupportedChain =
  | 'ethereum'
  | 'polygon'
  | 'arbitrum'
  | 'optimism'
  | 'base'
  | 'avalanche'
  | 'bsc'
  | 'fantom'
  | 'metis'
  | 'moonbeam'
  | 'moonriver'
  | 'gnosis'
  | 'celo'
  | 'harmony'
  | 'cronos'
  | 'kcc'
  | 'okex'
  | 'heco'
  | 'aurora'
  | 'boba'
  | 'skale';

export type SupportedProtocol =
  | 'chainlink'
  | 'pyth'
  | 'band'
  | 'api3'
  | 'redstone'
  | 'switchboard'
  | 'flux'
  | 'dia'
  | 'uma';
