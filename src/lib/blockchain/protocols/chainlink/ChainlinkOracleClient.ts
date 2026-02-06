/**
 * Chainlink Oracle Client - Chainlink 预言机客户端
 *
 * 基于新的核心架构实现的 Chainlink 协议客户端
 */

import {
  createPublicClient,
  http,
  type PublicClient,
  type Address,
  parseAbi,
  formatUnits,
} from 'viem';
import type {
  OracleProtocol,
  SupportedChain,
  UnifiedPriceFeed,
} from '@/lib/types/unifiedOracleTypes';
import {
  BaseOracleClient,
  type OracleClientConfig,
  type OracleHealthStatus,
  type OracleClientCapabilities,
} from '@/lib/blockchain/core';
import { PriceFetchError } from '@/lib/blockchain/core/types';
import { VIEM_CHAIN_MAP } from '@/lib/blockchain/chainConfig';

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

// ============================================================================
// 价格喂价地址映射
// ============================================================================

const CHAINLINK_FEEDS: Record<SupportedChain, Record<string, Address>> = {
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
// Chainlink 客户端实现
// ============================================================================

export class ChainlinkOracleClient extends BaseOracleClient {
  readonly protocol: OracleProtocol = 'chainlink';
  readonly chain: SupportedChain;
  private readonly publicClient: PublicClient;

  constructor(config: OracleClientConfig) {
    super(config);
    this.chain = config.chain;
    this.publicClient = this.createPublicClient(config);
  }

  // ============================================================================
  // 抽象方法实现
  // ============================================================================

  async fetchPrice(symbol: string): Promise<UnifiedPriceFeed | null> {
    const feeds = CHAINLINK_FEEDS[this.chain];
    const feedAddress = feeds?.[symbol];

    if (!feedAddress) {
      this.logger.warn('No Chainlink feed found', { symbol, chain: this.chain });
      return null;
    }

    try {
      const [roundData, decimals] = await Promise.all([
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
      ]);

      return this.transformPriceData(symbol, feedAddress, [...roundData], decimals);
    } catch (error) {
      throw new PriceFetchError(
        `Failed to fetch Chainlink price: ${error instanceof Error ? error.message : String(error)}`,
        this.protocol,
        this.chain,
        symbol,
        error,
      );
    }
  }

  async fetchAllFeeds(): Promise<UnifiedPriceFeed[]> {
    const feeds = CHAINLINK_FEEDS[this.chain];
    const symbols = Object.keys(feeds);

    const results = await Promise.allSettled(symbols.map((symbol) => this.fetchPrice(symbol)));

    return results
      .filter(
        (result): result is PromiseFulfilledResult<UnifiedPriceFeed> =>
          result.status === 'fulfilled' && result.value !== null,
      )
      .map((result) => result.value);
  }

  async checkHealth(): Promise<Omit<OracleHealthStatus, 'lastUpdate'>> {
    const feeds = CHAINLINK_FEEDS[this.chain];
    const symbols = Object.keys(feeds);

    if (symbols.length === 0) {
      return {
        status: 'unhealthy',
        issues: ['No feeds configured for this chain'],
      };
    }

    // 检查第一个喂价
    const testSymbol = symbols[0]!;
    const feedAddress = feeds[testSymbol]!;

    const startTime = Date.now();

    try {
      const roundData = await this.publicClient.readContract({
        address: feedAddress,
        abi: AGGREGATOR_ABI,
        functionName: 'latestRoundData',
      });

      const latency = Date.now() - startTime;
      const updatedAt = Number(roundData[3]) * 1000;
      const stalenessSeconds = Math.floor((Date.now() - updatedAt) / 1000);
      const isStale = stalenessSeconds > this.config.stalenessThreshold;

      if (isStale) {
        return {
          status: 'degraded',
          latency,
          issues: [`Data is stale: ${stalenessSeconds}s old`],
        };
      }

      if (roundData[1] === 0n) {
        return {
          status: 'degraded',
          latency,
          issues: ['Price is zero'],
        };
      }

      return {
        status: 'healthy',
        latency,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        issues: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  getCapabilities(): OracleClientCapabilities {
    return {
      priceFeeds: true,
      assertions: false,
      disputes: false,
      vrf: false,
      customData: false,
      batchQueries: true,
      websocket: false,
    };
  }

  // ============================================================================
  // 公共方法
  // ============================================================================

  /**
   * 获取历史价格数据
   */
  async getHistoricalPrice(
    symbol: string,
    roundId: bigint,
  ): Promise<{
    roundId: bigint;
    answer: bigint;
    startedAt: bigint;
    updatedAt: bigint;
    answeredInRound: bigint;
  } | null> {
    const feeds = CHAINLINK_FEEDS[this.chain];
    const feedAddress = feeds?.[symbol];

    if (!feedAddress) {
      return null;
    }

    try {
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
    } catch (error) {
      this.logger.error('Failed to get historical price', { symbol, roundId, error });
      return null;
    }
  }

  /**
   * 获取喂价元数据
   */
  async getFeedMetadata(symbol: string): Promise<{
    decimals: number;
    description: string;
    version: bigint;
    address: Address;
  } | null> {
    const feeds = CHAINLINK_FEEDS[this.chain];
    const feedAddress = feeds?.[symbol];

    if (!feedAddress) {
      return null;
    }

    try {
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

      return { decimals, description, version, address: feedAddress };
    } catch (error) {
      this.logger.error('Failed to get feed metadata', { symbol, error });
      return null;
    }
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  private createPublicClient(config: OracleClientConfig): PublicClient {
    const rpcUrl = config.rpcUrl || this.getDefaultRpcUrl(config.chain);

    if (!rpcUrl) {
      throw new Error(`No RPC URL available for chain ${config.chain}`);
    }

    return createPublicClient({
      chain: VIEM_CHAIN_MAP[config.chain],
      transport: http(rpcUrl, { timeout: config.timeoutMs ?? 30000 }),
    }) as PublicClient;
  }

  private getDefaultRpcUrl(chain: SupportedChain): string | undefined {
    // 可以从环境变量或配置中获取
    const envVar = `${chain.toUpperCase()}_RPC_URL`;
    return process.env[envVar];
  }

  private transformPriceData(
    symbol: string,
    _feedAddress: Address,
    roundData: [bigint, bigint, bigint, bigint, bigint],
    decimals: number,
  ): UnifiedPriceFeed {
    const [roundId, answer, , updatedAt] = roundData;
    const formattedPrice = parseFloat(formatUnits(answer, decimals));

    const updatedAtMs = Number(updatedAt) * 1000;
    const stalenessSeconds = Math.floor((Date.now() - updatedAtMs) / 1000);
    const isStale = stalenessSeconds > this.config.stalenessThreshold;

    const [baseAsset, quoteAsset] = symbol.split('/');

    return {
      id: `chainlink-${this.chain}-${symbol}-${roundId.toString()}`,
      symbol,
      protocol: this.protocol,
      chain: this.chain,
      price: formattedPrice,
      priceRaw: answer,
      timestamp: updatedAtMs,
      confidence: 1, // Chainlink 默认高置信度
      source: 'chainlink',
      decimals,
      isStale,
      stalenessSeconds: isStale ? stalenessSeconds : 0,
      baseAsset: baseAsset || 'UNKNOWN',
      quoteAsset: quoteAsset || 'USD',
    };
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

export function createChainlinkClient(
  chain: SupportedChain = 'ethereum',
  config?: Partial<Omit<OracleClientConfig, 'protocol' | 'chain'>>,
): ChainlinkOracleClient {
  return new ChainlinkOracleClient({
    protocol: 'chainlink',
    chain,
    ...config,
  });
}

// ============================================================================
// 工具函数
// ============================================================================

export function getSupportedChainlinkSymbols(chain: SupportedChain): string[] {
  return Object.keys(CHAINLINK_FEEDS[chain] || {});
}

export function isSymbolSupportedByChainlink(chain: SupportedChain, symbol: string): boolean {
  return symbol in (CHAINLINK_FEEDS[chain] || {});
}

export function getChainlinkFeedAddress(
  chain: SupportedChain,
  symbol: string,
): Address | undefined {
  return CHAINLINK_FEEDS[chain]?.[symbol];
}
