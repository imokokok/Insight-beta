import type { ChainId } from '@/config/chains';
import type { Operator } from '@/features/oracle/chainlink/types/chainlink';
import { calculateReliabilityScore } from '@/features/oracle/chainlink/utils/reliabilityScore';
import { POPULAR_FEEDS } from '@/lib/blockchain/chainlinkDataFeeds';
import type { ChainlinkStats, PythStats } from '@/types/stats';

export type { ChainlinkStats, PythStats };

export interface Feed {
  symbol: string;
  pair: string;
  latestPrice: string;
  heartbeat: number;
  deviationThreshold: string;
  aggregatorAddress: string;
  decimals: number;
  lastUpdate: string;
  isStale?: boolean;
  stalenessSeconds?: number;
}

export interface OverviewFeed {
  pair: string;
  status: string;
  decimals: number;
  lastUpdate: string;
}

export interface ChainlinkOverviewResponse {
  feeds: OverviewFeed[];
  metadata: {
    totalFeeds: number;
    activeFeeds: number;
    supportedChains: string[];
  };
}

export interface Publisher {
  name: string;
  trustScore: number;
  publishFrequency: number;
  supportedSymbols: string[];
  status: 'active' | 'inactive';
  lastPublish: string;
}

export interface HermesService {
  name: string;
  url: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  supportedChains: string[];
  uptime: number;
}

const CHAINLINK_MOCK_PRICES: Record<string, number> = {
  ETH: 2345.67,
  BTC: 67890.12,
  LINK: 14.56,
  USDC: 1.0001,
  USDT: 0.9999,
  DAI: 1.0002,
  AAVE: 92.45,
  UNI: 6.78,
  MATIC: 0.89,
  AVAX: 35.67,
  BNB: 312.45,
  FTM: 0.45,
  ARB: 1.23,
  OP: 2.45,
};

const CHAINLINK_SUPPORTED_CHAINS = [
  'Ethereum',
  'Polygon',
  'Arbitrum',
  'Optimism',
  'Avalanche',
  'BSC',
  'Base',
  'Fantom',
  'Gnosis',
  'Scroll',
  'Mantle',
  'Linea',
];

const CHAINLINK_FEED_PAIRS = [
  'ETH/USD',
  'BTC/USD',
  'LINK/USD',
  'USDC/USD',
  'USDT/USD',
  'DAI/USD',
  'AAVE/USD',
  'UNI/USD',
  'MATIC/USD',
  'AVAX/USD',
  'BNB/USD',
  'ARB/USD',
  'OP/USD',
  'ATOM/USD',
  'SOL/USD',
];

const CHAINLINK_OPERATOR_DATA = [
  {
    name: 'Chainlink Labs',
    baseFeeds: ['ETH/USD', 'BTC/USD', 'LINK/USD', 'USDC/USD'],
    baseUptime: 99.95,
    baseResponse: 85,
  },
  {
    name: 'Oracle Cloud Infrastructure',
    baseFeeds: ['ETH/USD', 'BTC/USD', 'LINK/USD'],
    baseUptime: 99.92,
    baseResponse: 95,
  },
  {
    name: 'Blockdaemon',
    baseFeeds: ['ETH/USD', 'BTC/USD', 'USDC/USD', 'USDT/USD', 'DAI/USD'],
    baseUptime: 99.88,
    baseResponse: 105,
  },
  {
    name: 'Figment',
    baseFeeds: ['ETH/USD', 'BTC/USD', 'LINK/USD', 'EUR/USD'],
    baseUptime: 99.85,
    baseResponse: 115,
  },
  {
    name: 'Staked.us',
    baseFeeds: ['ETH/USD', 'BTC/USD', 'USDC/USD'],
    baseUptime: 99.78,
    baseResponse: 125,
  },
  {
    name: 'Bison Trails (Coinbase Cloud)',
    baseFeeds: ['ETH/USD', 'BTC/USD', 'LINK/USD', 'USDT/USD', 'DAI/USD', 'GBP/USD'],
    baseUptime: 99.9,
    baseResponse: 90,
  },
  { name: 'P2P.org', baseFeeds: ['ETH/USD', 'BTC/USD'], baseUptime: 99.7, baseResponse: 135 },
  {
    name: 'Kiln',
    baseFeeds: ['ETH/USD', 'BTC/USD', 'LINK/USD', 'USDC/USD'],
    baseUptime: 99.82,
    baseResponse: 110,
  },
  {
    name: 'Everstake',
    baseFeeds: ['ETH/USD', 'BTC/USD', 'USDT/USD'],
    baseUptime: 99.75,
    baseResponse: 120,
  },
  {
    name: 'Chorus One',
    baseFeeds: ['ETH/USD', 'BTC/USD', 'LINK/USD', 'EUR/USD', 'GBP/USD'],
    baseUptime: 99.8,
    baseResponse: 100,
  },
];

