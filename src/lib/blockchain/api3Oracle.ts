/**
 * API3 Oracle Client
 *
 * API3 预言机集成模块
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

import { logger } from '@/lib/logger';
import type {
  SupportedChain,
  UnifiedPriceFeed,
  API3ProtocolConfig,
  OracleProtocol,
} from '@/lib/types/unifiedOracleTypes';

import { VIEM_CHAIN_MAP } from './chainConfig';
import { calculateDataFreshness } from './oracleClientBase';

// ============================================================================
// API3 dAPI 合约 ABI
// ============================================================================

const DAPI_ABI = parseAbi([
  'function readDataFeedWithDapiNameHash(bytes32 dapiNameHash) external view returns (int224 value, uint32 timestamp)',
  'function dataFeedIdToReaderToWhitelistStatus(bytes32 dataFeedId, address reader) external view returns (uint64 expirationTimestamp, uint192 indefiniteWhitelistCount)',
]);

// ============================================================================
// API3 合约地址配置
// ============================================================================

export const API3_DAPI_SERVER_ADDRESSES: Record<SupportedChain, Address | undefined> = {
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

export const API3_SUPPORTED_DAPIS: Record<SupportedChain, string[]> = {
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
// dAPI 名称到哈希的映射
// ============================================================================

function encodeDapiName(dapiName: string): string {
  // 简化的编码，实际应该使用 ethers.utils.formatBytes32String
  return `0x${Buffer.from(dapiName.padEnd(32, '\0')).toString('hex')}`;
}

// ============================================================================
// API3 客户端
// ============================================================================

export class API3Client {
  private publicClient: PublicClient;
  private chain: SupportedChain;

  private dapiServerAddress: Address;

  constructor(chain: SupportedChain, rpcUrl: string, config: API3ProtocolConfig = {}) {
    this.chain = chain;

    const contractAddress = config.airnodeAddress || API3_DAPI_SERVER_ADDRESSES[chain];
    if (!contractAddress) {
      throw new Error(`No API3 dAPI server address for chain ${chain}`);
    }
    this.dapiServerAddress = contractAddress as `0x${string}`;

    this.publicClient = createPublicClient({
      chain: VIEM_CHAIN_MAP[chain],
      transport: http(rpcUrl),
    }) as PublicClient;
  }

  /**
   * 读取 dAPI 数据
   */
  async readDataFeed(dapiName: string): Promise<{
    value: bigint;
    timestamp: number;
    formattedValue: number;
  }> {
    try {
      const dapiNameHash = encodeDapiName(dapiName);

      const result = await this.publicClient.readContract({
        address: this.dapiServerAddress,
        abi: DAPI_ABI,
        functionName: 'readDataFeedWithDapiNameHash',
        args: [dapiNameHash as `0x${string}`],
      });

      const value = result[0];
      const timestamp = result[1];

      // API3 使用 18 位小数
      const formattedValue = parseFloat(formatUnits(value, 18));

      return {
        value,
        timestamp: Number(timestamp),
        formattedValue,
      };
    } catch (error) {
      logger.error('Failed to read API3 dAPI', {
        chain: this.chain,
        dapiName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 获取指定交易对的价格
   */
  async getPriceForSymbol(symbol: string): Promise<UnifiedPriceFeed | null> {
    try {
      const data = await this.readDataFeed(symbol);
      return this.parsePriceData(data, symbol);
    } catch (error) {
      logger.error(`Failed to get API3 price for ${symbol}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
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
          logger.error(`Failed to get API3 price for ${symbol}`, {
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
   * 获取所有可用价格
   */
  async getAllAvailableFeeds(): Promise<UnifiedPriceFeed[]> {
    const symbols = API3_SUPPORTED_DAPIS[this.chain] || [];
    return this.getMultiplePrices(symbols);
  }

  /**
   * 解析价格数据
   */
  private parsePriceData(
    data: {
      value: bigint;
      timestamp: number;
      formattedValue: number;
    },
    symbol: string,
  ): UnifiedPriceFeed {
    const timestampDate = new Date(data.timestamp * 1000);
    const { isStale, stalenessSeconds } = calculateDataFreshness(timestampDate, 300);

    const [baseAsset, quoteAsset] = symbol.split('/');

    return {
      id: `api3-${this.chain}-${symbol}-${data.timestamp}`,
      instanceId: `api3-${this.chain}`,
      protocol: 'api3' as OracleProtocol,
      chain: this.chain,
      symbol,
      baseAsset: baseAsset || 'UNKNOWN',
      quoteAsset: quoteAsset || 'USD',
      price: data.formattedValue,
      priceRaw: data.value,
      decimals: 18,
      timestamp: timestampDate.getTime(),
      confidence: 0.98,
      sources: ['api3'],
      isStale,
      stalenessSeconds,
    };
  }

  /**
   * 获取当前区块号
   */
  async getBlockNumber(): Promise<bigint> {
    return this.publicClient.getBlockNumber();
  }

  /**
   * 检查 dAPI 健康状态
   */
  async checkDapiHealth(dapiName: string): Promise<{
    healthy: boolean;
    lastUpdate: Date;
    stalenessSeconds: number;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      const data = await this.readDataFeed(dapiName);
      const lastUpdate = new Date(data.timestamp * 1000);
      const now = new Date();
      const stalenessSeconds = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);

      // 检查数据新鲜度
      if (stalenessSeconds > 300) {
        issues.push(`Data is stale: ${stalenessSeconds}s old`);
      }

      // 检查价格是否为0
      if (data.value === 0n) {
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
        issues: [`Failed to read dAPI: ${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

export function createAPI3Client(
  chain: SupportedChain,
  rpcUrl: string,
  config?: API3ProtocolConfig,
): API3Client {
  return new API3Client(chain, rpcUrl, config);
}

/**
 * 获取支持的 API3 链列表
 */
export function getSupportedAPI3Chains(): SupportedChain[] {
  return Object.entries(API3_DAPI_SERVER_ADDRESSES)
    .filter(([_, address]) => address !== undefined)
    .map(([chain]) => chain as SupportedChain);
}

/**
 * 获取指定链的可用 dAPI 列表
 */
export function getAvailableAPI3Dapis(chain: SupportedChain): string[] {
  return API3_SUPPORTED_DAPIS[chain] || [];
}

/**
 * 检查链是否支持 API3
 */
export function isChainSupportedByAPI3(chain: SupportedChain): boolean {
  return API3_DAPI_SERVER_ADDRESSES[chain] !== undefined;
}

/**
 * 获取 dAPI 服务器地址
 */
export function getDapiServerAddress(chain: SupportedChain): Address | undefined {
  return API3_DAPI_SERVER_ADDRESSES[chain];
}
