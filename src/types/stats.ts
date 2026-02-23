/**
 * Stats Types - 统一的统计类型定义
 *
 * 提供各协议和模块共用的基础统计类型
 */

import type { TimeRange } from './shared/oracle';

export type TrendDirection = 'up' | 'down' | 'stable' | 'increasing' | 'decreasing' | 'neutral';

export type StatsStatus = 'healthy' | 'degraded' | 'critical' | 'unknown';

export interface BaseStats {
  generatedAt?: string;
  lastUpdated?: string | number;
}

export interface BaseCountStats {
  total: number;
  active: number;
  inactive?: number;
  pending?: number;
}

export interface BasePerformanceStats {
  avgLatency?: number;
  avgLatencyMs?: number;
  avgUpdateLatency?: number;
  avgDelayMs?: number;
  networkUptime?: number;
  uptime?: number;
  responseTime?: number;
}

export interface BaseVolumeStats {
  totalVolume?: number;
  totalValueSecured?: string | number;
  totalBonded?: number;
  totalRewards?: number;
}

export interface BaseProtocolStats extends BaseStats, BasePerformanceStats {
  totalFeeds: number;
  activeFeeds: number;
  staleFeeds?: number;
  totalNodes?: number;
  activeNodes?: number;
  totalSubmissions?: number;
  totalPublishers?: number;
  avgConfidence?: number;
}

export interface ChainlinkStats extends BaseProtocolStats {
  ocrRounds: number;
}

export interface PythStats extends BaseProtocolStats {
  totalPublishers: number;
  activePublishers: number;
  activePriceFeeds: number;
}

export interface BandStats extends BaseProtocolStats, BaseVolumeStats {
  activeBridges: number;
  totalTransfers: number;
  totalSources: number;
  successfulTransfers?: number;
  failedTransfers?: number;
}

export interface Api3Stats extends BaseProtocolStats {
  totalDapis: number;
  activeDapis: number;
  totalBeacons: number;
  oevEnabled?: boolean;
}

export interface UMAStats extends BaseStats, BaseVolumeStats {
  totalAssertions: number;
  proposedAssertions: number;
  disputedAssertions: number;
  settledAssertions: number;
  totalDisputes: number;
  activeDisputes: number;
  pendingAssertions?: number;
  avgBondSize?: bigint;
}

export interface DashboardStats extends BaseStats, BasePerformanceStats, BaseVolumeStats {
  totalProtocols: number;
  totalPriceFeeds: number;
  activeAlerts: number;
  priceUpdates24h: number;
  staleFeeds?: number;
  activeNodes?: number;
}

export interface HeartbeatStats extends BaseStats {
  totalFeeds: number;
  activeFeeds: number;
  timeoutFeeds?: number;
  criticalFeeds?: number;
  inactive?: number;
  pending?: number;
}

export interface DeviationTriggerBase {
  feedName: string;
  pair: string;
  chain: string;
  deviationThreshold: string;
  triggerCount: number;
  updateFrequency: number;
  avgUpdateInterval: number;
  lastTriggeredAt: string | null;
}

export interface DeviationStats extends BaseStats {
  timeRange: TimeRange;
  totalTriggers: number;
  triggers?: DeviationTriggerBase[];
  mostActiveFeeds?: DeviationTriggerBase[];
}

export interface PriceUpdateStats extends BaseStats {
  totalUpdates: number;
  avgDelayMs: number;
  warningCount: number;
  criticalCount: number;
  uniqueDapis?: number;
  uniqueChains?: number;
}

export interface UpdateFrequencyStats extends BaseStats {
  avgUpdateIntervalMs: number;
  minUpdateIntervalMs: number;
  maxUpdateIntervalMs: number;
  updateCount: number;
  anomalyDetected?: boolean;
  anomalyReason?: string;
}

export interface TransferStats extends BaseStats, BaseVolumeStats {
  totalTransfers: number;
  successfulTransfers: number;
  failedTransfers: number;
  pendingTransfers: number;
  avgLatencyMs: number;
}

export interface AlertHistoryStats extends BaseStats {
  totalAlerts: number;
  avgPerHour: number;
  peakHour: number;
  peakCount: number;
  trend: TrendDirection;
  trendPercent: number;
}

export interface VoterStats extends BaseStats, BaseVolumeStats {
  address: string;
  totalVotes: number;
  correctVotes: number;
  accuracy: number;
  totalWeight: number;
  avgWeight: number;
  claimedRewards?: number;
  pendingRewards?: number;
  firstVoteAt?: string | null;
  lastVoteAt?: string | null;
}

export interface DisputerStats extends BaseStats, BaseVolumeStats {
  address: string;
  totalDisputes: number;
  successfulDisputes: number;
  winRate: number;
  totalBonded: number;
  totalRewards: number;
  firstDisputeAt: string;
  lastDisputeAt: string;
}

export interface OracleProtocolStats extends BaseStats, BaseVolumeStats {
  tvsUsd: number;
  activeDisputes: number;
  resolved24h: number;
  avgResolutionMinutes: number;
}

export interface ProtocolStats extends BaseProtocolStats {
  totalSubmissions?: number;
  totalPublishers?: number;
  avgConfidence?: number;
}

export type ProtocolSpecificStats = ChainlinkStats | PythStats | BandStats | Api3Stats | UMAStats;

export function isChainlinkStats(stats: ProtocolSpecificStats): stats is ChainlinkStats {
  return 'ocrRounds' in stats;
}

export function isPythStats(stats: ProtocolSpecificStats): stats is PythStats {
  return 'activePublishers' in stats && 'activePriceFeeds' in stats;
}

export function isBandStats(stats: ProtocolSpecificStats): stats is BandStats {
  return 'activeBridges' in stats && 'totalTransfers' in stats;
}

export function isApi3Stats(stats: ProtocolSpecificStats): stats is Api3Stats {
  return 'totalDapis' in stats;
}

export function isUMAStats(stats: ProtocolSpecificStats): stats is UMAStats {
  return 'totalAssertions' in stats && 'proposedAssertions' in stats;
}
