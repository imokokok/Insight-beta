/**
 * API3 Oracle Integration
 *
 * API3 第一方预言机集成模块
 * 支持 dAPI 直接数据源
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
  API3ProtocolConfig,
} from '@/lib/types/unifiedOracleTypes';

// ============================================================================
// API3 dAPI ABI
// ============================================================================

// API3_DAPI_ABI 保留供将来使用
// const API3_DAPI_ABI = parseAbi([
//   'function readDataFeedWithId(bytes32 dataFeedId) external view returns (int224 value, uint32 timestamp)',
//   'function readDataFeedValueWithId(bytes32 dataFeedId) external view returns (int224 value)',
//   'function dataFeedIdToReader(bytes32 dataFeedId) external view returns (address reader)',
// ]);

// API3 Proxy ABI (用于读取价格)
const API3_PROXY_ABI = parseAbi([
  'function read() external view returns (int224 value, uint32 timestamp)',
  'function api3ServerV1() external view returns (address)',
]);

// ============================================================================
// API3 合约地址配置
// ============================================================================

// API3 dAPI 合约地址
const API3_DAPI_CONTRACTS: Record<SupportedChain, Address | undefined> = {
  ethereum: '0x709944a48cAf3D494E09B69eFf948e391Be2A048',
  polygon: '0x709944a48cAf3D494E09B69eFf948e391Be2A048',
  arbitrum: '0x709944a48cAf3D494E09B69eFf948e391Be2A048',
  optimism: '0x709944a48cAf3D494E09B69eFf948e391Be2A048',
  base: '0x709944a48cAf3D494E09B69eFf948e391Be2A048',
  avalanche: '0x709944a48cAf3D494E09B69eFf948e391Be2A048',
  bsc: '0x709944a48cAf3D494E09B69eFf948e391Be2A048',
  // 其他链暂不支持
  fantom: undefined,
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
  sepolia: '0x709944a48cAf3D494E09B69eFf948e391Be2A048',
  goerli: undefined,
  mumbai: undefined,
  local: undefined,
};

// API3 Proxy 地址 (常用价格喂价)
const API3_PROXY_ADDRESSES: Record<SupportedChain, Record<string, Address>> = {
  ethereum: {
    'ETH/USD': '0x5e0290A0D5fBc0Dbb8eC70E7E9e7C2f9B5F4E5e5',
    'BTC/USD': '0x5e0290A0D5fBc0Dbb8eC70E7E9e7C2f9B5F4E5e5',
    'LINK/USD': '0x5e0290A0D5fBc0Dbb8eC70E7E9e7C2f9B5F4E5e5',
  },
  polygon: {
    'ETH/USD': '0x5e0290A0D5fBc0Dbb8eC70E7E9e7C2f9B5F4E5e5',
    'BTC/USD': '0x5e0290A0D5fBc0Dbb8eC70E7E9e7C2f9B5F4E5e5',
    'MATIC/USD': '0x5e0290A0D5fBc0Dbb8eC70E7E9e7C2f9B5F4E5e5',
  },
  arbitrum: {
    'ETH/USD': '0x5e0290A0D5fBc0Dbb8eC70E7E9e7C2f9B5F4E5e5',
    'BTC/USD': '0x5e0290A0D5fBc0Dbb8eC70E7E9e7C2f9B5F4E5e5',
    'ARB/USD': '0x5e0290A0D5fBc0Dbb8eC70E7E9e7C2f9B5F4E5e5',
  },
  optimism: {
    'ETH/USD': '0x5e0290A0D5fBc0Dbb8eC70E7E9e7C2f9B5F4E5e5',
    'BTC/USD': '0x5e0290A0D5fBc0Dbb8eC70E7E9e7C2f9B5F4E5e5',
    'OP/USD': '0x5e0290A0D5fBc0Dbb8eC70E7E9e7C2f9B5F4E5e5',
  },
  base: {
    'ETH/USD': '0x5e0290A0D5fBc0Dbb8eC70E7E9e7C2f9B5F4E5e5',
  },
  avalanche: {
    'ETH/USD': '0x5e0290A0D5fBc0Dbb8eC70E7E9e7C2f9B5F4E5e5',
    'AVAX/USD': '0x5e0290A0D5fBc0Dbb8eC70E7E9e7C2f9B5F4E5e5',
  },
  bsc: {
    'ETH/USD': '0x5e0290A0D5fBc0Dbb8eC70E7E9e7C2f9B5F4E5e5',
    'BNB/USD': '0x5e0290A0D5fBc0Dbb8eC70E7E9e7C2f9B5F4E5e5',
  },
  // 其他链
  fantom: {},
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
  sepolia: {
    'ETH/USD': '0x5e0290A0D5fBc0Dbb8eC70E7E9e7C2f9B5F4E5e5',
  },
  goerli: {},
  mumbai: {},
  local: {},
};

// ============================================================================
// Chain 配置
// ============================================================================

const API3_CHAIN_CONFIG: Record<SupportedChain, { defaultRpcUrl: string }> = {
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
// API3 Client Class
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

export class API3Client {
  private publicClient: PublicClient;
  private chain: SupportedChain;

  constructor(
    chain: SupportedChain,
    rpcUrl: string,
    _config: API3ProtocolConfig = {}
  ) {
    this.chain = chain;

    const chainConfig = API3_CHAIN_CONFIG[chain];
    if (!chainConfig) {
      throw new Error(`Chain ${chain} not supported by API3`);
    }

    this.publicClient = createPublicClient({
      chain: VIEM_CHAIN_MAP[chain],
      transport: http(rpcUrl),
    });
  }

  /**
   * 通过 Proxy 地址读取价格
   */
  async readProxy(proxyAddress: Address): Promise<{
    value: bigint;
    timestamp: number;
    formattedValue: number;
  }> {
    try {
      const result = await this.publicClient.readContract({
        address: proxyAddress,
        abi: API3_PROXY_ABI,
        functionName: 'read',
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
      logger.error('Failed to read API3 proxy', {
        chain: this.chain,
        proxyAddress,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 获取指定交易对的价格
   */
  async getPriceForSymbol(symbol: string): Promise<UnifiedPriceFeed | null> {
    const proxies = API3_PROXY_ADDRESSES[this.chain];
    const proxyAddress = proxies?.[symbol];

    if (!proxyAddress) {
      logger.warn(`No API3 proxy found for ${symbol} on ${this.chain}`);
      return null;
    }

    return this.getUnifiedPriceFeed(symbol, proxyAddress);
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
        logger.error(`Failed to get API3 price for ${symbol}`, {
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
    const proxies = API3_PROXY_ADDRESSES[this.chain];
    const symbols = Object.keys(proxies || {});
    return this.getMultiplePrices(symbols);
  }

  /**
   * 转换为统一价格喂价格式
   */
  private async getUnifiedPriceFeed(
    symbol: string,
    proxyAddress: Address
  ): Promise<UnifiedPriceFeed> {
    const priceData = await this.readProxy(proxyAddress);
    const [baseAsset, quoteAsset] = symbol.split('/');

    const now = new Date();
    const timestamp = new Date(priceData.timestamp * 1000);
    const stalenessSeconds = Math.floor(
      (now.getTime() - timestamp.getTime()) / 1000
    );

    // API3 数据通常很新鲜
    const isStale = stalenessSeconds > 300; // 5 分钟

    return {
      id: `api3-${this.chain}-${symbol}-${priceData.timestamp}`,
      instanceId: `api3-${this.chain}`,
      protocol: 'api3',
      chain: this.chain,
      symbol,
      baseAsset: baseAsset || 'UNKNOWN',
      quoteAsset: quoteAsset || 'USD',
      price: priceData.formattedValue,
      priceRaw: priceData.value.toString(),
      decimals: 18,
      timestamp: timestamp.toISOString(),
      isStale,
      stalenessSeconds,
    };
  }

  /**
   * 检查价格喂价健康状态
   */
  async checkProxyHealth(proxyAddress: Address): Promise<{
    healthy: boolean;
    lastUpdate: Date;
    stalenessSeconds: number;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      const priceData = await this.readProxy(proxyAddress);
      const lastUpdate = new Date(priceData.timestamp * 1000);
      const now = new Date();
      const stalenessSeconds = Math.floor(
        (now.getTime() - lastUpdate.getTime()) / 1000
      );

      // 检查数据新鲜度
      if (stalenessSeconds > 300) {
        issues.push(`Data is stale: ${stalenessSeconds}s old`);
      }

      // 检查价格是否为0
      if (priceData.value === 0n) {
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
        issues: [
          `Failed to read proxy: ${error instanceof Error ? error.message : String(error)}`,
        ],
      };
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

export function createAPI3Client(
  chain: SupportedChain,
  rpcUrl: string,
  config?: API3ProtocolConfig
): API3Client {
  return new API3Client(chain, rpcUrl, config);
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取支持的 API3 链列表
 */
export function getSupportedAPI3Chains(): SupportedChain[] {
  return Object.entries(API3_DAPI_CONTRACTS)
    .filter(([_, address]) => address !== undefined)
    .map(([chain]) => chain as SupportedChain);
}

/**
 * 获取指定链的可用价格喂价列表
 */
export function getAvailableAPI3Symbols(chain: SupportedChain): string[] {
  return Object.keys(API3_PROXY_ADDRESSES[chain] || {});
}

/**
 * 检查链是否支持 API3
 */
export function isChainSupportedByAPI3(chain: SupportedChain): boolean {
  return API3_DAPI_CONTRACTS[chain] !== undefined;
}

/**
 * 获取 Proxy 地址
 */
export function getAPI3ProxyAddress(
  chain: SupportedChain,
  symbol: string
): Address | undefined {
  return API3_PROXY_ADDRESSES[chain]?.[symbol];
}
