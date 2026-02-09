/**
 * Orchestrator Service Types
 * 服务编排器类型定义
 */

export interface ServiceInstance {
  id: string;
  name: string;
  protocol: string;
  chain: string;
  status: 'running' | 'stopped' | 'error' | 'unknown';
  health: ServiceHealth;
  metrics: ServiceMetrics;
  config: ServiceConfig;
  lastSeen: number;
  endpoint: string;
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastSync: number;
  consecutiveFailures: number;
  errorRate: number;
}

export interface ServiceMetrics {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  totalPricesFetched: number;
  averageSyncDuration: number;
  lastSyncDuration: number;
  startTime: number;
}

export interface ServiceConfig {
  instanceId: string;
  protocol: string;
  chain: string;
  intervalMs: number;
  symbols: string[];
}

export interface AggregatedPrice {
  symbol: string;
  price: number;
  timestamp: number;
  sources: PriceSource[];
  aggregatedPrice: number;
  confidence: number;
  deviation: number;
}

export interface PriceSource {
  protocol: string;
  chain: string;
  price: number;
  timestamp: number;
  confidence: number;
}

export interface OrchestratorConfig {
  redisUrl: string;
  httpPort: number;
  healthCheckIntervalMs: number;
  aggregationEnabled: boolean;
  maxPriceAgeMs: number;
  deviationThreshold: number;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: AlertCondition;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  channels: string[];
}

export interface AlertCondition {
  type: 'price_deviation' | 'stale_data' | 'service_down' | 'error_rate';
  symbol?: string;
  protocol?: string;
  threshold: number;
  durationMs?: number;
}

export interface SystemStatus {
  services: ServiceInstance[];
  totalPrices: number;
  activeAlerts: number;
  systemHealth: 'healthy' | 'degraded' | 'unhealthy';
  lastUpdate: number;
}
