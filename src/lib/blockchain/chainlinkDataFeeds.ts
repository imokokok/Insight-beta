/**
 * Chainlink Data Feeds Integration
 *
 * Chainlink 价格喂价集成模块
 * 支持多链价格数据获取和监控
 */

import {
  createPublicClient,
  http,
  type PublicClient,
  type Address,
  parseAbi,
  formatUnits,
} from 'viem';
import { mainnet, polygon, arbitrum, optimism, base, avalanche, bsc, fantom } from 'viem/chains';
import { logger } from '@/lib/logger';
import type {
  SupportedChain,
  UnifiedPriceFeed,
  ChainlinkProtocolConfig,
} from '@/lib/types/unifiedOracleTypes';

// ============================================================================
// Chainlink ABI
// ============================================================================

const AGGREGATOR_ABI = parseAbi([
  'function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
  'function decimals() external view returns (uint8)',
  'function description() external view returns (string)',
  'function version() external view returns (uint256)',
  'function getRoundData(uint80 _roundId) external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
]);

// Feed Registry ABI (保留供将来使用)
// const FEED_REGISTRY_ABI = parseAbi([
//   'function latestRoundData(address base, address quote) external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
//   'function decimals(address base, address quote) external view returns (uint8)',
//   'function getFeed(address base, address quote) external view returns (address)',
// ]);

// ============================================================================
// Chain 配置
// ============================================================================

const CHAINLINK_CHAIN_CONFIG: Record<
  SupportedChain,
  {
    viemChain: typeof mainnet;
    feedRegistry?: Address;
    defaultRpcUrl: string;
  }
> = {
  ethereum: {
    viemChain: mainnet,
    feedRegistry: '0x47Fb2585D2C56Fe188D0E6ec6a473f24e99F1A76',
    defaultRpcUrl: 'https://eth-mainnet.g.alchemy.com/v2',
  },
  polygon: {
    viemChain: polygon,
    defaultRpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2',
  },
  arbitrum: {
    viemChain: arbitrum,
    defaultRpcUrl: 'https://arb-mainnet.g.alchemy.com/v2',
  },
  optimism: {
    viemChain: optimism,
    defaultRpcUrl: 'https://opt-mainnet.g.alchemy.com/v2',
  },
  base: {
    viemChain: base,
    defaultRpcUrl: 'https://base-mainnet.g.alchemy.com/v2',
  },
  avalanche: {
    viemChain: avalanche,
    defaultRpcUrl: 'https://avax-mainnet.g.alchemy.com/v2',
  },
  bsc: {
    viemChain: bsc,
    defaultRpcUrl: 'https://bsc-dataseed.binance.org',
  },
  fantom: {
    viemChain: fantom,
    defaultRpcUrl: 'https://rpc.ftm.tools',
  },
  // 其他链不支持 Chainlink
  celo: { viemChain: mainnet, defaultRpcUrl: '' },
  gnosis: { viemChain: mainnet, defaultRpcUrl: '' },
  linea: { viemChain: mainnet, defaultRpcUrl: '' },
  scroll: { viemChain: mainnet, defaultRpcUrl: '' },
  mantle: { viemChain: mainnet, defaultRpcUrl: '' },
  mode: { viemChain: mainnet, defaultRpcUrl: '' },
  blast: { viemChain: mainnet, defaultRpcUrl: '' },
  solana: { viemChain: mainnet, defaultRpcUrl: '' },
  near: { viemChain: mainnet, defaultRpcUrl: '' },
  aptos: { viemChain: mainnet, defaultRpcUrl: '' },
  sui: { viemChain: mainnet, defaultRpcUrl: '' },
  polygonAmoy: { viemChain: polygon, defaultRpcUrl: '' },
  sepolia: { viemChain: mainnet, defaultRpcUrl: '' },
  goerli: { viemChain: mainnet, defaultRpcUrl: '' },
  mumbai: { viemChain: polygon, defaultRpcUrl: '' },
  local: { viemChain: mainnet, defaultRpcUrl: 'http://localhost:8545' },
};

