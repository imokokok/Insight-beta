/**
 * Pyth Network Oracle Integration
 *
 * Pyth 预言机集成模块
 * 支持多链低延迟价格数据获取
 */

import {
  createPublicClient,
  http,
  type PublicClient,
  type Address,
  parseAbi,
  formatUnits,
} from 'viem';

import { DEFAULT_STALENESS_THRESHOLDS } from '@/lib/config/constants';
import { logger } from '@/lib/logger';
import type {
  SupportedChain,
  UnifiedPriceFeed,
  PythProtocolConfig,
} from '@/lib/types/unifiedOracleTypes';

import { VIEM_CHAIN_MAP } from './chainConfig';

// ============================================================================
// Pyth ABI
// ============================================================================

// PythStructs.Price 结构体: (int64 price, uint64 conf, int32 expo, uint publishTime)
const PYTH_ABI = parseAbi([
  'function getPrice(bytes32 id) external view returns (int64 price, uint64 conf, int32 expo, uint publishTime)',
  'function getEmaPrice(bytes32 id) external view returns (int64 price, uint64 conf, int32 expo, uint publishTime)',
  'function getPriceUnsafe(bytes32 id) external view returns (int64 price, uint64 conf, int32 expo, uint publishTime)',
  'function getPriceNoOlderThan(bytes32 id, uint age) external view returns (int64 price, uint64 conf, int32 expo, uint publishTime)',
]);

// PythStructs.Price
// {
//   int64 price;
//   uint64 conf;
//   int32 expo;
//   uint publishTime;
// }

// ============================================================================
// Pyth 合约地址配置
// ============================================================================

export const PYTH_CONTRACT_ADDRESSES: Record<SupportedChain, Address | undefined> = {
  ethereum: '0x4305FB66699C3B2702D4d05CF36551390A4c69C6',
  polygon: '0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a',
  arbitrum: '0xff1a0f4744e8582DF1aE09D5611b887B6a12925C',
  optimism: '0xff1a0f4744e8582DF1aE09D5611b887B6a12925C',
  base: '0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a',
  avalanche: '0x4305FB66699C3B2702D4d05CF36551390A4c69C6',
  bsc: '0x4D7E825f80bDf85e913E0DD2A2D54927e9dE1594',
  // 其他链暂不支持
  fantom: undefined,
  celo: undefined,
  gnosis: undefined,
  linea: undefined,
  scroll: undefined,
  mantle: undefined,
  mode: undefined,
  blast: undefined,
  solana: undefined, // Pyth 原生在 Solana，但这里我们用 EVM 接口
  near: undefined,
  aptos: undefined,
  sui: undefined,
  polygonAmoy: undefined,
  sepolia: '0xDd24F84d36BF92C65F92307595335bdFab5Bbd21',
  goerli: undefined,
  mumbai: undefined,
  local: undefined,
};

// ============================================================================
// 常用价格喂价 ID (Pyth 使用 32 字节的 ID)
// 从统一配置文件导入
// ============================================================================

import {
  PYTH_PRICE_FEED_IDS,
  getPriceFeedId as getPythPriceFeedId,
  getAvailablePythSymbols as getPythAvailableSymbols,
} from '@/lib/config/pythPriceFeeds';

// 重新导出以保持向后兼容
export { PYTH_PRICE_FEED_IDS };

// ============================================================================
// Pyth 特定配置
// ============================================================================

