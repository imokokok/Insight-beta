/**
 * Unified Chain Configuration - 统一的链配置索引
 *
 * 集中管理所有链相关的类型和配置
 */

// ============================================================================
// 链类型定义
// ============================================================================

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

// ============================================================================
// 链显示名称
// ============================================================================

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

// ============================================================================
// 链 ID
// ============================================================================

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

// ============================================================================
// 支持的链列表（带图标）
// ============================================================================

export const SUPPORTED_CHAINS = [
  { id: 'ethereum', name: 'Ethereum', icon: '⬡' },
  { id: 'polygon', name: 'Polygon', icon: '💜' },
  { id: 'arbitrum', name: 'Arbitrum', icon: '🔷' },
  { id: 'optimism', name: 'Optimism', icon: '🔴' },
  { id: 'base', name: 'Base', icon: '🔵' },
  { id: 'avalanche', name: 'Avalanche', icon: '❄️' },
  { id: 'bsc', name: 'BSC', icon: '🟡' },
  { id: 'solana', name: 'Solana', icon: '◎' },
  { id: 'near', name: 'NEAR', icon: '🌐' },
] as const;

// ============================================================================
// 链元数据
// ============================================================================

export type ChainMetadata = {
  name: string;
  chainId: number;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorerUrl: string;
};

export const CHAIN_METADATA: Record<SupportedChain, ChainMetadata> = {
  ethereum: {
    name: 'Ethereum',
    chainId: 1,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrl: 'https://etherscan.io',
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    blockExplorerUrl: 'https://polygonscan.com',
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrl: 'https://arbiscan.io',
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrl: 'https://optimistic.etherscan.io',
  },
  base: {
    name: 'Base',
    chainId: 8453,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrl: 'https://basescan.org',
  },
  avalanche: {
    name: 'Avalanche',
    chainId: 43114,
    nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
    blockExplorerUrl: 'https://snowtrace.io',
  },
  bsc: {
    name: 'BNB Smart Chain',
    chainId: 56,
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    blockExplorerUrl: 'https://bscscan.com',
  },
  fantom: {
    name: 'Fantom',
    chainId: 250,
    nativeCurrency: { name: 'FTM', symbol: 'FTM', decimals: 18 },
    blockExplorerUrl: 'https://ftmscan.com',
  },
  celo: {
    name: 'Celo',
    chainId: 42220,
    nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
    blockExplorerUrl: 'https://celoscan.io',
  },
  gnosis: {
    name: 'Gnosis',
    chainId: 100,
    nativeCurrency: { name: 'xDAI', symbol: 'xDAI', decimals: 18 },
    blockExplorerUrl: 'https://gnosisscan.io',
  },
  linea: {
    name: 'Linea',
    chainId: 59144,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrl: 'https://lineascan.build',
  },
  scroll: {
    name: 'Scroll',
    chainId: 534352,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrl: 'https://scrollscan.com',
  },
  mantle: {
    name: 'Mantle',
    chainId: 5000,
    nativeCurrency: { name: 'MNT', symbol: 'MNT', decimals: 18 },
    blockExplorerUrl: 'https://mantlescan.xyz',
  },
  mode: {
    name: 'Mode',
    chainId: 34443,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrl: 'https://modescan.io',
  },
  blast: {
    name: 'Blast',
    chainId: 81457,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrl: 'https://blastscan.io',
  },
  solana: {
    name: 'Solana',
    chainId: 0,
    nativeCurrency: { name: 'SOL', symbol: 'SOL', decimals: 9 },
    blockExplorerUrl: 'https://solscan.io',
  },
  near: {
    name: 'NEAR',
    chainId: 0,
    nativeCurrency: { name: 'NEAR', symbol: 'NEAR', decimals: 24 },
    blockExplorerUrl: 'https://nearblocks.io',
  },
  aptos: {
    name: 'Aptos',
    chainId: 0,
    nativeCurrency: { name: 'APT', symbol: 'APT', decimals: 8 },
    blockExplorerUrl: 'https://aptoscan.com',
  },
  sui: {
    name: 'Sui',
    chainId: 0,
    nativeCurrency: { name: 'SUI', symbol: 'SUI', decimals: 9 },
    blockExplorerUrl: 'https://suiscan.xyz',
  },
  polygonAmoy: {
    name: 'Polygon Amoy',
    chainId: 80002,
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    blockExplorerUrl: 'https://amoy.polygonscan.com',
  },
  sepolia: {
    name: 'Sepolia',
    chainId: 11155111,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrl: 'https://sepolia.etherscan.io',
  },
  goerli: {
    name: 'Goerli',
    chainId: 5,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrl: 'https://goerli.etherscan.io',
  },
  mumbai: {
    name: 'Mumbai',
    chainId: 80001,
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    blockExplorerUrl: 'https://mumbai.polygonscan.com',
  },
  local: {
    name: 'Local',
    chainId: 1337,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrl: 'http://localhost:8545',
  },
};

// ============================================================================
// 工具函数
// ============================================================================

export function getChainDisplayName(chain: SupportedChain): string {
  return CHAIN_DISPLAY_NAMES[chain] ?? chain;
}

export function getChainId(chain: SupportedChain): number {
  return CHAIN_IDS[chain] ?? 0;
}

export function getChainMetadata(chain: SupportedChain): ChainMetadata {
  return CHAIN_METADATA[chain] ?? CHAIN_METADATA.ethereum;
}

export function isEvmChain(chain: SupportedChain): boolean {
  const nonEvmChains: SupportedChain[] = ['solana', 'near', 'aptos', 'sui'];
  return !nonEvmChains.includes(chain);
}