// 常用价格喂价地址映射
const POPULAR_FEEDS: Record<SupportedChain, Record<string, Address>> = {
  ethereum: {
    'ETH/USD': '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
    'BTC/USD': '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c',
    'LINK/USD': '0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c',
    'DAI/USD': '0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9',
    'USDC/USD': '0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6',
    'USDT/USD': '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D',
    'AAVE/USD': '0x547a514d5e3769680Ce22B2361c10Ea13619e8a9',
    'UNI/USD': '0x553303d460EE0afB37EdFf9bE42922D8FF63220e',
  },
  polygon: {
    'ETH/USD': '0xF9680D99D6C9589e2a93a78A04A279e509205945',
    'BTC/USD': '0xc907E116054Ad103354f2D350FD2514433D57F6f',
    'LINK/USD': '0xd9FFdb71EbE7496cC440152d43986Aae0AB76665',
    'DAI/USD': '0x4746DeC9e833A82EC7C2C1356372CcF2cfcD2F3D',
    'USDC/USD': '0xfE4A8cc5b5B2366C1B58Bea3858e81843581b2F7',
    'MATIC/USD': '0xAB594600376Ec9fD91F8e885dADF0CE036862dE0',
  },
  arbitrum: {
    'ETH/USD': '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612',
    'BTC/USD': '0x6ce185860a4963106506C203335A2910413708e9',
    'LINK/USD': '0x86E53CF1B870786351Da77A57575e79CB55812CB',
    'USDC/USD': '0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3',
    'USDT/USD': '0x3f3f5dF88dC9F13eac63DF89B16E7F7Ff7E1A6B6',
  },
  optimism: {
    'ETH/USD': '0x13e3Ee699D1909E989722E753853AE30b17e08c5',
    'BTC/USD': '0xD702DD976Fb76Fffc2D3963D037dfDae5b04E593',
    'LINK/USD': '0xCc232dcFAA0f0cDb8b7C5A73988e1ca85f792f3b',
    'USDC/USD': '0x16a9FA2FDa030272Ce99B29CF780dFA30361E0f3',
  },
  base: {
    'ETH/USD': '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70',
    'BTC/USD': '0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F',
    'LINK/USD': '0x17D5820349E2aA9167247E3C98Eb5E0A8E3E0fF3',
    'USDC/USD': '0x7e860098F58bBFC8648a4311b374B1D669a2bc6B',
  },
  avalanche: {
    'ETH/USD': '0x976B3D034E162d8bD72D6b9C989d545b839003b0',
    'BTC/USD': '0x2779D32d5166BAaa2B2b658333bA7e6Ec9C505c9',
    'LINK/USD': '0x1a8d59E2E57F91f7b7f3f5d5C8F8B3B6b8e2C7D4',
    'AVAX/USD': '0x0A77230d17318075983913bC2145DB16C7366156',
    'USDC/USD': '0xF096872672F44d6EBA71458D74fe67F9a77a23B9',
  },
  bsc: {
    'ETH/USD': '0x9ef1B8c0E4F7dc8bF5719Ea496883DC6401d5b2e',
    'BTC/USD': '0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf',
    'BNB/USD': '0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE',
    'USDC/USD': '0x51597f405303C4377E36123cBc172b13269EA163',
    'USDT/USD': '0xB97Ad0E74fa7d920791E90258A6E2085088b4320',
  },
  fantom: {
    'ETH/USD': '0x11DdD59A217dD80c7616aD1E55F8D550f83E7B5a',
    'BTC/USD': '0x8e94C22842F4A64FED3A7563D1E3eB11E6C6E272',
    'FTM/USD': '0xf4766552D15AE4d256Ad41B6cf2933482B0680dc',
    'USDC/USD': '0x2553f4d6C7E21f5e98dC37c6E0aEB8d1B4C8E5F6',
  },
  // 其他链留空
  celo: {},
  gnosis: {},
  linea: {},
  scroll: {},
  mantle: {},
  mode: {},
  blast: {},
  solana: {},
  near: {},
  aptos: {},
  sui: {},
  polygonAmoy: {},
  sepolia: {},
  goerli: {},
  mumbai: {},
  local: {},
};

// ============================================================================
// Chainlink Client Class
// ============================================================================

export class ChainlinkClient {
  private publicClient: PublicClient;
  private chain: SupportedChain;
  private config: ChainlinkProtocolConfig;

  constructor(chain: SupportedChain, rpcUrl: string, config: ChainlinkProtocolConfig = {}) {
    this.chain = chain;
    this.config = config;

    const chainConfig = CHAINLINK_CHAIN_CONFIG[chain];
    if (!chainConfig) {
      throw new Error(`Chain ${chain} not supported by Chainlink`);
    }

    this.publicClient = createPublicClient({
      chain: chainConfig.viemChain,
      transport: http(rpcUrl),
    });
  }

