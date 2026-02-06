/**
 * Protocol Configuration - 协议页面配置
 * 将各协议特有的配置集中管理，避免重复代码
 */

import type { OracleProtocol } from './types';

export interface ProtocolConfig {
  id: OracleProtocol;
  name: string;
  description: string;
  icon: string;
  officialUrl: string;
  supportedChains: string[];
  features: {
    hasNodes: boolean;
    hasPublishers: boolean;
    hasPriceHistory: boolean;
    hasComparison: boolean;
    hasAlerts: boolean;
    hasAnalytics: boolean;
  };
  mockData: {
    feeds: unknown[];
    stats: Record<string, unknown>;
    nodes?: unknown[];
    publishers?: unknown[];
  };
}

// 协议图标映射
export const PROTOCOL_ICONS: Record<OracleProtocol, string> = {
  chainlink: '🔗',
  pyth: '🐍',
  band: '🎸',
  api3: '📡',
  redstone: '💎',
  switchboard: '🎛️',
  flux: '⚡',
  dia: '📊',
  uma: '⚖️',
};

// Chainlink 配置
const chainlinkConfig: ProtocolConfig = {
  id: 'chainlink',
  name: 'Chainlink Monitor',
  description: 'Decentralized Oracle Network Monitoring',
  icon: '🔗',
  officialUrl: 'https://chain.link',
  supportedChains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'avalanche', 'bsc'],
  features: {
    hasNodes: true,
    hasPublishers: false,
    hasPriceHistory: true,
    hasComparison: true,
    hasAlerts: true,
    hasAnalytics: true,
  },
  mockData: {
    feeds: [
      {
        id: 'eth-usd',
        name: 'ETH / USD',
        symbol: 'ETH/USD',
        price: 3254.78,
        decimals: 8,
        updatedAt: new Date(Date.now() - 120000).toISOString(),
        roundId: '123456789',
        answeredInRound: '123456789',
        chain: 'ethereum',
        contractAddress: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
        heartbeat: 3600,
        deviationThreshold: 0.5,
        status: 'active',
      },
      {
        id: 'btc-usd',
        name: 'BTC / USD',
        symbol: 'BTC/USD',
        price: 67432.15,
        decimals: 8,
        updatedAt: new Date(Date.now() - 180000).toISOString(),
        roundId: '987654321',
        answeredInRound: '987654321',
        chain: 'ethereum',
        contractAddress: '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c',
        heartbeat: 3600,
        deviationThreshold: 0.5,
        status: 'active',
      },
      {
        id: 'link-usd',
        name: 'LINK / USD',
        symbol: 'LINK/USD',
        price: 18.45,
        decimals: 8,
        updatedAt: new Date(Date.now() - 3600000).toISOString(),
        roundId: '456789123',
        answeredInRound: '456789123',
        chain: 'ethereum',
        contractAddress: '0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c',
        heartbeat: 3600,
        deviationThreshold: 1.0,
        status: 'stale',
      },
    ],
    nodes: [
      {
        id: 'node-1',
        name: 'Chainlink Labs 1',
        address: '0x1234567890abcdef1234567890abcdef12345678',
        status: 'active',
        lastUpdate: new Date(Date.now() - 60000).toISOString(),
        totalSubmissions: 15420,
        accuracy: 99.8,
        lastSubmission: new Date(Date.now() - 60000).toISOString(),
        successRate: 99.8,
        totalRequests: 15420,
      },
      {
        id: 'node-2',
        name: 'Chainlink Labs 2',
        address: '0xabcdef1234567890abcdef1234567890abcdef12',
        status: 'active',
        lastUpdate: new Date(Date.now() - 90000).toISOString(),
        totalSubmissions: 12350,
        accuracy: 99.5,
        lastSubmission: new Date(Date.now() - 90000).toISOString(),
        successRate: 99.5,
        totalRequests: 12350,
      },
      {
        id: 'node-3',
        name: 'Independent Node A',
        address: '0x9876543210fedcba9876543210fedcba98765432',
        status: 'inactive',
        lastUpdate: new Date(Date.now() - 86400000).toISOString(),
        totalSubmissions: 8750,
        accuracy: 97.2,
        lastSubmission: new Date(Date.now() - 86400000).toISOString(),
        successRate: 97.2,
        totalRequests: 8750,
      },
    ],
    stats: {
      totalFeeds: 150,
      activeFeeds: 147,
      staleFeeds: 3,
      totalNodes: 25,
      avgUpdateLatency: 45000,
      networkUptime: 99.9,
      totalSubmissions: 500000,
    },
  },
};

