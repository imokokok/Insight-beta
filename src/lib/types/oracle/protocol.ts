/**
 * Protocol Types - 预言机协议相关类型定义
 */

export type OracleProtocol =
  | 'uma'
  | 'chainlink'
  | 'pyth'
  | 'band'
  | 'api3'
  | 'redstone'
  | 'switchboard'
  | 'flux'
  | 'dia';

export const ORACLE_PROTOCOLS: OracleProtocol[] = [
  'chainlink',
  'pyth',
  'band',
  'api3',
  'redstone',
  'switchboard',
  'flux',
  'dia',
  'uma',
];

export const PROTOCOL_DISPLAY_NAMES: Record<OracleProtocol, string> = {
  chainlink: 'Chainlink',
  pyth: 'Pyth Network',
  band: 'Band Protocol',
  api3: 'API3',
  redstone: 'RedStone',
  switchboard: 'Switchboard',
  flux: 'Flux',
  dia: 'DIA',
  uma: 'UMA',
};

export const PROTOCOL_DESCRIPTIONS: Record<OracleProtocol, string> = {
  chainlink: 'Industry-standard decentralized oracle network',
  pyth: 'Low-latency financial data from institutional sources',
  band: 'Cross-chain data oracle platform',
  api3: 'First-party oracle with Airnode',
  redstone: 'Modular oracle with on-demand data',
  switchboard: 'Solana and EVM compatible oracle network',
  flux: 'Decentralized oracle aggregator',
  dia: 'Transparent and verifiable data feeds',
  uma: 'Optimistic oracle for custom data verification',
};

export type OracleFeature =
  | 'price_feeds'
  | 'randomness'
  | 'automation'
  | 'ccip'
  | 'functions'
  | 'proof_of_reserve'
  | 'dispute_resolution'
  | 'staking'
  | 'governance';

export type OracleProtocolInfo = {
  id: OracleProtocol;
  name: string;
  description: string;
  logoUrl?: string;
  website: string;
  supportedChains: string[];
  features: OracleFeature[];
  tvl?: number;
  marketShare?: number;
  // 协议类别
  category: 'price_feed' | 'optimistic' | 'hybrid';
};

export const PROTOCOL_INFO: Record<OracleProtocol, OracleProtocolInfo> = {
  chainlink: {
    id: 'chainlink',
    name: 'Chainlink',
    description: PROTOCOL_DESCRIPTIONS.chainlink,
    website: 'https://chain.link',
    supportedChains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'avalanche', 'bsc'],
    features: ['price_feeds', 'randomness', 'automation', 'ccip', 'functions'],
    category: 'price_feed',
  },
  pyth: {
    id: 'pyth',
    name: 'Pyth Network',
    description: PROTOCOL_DESCRIPTIONS.pyth,
    website: 'https://pyth.network',
    supportedChains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'avalanche', 'solana'],
    features: ['price_feeds'],
    category: 'price_feed',
  },
  band: {
    id: 'band',
    name: 'Band Protocol',
    description: PROTOCOL_DESCRIPTIONS.band,
    website: 'https://bandprotocol.com',
    supportedChains: ['ethereum', 'polygon', 'arbitrum', 'optimism'],
    features: ['price_feeds'],
    category: 'price_feed',
  },
  api3: {
    id: 'api3',
    name: 'API3',
    description: PROTOCOL_DESCRIPTIONS.api3,
    website: 'https://api3.org',
    supportedChains: ['ethereum', 'polygon', 'arbitrum', 'optimism'],
    features: ['price_feeds'],
    category: 'price_feed',
  },
  redstone: {
    id: 'redstone',
    name: 'RedStone',
    description: PROTOCOL_DESCRIPTIONS.redstone,
    website: 'https://redstone.finance',
    supportedChains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'],
    features: ['price_feeds'],
    category: 'price_feed',
  },
  switchboard: {
    id: 'switchboard',
    name: 'Switchboard',
    description: PROTOCOL_DESCRIPTIONS.switchboard,
    website: 'https://switchboard.xyz',
    supportedChains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'solana'],
    features: ['price_feeds', 'randomness'],
    category: 'price_feed',
  },
  flux: {
    id: 'flux',
    name: 'Flux',
    description: PROTOCOL_DESCRIPTIONS.flux,
    website: 'https://fluxprotocol.org',
    supportedChains: [
      'ethereum',
      'polygon',
      'arbitrum',
      'optimism',
      'base',
      'avalanche',
      'bsc',
      'fantom',
    ],
    features: ['price_feeds'],
    category: 'price_feed',
  },
  dia: {
    id: 'dia',
    name: 'DIA',
    description: PROTOCOL_DESCRIPTIONS.dia,
    website: 'https://diadata.org',
    supportedChains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'],
    features: ['price_feeds'],
    category: 'price_feed',
  },
  uma: {
    id: 'uma',
    name: 'UMA',
    description: PROTOCOL_DESCRIPTIONS.uma,
    website: 'https://umaproject.org',
    supportedChains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'],
    features: ['price_feeds', 'dispute_resolution', 'governance'],
    category: 'optimistic',
  },
};

// 按类别获取协议
export function getProtocolsByCategory(
  category: 'price_feed' | 'optimistic' | 'hybrid',
): OracleProtocol[] {
  return Object.values(PROTOCOL_INFO)
    .filter((p) => p.category === category)
    .map((p) => p.id);
}

// 获取所有价格预言机
export const PRICE_FEED_PROTOCOLS = getProtocolsByCategory('price_feed');

// 获取所有乐观预言机
export const OPTIMISTIC_PROTOCOLS = getProtocolsByCategory('optimistic');
