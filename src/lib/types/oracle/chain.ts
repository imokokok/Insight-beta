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

// 从 oracleTypes.ts 重新导出以保持一致性
export type { OracleChain, UMAChain } from '../oracleTypes';

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

// 支持的链数组
export const SUPPORTED_CHAINS: SupportedChain[] = Object.keys(CHAIN_IDS) as SupportedChain[];

// 链浏览器 URL
export const CHAIN_EXPLORERS: Record<SupportedChain, string> = {
  ethereum: 'https://etherscan.io',
  polygon: 'https://polygonscan.com',
  arbitrum: 'https://arbiscan.io',
  optimism: 'https://optimistic.etherscan.io',
  base: 'https://basescan.org',
  avalanche: 'https://snowtrace.io',
  bsc: 'https://bscscan.com',
  fantom: 'https://ftmscan.com',
  celo: 'https://celoscan.io',
  gnosis: 'https://gnosisscan.io',
  linea: 'https://lineascan.build',
  scroll: 'https://scrollscan.com',
  mantle: 'https://mantlescan.xyz',
  mode: 'https://modescan.io',
  blast: 'https://blastscan.io',
  solana: 'https://solscan.io',
  near: 'https://nearblocks.io',
  aptos: 'https://aptoscan.com',
  sui: 'https://suiscan.io',
  polygonAmoy: 'https://amoy.polygonscan.com',
  sepolia: 'https://sepolia.etherscan.io',
  goerli: 'https://goerli.etherscan.io',
  mumbai: 'https://mumbai.polygonscan.com',
  local: '',
};

// 链 RPC URLs
export const CHAIN_RPC_URLS: Record<SupportedChain, string[]> = {
  ethereum: ['https://eth.llamarpc.com', 'https://rpc.ankr.com/eth'],
  polygon: ['https://polygon.llamarpc.com', 'https://rpc.ankr.com/polygon'],
  arbitrum: ['https://arb1.arbitrum.io/rpc', 'https://rpc.ankr.com/arbitrum'],
  optimism: ['https://mainnet.optimism.io', 'https://rpc.ankr.com/optimism'],
  base: ['https://mainnet.base.org', 'https://base.llamarpc.com'],
  avalanche: ['https://api.avax.network/ext/bc/C/rpc', 'https://rpc.ankr.com/avalanche'],
  bsc: ['https://bsc-dataseed.binance.org', 'https://rpc.ankr.com/bsc'],
  fantom: ['https://rpc.ftm.tools', 'https://rpc.ankr.com/fantom'],
  celo: ['https://forno.celo.org', 'https://rpc.ankr.com/celo'],
  gnosis: ['https://rpc.gnosischain.com', 'https://rpc.ankr.com/gnosis'],
  linea: ['https://rpc.linea.build', 'https://linea.drpc.org'],
  scroll: ['https://rpc.scroll.io', 'https://rpc.ankr.com/scroll'],
  mantle: ['https://rpc.mantle.xyz', 'https://mantle.drpc.org'],
  mode: ['https://mainnet.mode.network', 'https://mode.drpc.org'],
  blast: ['https://rpc.blast.io', 'https://blast.din.dev/rpc'],
  solana: ['https://api.mainnet-beta.solana.com', 'https://solana-api.projectserum.com'],
  near: ['https://rpc.mainnet.near.org', 'https://near.lava.build'],
  aptos: ['https://fullnode.mainnet.aptoslabs.com/v1'],
  sui: ['https://fullnode.mainnet.sui.io', 'https://sui.publicnode.com'],
  polygonAmoy: ['https://rpc-amoy.polygon.technology'],
  sepolia: ['https://rpc.sepolia.org', 'https://rpc.ankr.com/eth_sepolia'],
  goerli: ['https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'],
  mumbai: ['https://rpc-mumbai.maticvigil.com'],
  local: ['http://localhost:8545'],
};

// 链原生货币
export const CHAIN_NATIVE_CURRENCIES: Record<SupportedChain, string> = {
  ethereum: 'ETH',
  polygon: 'MATIC',
  arbitrum: 'ETH',
  optimism: 'ETH',
  base: 'ETH',
  avalanche: 'AVAX',
  bsc: 'BNB',
  fantom: 'FTM',
  celo: 'CELO',
  gnosis: 'xDAI',
  linea: 'ETH',
  scroll: 'ETH',
  mantle: 'MNT',
  mode: 'ETH',
  blast: 'ETH',
  solana: 'SOL',
  near: 'NEAR',
  aptos: 'APT',
  sui: 'SUI',
  polygonAmoy: 'MATIC',
  sepolia: 'ETH',
  goerli: 'ETH',
  mumbai: 'MATIC',
  local: 'ETH',
};

// 检查是否为测试网
export function isTestnet(chain: SupportedChain): boolean {
  return ['polygonAmoy', 'sepolia', 'goerli', 'mumbai', 'local'].includes(chain);
}

// 获取链信息
export function getChainInfo(chain: SupportedChain): ChainInfo {
  return {
    id: chain,
    name: CHAIN_DISPLAY_NAMES[chain],
    nativeCurrency: CHAIN_NATIVE_CURRENCIES[chain],
    chainId: CHAIN_IDS[chain],
    explorerUrl: CHAIN_EXPLORERS[chain],
    rpcUrls: CHAIN_RPC_URLS[chain],
    isTestnet: isTestnet(chain),
    supportedProtocols: [],
  };
}
