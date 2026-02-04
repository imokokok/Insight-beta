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
  'uma',
  'chainlink',
  'pyth',
  'band',
  'api3',
  'redstone',
  'switchboard',
  'flux',
  'dia',
];

export const PROTOCOL_DISPLAY_NAMES: Record<OracleProtocol, string> = {
  uma: 'UMA',
  chainlink: 'Chainlink',
  pyth: 'Pyth Network',
  band: 'Band Protocol',
  api3: 'API3',
  redstone: 'RedStone',
  switchboard: 'Switchboard',
  flux: 'Flux',
  dia: 'DIA',
};

export const PROTOCOL_DESCRIPTIONS: Record<OracleProtocol, string> = {
  uma: 'Optimistic Oracle with assertion and dispute mechanisms',
  chainlink: 'Industry-standard decentralized oracle network',
  pyth: 'Low-latency financial data from institutional sources',
  band: 'Cross-chain data oracle platform',
  api3: 'First-party oracle with Airnode',
  redstone: 'Modular oracle with on-demand data',
  switchboard: 'Solana and EVM compatible oracle network',
  flux: 'Decentralized oracle aggregator',
  dia: 'Transparent and verifiable data feeds',
};

export const SUPPORTED_ASSERTION_PROTOCOLS: OracleProtocol[] = ['uma'];

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
};

export const PROTOCOL_INFO: Record<OracleProtocol, OracleProtocolInfo> = {
  uma: {
    id: 'uma',
    name: 'UMA',
    description: PROTOCOL_DESCRIPTIONS.uma,
    website: 'https://umaproject.org',
    supportedChains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'],
    features: ['price_feeds', 'dispute_resolution', 'governance'],
  },
  chainlink: {
    id: 'chainlink',
    name: 'Chainlink',
    description: PROTOCOL_DESCRIPTIONS.chainlink,
    website: 'https://chain.link',
    supportedChains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'avalanche', 'bsc'],
    features: ['price_feeds', 'randomness', 'automation', 'ccip', 'functions'],
  },
  pyth: {
    id: 'pyth',
    name: 'Pyth Network',
    description: PROTOCOL_DESCRIPTIONS.pyth,
    website: 'https://pyth.network',
    supportedChains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'avalanche', 'solana'],
    features: ['price_feeds'],
  },
  band: {
    id: 'band',
    name: 'Band Protocol',
    description: PROTOCOL_DESCRIPTIONS.band,
    website: 'https://bandprotocol.com',
    supportedChains: ['ethereum', 'polygon', 'arbitrum', 'optimism'],
    features: ['price_feeds'],
  },
  api3: {
    id: 'api3',
    name: 'API3',
    description: PROTOCOL_DESCRIPTIONS.api3,
    website: 'https://api3.org',
    supportedChains: ['ethereum', 'polygon', 'arbitrum', 'optimism'],
    features: ['price_feeds'],
  },
  redstone: {
    id: 'redstone',
    name: 'RedStone',
    description: PROTOCOL_DESCRIPTIONS.redstone,
    website: 'https://redstone.finance',
    supportedChains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'],
    features: ['price_feeds'],
  },
  switchboard: {
    id: 'switchboard',
    name: 'Switchboard',
    description: PROTOCOL_DESCRIPTIONS.switchboard,
    website: 'https://switchboard.xyz',
    supportedChains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'solana'],
    features: ['price_feeds', 'randomness'],
  },
  flux: {
    id: 'flux',
    name: 'Flux',
    description: PROTOCOL_DESCRIPTIONS.flux,
    website: 'https://fluxprotocol.org',
    supportedChains: ['ethereum', 'polygon', 'arbitrum'],
    features: ['price_feeds'],
  },
  dia: {
    id: 'dia',
    name: 'DIA',
    description: PROTOCOL_DESCRIPTIONS.dia,
    website: 'https://diadata.org',
    supportedChains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'],
    features: ['price_feeds'],
  },
};