const PYTH_PUBLISHERS_DATA: Publisher[] = [
  {
    name: 'Binance',
    trustScore: 98,
    publishFrequency: 3600,
    supportedSymbols: ['BTC/USD', 'ETH/USD', 'BNB/USD', 'SOL/USD'],
    status: 'active',
    lastPublish: new Date(Date.now() - 5000).toISOString(),
  },
  {
    name: 'OKX',
    trustScore: 95,
    publishFrequency: 3200,
    supportedSymbols: ['BTC/USD', 'ETH/USD', 'OKB/USD', 'DOGE/USD'],
    status: 'active',
    lastPublish: new Date(Date.now() - 8000).toISOString(),
  },
  {
    name: 'Bybit',
    trustScore: 92,
    publishFrequency: 2800,
    supportedSymbols: ['BTC/USD', 'ETH/USD', 'BIT/USD'],
    status: 'active',
    lastPublish: new Date(Date.now() - 3000).toISOString(),
  },
  {
    name: 'Coinbase',
    trustScore: 97,
    publishFrequency: 3500,
    supportedSymbols: ['BTC/USD', 'ETH/USD', 'SOL/USD', 'AVAX/USD'],
    status: 'active',
    lastPublish: new Date(Date.now() - 2000).toISOString(),
  },
  {
    name: 'Kraken',
    trustScore: 94,
    publishFrequency: 3000,
    supportedSymbols: ['BTC/USD', 'ETH/USD', 'DOT/USD', 'KSM/USD'],
    status: 'active',
    lastPublish: new Date(Date.now() - 6000).toISOString(),
  },
  {
    name: 'FTX',
    trustScore: 45,
    publishFrequency: 0,
    supportedSymbols: ['BTC/USD', 'ETH/USD'],
    status: 'inactive',
    lastPublish: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    name: 'Huobi',
    trustScore: 88,
    publishFrequency: 2400,
    supportedSymbols: ['BTC/USD', 'ETH/USD', 'HT/USD', 'TRX/USD'],
    status: 'active',
    lastPublish: new Date(Date.now() - 4000).toISOString(),
  },
  {
    name: 'Gate.io',
    trustScore: 85,
    publishFrequency: 2200,
    supportedSymbols: ['BTC/USD', 'ETH/USD', 'GT/USD'],
    status: 'active',
    lastPublish: new Date(Date.now() - 7000).toISOString(),
  },
];

const HERMES_SERVICES_DATA: HermesService[] = [
  {
    name: 'Hermes Mainnet Primary',
    url: 'https://hermes.pyth.network',
    status: 'healthy',
    responseTime: 45,
    supportedChains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'base'],
    uptime: 99.95,
  },
  {
    name: 'Hermes Mainnet Backup',
    url: 'https://hermes-backup.pyth.network',
    status: 'healthy',
    responseTime: 52,
    supportedChains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism'],
    uptime: 99.87,
  },
  {
    name: 'Hermes Asia Pacific',
    url: 'https://hermes-ap.pyth.network',
    status: 'healthy',
    responseTime: 38,
    supportedChains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'avalanche', 'base'],
    uptime: 99.92,
  },
  {
    name: 'Hermes Europe',
    url: 'https://hermes-eu.pyth.network',
    status: 'degraded',
    responseTime: 125,
    supportedChains: ['ethereum', 'polygon', 'arbitrum'],
    uptime: 98.45,
  },
  {
    name: 'Hermes Testnet',
    url: 'https://hermes-testnet.pyth.network',
    status: 'healthy',
    responseTime: 68,
    supportedChains: ['ethereum-sepolia', 'polygon-mumbai', 'arbitrum-sepolia'],
    uptime: 99.78,
  },
  {
    name: 'Hermes Solana',
    url: 'https://hermes-solana.pyth.network',
    status: 'healthy',
    responseTime: 42,
    supportedChains: ['solana-mainnet', 'solana-devnet'],
    uptime: 99.89,
  },
];

export function getChainlinkMockStats(): ChainlinkStats {
  return {
    totalFeeds: 1247,
    activeFeeds: 1200,
    activeNodes: 42,
    ocrRounds: 156832,
    avgLatency: 245,
    generatedAt: new Date().toISOString(),
  };
}

export function getPythMockStats(): PythStats {
  return {
    totalFeeds: 356,
    activeFeeds: 350,
    totalPublishers: 28,
    activePublishers: 24,
    activePriceFeeds: 356,
    avgLatency: 245,
    generatedAt: new Date().toISOString(),
  };
}

