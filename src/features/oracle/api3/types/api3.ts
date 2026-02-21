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