// Pyth 配置
const pythConfig: ProtocolConfig = {
  id: 'pyth',
  name: 'Pyth Network Monitor',
  description: 'Low-Latency Financial Data Oracle',
  icon: '🐍',
  officialUrl: 'https://pyth.network',
  supportedChains: ['ethereum', 'solana', 'arbitrum', 'optimism', 'base', 'avalanche', 'polygon'],
  features: {
    hasNodes: false,
    hasPublishers: true,
    hasPriceHistory: true,
    hasComparison: true,
    hasAlerts: true,
    hasAnalytics: true,
  },
  mockData: {
    feeds: [
      {
        id: 'btc-usd',
        name: 'BTC / USD',
        symbol: 'BTC/USD',
        price: 67432.15,
        decimals: 8,
        updatedAt: new Date(Date.now() - 30000).toISOString(),
        chain: 'solana',
        status: 'active',
        confidence: 0.05,
        sources: 12,
        publishTime: new Date(Date.now() - 30000).toISOString(),
      },
      {
        id: 'eth-usd',
        name: 'ETH / USD',
        symbol: 'ETH/USD',
        price: 3254.78,
        decimals: 8,
        updatedAt: new Date(Date.now() - 45000).toISOString(),
        chain: 'solana',
        status: 'active',
        confidence: 0.02,
        sources: 15,
        publishTime: new Date(Date.now() - 45000).toISOString(),
      },
      {
        id: 'sol-usd',
        name: 'SOL / USD',
        symbol: 'SOL/USD',
        price: 98.45,
        decimals: 8,
        updatedAt: new Date(Date.now() - 120000).toISOString(),
        chain: 'solana',
        status: 'stale',
        confidence: 0.03,
        sources: 8,
        publishTime: new Date(Date.now() - 120000).toISOString(),
      },
    ],
    publishers: [
      {
        id: 'pub-1',
        name: 'Jump Crypto',
        status: 'active',
        lastPublish: new Date(Date.now() - 30000).toISOString(),
        accuracy: 99.9,
        totalPublishes: 500000,
      },
      {
        id: 'pub-2',
        name: 'Wintermute',
        status: 'active',
        lastPublish: new Date(Date.now() - 45000).toISOString(),
        accuracy: 99.8,
        totalPublishes: 450000,
      },
    ],
    stats: {
      totalFeeds: 400,
      activeFeeds: 398,
      staleFeeds: 2,
      totalNodes: 80,
      avgUpdateLatency: 15000,
      networkUptime: 99.95,
      totalPublishers: 80,
      avgConfidence: 0.03,
    },
  },
};

// 其他协议的简化配置
const createBasicConfig = (
  id: OracleProtocol,
  name: string,
  description: string,
  officialUrl: string,
  supportedChains: string[],
): ProtocolConfig => ({
  id,
  name: `${name} Monitor`,
  description,
  icon: PROTOCOL_ICONS[id],
  officialUrl,
  supportedChains,
  features: {
    hasNodes: false,
    hasPublishers: false,
    hasPriceHistory: true,
    hasComparison: true,
    hasAlerts: true,
    hasAnalytics: false,
  },
  mockData: {
    feeds: [
      {
        id: 'eth-usd',
        name: 'ETH / USD',
        symbol: 'ETH/USD',
        price: 3254.78,
        decimals: 8,
        updatedAt: new Date(Date.now() - 120000).toISOString(),
        chain: supportedChains[0],
        status: 'active',
      },
      {
        id: 'btc-usd',
        name: 'BTC / USD',
        symbol: 'BTC/USD',
        price: 67432.15,
        decimals: 8,
        updatedAt: new Date(Date.now() - 180000).toISOString(),
        chain: supportedChains[0],
        status: 'active',
      },
    ],
    stats: {
      totalFeeds: 50,
      activeFeeds: 48,
      staleFeeds: 2,
      totalNodes: 10,
      avgUpdateLatency: 60000,
      networkUptime: 99.5,
    },
  },
});

// 所有协议配置
export const PROTOCOL_CONFIGS: Record<OracleProtocol, ProtocolConfig> = {
  chainlink: chainlinkConfig,
  pyth: pythConfig,
  band: createBasicConfig(
    'band',
    'Band Protocol',
    'Cross-chain Data Oracle Platform',
    'https://bandprotocol.com',
    ['ethereum', 'polygon', 'arbitrum', 'optimism'],
  ),
  api3: createBasicConfig('api3', 'API3', 'First-Party Oracle with Airnode', 'https://api3.org', [
    'ethereum',
    'polygon',
    'arbitrum',
    'optimism',
  ]),
  redstone: createBasicConfig(
    'redstone',
    'RedStone',
    'Modular Oracle with On-Demand Data',
    'https://redstone.finance',
    ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'],
  ),
  switchboard: createBasicConfig(
    'switchboard',
    'Switchboard',
    'Solana and EVM Compatible Oracle',
    'https://switchboard.xyz',
    ['ethereum', 'polygon', 'arbitrum', 'optimism', 'solana'],
  ),
  flux: createBasicConfig(
    'flux',
    'Flux',
    'Decentralized Oracle Aggregator',
    'https://fluxprotocol.org',
    ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'avalanche', 'bsc', 'fantom'],
  ),
  dia: createBasicConfig(
    'dia',
    'DIA',
    'Transparent and Verifiable Data Feeds',
    'https://diadata.org',
    ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'],
  ),
  uma: createBasicConfig(
    'uma',
    'UMA',
    'Optimistic Oracle for Custom Data',
    'https://umaproject.org',
    ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'],
  ),
};

// 获取协议配置
export function getProtocolConfig(protocol: OracleProtocol): ProtocolConfig {
  return PROTOCOL_CONFIGS[protocol];
}
