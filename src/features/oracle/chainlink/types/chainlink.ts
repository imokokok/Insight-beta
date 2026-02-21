export interface OcrRound {
  roundId: string;
  participatingNodes: number;
  aggregationThreshold: string;
  answer: string;
  startedAt: string;
  updatedAt: string;
  nodeContributions?: NodeContribution[];
}

export interface NodeContribution {
  nodeName: string;
  contributionPercentage: number;
  role: 'proposer' | 'observer';
}

export interface ReliabilityScore {
  overall: number;
  uptime: number;
  responseTime: number;
  feedSupport: number;
  trend: 'up' | 'down' | 'stable';
}

export interface Operator {
  name: string;
  online: boolean;
  responseTime: number;
  supportedFeeds: string[];
  lastHeartbeat: string | null;
  reliabilityScore?: ReliabilityScore;
  uptimePercentage?: number;
}

export interface ChainlinkFeed {
  symbol: string;
  pair: string;
  latestPrice: string;
  heartbeat: number;
  deviationThreshold: string;
  aggregatorAddress: string;
  decimals: number;
  lastUpdate: string;
  chain?: string;
}

export interface GasCostTrendPoint {
  timestamp: string;
  gasUsed: number;
  costEth: number;
  costUsd: number;
  transactionCount: number;
}

export interface GasCostByFeed {
  feedName: string;
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
  feedCount: number;
}

export interface GasCostAnalysisData {
  timeRange: '1h' | '24h' | '7d' | '30d';
  byFeed: GasCostByFeed[];
  byChain: GasCostByChain[];
  trend: GasCostTrendPoint[];
  totalGasUsed: number;
  totalCostEth: number;
  totalCostUsd: number;
  totalTransactions: number;
  generatedAt: string;
}

export interface HeartbeatAlert {
  feedName: string;
  pair: string;
  aggregatorAddress: string;
  heartbeat: number;
  lastUpdate: string;
  timeoutDuration: number;
  status: 'active' | 'timeout' | 'critical';
  chain?: string;
}

export interface HeartbeatStats {
  totalFeeds: number;
  activeFeeds: number;
  timeoutFeeds: number;
  criticalFeeds: number;
  alerts: HeartbeatAlert[];
  generatedAt: string;
}

export interface DeviationTrigger {
  feedName: string;
  pair: string;
  chain: string;
  deviationThreshold: string;
  triggerCount: number;
  updateFrequency: number;
  avgUpdateInterval: number;
  lastTriggeredAt: string | null;
}

export interface DeviationStats {
  timeRange: '24h' | '7d' | '30d';
  triggers: DeviationTrigger[];
  totalTriggers: number;
  mostActiveFeeds: DeviationTrigger[];
  generatedAt: string;
}

export interface CrossChainPrice {
  symbol: string;
  pair: string;
  chain: string;
  price: string;
  decimals: number;
  lastUpdate: string;
}

export interface CrossChainComparison {
  symbol: string;
  prices: CrossChainPrice[];
  priceDifference: number;
  priceDifferencePercentage: number;
}
