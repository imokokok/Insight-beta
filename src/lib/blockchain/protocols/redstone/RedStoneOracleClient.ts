/**
 * RedStone Oracle Client - RedStone 预言机客户端
 *
 * 基于新的核心架构实现的 RedStone 协议客户端
 * 支持拉取式 (pull-based) 价格数据获取
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
// RedStone ABI
// ============================================================================

const REDSTONE_ABI = parseAbi([
  'function getPrice(bytes32 feedId) external view returns (uint256 price, uint256 timestamp)',
  'function getPrices(bytes32[] calldata feedIds) external view returns (uint256[] memory prices, uint256[] memory timestamps)',
]);

// ============================================================================
// RedStone 合约地址配置
// ============================================================================

const REDSTONE_CONTRACT_ADDRESSES: Record<SupportedChain, Address | undefined> = {
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

const REDSTONE_FEED_IDS: Record<string, string> = {
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

const REDSTONE_SUPPORTED_SYMBOLS: Record<SupportedChain, string[]> = {
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
// RedStone 客户端实现
// ============================================================================

export class RedStoneOracleClient extends BaseOracleClient {
  readonly protocol: OracleProtocol = 'redstone';
  readonly chain: SupportedChain;
  private readonly publicClient: PublicClient;
  private readonly contractAddress: Address;

  constructor(config: OracleClientConfig) {
    super(config);
    this.chain = config.chain;

    const contractAddress = config.contractAddress || REDSTONE_CONTRACT_ADDRESSES[config.chain];
    if (!contractAddress) {
      throw new Error(`No RedStone contract address for chain ${config.chain}`);
    }
    this.contractAddress = contractAddress;
    this.publicClient = this.createPublicClient(config);
  }

  // ============================================================================
  // 抽象方法实现
  // ============================================================================

  async fetchPrice(symbol: string): Promise<UnifiedPriceFeed | null> {
    const feedId = REDSTONE_FEED_IDS[symbol];
    if (!feedId) {
      this.logger.warn('No RedStone feed found', { symbol });
      return null;
    }

    try {
      const result = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: REDSTONE_ABI,
        functionName: 'getPrice',
        args: [feedId as `0x${string}`],
      });

      const price = result[0];
      const timestamp = Number(result[1]);

      return this.transformPriceData(price, timestamp, symbol);
    } catch (error) {
      throw new PriceFetchError(
        `Failed to fetch RedStone price: ${error instanceof Error ? error.message : String(error)}`,
        this.protocol,
        this.chain,
        symbol,
        error,
      );
    }
  }

  async fetchAllFeeds(): Promise<UnifiedPriceFeed[]> {
    const symbols = REDSTONE_SUPPORTED_SYMBOLS[this.chain];
    const results: UnifiedPriceFeed[] = [];

    for (const symbol of symbols) {
      try {
        const price = await this.fetchPrice(symbol);
        if (price) {
          results.push(price);
        }
      } catch (error) {
        this.logger.error('Failed to fetch price', { symbol, error });
      }
    }

    return results;
  }

  async checkHealth(): Promise<Omit<OracleHealthStatus, 'lastUpdate'>> {
    const startTime = Date.now();

    const symbols = REDSTONE_SUPPORTED_SYMBOLS[this.chain];
    if (symbols.length === 0) {
      return {
        status: 'unhealthy',
        issues: ['No symbols configured for this chain'],
      };
    }

    try {
      const testSymbol = symbols[0]!;
      const feedId = REDSTONE_FEED_IDS[testSymbol];

      if (!feedId) {
        return {
          status: 'unhealthy',
          issues: ['No feed ID found for test symbol'],
        };
      }

      await this.publicClient.readContract({
        address: this.contractAddress,
        abi: REDSTONE_ABI,
        functionName: 'getPrice',
        args: [feedId as `0x${string}`],
      });

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

  private transformPriceData(price: bigint, timestamp: number, symbol: string): UnifiedPriceFeed {
    // RedStone 使用 8 位小数
    const formattedPrice = parseFloat(formatUnits(price, 8));
    const timestampMs = timestamp * 1000;
    const stalenessSeconds = Math.floor((Date.now() - timestampMs) / 1000);
    const isStale = stalenessSeconds > this.config.stalenessThreshold;

    const [baseAsset, quoteAsset] = symbol.split('/');

    return {
      id: `redstone-${this.chain}-${symbol}-${timestamp}`,
      symbol,
      protocol: this.protocol,
      chain: this.chain,
      price: formattedPrice,
      priceRaw: price,
      timestamp: timestampMs,
      confidence: 0.97,
      source: 'redstone',
      decimals: 8,
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

export function createRedStoneClient(
  chain: SupportedChain = 'ethereum',
  config?: Partial<Omit<OracleClientConfig, 'protocol' | 'chain'>>,
): RedStoneOracleClient {
  return new RedStoneOracleClient({
    protocol: 'redstone',
    chain,
    ...config,
  });
}

// ============================================================================
// 工具函数
// ============================================================================

export function getSupportedRedStoneSymbols(chain: SupportedChain): string[] {
  return REDSTONE_SUPPORTED_SYMBOLS[chain] || [];
}

export function isChainSupportedByRedStone(chain: SupportedChain): boolean {
  return REDSTONE_CONTRACT_ADDRESSES[chain] !== undefined;
}

export function getRedStoneFeedId(symbol: string): string | undefined {
  return REDSTONE_FEED_IDS[symbol];
}
