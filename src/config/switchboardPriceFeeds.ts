/**
 * Switchboard Price Feed Configuration
 *
 * Switchboard 价格喂价配置
 * 包含 Solana 主网和 EVM 链的 Aggregator 账户地址
 */

import { PublicKey } from '@solana/web3.js';

import type { SupportedChain } from '@/types/unifiedOracleTypes';

import type { Address } from 'viem';

// ============================================================================
// Solana Mainnet Aggregator 账户地址
// ============================================================================

export const SWITCHBOARD_SOLANA_FEED_IDS: Record<string, string> = {
  // 主要交易对
  'SOL/USD': 'GvDMxPzN1sCj7L26YDK2HnMRXEQmQ2aemov8YBtPS7vR',
  'BTC/USD': '8SXvChNYFhRq4EZuZvnhjrB3jJRQCuh4mtJF4ptNfQ8m',
  'ETH/USD': 'HNStfhaRbDndz2pYr3oGrh1T7s6PT9wFp6p7JQw9XxXz',
  'USDC/USD': '5zZc4zPpZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZz',
  'USDT/USD': '5zZc4zPpZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZz',
  'LINK/USD': '5zZc4zPpZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZz',
  'AVAX/USD': '5zZc4zPpZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZz',
  'MATIC/USD': '5zZc4zPpZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZz',
  'ARB/USD': '5zZc4zPpZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZz',
  'OP/USD': '5zZc4zPpZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZz',
  'DOGE/USD': '5zZc4zPpZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZz',
  'SHIB/USD': '5zZc4zPpZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZz',
  'UNI/USD': '5zZc4zPpZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZz',
  'AAVE/USD': '5zZc4zPpZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZz',
  'SUSHI/USD': '5zZc4zPpZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZz',
  'COMP/USD': '5zZc4zPpZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZz',
  'MKR/USD': '5zZc4zPpZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZz',
  'YFI/USD': '5zZc4zPpZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZz',
  'SNX/USD': '5zZc4zPpZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZz',
  'CRV/USD': '5zZc4zPpZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZz',
};

// ============================================================================
// EVM 链合约地址
// ============================================================================

export const SWITCHBOARD_CONTRACT_ADDRESSES: Record<SupportedChain, Address | undefined> = {
  // Solana 使用程序 ID 而不是合约地址
  solana: undefined,

  // EVM 链
  ethereum: '0x0000000000000000000000000000000000000000', // 待填充
  polygon: '0x0000000000000000000000000000000000000000', // 待填充
  arbitrum: '0x0000000000000000000000000000000000000000', // 待填充
  optimism: '0x0000000000000000000000000000000000000000', // 待填充
  base: '0x0000000000000000000000000000000000000000', // 待填充
  avalanche: '0x0000000000000000000000000000000000000000', // 待填充
  bsc: '0x0000000000000000000000000000000000000000', // 待填充

  // 暂不支持的其他链
  fantom: undefined,
  celo: undefined,
  gnosis: undefined,
  linea: undefined,
  scroll: undefined,
  mantle: undefined,
  mode: undefined,
  blast: undefined,
  near: undefined,
  aptos: undefined,
  sui: undefined,
  polygonAmoy: undefined,
  sepolia: undefined,
  goerli: undefined,
  mumbai: undefined,
  local: undefined,
};

// ============================================================================
// Switchboard 程序 ID (Solana)
// ============================================================================

export const SWITCHBOARD_PROGRAM_ID = {
  mainnet: 'SW1TCH7qEPTdLsDHRgPuMQjbQxKdH2aBStViMFnt64f',
  devnet: 'SW1TCH7qEPTdLsDHRgPuMQjbQxKdH2aBStViMFnt64f',
};

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取价格喂价的 Feed ID (Solana PublicKey)
 */
export function getSwitchboardFeedId(symbol: string): PublicKey | undefined {
  const address = SWITCHBOARD_SOLANA_FEED_IDS[symbol.toUpperCase()];
  if (!address) return undefined;
  try {
    return new PublicKey(address);
  } catch {
    return undefined;
  }
}

/**
 * 获取所有可用的价格喂价符号
 */
export function getAvailableSwitchboardSymbols(): string[] {
  return Object.keys(SWITCHBOARD_SOLANA_FEED_IDS);
}

/**
 * 检查符号是否支持
 */
export function isSwitchboardSymbolSupported(symbol: string): boolean {
  return symbol.toUpperCase() in SWITCHBOARD_SOLANA_FEED_IDS;
}

/**
 * 获取合约地址
 */
export function getSwitchboardContractAddress(chain: SupportedChain): Address | undefined {
  return SWITCHBOARD_CONTRACT_ADDRESSES[chain];
}

/**
 * 检查链是否支持 Switchboard
 */
export function isChainSupportedBySwitchboard(chain: SupportedChain): boolean {
  return SWITCHBOARD_CONTRACT_ADDRESSES[chain] !== undefined;
}

/**
 * 获取支持的链列表
 */
export function getSupportedSwitchboardChains(): SupportedChain[] {
  return Object.entries(SWITCHBOARD_CONTRACT_ADDRESSES)
    .filter(([_, address]) => address !== undefined)
    .map(([chain]) => chain as SupportedChain);
}

// ============================================================================
// 聚合器账户数据结构
// ============================================================================

export interface SwitchboardAggregatorData {
  /** 当前价格 */
  result: {
    mantissa: bigint;
    scale: number;
  };
  /** 最后更新时间 */
  lastUpdateTimestamp: bigint;
  /** 当前轮次 */
  currentRound: {
    roundId: bigint;
    slot: bigint;
  };
  /** 任务数量 */
  jobCount: number;
  /** 最小 oracle 结果数 */
  minOracleResults: number;
  /** 方差阈值 */
  varianceThreshold: {
    mantissa: bigint;
    scale: number;
  };
  /** 队列公钥 */
  queuePubkey: PublicKey;
  /** 配置 */
  config: {
    batchSize: number;
    minUpdateDelaySeconds: number;
  };
}

// ============================================================================
// 默认配置
// ============================================================================

export const SWITCHBOARD_DEFAULT_CONFIG = {
  /** 默认陈旧阈值 (秒) */
  stalenessThreshold: 300, // 5 分钟
  /** 默认置信度阈值 */
  confidenceThreshold: 0.95,
  /** 默认精度 */
  defaultDecimals: 8,
  /** 最小更新延迟 */
  minUpdateDelaySeconds: 10,
  /** 默认批次大小 */
  batchSize: 1,
};
