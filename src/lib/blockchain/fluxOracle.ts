/**
 * Flux Oracle Client
 *
 * Flux 是一个去中心化的预言机网络
 * 特点：
 * - 由验证者节点提供数据
 * - 支持自定义数据源
 * - 经济激励机制保证数据准确性
 * - 多链支持
 */

import {
  createPublicClient,
  http,
  type PublicClient,
  type Address,
  type Chain,
  formatUnits,
} from 'viem';
import { mainnet, arbitrum, optimism, polygon, base, bsc, avalanche } from 'viem/chains';
import { logger } from '@/lib/logger';

// ============================================================================
// Types
// ============================================================================

export type FluxSupportedChain =
  | 'ethereum'
  | 'arbitrum'
  | 'optimism'
  | 'polygon'
  | 'base'
  | 'bsc'
  | 'avalanche';

export interface FluxPriceData {
  symbol: string;
  price: bigint;
  timestamp: number;
  formattedPrice: number;
  decimals: number;
  roundId: bigint;
  answeredInRound: bigint;
}

export interface FluxProtocolConfig {
  rpcUrl: string;
  aggregatorAddress?: Address;
}

// ============================================================================
// Chain Configuration
// ============================================================================

const CHAIN_MAP: Record<FluxSupportedChain, Chain> = {
  ethereum: mainnet,
  arbitrum: arbitrum,
  optimism: optimism,
  polygon: polygon,
  base: base,
  bsc: bsc,
  avalanche: avalanche,
};

const FLUX_RPC_URLS: Record<FluxSupportedChain, string> = {
  ethereum: 'https://eth-mainnet.g.alchemy.com/v2/demo',
  arbitrum: 'https://arb-mainnet.g.alchemy.com/v2/demo',
  optimism: 'https://opt-mainnet.g.alchemy.com/v2/demo',
  polygon: 'https://polygon-mainnet.g.alchemy.com/v2/demo',
  base: 'https://base-mainnet.g.alchemy.com/v2/demo',
  bsc: 'https://bsc-dataseed.binance.org',
  avalanche: 'https://api.avax.network/ext/bc/C/rpc',
};

// Flux Aggregator 合约地址 (示例地址，实际需要更新)
const FLUX_AGGREGATOR_ADDRESSES: Record<string, Record<FluxSupportedChain, Address>> = {
  'ETH/USD': {
    ethereum: '0x0000000000000000000000000000000000000000',
    arbitrum: '0x0000000000000000000000000000000000000000',
    optimism: '0x0000000000000000000000000000000000000000',
    polygon: '0x0000000000000000000000000000000000000000',
    base: '0x0000000000000000000000000000000000000000',
    bsc: '0x0000000000000000000000000000000000000000',
    avalanche: '0x0000000000000000000000000000000000000000',
  },
  'BTC/USD': {
    ethereum: '0x0000000000000000000000000000000000000000',
    arbitrum: '0x0000000000000000000000000000000000000000',
    optimism: '0x0000000000000000000000000000000000000000',
    polygon: '0x0000000000000000000000000000000000000000',
    base: '0x0000000000000000000000000000000000000000',
    bsc: '0x0000000000000000000000000000000000000000',
    avalanche: '0x0000000000000000000000000000000000000000',
  },
};

// Flux 支持的资产
export const FLUX_ASSETS: Record<string, string> = {
  'ETH/USD': 'ETH',
  'BTC/USD': 'BTC',
  'LINK/USD': 'LINK',
  'UNI/USD': 'UNI',
  'AAVE/USD': 'AAVE',
  'COMP/USD': 'COMP',
  'MKR/USD': 'MKR',
  'SNX/USD': 'SNX',
  'YFI/USD': 'YFI',
  'CRV/USD': 'CRV',
  'USDC/USD': 'USDC',
  'USDT/USD': 'USDT',
  'DAI/USD': 'DAI',
  'ARB/USD': 'ARB',
  'OP/USD': 'OP',
  'MATIC/USD': 'MATIC',
  'AVAX/USD': 'AVAX',
  'BNB/USD': 'BNB',
};

