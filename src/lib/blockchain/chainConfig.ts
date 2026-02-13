/**
 * 区块链链配置
 *
 * 提供统一的链配置和 viem chain 映射
 */

import {
  mainnet,
  polygon,
  arbitrum,
  optimism,
  base,
  avalanche,
  bsc,
  fantom,
  celo,
  gnosis,
  linea,
  scroll,
  mantle,
  mode,
  blast,
  sepolia,
  goerli,
  type Chain,
} from 'viem/chains';

import type { SupportedChain } from '@/types/unifiedOracleTypes';

// ============================================================================
// Viem Chain 映射
// ============================================================================

/**
 * 支持的链到 viem chain 对象的映射
 * 不支持的链默认映射到 mainnet
 */
export const VIEM_CHAIN_MAP: Record<SupportedChain, Chain> = {
  ethereum: mainnet,
  polygon: polygon,
  arbitrum: arbitrum,
  optimism: optimism,
  base: base,
  avalanche: avalanche,
  bsc: bsc,
  fantom: fantom,
  celo: celo,
  gnosis: gnosis,
  linea: linea,
  scroll: scroll,
  mantle: mantle,
  mode: mode,
  blast: blast,
  sepolia: sepolia,
  goerli: goerli,
  // 以下链暂不支持，默认使用 mainnet
  solana: mainnet,
  near: mainnet,
  aptos: mainnet,
  sui: mainnet,
  polygonAmoy: polygon,
  mumbai: polygon,
  local: mainnet,
};

// ============================================================================
// RPC URL 配置
// ============================================================================

/**
 * 默认 RPC URL 模板
 */
export const DEFAULT_RPC_URLS: Record<SupportedChain, string> = {
  ethereum: 'https://eth-mainnet.g.alchemy.com/v2',
  polygon: 'https://polygon-mainnet.g.alchemy.com/v2',
  arbitrum: 'https://arb-mainnet.g.alchemy.com/v2',
  optimism: 'https://opt-mainnet.g.alchemy.com/v2',
  base: 'https://base-mainnet.g.alchemy.com/v2',
  avalanche: 'https://avalanche-mainnet.infura.io/v3',
  bsc: 'https://bsc-dataseed.binance.org',
  fantom: 'https://rpc.ftm.tools',
  celo: 'https://forno.celo.org',
  gnosis: 'https://rpc.gnosischain.com',
  linea: 'https://linea-mainnet.infura.io/v3',
  scroll: 'https://rpc.scroll.io',
  mantle: 'https://rpc.mantle.xyz',
  mode: 'https://mainnet.mode.network',
  blast: 'https://rpc.blast.io',
  solana: 'https://api.mainnet-beta.solana.com',
  near: 'https://rpc.mainnet.near.org',
  aptos: 'https://fullnode.mainnet.aptoslabs.com',
  sui: 'https://fullnode.mainnet.sui.io',
  polygonAmoy: 'https://polygon-amoy.g.alchemy.com/v2',
  sepolia: 'https://eth-sepolia.g.alchemy.com/v2',
  goerli: 'https://eth-goerli.g.alchemy.com/v2',
  mumbai: 'https://polygon-mumbai.g.alchemy.com/v2',
  local: 'http://localhost:8545',
};

// ============================================================================
// 链元数据
// ============================================================================

/**
 * 链元数据
 */
export interface ChainMetadata {
  name: string;
  chainId: number;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorerUrl: string;
}

/**
 * 链元数据映射
 */
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
    chainId: 0, // Solana 不使用 EVM chainId
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

/**
 * 根据 chainId 获取链符号
 * @param chainId - 链 ID
 * @returns 链符号
 */
export function getChainSymbol(chainId: number): string {
  const chain = Object.entries(CHAIN_METADATA).find(([, metadata]) => metadata.chainId === chainId);
  return chain?.[1].nativeCurrency.symbol ?? 'ETH';
}

/**
 * 获取 viem chain 对象
 * @param chain - 支持的链
 * @returns viem chain 对象
 */
export function getViemChain(chain: SupportedChain): unknown {
  return VIEM_CHAIN_MAP[chain] ?? mainnet;
}

/**
 * 获取默认 RPC URL
 * @param chain - 支持的链
 * @returns RPC URL
 */
export function getDefaultRpcUrl(chain: SupportedChain): string {
  return DEFAULT_RPC_URLS[chain] ?? DEFAULT_RPC_URLS.ethereum;
}

/**
 * 获取链元数据
 * @param chain - 支持的链
 * @returns 链元数据
 */
export function getChainMetadata(chain: SupportedChain): ChainMetadata {
  return CHAIN_METADATA[chain] ?? CHAIN_METADATA.ethereum;
}

/**
 * 检查链是否为 EVM 链
 * @param chain - 支持的链
 * @returns 是否为 EVM 链
 */
export function isEvmChain(chain: SupportedChain): boolean {
  const nonEvmChains: SupportedChain[] = ['solana', 'near', 'aptos', 'sui'];
  return !nonEvmChains.includes(chain);
}

/**
 * 获取交易浏览器 URL
 * @param chain - 支持的链
 * @param txHash - 交易哈希
 * @returns 交易浏览器 URL
 */
export function getExplorerTxUrl(chain: SupportedChain, txHash: string): string {
  const metadata = getChainMetadata(chain);
  return `${metadata.blockExplorerUrl}/tx/${txHash}`;
}

/**
 * 获取地址浏览器 URL
 * @param chain - 支持的链
 * @param address - 地址
 * @returns 地址浏览器 URL
 */
export function getExplorerAddressUrl(chain: SupportedChain, address: string): string {
  const metadata = getChainMetadata(chain);
  return `${metadata.blockExplorerUrl}/address/${address}`;
}
