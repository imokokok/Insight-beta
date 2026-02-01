/**
 * Chain Types - 区块链网络相关类型定义
 */

import type { OracleProtocol } from './protocol';

export type SupportedChain =
  | 'ethereum'
  | 'polygon'
  | 'arbitrum'
  | 'optimism'
  | 'base'
  | 'avalanche'
  | 'bsc'
  | 'fantom'
  | 'celo'
  | 'gnosis'
  | 'linea'
  | 'scroll'
  | 'mantle'
  | 'mode'
  | 'blast'
  | 'solana'
  | 'near'
  | 'aptos'
  | 'sui'
  | 'polygonAmoy'
  | 'sepolia'
  | 'goerli'
  | 'mumbai'
  | 'local';

export type ChainInfo = {
  id: SupportedChain;
  name: string;
  nativeCurrency: string;
  chainId: number;
  explorerUrl: string;
  rpcUrls: string[];
  isTestnet: boolean;
  supportedProtocols: OracleProtocol[];
};

export type OracleChain = 'Polygon' | 'PolygonAmoy' | 'Arbitrum' | 'Optimism' | 'Local';
export type UMAChain = 'Ethereum' | 'Polygon' | 'Arbitrum' | 'Optimism' | 'Base' | 'PolygonAmoy';

export const CHAIN_DISPLAY_NAMES: Record<SupportedChain, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  arbitrum: 'Arbitrum',
  optimism: 'Optimism',
  base: 'Base',
  avalanche: 'Avalanche',
  bsc: 'BNB Chain',
  fantom: 'Fantom',
  celo: 'Celo',
  gnosis: 'Gnosis',
  linea: 'Linea',
  scroll: 'Scroll',
  mantle: 'Mantle',
  mode: 'Mode',
  blast: 'Blast',
  solana: 'Solana',
  near: 'NEAR',
  aptos: 'Aptos',
  sui: 'Sui',
  polygonAmoy: 'Polygon Amoy',
  sepolia: 'Sepolia',
  goerli: 'Goerli',
  mumbai: 'Mumbai',
  local: 'Local',
};

export const CHAIN_IDS: Record<SupportedChain, number> = {
  ethereum: 1,
  polygon: 137,
  arbitrum: 42161,
  optimism: 10,
  base: 8453,
  avalanche: 43114,
  bsc: 56,
  fantom: 250,
  celo: 42220,
  gnosis: 100,
  linea: 59144,
  scroll: 534352,
  mantle: 5000,
  mode: 34443,
  blast: 81457,
  solana: 0,
  near: 0,
  aptos: 0,
  sui: 0,
  polygonAmoy: 80002,
  sepolia: 11155111,
  goerli: 5,
  mumbai: 80001,
  local: 1337,
};
