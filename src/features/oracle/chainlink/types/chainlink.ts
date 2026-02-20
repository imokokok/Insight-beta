export interface OcrRound {
  roundId: string;
  participatingNodes: number;
  aggregationThreshold: string;
  answer: string;
  startedAt: string;
  updatedAt: string;
}

export interface Operator {
  name: string;
  online: boolean;
  responseTime: number;
  supportedFeeds: string[];
  lastHeartbeat: string | null;
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
