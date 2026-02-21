export interface Airnode {
  airnodeAddress: string;
  endpointId: string;
  sponsorAddress: string;
  chain: string;
  status: 'online' | 'offline';
  lastSeenAt: string;
  responseTimeMs: number;
  uptimePercentage: number;
}

export interface UptimeTrendPoint {
  timestamp: string;
  uptimePercentage: number;
  responseTimeMs: number;
}

export interface OfflineEvent {
  id: string;
  startTime: string;
  endTime: string;
  durationMs: number;
  reason?: string;
}

export type TimePeriod = 'day' | 'week' | 'month';

export interface AirnodeHistoryData {
  timePeriod: TimePeriod;
  uptimeTrend: UptimeTrendPoint[];
  offlineEvents: OfflineEvent[];
  totalUptimePercentage: number;
  totalOfflineDurationMs: number;
  offlineEventCount: number;
}

export interface BeaconSetComponent {
  beaconId: string;
  beaconName: string;
  weight: number;
  lastPrice: number;
}

export interface Dapi {
  dapiName: string;
  dataFeedId: string;
  airnodeAddress: string;
  chain: string;
  symbol: string;
  decimals: number;
  status: 'active' | 'inactive';
  lastPrice: number;
  lastUpdatedAt: string;
  providerName?: string;
  providerDescription?: string;
  providerWebsite?: string;
  sourceType?: 'beacon' | 'beacon_set';
  beaconSetComponents?: BeaconSetComponent[];
}

export interface OevEvent {
  id: string;
  dapiName: string;
  chain: string;
  blockNumber: number;
  transactionHash: string;
  oevValue: number;
  priceBefore: number;
  priceAfter: number;
  timestamp: string;
}

export interface OevOverviewData {
  totalOev: number;
  totalEvents: number;
  avgOevPerEvent: number;
  affectedDapis: number;
  eventsCount: number;
  topDapis: Array<{
    dapiName: string;
    oevValue: number;
    percentage: number;
  }>;
  chainDistribution: Array<{
    chain: string;
    oevValue: number;
    percentage: number;
  }>;
  trend: Array<{
    date: string;
    oevValue: number;
  }>;
}

export interface SignatureVerifyResult {
  isValid: boolean;
  signer?: string;
  dataFeedId?: string;
  timestamp?: string;
  error?: string;
}

export interface Api3PriceData {
  timestamp: string;
  price: number;
  emaPrice: number;
}

export interface UpdateFrequencyStats {
  dapiName: string;
  chain: string;
  avgUpdateIntervalMs: number;
  minUpdateIntervalMs: number;
  maxUpdateIntervalMs: number;
  updateCount: number;
  lastUpdateTime: string;
  anomalyDetected: boolean;
  anomalyReason?: string;
}

export interface UpdateIntervalPoint {
  timestamp: string;
  intervalMs: number;
  isAnomaly: boolean;
}

export interface UpdateFrequencyResponse {
  stats: UpdateFrequencyStats;
  intervals: UpdateIntervalPoint[];
  timeRange: string;
}

export interface ProtocolPricePoint {
  timestamp: string;
  api3Price: number;
  chainlinkPrice: number;
  pythPrice: number;
}

export interface DeviationMetrics {
  mean: number;
  max: number;
  min: number;
  stdDev: number;
}

export interface ComparisonDeviation {
  api3VsChainlink: DeviationMetrics;
  api3VsPyth: DeviationMetrics;
}

export interface Api3DeviationData {
  timeRange: string;
  symbol: string;
  pricePoints: ProtocolPricePoint[];
  deviations: ComparisonDeviation;
  generatedAt: string;
}

export interface GasCostByDapi {
  dapiName: string;
  chain: string;
  totalGasUsed: number;
  totalCostEth: number;
  totalCostUsd: number;
  transactionCount: number;
  avgGasPerTransaction: number;
}

export interface GasCostByChain {
  chain: string;
  totalGasUsed: number;
  totalCostEth: number;
  totalCostUsd: number;
  transactionCount: number;
  dapiCount: number;
}

export interface GasCostTrendPoint {
  timestamp: string;
  gasUsed: number;
  costEth: number;
  costUsd: number;
  transactionCount: number;
}

export interface GasCostAnalysisData {
  timeRange: '1h' | '24h' | '7d' | '30d';
  byDapi: GasCostByDapi[];
  byChain: GasCostByChain[];
  trend: GasCostTrendPoint[];
  totalGasUsed: number;
  totalCostEth: number;
  totalCostUsd: number;
  totalTransactions: number;
  generatedAt: string;
}

export interface CrossChainDapiData {
  dapiName: string;
  chain: string;
  lastPrice: number;
  lastUpdatedAt: string;
  avgUpdateIntervalMs: number;
  minUpdateIntervalMs: number;
  maxUpdateIntervalMs: number;
  avgLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  gasCostUsd: number;
  gasCostEth: number;
  status: 'active' | 'inactive';
  uptimePercentage: number;
  updateCount24h: number;
}

export interface CrossChainPricePoint {
  timestamp: string;
  [chain: string]: string | number;
}

export interface CrossChainComparisonData {
  dapiName: string;
  chains: string[];
  dapiData: CrossChainDapiData[];
  priceHistory: CrossChainPricePoint[];
  timeRange: '1h' | '24h' | '7d' | '30d';
  generatedAt: string;
}

export type API3AlertType = 'price_deviation' | 'update_frequency' | 'airnode_offline';

export interface API3AlertConfig {
  id: string;
  type: API3AlertType;
  name: string;
  enabled: boolean;
  threshold: number;
  targetDapi?: string;
  targetAirnode?: string;
  chain?: string;
  createdAt: string;
  updatedAt: string;
}

export interface API3AlertSummary {
  total: number;
  byType: {
    price_deviation: number;
    update_frequency: number;
    airnode_offline: number;
  };
  enabled: number;
  disabled: number;
}

export interface API3AlertsResponse {
  success: boolean;
  data?: {
    alerts: API3AlertConfig[];
    summary: API3AlertSummary;
  };
  error?: string;
  timestamp: string;
}
