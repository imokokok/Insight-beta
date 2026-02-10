/**
 * RedStone Oracle Client (Refactored with EvmOracleClient)
 *
 * 使用 EvmOracleClient 基类重构的 RedStone 预言机集成模块
 * 代码量从 ~400 行减少到 ~200 行
 */

import { type Address, parseAbi, formatUnits } from 'viem';

import { ErrorHandler, normalizeError } from '@/lib/errors';
import { EvmOracleClient } from '@/lib/shared';
import type {
  SupportedChain,
  UnifiedPriceFeed,
  RedStoneProtocolConfig,
  OracleProtocol,
} from '@/lib/types/unifiedOracleTypes';

import { calculateDataFreshness } from './core/types';

// ============================================================================
// RedStone ABI
// ============================================================================

const REDSTONE_ABI = parseAbi([
  'function getPrice(bytes32 feedId) external view returns (uint256 price, uint256 timestamp)',
  'function getPrices(bytes32[] calldata feedIds) external view returns (uint256[] memory prices, uint256[] memory timestamps)',
  'function getOracle() external view returns (address)',
]);

// ============================================================================
// RedStone 合约地址配置
// ============================================================================

export const REDSTONE_CONTRACT_ADDRESSES: Record<SupportedChain, Address | undefined> = {
  ethereum: '0x6E1389D6E59e83B854c59e7eE608F6B8D5F67355',
  polygon: '0x6E1389D6E59e83B854c59e7eE608F6B8D5F67355',
  arbitrum: '0x6E1389D6E59e83B854c59e7eE608F6B8D5F67355',
  optimism: '0x6E1389D6E59e83B854c59e7eE608F6B8D5F67355',
  base: '0x6E1389D6E59e83B854c59e7eE608F6B8D5F67355',
  avalanche: '0x6E1389D6E59e83B854c59e7eE608F6B8D5F67355',
  bsc: '0x6E1389D6E59e83B854c59e7eE608F6B8D5F67355',
  fantom: '0x6E1389D6E59e83B854c59e7eE608F6B8D5F67355',
  // 其他链暂不支持
  celo: undefined,
  gnosis: undefined,
  linea: undefined,
  scroll: undefined,
  mantle: undefined,
  mode: undefined,
  blast: undefined,
  solana: undefined,
  near: undefined,
  aptos: undefined,
  sui: undefined,
  polygonAmoy: undefined,
  sepolia: '0x6E1389D6E59e83B854c59e7eE608F6B8D5F67355',
  goerli: undefined,
  mumbai: undefined,
  local: undefined,
};

// ============================================================================
// RedStone Feed IDs
// ============================================================================

export const REDSTONE_FEED_IDS: Record<string, string> = {
  'ETH/USD': '0x4554480000000000000000000000000000000000000000000000000000000000',
  'BTC/USD': '0x4254430000000000000000000000000000000000000000000000000000000000',
  'AVAX/USD': '0x4156415800000000000000000000000000000000000000000000000000000000',
  'SOL/USD': '0x534f4c0000000000000000000000000000000000000000000000000000000000',
  'ARB/USD': '0x4152420000000000000000000000000000000000000000000000000000000000',
  'OP/USD': '0x4f50000000000000000000000000000000000000000000000000000000000000',
  'MATIC/USD': '0x4d41544943000000000000000000000000000000000000000000000000000000',
  'BNB/USD': '0x424e420000000000000000000000000000000000000000000000000000000000',
  'USDC/USD': '0x5553444300000000000000000000000000000000000000000000000000000000',
  'USDT/USD': '0x5553445400000000000000000000000000000000000000000000000000000000',
  'DAI/USD': '0x4441490000000000000000000000000000000000000000000000000000000000',
  'LINK/USD': '0x4c494e4b00000000000000000000000000000000000000000000000000000000',
  'UNI/USD': '0x554e490000000000000000000000000000000000000000000000000000000000',
  'AAVE/USD': '0x4141564500000000000000000000000000000000000000000000000000000000',
};

// ============================================================================
// 支持的链和资产
// ============================================================================