  /**
   * 获取最新价格数据
   */
  async getLatestPrice(feedAddress: Address): Promise<{
    roundId: bigint;
    answer: bigint;
    startedAt: bigint;
    updatedAt: bigint;
    answeredInRound: bigint;
    decimals: number;
    description: string;
  }> {
    try {
      const [roundData, decimals, description] = await Promise.all([
        this.publicClient.readContract({
          address: feedAddress,
          abi: AGGREGATOR_ABI,
          functionName: 'latestRoundData',
        }),
        this.publicClient.readContract({
          address: feedAddress,
          abi: AGGREGATOR_ABI,
          functionName: 'decimals',
        }),
        this.publicClient.readContract({
          address: feedAddress,
          abi: AGGREGATOR_ABI,
          functionName: 'description',
        }),
      ]);

      return {
        roundId: roundData[0],
        answer: roundData[1],
        startedAt: roundData[2],
        updatedAt: roundData[3],
        answeredInRound: roundData[4],
        decimals,
        description,
      };
    } catch (error) {
      logger.error('Failed to get Chainlink price', {
        chain: this.chain,
        feedAddress,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 获取指定交易对的价格
   */
  async getPriceForSymbol(symbol: string): Promise<UnifiedPriceFeed | null> {
    const feeds = POPULAR_FEEDS[this.chain];
    const feedAddress = feeds?.[symbol];

    if (!feedAddress) {
      logger.warn(`No Chainlink feed found for ${symbol} on ${this.chain}`);
      return null;
    }

    return this.getUnifiedPriceFeed(symbol, feedAddress);
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
        logger.error(`Failed to get price for ${symbol}`, {
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
    const feeds = POPULAR_FEEDS[this.chain];
    const symbols = Object.keys(feeds);
    return this.getMultiplePrices(symbols);
  }

  /**
   * 转换为统一价格喂价格式
   */
  private async getUnifiedPriceFeed(
    symbol: string,
    feedAddress: Address,
  ): Promise<UnifiedPriceFeed> {
    const priceData = await this.getLatestPrice(feedAddress);
    const [baseAsset, quoteAsset] = symbol.split('/');

    const formattedPrice = parseFloat(formatUnits(priceData.answer, priceData.decimals));

    const now = new Date();
    const updatedAt = new Date(Number(priceData.updatedAt) * 1000);
    const stalenessSeconds = Math.floor((now.getTime() - updatedAt.getTime()) / 1000);

    // 判断数据是否过期（默认1小时）
    const stalenessThreshold = this.config.stalenessThreshold || 3600;
    const isStale = stalenessSeconds > stalenessThreshold;

    return {
      id: `chainlink-${this.chain}-${symbol}-${priceData.roundId.toString()}`,
      instanceId: `chainlink-${this.chain}`,
      protocol: 'chainlink',
      chain: this.chain,
      symbol,
      baseAsset,
      quoteAsset,
      price: formattedPrice,
      priceRaw: priceData.answer.toString(),
      decimals: priceData.decimals,
      timestamp: updatedAt.toISOString(),
      isStale,
      stalenessSeconds,
    };
  }

  /**
   * 检查价格喂价健康状态
   */
  async checkFeedHealth(feedAddress: Address): Promise<{
    healthy: boolean;
    lastUpdate: Date;
    stalenessSeconds: number;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      const priceData = await this.getLatestPrice(feedAddress);
      const lastUpdate = new Date(Number(priceData.updatedAt) * 1000);
      const now = new Date();
      const stalenessSeconds = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);

      // 检查数据新鲜度
      const heartbeat = this.config.heartbeat || 3600; // 默认1小时
      if (stalenessSeconds > heartbeat) {
        issues.push(`Data is stale: ${stalenessSeconds}s old`);
      }

      // 检查价格是否为0
      if (priceData.answer === 0n) {
        issues.push('Price is zero');
      }

      // 检查轮次是否有效
      if (priceData.answeredInRound < priceData.roundId) {
        issues.push('Round data may be incomplete');
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
   * 获取喂价合约元数据
   */
  async getFeedMetadata(feedAddress: Address): Promise<{
    decimals: number;
    description: string;
    version: bigint;
  }> {
    const [decimals, description, version] = await Promise.all([
      this.publicClient.readContract({
        address: feedAddress,
        abi: AGGREGATOR_ABI,
        functionName: 'decimals',
      }),
      this.publicClient.readContract({
        address: feedAddress,
        abi: AGGREGATOR_ABI,
        functionName: 'description',
      }),
      this.publicClient.readContract({
        address: feedAddress,
        abi: AGGREGATOR_ABI,
        functionName: 'version',
      }),
    ]);

    return { decimals, description, version };
  }

  /**
   * 获取历史价格数据
   */
  async getHistoricalPrice(
    feedAddress: Address,
    roundId: bigint,
  ): Promise<{
    roundId: bigint;
    answer: bigint;
    startedAt: bigint;
    updatedAt: bigint;
    answeredInRound: bigint;
  }> {
    const data = await this.publicClient.readContract({
      address: feedAddress,
      abi: AGGREGATOR_ABI,
      functionName: 'getRoundData',
      args: [roundId],
    });

    return {
      roundId: data[0],
      answer: data[1],
      startedAt: data[2],
      updatedAt: data[3],
      answeredInRound: data[4],
    };
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

export function createChainlinkClient(
  chain: SupportedChain,
  rpcUrl: string,
  config?: ChainlinkProtocolConfig,
): ChainlinkClient {
  return new ChainlinkClient(chain, rpcUrl, config);
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取支持的 Chainlink 链列表
 */
export function getSupportedChainlinkChains(): SupportedChain[] {
  return Object.entries(CHAINLINK_CHAIN_CONFIG)
    .filter(([_, config]) => config.defaultRpcUrl !== '')
    .map(([chain]) => chain as SupportedChain);
}

/**
 * 获取指定链的可用价格喂价列表
 */
export function getAvailableFeedsForChain(chain: SupportedChain): string[] {
  return Object.keys(POPULAR_FEEDS[chain] || {});
}

/**
 * 检查链是否支持 Chainlink
 */
export function isChainSupportedByChainlink(chain: SupportedChain): boolean {
  return CHAINLINK_CHAIN_CONFIG[chain]?.defaultRpcUrl !== '';
}

/**
 * 获取喂价地址
 */
export function getFeedAddress(chain: SupportedChain, symbol: string): Address | undefined {
  return POPULAR_FEEDS[chain]?.[symbol];
}
