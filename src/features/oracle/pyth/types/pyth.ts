export interface PriceSourceDistribution {
  name: string;
  value: number;
  color: string;
}

export interface ActiveTimeStats {
  onlinePercentage: number;
  totalHours: number;
  activeHours: number;
  inactiveHours: number;
}

export interface Publisher {
  name: string;
  trustScore: number;
  publishFrequency: number;
  supportedSymbols: string[];
  status: 'active' | 'inactive';
  lastPublish: string;
  priceSourceDistribution: PriceSourceDistribution[];
  activeTimeStats: ActiveTimeStats;
}

export interface PriceUpdate {
  symbol: string;
  price: string;
  confidence: string;
  publishTime: string;
  publisher: string;
  emaPrice: string;
}

export interface HermesService {
  name: string;
  url: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  supportedChains: string[];
  uptime: number;
}

export interface PythPublisherResponse {
  publishers: Publisher[];
  total: number;
}

export interface PythPriceUpdateResponse {
  updates: PriceUpdate[];
  total: number;
}

export interface PythHermesResponse {
  services: HermesService[];
  total: number;
}

export interface ConfidenceHistoryPoint {
  timestamp: string;
  symbol: string;
  confidence: number;
  avgConfidence: number;
  isAnomaly: boolean;
}

export interface ConfidenceHistoryResponse {
  data: ConfidenceHistoryPoint[];
  metadata: {
    total: number;
    anomalies: number;
    symbol: string;
  };
}

export interface PublisherHistoryPoint {
  timestamp: string;
  publisherName: string;
  trustScore: number;
  avgTrustScore: number;
  isAnomaly: boolean;
}

export interface PublisherHistoryResponse {
  data: PublisherHistoryPoint[];
  metadata: {
    total: number;
    anomalies: number;
    publisher: string;
  };
}