export const REDSTONE_SUPPORTED_SYMBOLS: Record<SupportedChain, string[]> = {
  ethereum: [
    'ETH/USD',
    'BTC/USD',
    'USDC/USD',
    'USDT/USD',
    'DAI/USD',
    'LINK/USD',
    'UNI/USD',
    'AAVE/USD',
  ],
  polygon: ['MATIC/USD', 'ETH/USD', 'BTC/USD', 'USDC/USD', 'USDT/USD'],
  arbitrum: ['ETH/USD', 'BTC/USD', 'USDC/USD', 'USDT/USD', 'ARB/USD'],
  optimism: ['ETH/USD', 'BTC/USD', 'USDC/USD', 'USDT/USD', 'OP/USD'],
  base: ['ETH/USD', 'BTC/USD', 'USDC/USD', 'USDT/USD'],
  avalanche: ['AVAX/USD', 'ETH/USD', 'BTC/USD', 'USDC/USD', 'USDT/USD'],
  bsc: ['BNB/USD', 'ETH/USD', 'BTC/USD', 'USDC/USD', 'USDT/USD'],
  fantom: ['ETH/USD', 'BTC/USD', 'USDC/USD', 'USDT/USD'],
  // 其他链
  celo: [],
  gnosis: [],
  linea: [],
  scroll: [],
  mantle: [],
  mode: [],
  blast: [],
  solana: [],
  near: [],
  aptos: [],
  sui: [],
  polygonAmoy: [],
  sepolia: ['ETH/USD', 'BTC/USD'],
  goerli: [],
  mumbai: [],
  local: [],
};

// ============================================================================
// RedStone Client (使用 EvmOracleClient 基类)
// ============================================================================

export class RedStoneClient extends EvmOracleClient {
  readonly protocol = 'redstone' as const;
  readonly chain: SupportedChain;

  private clientConfig: RedStoneProtocolConfig;

  constructor(chain: SupportedChain, rpcUrl: string, config: RedStoneProtocolConfig = {}) {
    super({
      chain,
      protocol: 'redstone',
      rpcUrl,
      timeoutMs: (config as { timeoutMs?: number }).timeoutMs ?? 30000,
      defaultDecimals: 8,
    });

    this.chain = chain;
    this.clientConfig = config;
  }

  // ============================================================================
  // 实现抽象方法
  // ============================================================================

  protected resolveContractAddress(): Address | undefined {
    const address =
      (this.clientConfig as { apiEndpoint?: Address }).apiEndpoint ||
      REDSTONE_CONTRACT_ADDRESSES[this.chain];
    return address;
  }

  protected getFeedId(symbol: string): string | undefined {
    return REDSTONE_FEED_IDS[symbol];
  }

  protected async fetchRawPriceData(feedId: string): Promise<{
    price: bigint;
    timestamp: number;
  }> {
    if (!this.contractAddress) {
      throw new Error('Contract address is not set');
    }
    try {
      const result = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: REDSTONE_ABI,
        functionName: 'getPrice',
        args: [feedId as `0x${string}`],
      });