export function getChainlinkMockFeeds(chain?: ChainId): Feed[] {
  const chainFeeds = chain ? POPULAR_FEEDS[chain] : POPULAR_FEEDS.ethereum;
  const feedEntries = Object.entries(chainFeeds || {});

  if (feedEntries.length === 0) {
    const defaultFeedData = [
      { symbol: 'ETH', pair: 'ETH/USD', price: 2345.67, decimals: 8 },
      { symbol: 'BTC', pair: 'BTC/USD', price: 67890.12, decimals: 8 },
      { symbol: 'LINK', pair: 'LINK/USD', price: 14.56, decimals: 8 },
      { symbol: 'USDC', pair: 'USDC/USD', price: 1.0001, decimals: 8 },
      { symbol: 'USDT', pair: 'USDT/USD', price: 0.9999, decimals: 8 },
      { symbol: 'DAI', pair: 'DAI/USD', price: 1.0002, decimals: 8 },
    ];

    return defaultFeedData.map((data, index) => ({
      symbol: data.symbol,
      pair: data.pair,
      latestPrice: data.price.toFixed(data.decimals),
      heartbeat: [60000, 300000, 600000, 3600000][index % 4] ?? 60000,
      deviationThreshold: ['0.5%', '1%', '2%', '0.25%'][index % 4] ?? '0.5%',
      aggregatorAddress: `0x${(index + 1).toString(16).padStart(40, '0')}`,
      decimals: data.decimals,
      lastUpdate: new Date(Date.now() - Math.floor(Math.random() * 600000)).toISOString(),
    }));
  }

  return feedEntries.map(([pair, address], index) => {
    const [base = 'UNKNOWN'] = pair.split('/');
    const mockPrice = getChainlinkMockPriceForSymbol(base);
    return {
      symbol: base,
      pair,
      latestPrice: mockPrice.toFixed(8),
      heartbeat: [60000, 300000, 600000, 3600000][index % 4] ?? 60000,
      deviationThreshold: ['0.5%', '1%', '2%', '0.25%'][index % 4] ?? '0.5%',
      aggregatorAddress: address as string,
      decimals: 8,
      lastUpdate: new Date(Date.now() - Math.floor(Math.random() * 600000)).toISOString(),
    };
  });
}

export function getChainlinkMockPriceForSymbol(symbol: string): number {
  return CHAINLINK_MOCK_PRICES[symbol] ?? 1.0;
}

export function getChainlinkMockOverview(): ChainlinkOverviewResponse {
  const feeds: OverviewFeed[] = CHAINLINK_FEED_PAIRS.map((pair) => ({
    pair,
    status: Math.random() > 0.05 ? 'active' : 'inactive',
    decimals: 8,
    lastUpdate: new Date(Date.now() - Math.floor(Math.random() * 600000)).toISOString(),
  }));

  const activeFeeds = feeds.filter((f) => f.status === 'active').length;

  return {
    feeds,
    metadata: {
      totalFeeds: feeds.length,
      activeFeeds,
      supportedChains: CHAINLINK_SUPPORTED_CHAINS,
    },
  };
}

export function getChainlinkMockOperators(): Operator[] {
  const feedTypes = [
    'ETH/USD',
    'BTC/USD',
    'LINK/USD',
    'USDC/USD',
    'USDT/USD',
    'DAI/USD',
    'EUR/USD',
    'GBP/USD',
    'AUD/USD',
    'JPY/USD',
  ];

  return CHAINLINK_OPERATOR_DATA.map((data) => {
    const online = Math.random() > 0.03;
    const additionalFeeds = feedTypes.filter((f) => !data.baseFeeds.includes(f));
    const randomExtraFeeds = additionalFeeds
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.floor(Math.random() * 3));
    const supportedFeeds = [...data.baseFeeds, ...randomExtraFeeds].sort();

    const uptimeVariation = (Math.random() - 0.5) * 0.4;
    const uptimePercentage = online
      ? Math.min(100, Math.max(95, data.baseUptime + uptimeVariation))
      : Math.random() * 20 + 5;

    const responseVariation = (Math.random() - 0.5) * 40;
    const responseTime = online
      ? Math.max(50, Math.floor(data.baseResponse + responseVariation))
      : 0;

    const operator: Operator = {
      name: data.name,
      online,
      responseTime,
      supportedFeeds,
      lastHeartbeat: online
        ? new Date(Date.now() - Math.floor(Math.random() * 120000)).toISOString()
        : new Date(Date.now() - Math.floor(Math.random() * 86400000)).toISOString(),
      uptimePercentage,
    };

    operator.reliabilityScore = calculateReliabilityScore(operator);

    return operator;
  });
}

export function getPythMockPublishers(): Publisher[] {
  return PYTH_PUBLISHERS_DATA;
}

export function getPythMockHermesServices(): HermesService[] {
  return HERMES_SERVICES_DATA;
}
