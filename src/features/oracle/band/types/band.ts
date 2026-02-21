export interface Bridge {
  bridgeId: string;
  sourceChain: string;
  destinationChain: string;
  status: 'active' | 'inactive' | 'degraded';
  lastTransferAt: string;
  totalTransfers: number;
  totalVolume: number;
  avgLatencyMs: number;
  successRate: number;
}

export interface DataSource {
  sourceId: string;
  name: string;
  symbol: string;
  chain: string;
  sourceType: 'evm' | 'cosmos';
  status: 'active' | 'inactive';
  updateIntervalSeconds: number;
  lastUpdateAt: string;
  reliabilityScore: number;
  updateFrequency: number;
  lastUpdateLatency: number;
  historicalReliability: number[];
  anomalyCount: number;
}

export interface Transfer {
  transferId: string;
  bridgeId: string;
  sourceChain: string;
  destinationChain: string;
  symbol: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  sourceTxHash: string;
  destinationTxHash?: string;
  latencyMs: number;
  timestamp: string;
}

export interface CosmosChainInfo {
  chainId: string;
  chainName: string;
  rpcUrl: string;
  restUrl: string;
  blockTime: number;
  validators: number;
  features: string[];
}

export interface BandPriceData {
  symbol: string;
  chain: string;
  price: number;
  timestamp: string;
  sourcesCount: number;
  aggregationValid: boolean;
}