      return {
        price: result[0],
        timestamp: Number(result[1]),
      };
    } catch (error) {
      ErrorHandler.logError(this.logger, 'Failed to get RedStone price', error, {
        chain: this.chain,
        feedId,
      });
      throw error;
    }
  }

  /**
   * 获取客户端能力
   */
  getCapabilities() {
    return {
      priceFeeds: true,
      assertions: false,
      disputes: false,
      vrf: false,
      customData: true,
      batchQueries: true,
    };
  }

  protected parsePriceFromContract(
    rawData: {
      price: bigint;
      timestamp: number;
    },
    symbol: string,
    _feedId: string,
  ): UnifiedPriceFeed | null {
    const timestampDate = new Date(rawData.timestamp * 1000);
    const { isStale, stalenessSeconds } = calculateDataFreshness(timestampDate, 300);

    const [baseAsset, quoteAsset] = symbol.split('/');

    // RedStone 使用 8 位小数
    const formattedPrice = parseFloat(formatUnits(rawData.price, 8));

    return {
      id: `redstone-${this.chain}-${symbol}-${rawData.timestamp}`,
      instanceId: `redstone-${this.chain}`,
      protocol: 'redstone' as OracleProtocol,
      chain: this.chain,
      symbol,
      baseAsset: baseAsset || 'UNKNOWN',
      quoteAsset: quoteAsset || 'USD',
      price: formattedPrice,
      priceRaw: rawData.price,
      decimals: 8,
      timestamp: timestampDate.getTime(),
      confidence: 0.97,
      sources: ['redstone'],
      isStale,
      stalenessSeconds,
    };
  }

  // ============================================================================
  // 公共方法
  // ============================================================================

  /**
   * 获取指定交易对的价格（兼容旧接口）
   */
  async getPriceForSymbol(symbol: string): Promise<UnifiedPriceFeed | null> {
    return this.fetchPrice(symbol);
  }

  /**
   * 获取多个价格
   */
  async getMultiplePrices(symbols: string[]): Promise<UnifiedPriceFeed[]> {
    const results = await Promise.allSettled(
      symbols.map(async (symbol) => {
        try {
          return await this.getPriceForSymbol(symbol);
        } catch (error) {
          this.logger.error(`Failed to get RedStone price for ${symbol}`, {
            error: normalizeError(error).message,
          });
          return null;
        }
      }),
    );

    return results
      .filter(
        (result): result is PromiseFulfilledResult<UnifiedPriceFeed | null> =>
          result.status === 'fulfilled',
      )
      .map((result) => result.value)
      .filter((feed): feed is UnifiedPriceFeed => feed !== null);
  }

  /**
   * 获取所有可用价格
   */
  async fetchAllFeeds(): Promise<UnifiedPriceFeed[]> {
    const symbols = REDSTONE_SUPPORTED_SYMBOLS[this.chain] || [];
    return this.getMultiplePrices(symbols);
  }

  /**
   * 检查 Feed 健康状态
   */
  async checkFeedHealth(symbol: string): Promise<{
    healthy: boolean;
    lastUpdate: Date;
    stalenessSeconds: number;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      const feedId = this.getFeedId(symbol);
      if (!feedId) {
        return {
          healthy: false,
          lastUpdate: new Date(0),
          stalenessSeconds: Infinity,
          issues: [`No feed ID found for ${symbol}`],
        };
      }

      const data = await this.fetchRawPriceData(feedId);
      const lastUpdate = new Date(data.timestamp * 1000);
      const now = new Date();
      const stalenessSeconds = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);

      // 检查数据新鲜度
      if (stalenessSeconds > 300) {
        issues.push(`Data is stale: ${stalenessSeconds}s old`);
      }

      // 检查价格是否为0
      if (data.price === 0n) {
        issues.push('Price is zero');
      }

      return {
        healthy: issues.length === 0,
        lastUpdate,
        stalenessSeconds,
        issues,
      };
    } catch (error) {
      return {
        healthy: false,
        lastUpdate: new Date(0),
        stalenessSeconds: Infinity,
        issues: [`Failed to read feed: ${normalizeError(error).message}`],
      };
    }
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

export function createRedStoneClient(
  chain: SupportedChain,
  rpcUrl: string,
  config?: RedStoneProtocolConfig,
): RedStoneClient {
  return new RedStoneClient(chain, rpcUrl, config);
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取支持的 RedStone 链列表
 */
export function getSupportedRedStoneChains(): SupportedChain[] {
  return Object.entries(REDSTONE_CONTRACT_ADDRESSES)
    .filter(([_, address]) => address !== undefined)
    .map(([chain]) => chain as SupportedChain);
}

/**
 * 获取所有可用的价格喂价符号
 */
export function getAvailableRedStoneSymbols(chain: SupportedChain): string[] {
  return REDSTONE_SUPPORTED_SYMBOLS[chain] || [];
}

/**
 * 检查链是否支持 RedStone
 */
export function isChainSupportedByRedStone(chain: SupportedChain): boolean {
  return REDSTONE_CONTRACT_ADDRESSES[chain] !== undefined;
}

/**
 * 获取合约地址
 */
export function getRedStoneContractAddress(chain: SupportedChain): Address | undefined {
  return REDSTONE_CONTRACT_ADDRESSES[chain];
}

/**
 * 获取 Feed ID
 */
export function getRedStoneFeedId(symbol: string): string | undefined {
  return REDSTONE_FEED_IDS[symbol];
}