const PYTH_CHAIN_CONFIG: Record<SupportedChain, { defaultRpcUrl: string }> = {
  ethereum: { defaultRpcUrl: 'https://eth-mainnet.g.alchemy.com/v2' },
  polygon: { defaultRpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2' },
  arbitrum: { defaultRpcUrl: 'https://arb-mainnet.g.alchemy.com/v2' },
  optimism: { defaultRpcUrl: 'https://opt-mainnet.g.alchemy.com/v2' },
  base: { defaultRpcUrl: 'https://base-mainnet.g.alchemy.com/v2' },
  avalanche: { defaultRpcUrl: 'https://avax-mainnet.g.alchemy.com/v2' },
  bsc: { defaultRpcUrl: 'https://bsc-dataseed.binance.org' },
  sepolia: { defaultRpcUrl: 'https://eth-sepolia.g.alchemy.com/v2' },
  // 其他链
  fantom: { defaultRpcUrl: '' },
  celo: { defaultRpcUrl: '' },
  gnosis: { defaultRpcUrl: '' },
  linea: { defaultRpcUrl: '' },
  scroll: { defaultRpcUrl: '' },
  mantle: { defaultRpcUrl: '' },
  mode: { defaultRpcUrl: '' },
  blast: { defaultRpcUrl: '' },
  solana: { defaultRpcUrl: '' },
  near: { defaultRpcUrl: '' },
  aptos: { defaultRpcUrl: '' },
  sui: { defaultRpcUrl: '' },
  polygonAmoy: { defaultRpcUrl: '' },
  goerli: { defaultRpcUrl: '' },
  mumbai: { defaultRpcUrl: '' },
  local: { defaultRpcUrl: 'http://localhost:8545' },
};

// ============================================================================
// Pyth Client Class
// ============================================================================

export class PythClient {
  private publicClient: PublicClient;
  private chain: SupportedChain;
  private config: PythProtocolConfig;
  private contractAddress: Address;

  constructor(chain: SupportedChain, rpcUrl: string, config: PythProtocolConfig = {}) {
    this.chain = chain;
    this.config = config;

    const chainConfig = PYTH_CHAIN_CONFIG[chain];
    if (!chainConfig) {
      throw new Error(`Chain ${chain} not supported by Pyth`);
    }

    // 使用配置的合约地址或默认地址
    const contractAddress = config.pythContractAddress || PYTH_CONTRACT_ADDRESSES[chain];
    if (!contractAddress) {
      throw new Error(`No Pyth contract address for chain ${chain}`);
    }
    this.contractAddress = contractAddress as Address;

    this.publicClient = createPublicClient({
      chain: VIEM_CHAIN_MAP[chain],
      transport: http(rpcUrl),
    }) as PublicClient;
  }

  /**
   * 获取最新价格数据
   */
  async getLatestPrice(priceId: string): Promise<{
    price: bigint;
    conf: bigint;
    expo: number;
    publishTime: bigint;
    formattedPrice: number;
    confidence: number;
  }> {
    try {
      const priceData = (await this.publicClient.readContract({
        address: this.contractAddress,
        abi: PYTH_ABI,
        functionName: 'getPrice',
        args: [priceId as `0x${string}`],
      })) as [bigint, bigint, number, bigint];

      // 解析价格数据
      const price = priceData[0]; // int64
      const conf = priceData[1]; // uint64
      const expo = priceData[2]; // int32
      const publishTime = priceData[3]; // uint

      // 格式化价格 (考虑指数)
      const formattedPrice = parseFloat(formatUnits(price, Math.abs(Number(expo))));
      const confidence = parseFloat(formatUnits(conf, Math.abs(Number(expo))));

      return {
        price,
        conf,
        expo: Number(expo),
        publishTime,
        formattedPrice,
        confidence,
      };
    } catch (error) {
      logger.error('Failed to get Pyth price', {
        chain: this.chain,
        priceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 获取指定交易对的价格
   */
  async getPriceForSymbol(symbol: string): Promise<UnifiedPriceFeed | null> {
    const priceId = PYTH_PRICE_FEED_IDS[symbol];

    if (!priceId) {
      logger.warn(`No Pyth price feed found for ${symbol}`);
      return null;
    }

    return this.getUnifiedPriceFeed(symbol, priceId);
  }

  /**
   * 获取多个价格喂价
   */
  async getMultiplePrices(symbols: string[]): Promise<UnifiedPriceFeed[]> {
    const results = await Promise.allSettled(
      symbols.map(async (symbol) => {
        try {
          return await this.getPriceForSymbol(symbol);
        } catch (error) {
          logger.error(`Failed to get Pyth price for ${symbol}`, {
            error: error instanceof Error ? error.message : String(error),
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
   * 获取所有可用价格喂价
   */
  async getAllAvailableFeeds(): Promise<UnifiedPriceFeed[]> {
    const symbols = Object.keys(PYTH_PRICE_FEED_IDS);
    return this.getMultiplePrices(symbols);
  }

  /**
   * 获取指定价格喂价 ID 列表的价格
   */
  async getPricesForIds(priceIds: string[]): Promise<UnifiedPriceFeed[]> {
    const feeds: UnifiedPriceFeed[] = [];

    for (const priceId of priceIds) {
      try {
        // 查找对应的 symbol
        const symbol = Object.entries(PYTH_PRICE_FEED_IDS).find(
          ([_, id]) => id.toLowerCase() === priceId.toLowerCase(),
        )?.[0];

        if (symbol) {
          const feed = await this.getUnifiedPriceFeed(symbol, priceId);
          feeds.push(feed);
        }
      } catch (error) {
        logger.error(`Failed to get Pyth price for ${priceId}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return feeds;
  }

  /**
   * 转换为统一价格喂价格式
   */
  private async getUnifiedPriceFeed(symbol: string, priceId: string): Promise<UnifiedPriceFeed> {
    const priceData = await this.getLatestPrice(priceId);
    const [baseAsset, quoteAsset] = symbol.split('/');

    const now = new Date();
    const publishTime = new Date(Number(priceData.publishTime) * 1000);
    const stalenessSeconds = Math.floor((now.getTime() - publishTime.getTime()) / 1000);

    // 判断数据是否过期
    const stalenessThreshold = this.config.stalenessThreshold || DEFAULT_STALENESS_THRESHOLDS.PYTH;
    const isStale = stalenessSeconds > stalenessThreshold;

    // 计算置信度百分比
    const confidencePercent = (priceData.confidence / priceData.formattedPrice) * 100;

    return {
      id: `pyth-${this.chain}-${symbol}-${priceData.publishTime.toString()}`,
      instanceId: `pyth-${this.chain}`,
      protocol: 'pyth',
      chain: this.chain,
      symbol,
      baseAsset: baseAsset || 'UNKNOWN',
      quoteAsset: quoteAsset || 'USD',
      price: priceData.formattedPrice,
      priceRaw: priceData.price,
      decimals: Math.abs(priceData.expo),
      timestamp: publishTime.getTime(),
      confidence: confidencePercent,
      sources: ['pyth'], // Pyth 聚合多个源，但作为一个整体
      isStale,
      stalenessSeconds,
    };
  }

  /**
   * 检查价格喂价健康状态
   */
  async checkFeedHealth(priceId: string): Promise<{
    healthy: boolean;
    lastUpdate: Date;
    stalenessSeconds: number;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      const priceData = await this.getLatestPrice(priceId);
      const lastUpdate = new Date(Number(priceData.publishTime) * 1000);
      const now = new Date();
      const stalenessSeconds = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);

      // 检查数据新鲜度
      const stalenessThreshold =
        this.config.stalenessThreshold || DEFAULT_STALENESS_THRESHOLDS.PYTH;
      if (stalenessSeconds > stalenessThreshold) {
        issues.push(`Data is stale: ${stalenessSeconds}s old`);
      }

      // 检查价格是否为0
      if (priceData.price === 0n) {
        issues.push('Price is zero');
      }

      // 检查置信度
      const confidencePercent = (priceData.confidence / priceData.formattedPrice) * 100;
      if (confidencePercent > 1) {
        issues.push(`High uncertainty: ${confidencePercent.toFixed(2)}% confidence interval`);
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
        issues: [`Failed to read feed: ${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }

  /**
   * 获取 EMA (指数移动平均) 价格
   */
  async getEmaPrice(priceId: string): Promise<{
    price: bigint;
    conf: bigint;
    expo: number;
    publishTime: bigint;
    formattedPrice: number;
  }> {
    try {
      const priceData = (await this.publicClient.readContract({
        address: this.contractAddress,
        abi: PYTH_ABI,
        functionName: 'getEmaPrice',
        args: [priceId as `0x${string}`],
      })) as [bigint, bigint, number, bigint];

      const price = priceData[0];
      const conf = priceData[1];
      const expo = priceData[2];
      const publishTime = priceData[3];

      const formattedPrice = parseFloat(formatUnits(price, Math.abs(Number(expo))));

      return {
        price,
        conf,
        expo: Number(expo),
        publishTime,
        formattedPrice,
      };
    } catch (error) {
      logger.error('Failed to get Pyth EMA price', {
        chain: this.chain,
        priceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 获取当前区块号
   */
  async getBlockNumber(): Promise<bigint> {
    return this.publicClient.getBlockNumber();
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

export function createPythClient(
  chain: SupportedChain,
  rpcUrl: string,
  config?: PythProtocolConfig,
): PythClient {
  return new PythClient(chain, rpcUrl, config);
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取支持的 Pyth 链列表
 */
export function getSupportedPythChains(): SupportedChain[] {
  return Object.entries(PYTH_CONTRACT_ADDRESSES)
    .filter(([_, address]) => address !== undefined)
    .map(([chain]) => chain as SupportedChain);
}

/**
 * 获取所有可用的价格喂价符号
 */
export function getAvailablePythSymbols(): string[] {
  return getPythAvailableSymbols();
}

/**
 * 检查链是否支持 Pyth
 */
export function isChainSupportedByPyth(chain: SupportedChain): boolean {
  return PYTH_CONTRACT_ADDRESSES[chain] !== undefined;
}

/**
 * 获取价格喂价 ID
 */
export function getPriceFeedId(symbol: string): string | undefined {
  return getPythPriceFeedId(symbol);
}

/**
 * 获取合约地址
 */
export function getPythContractAddress(chain: SupportedChain): Address | undefined {
  return PYTH_CONTRACT_ADDRESSES[chain];
}
