export type TimeRange = '1h' | '24h' | '7d' | '30d' | '90d';

export interface FeedHistoricalDataPoint {
  timestamp: string;
  price: number;
  volume?: number;
  updates?: number;
  participants?: number;
}

export interface FeedTrendData {
  feedId: string;
  symbol: string;
  pair: string;
  chain: string;
  currentPrice: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  high24h: number;
  low24h: number;
  history: FeedHistoricalDataPoint[];
}

export interface NodePerformanceDataPoint {
  timestamp: string;
  uptime: number;
  responseTime: number;
  proposalsCount: number;
  observationsCount: number;
  supportedFeedsCount?: number;
  feedUpdatesCount?: number;
}

export interface NodePerformanceHistory {
  nodeName: string;
  operatorName?: string;
  currentUptime: number;
  avgResponseTime: number;
  totalProposals: number;
  totalObservations: number;
  history: NodePerformanceDataPoint[];
  events?: NodeEvent[];
  supportedFeeds?: string[];
}

export interface NodeUptimeDataPoint {
  timestamp: string;
  uptime: number;
  status: 'online' | 'offline' | 'degraded';
}

export interface NodeUptimeTimeSeries {
  nodeName: string;
  operatorName?: string;
  currentUptime: number;
  avgUptime: number;
  minUptime: number;
  maxUptime: number;
  downtimeCount: number;
  totalDowntimeDuration: number;
  history: NodeUptimeDataPoint[];
}

export interface NodeResponseTimeDataPoint {
  timestamp: string;
  responseTime: number;
  p50ResponseTime?: number;
  p95ResponseTime?: number;
  p99ResponseTime?: number;
}

export interface NodeResponseTimeTrend {
  nodeName: string;
  operatorName?: string;
  currentResponseTime: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  history: NodeResponseTimeDataPoint[];
}

export interface NodeFeedSupportDataPoint {
  timestamp: string;
  supportedFeedsCount: number;
  activeFeedsCount: number;
  feedUpdatesCount: number;
}

export interface NodeFeedSupportHistory {
  nodeName: string;
  operatorName?: string;
  currentSupportedFeeds: number;
  avgSupportedFeeds: number;
  totalFeedUpdates: number;
  history: NodeFeedSupportDataPoint[];
}

export interface FeedUpdateFrequencyDataPoint {
  timestamp: string;
  updatesPerMinute: number;
  avgIntervalSeconds: number;
}

export interface FeedUpdateFrequencyTrend {
  feedId: string;
  symbol: string;
  pair: string;
  currentFrequency: number;
  avgFrequency: number;
  minFrequency: number;
  maxFrequency: number;
  totalUpdates: number;
  history: FeedUpdateFrequencyDataPoint[];
}

export interface NodeComparisonMetrics {
  nodeName: string;
  operatorName?: string;
  uptime: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  supportedFeedsCount: number;
  totalUpdates: number;
  reliabilityScore: number;
  trend: 'up' | 'down' | 'stable';
}

export interface MultiNodeComparisonData {
  nodes: NodeComparisonMetrics[];
  timeRange: TimeRange;
  comparisonMetrics: {
    avgUptime: number;
    bestUptime: string;
    worstUptime: string;
    avgResponseTime: number;
    fastestNode: string;
    slowestNode: string;
  };
}

export interface NodeEvent {
  id: string;
  type: 'offline' | 'degraded' | 'recovered' | 'maintenance';
  timestamp: string;
  duration?: number;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface OCRRoundHistoryDataPoint {
  timestamp: string;
  roundId: string;
  participants: number;
  aggregationTime: number;
  gasUsed: number;
  proposer: string;
}

export interface OCRRoundStats {
  totalRounds: number;
  avgParticipants: number;
  avgAggregationTime: number;
  avgGasUsed: number;
  mostActiveProposer: string;
  proposerDistribution: Record<string, number>;
  history: OCRRoundHistoryDataPoint[];
}

export interface AnomalyEvent {
  id: string;
  feedId?: string;
  nodeName?: string;
  type:
    | 'price_spike'
    | 'price_drop'
    | 'delayed_update'
    | 'node_offline'
    | 'consensus_failure'
    | 'unusual_gas';
  timestamp: string;
  resolvedAt?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact?: string;
  metadata?: Record<string, unknown>;
}

export interface AnomalyStats {
  totalAnomalies: number;
  resolvedAnomalies: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  avgResolutionTime?: number;
  anomaliesByType: Record<string, number>;
  recentAnomalies: AnomalyEvent[];
}

export interface HistoricalTrendResponse {
  feedTrends: FeedTrendData[];
  nodePerformance: NodePerformanceHistory[];
  ocrStats: OCRRoundStats;
  anomalyStats: AnomalyStats;
  timeRange: TimeRange;
  generatedAt: string;
  metadata: {
    totalFeeds: number;
    totalNodes: number;
    totalRounds: number;
    dataPoints: number;
    samplingRate?: number;
  };
}

export interface FeedTrendChartProps {
  data: FeedTrendData[];
  timeRange: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  className?: string;
}

export interface NodePerformanceChartProps {
  data: NodePerformanceHistory[];
  timeRange: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  className?: string;
}

export interface OCRRoundChartProps {
  data: OCRRoundStats;
  timeRange: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  className?: string;
}

export interface AnomalyTimelineProps {
  data: AnomalyEvent[];
  timeRange: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  className?: string;
}

export interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  className?: string;
  disabled?: boolean;
}
