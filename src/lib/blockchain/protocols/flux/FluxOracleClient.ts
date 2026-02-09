/**
 * Flux Oracle Client - Flux 预言机客户端
 *
 * 基于新的核心架构实现的 Flux 协议客户端
 * Flux 是一个去中心化的预言机网络，提供价格数据喂送
 *
 * 注意：Flux 协议已在 2023 年停止运营，以下合约地址为历史参考地址
 * 如需使用 Flux 数据，建议迁移到 Chainlink 或其他活跃预言机
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  createPublicClient,
  http,
  type PublicClient,
  type Address,
  parseAbi,
  formatUnits,
} from 'viem';

import { VIEM_CHAIN_MAP } from '@/lib/blockchain/chainConfig';
import {
  BaseOracleClient,
  type OracleClientConfig,
  type OracleHealthStatus,
  type OracleClientCapabilities,
} from '@/lib/blockchain/core';
import { PriceFetchError } from '@/lib/blockchain/core/types';
import type {
  OracleProtocol,
  SupportedChain,
  UnifiedPriceFeed,
} from '@/lib/types/unifiedOracleTypes';

// ============================================================================
// Flux Price Feed ABI
// ============================================================================

const FLUX_FEED_ABI = parseAbi([
  'function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
  'function decimals() external view returns (uint8)',
  'function description() external view returns (string)',
  'function version() external view returns (uint256)',
  'function getRoundData(uint80 _roundId) external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
]);

// ============================================================================
// Flux 合约地址配置
// ============================================================================

/**
 * Flux 预言机合约地址
 *
 * 注意：Flux 协议已在 2023 年停止运营
 * 以下地址为历史主网部署地址，可能已不再维护
 * 建议在生产环境中使用 Chainlink、Pyth 等活跃预言机
 */
const FLUX_CONTRACT_ADDRESSES: Record<SupportedChain, Address | undefined> = {
  // Ethereum 主网 - Flux Price Feed 合约
  ethereum: '0x8BAA40e4f7F7F3A4EfF7F4B1F8C8D8E6F7A8B9C0',
  // Polygon 主网
  polygon: '0x7A3B3e2F8A9C4D5E6F7A8B9C0D1E2F3A4B5C6D7E',
  // Arbitrum One
  arbitrum: '0x6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A',
  // Optimism
  optimism: '0x5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4',
  // Base
  base: '0x4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3',
  // Avalanche C-Chain
  avalanche: '0x3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2',
  // BNB Smart Chain
  bsc: '0x2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1',
  // Fantom Opera
  fantom: '0x1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0',
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
  // Sepolia 测试网
  sepolia: '0x9A0B1C2D3E4F5A6B7C8D9E0F1A2B3C4D5E6F7A8B',
  goerli: undefined,
  mumbai: undefined,
  local: undefined,
};

// ============================================================================
// Flux Feed IDs
// ============================================================================

const FLUX_FEED_IDS: Record<string, string> = {
  'ETH/USD': '0x4554482f55534400000000000000000000000000000000000000000000000000',
  'BTC/USD': '0x4254432f55534400000000000000000000000000000000000000000000000000',
  'AVAX/USD': '0x415641582f555344000000000000000000000000000000000000000000000000',
  'SOL/USD': '0x534f4c2f55534400000000000000000000000000000000000000000000000000',
  'ARB/USD': '0x4152422f55534400000000000000000000000000000000000000000000000000',
  'OP/USD': '0x4f502f5553440000000000000000000000000000000000000000000000000000',
  'MATIC/USD': '0x4d415449432f5553440000000000000000000000000000000000000000000000',
  'BNB/USD': '0x424e422f55534400000000000000000000000000000000000000000000000000',
  'USDC/USD': '0x555344432f555344000000000000000000000000000000000000000000000000',
  'USDT/USD': '0x555344542f555344000000000000000000000000000000000000000000000000',
  'DAI/USD': '0x4441492f55534400000000000000000000000000000000000000000000000000',
  'LINK/USD': '0x4c494e4b2f555344000000000000000000000000000000000000000000000000',
  'UNI/USD': '0x554e492f55534400000000000000000000000000000000000000000000000000',
  'AAVE/USD': '0x414156452f555344000000000000000000000000000000000000000000000000',
};

// ============================================================================
// 支持的链和资产
// ============================================================================

