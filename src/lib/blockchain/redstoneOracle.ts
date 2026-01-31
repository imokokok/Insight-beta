/**
 * RedStone Oracle Client
 *
 * RedStone 是一个创新的拉取式预言机（Pull Oracle）
 * 特点：
 * - 数据签名存储在链下，使用时才拉取到链上
 * - 大幅降低 Gas 成本
 * - 支持多链部署
 * - 使用 EIP-712 标准签名
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

export type RedStoneSupportedChain =
  | 'ethereum'
  | 'arbitrum'
  | 'optimism'
  | 'polygon'
  | 'base'
  | 'bsc'
  | 'avalanche';

export interface RedStonePriceData {
  symbol: string;
  price: bigint;
  timestamp: number;
  formattedPrice: number;
  decimals: number;
}

export interface RedStoneProtocolConfig {
  rpcUrl: string;
  dataServiceId?: string;
  dataFeedId?: string;
  uniqueSignersCount?: number;
}

// ============================================================================
// Chain Configuration
// ============================================================================

const CHAIN_MAP: Record<RedStoneSupportedChain, Chain> = {
  ethereum: mainnet,
  arbitrum: arbitrum,
  optimism: optimism,
  polygon: polygon,
  base: base,
  bsc: bsc,
  avalanche: avalanche,
};

const REDSTONE_RPC_URLS: Record<RedStoneSupportedChain, string> = {
  ethereum: 'https://eth-mainnet.g.alchemy.com/v2/demo',
  arbitrum: 'https://arb-mainnet.g.alchemy.com/v2/demo',
  optimism: 'https://opt-mainnet.g.alchemy.com/v2/demo',
  polygon: 'https://polygon-mainnet.g.alchemy.com/v2/demo',
  base: 'https://base-mainnet.g.alchemy.com/v2/demo',
  bsc: 'https://bsc-dataseed.binance.org',
  avalanche: 'https://api.avax.network/ext/bc/C/rpc',
};

// RedStone Core Contracts (Price-Aware 合约地址)
const REDSTONE_CORE_CONTRACTS: Record<RedStoneSupportedChain, Address> = {
  ethereum: '0x0000000000000000000000000000000000000000', // Placeholder - 实际使用时通过 Price-Aware 合约
  arbitrum: '0x0000000000000000000000000000000000000000',
  optimism: '0x0000000000000000000000000000000000000000',
  polygon: '0x0000000000000000000000000000000000000000',
  base: '0x0000000000000000000000000000000000000000',
  bsc: '0x0000000000000000000000000000000000000000',
  avalanche: '0x0000000000000000000000000000000000000000',
};

// RedStone Data Feed IDs (常用的价格对)
export const REDSTONE_FEED_IDS: Record<string, string> = {
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
  'FRAX/USD': 'FRAX',
  'ARB/USD': 'ARB',
  'OP/USD': 'OP',
  'MATIC/USD': 'MATIC',
  'AVAX/USD': 'AVAX',
  'BNB/USD': 'BNB',
  'SOL/USD': 'SOL',
  'DOGE/USD': 'DOGE',
  'SHIB/USD': 'SHIB',
};

// Price-Aware 合约 ABI (简化版 - 用于读取已写入的价格)
const REDSTONE_PRICE_AWARE_ABI = [
  {
    inputs: [{ internalType: 'bytes32', name: 'dataFeedId', type: 'bytes32' }],
    name: 'getPrice',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'dataFeedId', type: 'bytes32' }],
    name: 'getPriceTimestamp',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'dataFeedId', type: 'bytes32' }],
    name: 'getPriceAge',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// ============================================================================
// RedStone Client
// ============================================================================

export class RedStoneClient {
  private publicClient: PublicClient;
  private chain: RedStoneSupportedChain;
  private config: RedStoneProtocolConfig;

  constructor(chain: RedStoneSupportedChain, config: RedStoneProtocolConfig) {
    this.chain = chain;
    this.config = config;

    const rpcUrl = config.rpcUrl || REDSTONE_RPC_URLS[chain];

    this.publicClient = createPublicClient({
      chain: CHAIN_MAP[chain],
      transport: http(rpcUrl),
    });
  }

  /**
   * 从 RedStone API 获取最新价格数据
   * RedStone 提供 REST API 获取签名价格数据
   */
  async fetchPriceFromAPI(feedId: string): Promise<RedStonePriceData | null> {
    try {
      // RedStone API endpoint
      const url = `https://api.redstone.finance/prices/?symbol=${feedId}&provider=redstone&limit=1`;

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`RedStone API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('Invalid response from RedStone API');
      }

      const pricePoint = data[0];
      const price = BigInt(Math.round(pricePoint.value * 1e8)); // RedStone 使用 8 位小数
      const timestamp = pricePoint.timestamp;

      return {
        symbol: feedId,
        price,
        timestamp,
        formattedPrice: pricePoint.value,
        decimals: 8,
      };
    } catch (error) {
      logger.error('Failed to fetch RedStone price from API', {
        feedId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * 从链上 Price-Aware 合约读取价格
   * 注意：需要知道具体的 Price-Aware 合约地址
   */
  async readPriceFromContract(
    contractAddress: Address,
    feedId: string,
  ): Promise<RedStonePriceData | null> {
    try {
      const dataFeedId = this.encodeFeedId(feedId);

      const [price, timestamp] = await Promise.all([
        this.publicClient.readContract({
          address: contractAddress,
          abi: REDSTONE_PRICE_AWARE_ABI,
          functionName: 'getPrice',
          args: [dataFeedId],
        }),
        this.publicClient.readContract({
          address: contractAddress,
          abi: REDSTONE_PRICE_AWARE_ABI,
          functionName: 'getPriceTimestamp',
          args: [dataFeedId],
        }),
      ]);

      const formattedPrice = parseFloat(formatUnits(price, 8));

      return {
        symbol: feedId,
        price,
        timestamp: Number(timestamp),
        formattedPrice,
        decimals: 8,
      };
    } catch (error) {
      logger.error('Failed to read RedStone price from contract', {
        contractAddress,
        feedId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * 批量获取多个价格对
   */
  async fetchMultiplePrices(feedIds: string[]): Promise<Map<string, RedStonePriceData>> {
    const results = new Map<string, RedStonePriceData>();

    // RedStone 支持批量查询
    try {
      const symbols = feedIds.join(',');
      const url = `https://api.redstone.finance/prices/?symbol=${symbols}&provider=redstone&limit=1`;

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`RedStone API error: ${response.status}`);
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        for (const item of data) {
          const feedId = item.symbol;
          const price = BigInt(Math.round(item.value * 1e8));

          results.set(feedId, {
            symbol: feedId,
            price,
            timestamp: item.timestamp,
            formattedPrice: item.value,
            decimals: 8,
          });
        }
      }
    } catch (error) {
      logger.error('Failed to fetch batch prices from RedStone', {
        error: error instanceof Error ? error.message : String(error),
      });

      // 回退到单个查询
      for (const feedId of feedIds) {
        const price = await this.fetchPriceFromAPI(feedId);
        if (price) {
          results.set(feedId, price);
        }
      }
    }

    return results;
  }

  /**
   * 获取 RedStone 数据包（包含签名）
   * 用于链上验证
   */
  async fetchDataPackage(feedIds: string[]): Promise<{
    prices: Map<string, RedStonePriceData>;
    dataPackage: unknown;
  } | null> {
    try {
      const symbols = feedIds.join(',');
      const url = `https://api.redstone.finance/data-packages/latest?symbols=${symbols}&provider=redstone&limit=1`;

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`RedStone API error: ${response.status}`);
      }

      const dataPackage = await response.json();
      const prices = await this.fetchMultiplePrices(feedIds);

      return { prices, dataPackage };
    } catch (error) {
      logger.error('Failed to fetch RedStone data package', {
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
   * 获取支持的 Feed IDs
   */
  getSupportedFeedIds(): string[] {
    return Object.keys(REDSTONE_FEED_IDS);
  }

  /**
   * 将 feed ID 编码为 bytes32
   */
  private encodeFeedId(feedId: string): `0x${string}` {
    // 简单实现：将字符串转换为 bytes32
    const encoded = feedId.padEnd(32, '\0');
    const hex = '0x' + Buffer.from(encoded).toString('hex');
    return hex as `0x${string}`;
  }

  /**
   * 获取客户端信息
   */
  getClientInfo(): {
    chain: RedStoneSupportedChain;
    rpcUrl: string;
    supportedFeeds: number;
  } {
    return {
      chain: this.chain,
      rpcUrl: this.config.rpcUrl || REDSTONE_RPC_URLS[this.chain],
      supportedFeeds: Object.keys(REDSTONE_FEED_IDS).length,
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * 创建 RedStone 客户端
 */
export function createRedStoneClient(
  chain: RedStoneSupportedChain,
  config?: Partial<RedStoneProtocolConfig>,
): RedStoneClient {
  return new RedStoneClient(chain, {
    rpcUrl: REDSTONE_RPC_URLS[chain],
    ...config,
  });
}

/**
 * 获取所有支持的链
 */
export function getRedStoneSupportedChains(): RedStoneSupportedChain[] {
  return Object.keys(CHAIN_MAP) as RedStoneSupportedChain[];
}

/**
 * 解析 RedStone 价格
 */
export function parseRedStonePrice(price: bigint, decimals: number = 8): number {
  return parseFloat(formatUnits(price, decimals));
}
