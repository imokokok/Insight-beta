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
import {
  mainnet,
  polygon,
  arbitrum,
  optimism,
  base,
  avalanche,
  bsc,
} from 'viem/chains';
import { logger } from '@/lib/logger';
import type {
  SupportedChain,
  UnifiedPriceFeed,
  PythProtocolConfig,
} from '@/lib/types/unifiedOracleTypes';

// ============================================================================
// Pyth ABI
// ============================================================================

const PYTH_ABI = parseAbi([
  'function getPrice(bytes32 id) external view returns (PythStructs.Price memory price)',
  'function getEmaPrice(bytes32 id) external view returns (PythStructs.Price memory price)',
  'function getPriceUnsafe(bytes32 id) external view returns (PythStructs.Price memory price)',
  'function getPriceNoOlderThan(bytes32 id, uint age) external view returns (PythStructs.Price memory price)',
  'function parsePriceFeedUpdates(bytes[] calldata updateData, bytes32[] calldata priceIds, uint64 minPublishTime, uint64 maxPublishTime) external payable returns (PythStructs.PriceFeed[] memory priceFeeds)',
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

const PYTH_CONTRACT_ADDRESSES: Record<SupportedChain, Address | undefined> = {
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
// ============================================================================

const PYTH_PRICE_FEED_IDS: Record<string, string> = {
  'ETH/USD': '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  'BTC/USD': '0xe62df6c8b4a85fe1f67dab44abcabdeb54c0f983b2d28b4583c5d9483c324d5b',
  'SOL/USD': '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  'AVAX/USD': '0x93da3352f9f1d105fdfe4971cfa80e9dd777bfc5d0f683ebb6e1294b92137bb7',
  'MATIC/USD': '0x5de33a9112c2b700b8d30b8a3402c103578ccfa2765696471cc672bd5cf6ac52',
  'BNB/USD': '0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f',
  'ARB/USD': '0x3fa4252848f9f0a1450fbbf400fc13e3461d0919e0aaaf49facf448471fd3ce4',
  'OP/USD': '0x385e76cc5f875b51cf3554064d092f422d62b4755e385b5e6219d8a5b1cc1c3c',
  'LINK/USD': '0x8ac0c70fff57e9aefdf5edf44b51d62c2d433617cbb900000000000000000000',
  'UNI/USD': '0x78d185a741d07edb3412b120000000000000000000000000000000000000000',
  'AAVE/USD': '0x2b9ab1e972000000000000000000000000000000000000000000000000000000',
  'CRV/USD': '0x5dbbdb28d1e0b1a0000000000000000000000000000000000000000000000000',
  'SNX/USD': '0x39d020f000000000000000000000000000000000000000000000000000000000',
  'COMP/USD': '0x4a8e0c8d6c9e5f00000000000000000000000000000000000000000000000000',
  'MKR/USD': '0x3a810ff000000000000000000000000000000000000000000000000000000000',
  'YFI/USD': '0x2d5a570000000000000000000000000000000000000000000000000000000000',
  '1INCH/USD': '0x2495a3b000000000000000000000000000000000000000000000000000000000',
  'SUSHI/USD': '0x26b3800000000000000000000000000000000000000000000000000000000000',
};

// ============================================================================
// Chain 配置
// ============================================================================

// viem chain 映射
const VIEM_CHAIN_MAP = {
  ethereum: mainnet,
  polygon: polygon,
  arbitrum: arbitrum,
  optimism: optimism,
  base: base,
  avalanche: avalanche,
  bsc: bsc,
  sepolia: mainnet,
  fantom: mainnet,
  celo: mainnet,
  gnosis: mainnet,
  linea: mainnet,
  scroll: mainnet,
  mantle: mainnet,
  mode: mainnet,
  blast: mainnet,
  solana: mainnet,
  near: mainnet,
  aptos: mainnet,
  sui: mainnet,
  polygonAmoy: polygon,
  goerli: mainnet,
  mumbai: polygon,
  local: mainnet,
} as const;

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

  constructor(
    chain: SupportedChain,
    rpcUrl: string,
    config: PythProtocolConfig = {}
  ) {
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
    });
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
      const priceData = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: PYTH_ABI,
        functionName: 'getPrice',
        args: [priceId as `0x${string}`],
      }) as [bigint, bigint, number, bigint];

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
    const feeds: UnifiedPriceFeed[] = [];

    for (const symbol of symbols) {
      try {
        const feed = await this.getPriceForSymbol(symbol);
        if (feed) {
          feeds.push(feed);
        }
      } catch (error) {
        logger.error(`Failed to get Pyth price for ${symbol}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return feeds;
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
          ([_, id]) => id.toLowerCase() === priceId.toLowerCase()
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
  private async getUnifiedPriceFeed(
    symbol: string,
    priceId: string
  ): Promise<UnifiedPriceFeed> {
    const priceData = await this.getLatestPrice(priceId);
    const [baseAsset, quoteAsset] = symbol.split('/');

    const now = new Date();
    const publishTime = new Date(Number(priceData.publishTime) * 1000);
    const stalenessSeconds = Math.floor(
      (now.getTime() - publishTime.getTime()) / 1000
    );

    // 判断数据是否过期
    const stalenessThreshold = this.config.stalenessThreshold || 60; // Pyth 默认 60 秒
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
      priceRaw: priceData.price.toString(),
      decimals: Math.abs(priceData.expo),
      timestamp: publishTime.toISOString(),
      confidence: confidencePercent,
      sources: 1, // Pyth 聚合多个源，但作为一个整体
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
      const stalenessSeconds = Math.floor(
        (now.getTime() - lastUpdate.getTime()) / 1000
      );

      // 检查数据新鲜度
      const stalenessThreshold = this.config.stalenessThreshold || 60;
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
        issues: [
          `Failed to read feed: ${error instanceof Error ? error.message : String(error)}`,
        ],
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
      const priceData = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: PYTH_ABI,
        functionName: 'getEmaPrice',
        args: [priceId as `0x${string}`],
      }) as [bigint, bigint, number, bigint];

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
  config?: PythProtocolConfig
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
  return Object.keys(PYTH_PRICE_FEED_IDS);
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
  return PYTH_PRICE_FEED_IDS[symbol];
}

/**
 * 获取合约地址
 */
export function getPythContractAddress(chain: SupportedChain): Address | undefined {
  return PYTH_CONTRACT_ADDRESSES[chain];
}
