export interface OcrRound {
  roundId: string;
  participatingNodes: number;
  aggregationThreshold: string;
  answer: string;
  startedAt: string;
  updatedAt: string;
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
}
