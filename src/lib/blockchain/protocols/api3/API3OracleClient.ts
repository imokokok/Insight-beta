/**
 * API3 Oracle Client - API3 预言机客户端
 *
 * 基于新的核心架构实现的 API3 协议客户端
 * 支持 dAPI 和 Airnode 数据获取
 */

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
// API3 dAPI 合约 ABI
// ============================================================================

const DAPI_ABI = parseAbi([
  'function readDataFeedWithDapiNameHash(bytes32 dapiNameHash) external view returns (int224 value, uint32 timestamp)',
]);

// ============================================================================
// API3 合约地址配置
// ============================================================================

const API3_DAPI_SERVER_ADDRESSES: Record<SupportedChain, Address | undefined> = {
  ethereum: '0x9EB9798Dc1b602067DFe5C6A463dBae0D60c67fE',
  polygon: '0x9EB9798Dc1b602067DFe5C6A463dBae0D60c67fE',
  arbitrum: '0x9EB9798Dc1b602067DFe5C6A463dBae0D60c67fE',
  optimism: '0x9EB9798Dc1b602067DFe5C6A463dBae0D60c67fE',
  base: '0x9EB9798Dc1b602067DFe5C6A463dBae0D60c67fE',
  avalanche: '0x9EB9798Dc1b602067DFe5C6A463dBae0D60c67fE',
  bsc: '0x9EB9798Dc1b602067DFe5C6A463dBae0D60c67fE',
  fantom: '0x9EB9798Dc1b602067DFe5C6A463dBae0D60c67fE',
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
  sepolia: '0x9EB9798Dc1b602067DFe5C6A463dBae0D60c67fE',
  goerli: undefined,
  mumbai: undefined,
  local: undefined,
};

// ============================================================================
// 支持的 dAPI
// ============================================================================

const API3_SUPPORTED_DAPIS: Record<SupportedChain, string[]> = {
  ethereum: ['ETH/USD', 'BTC/USD', 'USDC/USD', 'USDT/USD', 'DAI/USD', 'LINK/USD'],
  polygon: ['MATIC/USD', 'ETH/USD', 'BTC/USD', 'USDC/USD'],
  arbitrum: ['ETH/USD', 'BTC/USD', 'USDC/USD', 'ARB/USD'],
  optimism: ['ETH/USD', 'BTC/USD', 'USDC/USD', 'OP/USD'],
  base: ['ETH/USD', 'BTC/USD', 'USDC/USD'],
  avalanche: ['AVAX/USD', 'ETH/USD', 'BTC/USD'],
  bsc: ['BNB/USD', 'ETH/USD', 'BTC/USD'],
  fantom: ['FTM/USD', 'ETH/USD', 'BTC/USD'],
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
// API3 客户端实现
// ============================================================================

export class API3OracleClient extends BaseOracleClient {
  readonly protocol: OracleProtocol = 'api3';
  readonly chain: SupportedChain;
  private readonly publicClient: PublicClient;
  private readonly dapiServerAddress: Address;

  constructor(config: OracleClientConfig) {
    super(config);
    this.chain = config.chain;

    const contractAddress = config.contractAddress || API3_DAPI_SERVER_ADDRESSES[config.chain];
    if (!contractAddress) {
      throw new Error(`No API3 dAPI server address for chain ${config.chain}`);
    }
    this.dapiServerAddress = contractAddress;
    this.publicClient = this.createPublicClient(config);
  }

  // ============================================================================
  // 抽象方法实现
  // ============================================================================

  async fetchPrice(symbol: string): Promise<UnifiedPriceFeed | null> {
    const supportedDapis = API3_SUPPORTED_DAPIS[this.chain];
    if (!supportedDapis.includes(symbol)) {
      this.logger.warn('dAPI not supported by API3', { symbol, chain: this.chain });
      return null;
    }

    try {
      const dapiNameHash = this.encodeDapiName(symbol);

      const result = await this.publicClient.readContract({
        address: this.dapiServerAddress,
        abi: DAPI_ABI,
        functionName: 'readDataFeedWithDapiNameHash',
        args: [dapiNameHash as `0x${string}`],
      });

      const value = result[0];
      const timestamp = Number(result[1]);

      return this.transformPriceData(value, timestamp, symbol);
    } catch (error) {
      throw new PriceFetchError(
        `Failed to fetch API3 price: ${error instanceof Error ? error.message : String(error)}`,
        this.protocol,
        this.chain,
        symbol,
        error,
      );
    }
  }

  async fetchAllFeeds(): Promise<UnifiedPriceFeed[]> {
    const symbols = API3_SUPPORTED_DAPIS[this.chain];
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

    const symbols = API3_SUPPORTED_DAPIS[this.chain];
    if (symbols.length === 0) {
      return {
        status: 'unhealthy',
        issues: ['No dAPIs configured for this chain'],
      };
    }

    try {
      const testSymbol = symbols[0]!;
      const dapiNameHash = this.encodeDapiName(testSymbol);

      await this.publicClient.readContract({
        address: this.dapiServerAddress,
        abi: DAPI_ABI,
        functionName: 'readDataFeedWithDapiNameHash',
        args: [dapiNameHash as `0x${string}`],
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
      customData: true,
      batchQueries: false,
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

  private encodeDapiName(dapiName: string): string {
    // 简化的编码，将字符串转换为 bytes32
    return `0x${Buffer.from(dapiName.padEnd(32, '\0')).toString('hex')}`;
  }

  private transformPriceData(value: bigint, timestamp: number, symbol: string): UnifiedPriceFeed {
    // API3 使用 18 位小数
    const formattedPrice = parseFloat(formatUnits(value, 18));
    const timestampMs = timestamp * 1000;
    const stalenessSeconds = Math.floor((Date.now() - timestampMs) / 1000);
    const isStale = stalenessSeconds > this.config.stalenessThreshold;

    const [baseAsset, quoteAsset] = symbol.split('/');

    return {
      id: `api3-${this.chain}-${symbol}-${timestamp}`,
      symbol,
      protocol: this.protocol,
      chain: this.chain,
      price: formattedPrice,
      priceRaw: value,
      timestamp: timestampMs,
      confidence: 0.98,
      source: 'api3',
      decimals: 18,
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

export function createAPI3Client(
  chain: SupportedChain = 'ethereum',
  config?: Partial<Omit<OracleClientConfig, 'protocol' | 'chain'>>,
): API3OracleClient {
  return new API3OracleClient({
    protocol: 'api3',
    chain,
    ...config,
  });
}

// ============================================================================
// 工具函数
// ============================================================================

export function getSupportedAPI3Dapis(chain: SupportedChain): string[] {
  return API3_SUPPORTED_DAPIS[chain] || [];
}

export function isChainSupportedByAPI3(chain: SupportedChain): boolean {
  return API3_DAPI_SERVER_ADDRESSES[chain] !== undefined;
}