// Flux Aggregator ABI
const FLUX_AGGREGATOR_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { internalType: 'uint80', name: 'roundId', type: 'uint80' },
      { internalType: 'int256', name: 'answer', type: 'int256' },
      { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
      { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
      { internalType: 'uint80', name: 'answeredInRound', type: 'uint80' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'description',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// ============================================================================
// Flux Client
// ============================================================================

export class FluxClient {
  private publicClient: PublicClient;
  private chain: FluxSupportedChain;
  private config: FluxProtocolConfig;

  constructor(chain: FluxSupportedChain, config: FluxProtocolConfig) {
    this.chain = chain;
    this.config = config;

    const rpcUrl = config.rpcUrl || FLUX_RPC_URLS[chain];

    this.publicClient = createPublicClient({
      chain: CHAIN_MAP[chain],
      transport: http(rpcUrl),
    });
  }

  /**
   * 从链上 Flux Aggregator 读取最新价格数据
   */
  async readLatestRoundData(aggregatorAddress: Address): Promise<FluxPriceData | null> {
    try {
      const [roundData, decimals] = await Promise.all([
        this.publicClient.readContract({
          address: aggregatorAddress,
          abi: FLUX_AGGREGATOR_ABI,
          functionName: 'latestRoundData',
        }),
        this.publicClient.readContract({
          address: aggregatorAddress,
          abi: FLUX_AGGREGATOR_ABI,
          functionName: 'decimals',
        }),
      ]);

      const [roundId, answer, startedAt, updatedAt, answeredInRound] = roundData;

      // 确保价格是正数
      if (answer < 0) {
        throw new Error('Negative price received from Flux oracle');
      }

      const formattedPrice = parseFloat(formatUnits(answer, decimals));

      return {
        symbol: '', // 需要外部设置
        price: answer,
        timestamp: Number(updatedAt),
        formattedPrice,
        decimals,
        roundId,
        answeredInRound,
      };
    } catch (error) {
      logger.error('Failed to read Flux latest round data', {
        aggregatorAddress,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * 从 Flux API 获取价格数据
   */
  async fetchPriceFromAPI(symbol: string): Promise<FluxPriceData | null> {
    try {
      // Flux API endpoint (需要根据实际 API 更新)
      const url = `https://api.fluxprotocol.org/v1/price/${symbol}`;

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        // Flux API 可能不存在，使用模拟数据
        logger.warn(`Flux API not available for ${symbol}, using placeholder`);
        return null;
      }

      const data = await response.json();

      return {
        symbol,
        price: BigInt(Math.round(data.price * 1e8)),
        timestamp: data.timestamp,
        formattedPrice: data.price,
        decimals: 8,
        roundId: BigInt(data.roundId || 0),
        answeredInRound: BigInt(data.answeredInRound || 0),
      };
    } catch (error) {
      logger.error('Failed to fetch Flux price from API', {
        symbol,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * 获取 Aggregator 信息
   */
  async getAggregatorInfo(aggregatorAddress: Address): Promise<{
    decimals: number;
    description: string;
  } | null> {
    try {
      const [decimals, description] = await Promise.all([
        this.publicClient.readContract({
          address: aggregatorAddress,
          abi: FLUX_AGGREGATOR_ABI,
          functionName: 'decimals',
        }),
        this.publicClient.readContract({
          address: aggregatorAddress,
          abi: FLUX_AGGREGATOR_ABI,
          functionName: 'description',
        }),
      ]);

      return { decimals, description };
    } catch (error) {
      logger.error('Failed to get Flux aggregator info', {
        aggregatorAddress,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * 验证价格新鲜度
   */
  isPriceFresh(timestamp: number, maxAgeSeconds: number = 300): boolean {
    const now = Math.floor(Date.now() / 1000);
    const age = now - timestamp;
    return age <= maxAgeSeconds;
  }

  /**
   * 获取支持的资产列表
   */
  getSupportedAssets(): string[] {
    return Object.keys(FLUX_ASSETS);
  }

  /**
   * 获取 Aggregator 地址
   */
  getAggregatorAddress(symbol: string): Address | null {
    const addresses = FLUX_AGGREGATOR_ADDRESSES[symbol];
    if (addresses) {
      return addresses[this.chain];
    }
    return null;
  }

  /**
   * 获取客户端信息
   */
  getClientInfo(): {
    chain: FluxSupportedChain;
    rpcUrl: string;
    supportedAssets: number;
  } {
    return {
      chain: this.chain,
      rpcUrl: this.config.rpcUrl || FLUX_RPC_URLS[this.chain],
      supportedAssets: Object.keys(FLUX_ASSETS).length,
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * 创建 Flux 客户端
 */
export function createFluxClient(
  chain: FluxSupportedChain,
  config?: Partial<FluxProtocolConfig>,
): FluxClient {
  return new FluxClient(chain, {
    rpcUrl: FLUX_RPC_URLS[chain],
    ...config,
  });
}

/**
 * 获取所有支持的链
 */
export function getFluxSupportedChains(): FluxSupportedChain[] {
  return Object.keys(CHAIN_MAP) as FluxSupportedChain[];
}

/**
 * 解析 Flux 价格
 */
export function parseFluxPrice(price: bigint, decimals: number = 8): number {
  return parseFloat(formatUnits(price, decimals));
}
