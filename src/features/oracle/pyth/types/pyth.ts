export interface Publisher {
  name: string;
  trustScore: number;
  publishFrequency: number;
  supportedSymbols: string[];
  status: 'active' | 'inactive';
  lastPublish: string;
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
