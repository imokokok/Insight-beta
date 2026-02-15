import type { SupportedChain } from './unifiedOracleTypes';

export type GasProvider = 'etherscan' | 'gasnow' | 'blocknative' | 'ethgasstation' | 'gasprice';

export interface GasPriceData {
  chain: SupportedChain;
  provider: GasProvider;
  slow: number;
  average: number;
  fast: number;
  fastest: number;
  timestamp: Date;
  baseFee?: number;
  priorityFee?: number;
  currency: string;
}

export interface GasPriceConfig {
  enabled: boolean;
  providers: GasProvider[];
  defaultProvider: GasProvider;
  cacheTtlMs: number;
  fallbackToEstimate: boolean;
  chains: SupportedChain[];
  retryConfig: {
    maxRetries: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
  };
}

export interface GasProviderResponse {
  provider: GasProvider;
  success: boolean;
  data?: GasPriceData;
  error?: string;
  latencyMs: number;
  retryCount?: number;
}

export interface GasPriceHistoryEntry {
  chain: SupportedChain;
  provider: GasProvider;
  priceLevel: 'slow' | 'average' | 'fast' | 'fastest';
  price: number;
  timestamp: Date;
}

export interface GasPriceStatistics {
  chain: SupportedChain;
  provider: GasProvider;
  priceLevel: 'slow' | 'average' | 'fast' | 'fastest';
  min: number;
  max: number;
  avg: number;
  median: number;
  stdDev: number;
  p25: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  count: number;
  startTime: Date;
  endTime: Date;
}

export interface GasPriceTrend {
  chain: SupportedChain;
  priceLevel: 'slow' | 'average' | 'fast' | 'fastest';
  direction: 'up' | 'down' | 'stable';
  changePercent: number;
  changeValue: number;
  ma7: number;
  ma24: number;
  ma168: number;
  volatility: number;
  timestamp: Date;
}

export interface ProviderHealth {
  provider: GasProvider;
  status: 'healthy' | 'degraded' | 'unhealthy';
  successRate: number;
  avgLatencyMs: number;
  lastSuccessTime: Date;
  lastFailureTime?: Date;
  consecutiveFailures: number;
  totalRequests: number;
  totalSuccesses: number;
  totalFailures: number;
}

export interface GasPriceHistoryRequest {
  chains: SupportedChain[];
  providers?: GasProvider[];
  startTime: Date;
  endTime: Date;
  interval?: '1min' | '5min' | '15min' | '1hour' | '6hour' | '1day';
  priceLevels?: ('slow' | 'average' | 'fast' | 'fastest')[];
}

export interface GasPriceHealthResponse {
  ok: boolean;
  data: ProviderHealth[];
  meta: {
    totalProviders: number;
    healthyCount: number;
    degradedCount: number;
    unhealthyCount: number;
  };
}
