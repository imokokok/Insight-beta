export interface MarketOverviewData {
  healthScore: number;
  activeFeeds: number;
  activeFeedsChange: number;
  updates24h: number;
  deviationDistribution: {
    low: number;
    medium: number;
    high: number;
  };
  protocolCoverage: {
    chainlink: number;
    pyth: number;
    redstone: number;
  };
  recentAnomalies: AnomalySummary[];
}

export interface AnomalySummary {
  id: string;
  type: 'price_spike' | 'deviation' | 'delay' | 'new_feed';
  symbol: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  description: string;
}

export interface TrendingFeed {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  updateFrequency: number;
  favoriteCount: number;
  sources: string[];
  healthStatus: 'healthy' | 'warning' | 'critical';
  lastUpdated: string;
}

export type TrendingSortBy = 'volume' | 'volatility' | 'updateFrequency' | 'popularity';

export interface DiscoveryItem {
  id: string;
  type: 'anomaly' | 'trend' | 'new_feed' | 'activity_change';
  title: string;
  description: string;
  symbol?: string;
  protocol?: string;
  severity?: 'info' | 'warning' | 'critical';
  timestamp: string;
  actionUrl?: string;
}

export interface SearchResult {
  id: string;
  type: 'feed' | 'protocol' | 'address' | 'chain';
  title: string;
  subtitle: string;
  url: string;
  icon?: string;
}

export interface FavoriteItem {
  id: string;
  type: 'feed' | 'address';
  symbol?: string;
  address?: string;
  addedAt: string;
}

export interface HistoryItem {
  id: string;
  type: 'feed' | 'address';
  url: string;
  title: string;
  visitedAt: string;
}

export interface UserPreferences {
  defaultTab: string;
  defaultSortBy: TrendingSortBy;
  theme?: 'light' | 'dark' | 'system';
}
