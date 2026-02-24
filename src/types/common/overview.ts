export interface BaseOverviewStats {
  avgLatency?: number;
  lastUpdated?: Date | string;
}

export interface PythOverviewStats extends BaseOverviewStats {
  totalPublishers: number;
  activePublishers: number;
  activePriceFeeds: number;
  avgLatency: number;
}

export interface ChainlinkOverviewStats extends BaseOverviewStats {
  totalFeeds: number;
  activeNodes: number;
  ocrRounds: number;
  avgLatency: number;
}

export interface Api3OverviewStats extends BaseOverviewStats {
  totalAirnodes: number;
  onlineAirnodes: number;
  priceUpdateEvents: number;
  totalDapis: number;
}

export interface BandOverviewStats extends BaseOverviewStats {
  totalFeeds: number;
  activeFeeds: number;
  totalValidators: number;
  avgLatency: number;
}

export type OverviewStats =
  | PythOverviewStats
  | ChainlinkOverviewStats
  | Api3OverviewStats
  | BandOverviewStats;
