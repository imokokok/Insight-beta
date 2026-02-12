/**
 * Protocol Types - 预言机协议相关类型定义
 */

export type OracleProtocol =
  | 'uma'
  | 'chainlink'
  | 'pyth'
  | 'redstone';

export const ORACLE_PROTOCOLS: OracleProtocol[] = [
  'chainlink',
  'pyth',
  'redstone',
  'uma',
];

export const PROTOCOL_DISPLAY_NAMES: Record<OracleProtocol, string> = {
  chainlink: 'Chainlink',
  pyth: 'Pyth Network',
  redstone: 'RedStone',
  uma: 'UMA',
};

export const PROTOCOL_DESCRIPTIONS: Record<OracleProtocol, string> = {
  chainlink: 'Industry-standard decentralized oracle network',
  pyth: 'Low-latency financial data from institutional sources',
  redstone: 'Modular oracle with on-demand data',
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
  redstone: {
    id: 'redstone',
    name: 'RedStone',
    description: PROTOCOL_DESCRIPTIONS.redstone,
    website: 'https://redstone.finance',
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

export function getProtocolsByCategory(
  category: 'price_feed' | 'optimistic' | 'hybrid',
): OracleProtocol[] {
  return Object.values(PROTOCOL_INFO)
    .filter((p) => p.category === category)
    .map((p) => p.id);
}

export const PRICE_FEED_PROTOCOLS = getProtocolsByCategory('price_feed');

export const OPTIMISTIC_PROTOCOLS = getProtocolsByCategory('optimistic');