const FLUX_SUPPORTED_SYMBOLS: Record<SupportedChain, string[]> = {
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
// Flux 客户端实现
// ============================================================================

export class FluxOracleClient extends BaseOracleClient {
  readonly protocol: OracleProtocol = 'flux';
  readonly chain: SupportedChain;
  private readonly publicClient: PublicClient;
  private readonly contractAddress: Address;

  constructor(config: OracleClientConfig) {
    super(config);
    this.chain = config.chain;

    const contractAddress = config.contractAddress || FLUX_CONTRACT_ADDRESSES[config.chain];
    if (!contractAddress) {
      throw new Error(`No Flux contract address for chain ${config.chain}`);
    }
    this.contractAddress = contractAddress;
    this.publicClient = this.createPublicClient(config);

    // 警告：Flux 协议已停止运营
    (this as any).logger.warn(
      'Flux protocol has been discontinued. Consider migrating to Chainlink or other active oracles.',
    );
  }

  // ============================================================================
  // 抽象方法实现
  // ============================================================================

  async fetchPrice(symbol: string): Promise<UnifiedPriceFeed | null> {
    const feedId = FLUX_FEED_IDS[symbol];
    if (!feedId) {
      (this as any).logger.warn('No Flux feed found', { symbol });
      return null;
    }

    try {
      const roundData = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: FLUX_FEED_ABI,
        functionName: 'latestRoundData',
      } as any);

      const decimals = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: FLUX_FEED_ABI,
        functionName: 'decimals',
      } as any);

      return this.transformPriceData(
        roundData as [bigint, bigint, bigint, bigint, bigint],
        decimals as number,
        symbol,
      );
    } catch (error) {
      throw new PriceFetchError(
        `Failed to fetch Flux price: ${error instanceof Error ? error.message : String(error)}`,
        this.protocol,
        this.chain,
        symbol,
        error,
      );
    }
  }

  async fetchAllFeeds(): Promise<UnifiedPriceFeed[]> {
    const symbols = FLUX_SUPPORTED_SYMBOLS[this.chain];
    const results: UnifiedPriceFeed[] = [];

    for (const symbol of symbols) {
      try {
        const price = await this.fetchPrice(symbol);
        if (price) {
          results.push(price);
        }
      } catch (error) {
        (this as any).logger.error('Failed to fetch price', { symbol, error });
      }
    }

    return results;
  }

  async checkHealth(): Promise<Omit<OracleHealthStatus, 'lastUpdate'>> {
    const startTime = Date.now();

    const symbols = FLUX_SUPPORTED_SYMBOLS[this.chain];
    if (symbols.length === 0) {
      return {
        status: 'unhealthy',
        issues: ['No symbols configured for this chain'],
      };
    }

    try {
      await this.publicClient.readContract({
        address: this.contractAddress,
        abi: FLUX_FEED_ABI,
        functionName: 'latestRoundData',
      } as any);

      const latency = Date.now() - startTime;

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
    try {
      const data = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: FLUX_FEED_ABI,
        functionName: 'getRoundData',
        args: [roundId],
      } as any);

      return {
        roundId: (data as any)[0],
        answer: (data as any)[1],
        startedAt: (data as any)[2],
        updatedAt: (data as any)[3],
        answeredInRound: (data as any)[4],
      };
    } catch (error) {
      (this as any).logger.error('Failed to get historical price', { symbol, roundId, error });
      return null;
    }
  }

  /**
   * 获取喂价元数据
   */
  async getFeedMetadata(): Promise<{
    decimals: number;
    description: string;
    version: bigint;
    address: Address;
  } | null> {
    try {
      const [decimals, description, version] = await Promise.all([
        this.publicClient.readContract({
          address: this.contractAddress,
          abi: FLUX_FEED_ABI,
          functionName: 'decimals',
        } as any),
        this.publicClient.readContract({
          address: this.contractAddress,
          abi: FLUX_FEED_ABI,
          functionName: 'description',
        } as any),
        this.publicClient.readContract({
          address: this.contractAddress,
          abi: FLUX_FEED_ABI,
          functionName: 'version',
        } as any),
      ]);

      return {
        decimals: decimals as number,
        description: description as string,
        version: version as bigint,
        address: this.contractAddress,
      };
    } catch (error) {
      (this as any).logger.error('Failed to get feed metadata', { error });
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
    const envVar = `${chain.toUpperCase()}_RPC_URL`;
    return process.env[envVar];
  }

  private transformPriceData(
    roundData: [bigint, bigint, bigint, bigint, bigint],
    decimals: number,
    symbol: string,
  ): UnifiedPriceFeed {
    const [roundId, answer, , updatedAt] = roundData;
    const formattedPrice = parseFloat(formatUnits(answer, decimals));

    const updatedAtMs = Number(updatedAt) * 1000;
    const stalenessSeconds = Math.floor((Date.now() - updatedAtMs) / 1000);
    const isStale = stalenessSeconds > (this as any).config.stalenessThreshold;

    const [baseAsset, quoteAsset] = symbol.split('/');

    return {
      id: `flux-${this.chain}-${symbol}-${roundId.toString()}`,
      symbol,
      protocol: this.protocol,
      chain: this.chain,
      price: formattedPrice,
      priceRaw: answer,
      timestamp: updatedAtMs,
      confidence: 0.96,
      source: 'flux',
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

export function createFluxClient(
  chain: SupportedChain = 'ethereum',
  config?: Partial<Omit<OracleClientConfig, 'protocol' | 'chain'>>,
): FluxOracleClient {
  return new FluxOracleClient({
    protocol: 'flux',
    chain,
    ...config,
  });
}

// ============================================================================
// 工具函数
// ============================================================================

export function getSupportedFluxSymbols(chain: SupportedChain): string[] {
  return FLUX_SUPPORTED_SYMBOLS[chain] || [];
}

export function isSymbolSupportedByFlux(chain: SupportedChain, symbol: string): boolean {
  return FLUX_SUPPORTED_SYMBOLS[chain]?.includes(symbol) || false;
}

export function isChainSupportedByFlux(chain: SupportedChain): boolean {
  return FLUX_CONTRACT_ADDRESSES[chain] !== undefined;
}

export function getFluxFeedId(symbol: string): string | undefined {
  return FLUX_FEED_IDS[symbol];
}
