/**
 * Stats Types - 统计数据和指标相关类型定义
 */

import type { SupportedChain } from './chain';
import type { OracleProtocol } from './protocol';

export type OracleStats = {
  instanceId?: string;
  protocol?: OracleProtocol;
  chain?: SupportedChain;
  totalUpdates?: number;
  updates24h?: number;
  lastUpdateAt?: string;
  currentPrice?: number;
  priceChange24h?: number;
  volatility24h?: number;
  totalAssertions?: number;
  activeAssertions?: number;
  disputedAssertions?: number;
  settledAssertions?: number;
  proposedAssertions?: number;
  totalDisputes?: number;
  activeDisputes?: number;
  resolvedDisputes?: number;
  avgResponseTime?: number;
  uptime?: number;
  totalVolume?: number;
  totalValueLocked?: number;
  tvsUsd?: number;
  resolved24h?: number;
  avgResolutionMinutes?: number;
  updatedAt?: string;
};

export type SyncState = {
  instanceId: string;
  protocol: OracleProtocol;
  chain: SupportedChain;
  lastProcessedBlock: number;
  latestBlock: number;
  safeBlock: number;
  lagBlocks: number;
  lastSyncAt: string;
  lastSyncDurationMs: number;
  avgSyncDurationMs: number;
  status: 'healthy' | 'lagging' | 'stalled' | 'error';
  consecutiveFailures: number;
  lastError?: string;
  lastErrorAt?: string;
  activeRpcUrl?: string;
  rpcHealth: 'healthy' | 'degraded' | 'unhealthy';
  updatedAt: string;
};

export type OpsMetricsSeriesPoint = {
  date: string;
  alertsCreated: number;
  alertsResolved: number;
  incidentsCreated: number;
  incidentsResolved: number;
};

export type OpsMetrics = {
  generatedAt: string;
  windowDays: number;
  alerts: {
    open: number;
    acknowledged: number;
    resolved: number;
    mttaMs: number | null;
    mttrMs: number | null;
  };
  incidents: {
    open: number;
    mitigating: number;
    resolved: number;
    mttrMs: number | null;
  };
  slo?: OpsSloStatus;
};

export type OpsSloStatus = {
  status: 'met' | 'degraded' | 'breached';
  targets: {
    maxLagBlocks: number;
    maxSyncStalenessMinutes: number;
    maxAlertMttaMinutes: number;
    maxAlertMttrMinutes: number;
    maxIncidentMttrMinutes: number;
    maxOpenAlerts: number;
    maxOpenCriticalAlerts: number;
  };
  current: {
    lagBlocks: number | null;
    syncStalenessMinutes: number | null;
    alertMttaMinutes: number | null;
    alertMttrMinutes: number | null;
    incidentMttrMinutes: number | null;
    openAlerts: number | null;
    openCriticalAlerts: number | null;
  };
  breaches: Array<{ key: string; target: number; actual: number }>;
};

export type CacheStats = {
  local: {
    size: number;
    type: 'in-memory';
    ttlMs: number;
  };
  distributed: {
    keys: number;
    connected: boolean;
    type: 'memory';
    ttlSeconds: number;
  };
};
