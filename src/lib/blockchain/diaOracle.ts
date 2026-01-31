/**
 * DIA Oracle Client
 *
 * DIA (Decentralized Information Asset) 是一个开源的金融数据预言机
 * 特点：
 * - 完全透明和开源的数据源
 * - 支持 2000+ 种资产
 * - 多链部署
 * - 提供传统金融和 DeFi 数据
 */

import {
  createPublicClient,
  http,
  type PublicClient,
  type Address,
  type Chain,
  formatUnits,
} from 'viem';
import { mainnet, arbitrum, optimism, polygon, base, bsc, avalanche, fantom, moonbeam } from 'viem/chains';
import { logger } from '@/lib/logger';

// ============================================================================
// Types
// ============================================================================

export type DIASupportedChain =
  | 'ethereum'
  | 'arbitrum'
  | 'optimism'
  | 'polygon'
  | 'base'
  | 'bsc'
  | 'avalanche'
  | 'fantom'
  | 'moonbeam';

export interface DIAPriceData {
  symbol: string;
  price: bigint;
  timestamp: number;
  formattedPrice: number;
  decimals: number;
  source: string;
}

export interface DIAProtocolConfig {
  rpcUrl: string;
  oracleAddress?: Address;
}

// ============================================================================
// Chain Configuration
// ============================================================================

const CHAIN_MAP: Record<DIASupportedChain, Chain> = {
  ethereum: mainnet,
  arbitrum: arbitrum,
  optimism: optimism,
  polygon: polygon,
  base: base,
  bsc: bsc,
  avalanche: avalanche,
  fantom: fantom,
  moonbeam: moonbeam,
};

const DIA_RPC_URLS: Record<DIASupportedChain, string> = {
  ethereum: 'https://eth-mainnet.g.alchemy.com/v2/demo',
  arbitrum: 'https://arb-mainnet.g.alchemy.com/v2/demo',
  optimism: 'https://opt-mainnet.g.alchemy.com/v2/demo',
  polygon: 'https://polygon-mainnet.g.alchemy.com/v2/demo',
  base: 'https://base-mainnet.g.alchemy.com/v2/demo',
  bsc: 'https://bsc-dataseed.binance.org',
  avalanche: 'https://api.avax.network/ext/bc/C/rpc',
  fantom: 'https://rpc.ftm.tools',
  moonbeam: 'https://rpc.api.moonbeam.network',
};

// DIA Oracle 合约地址
const DIA_ORACLE_ADDRESSES: Record<DIASupportedChain, Address> = {
  ethereum: '0xa93546947f3015c986695750b8bbEa8e26D65856',
  arbitrum: '0x598371336011023b76d1f5DED288faD32bF6d2bE',
  optimism: '0x598371336011023b76d1f5DED288faD32bF6d2bE',
  polygon: '0x598371336011023b76d1f5DED288faD32bF6d2bE',
  base: '0x598371336011023b76d1f5DED288faD32bF6d2bE',
  bsc: '0x598371336011023b76d1f5DED288faD32bF6d2bE',
  avalanche: '0x598371336011023b76d1f5DED288faD32bF6d2bE',
  fantom: '0x598371336011023b76d1f5DED288faD32bF6d2bE',
  moonbeam: '0x598371336011023b76d1f5DED288faD32bF6d2bE',
};

// DIA 支持的资产列表 (常用资产)
export const DIA_ASSETS: Record<string, string> = {
  'ETH/USD': 'ETH',
  'BTC/USD': 'BTC',
  'LINK/USD': 'LINK',
  'UNI/USD': 'UNI',
  'AAVE/USD': 'AAVE',
  'COMP/USD': 'COMP',
  'MKR/USD': 'MKR',
  'SNX/USD': 'SNX',
  'YFI/USD': 'YFI',
  'CRV/USD': 'CRV',
  'USDC/USD': 'USDC',
  'USDT/USD': 'USDT',
  'DAI/USD': 'DAI',
  'FRAX/USD': 'FRAX',
  'ARB/USD': 'ARB',
  'OP/USD': 'OP',
  'MATIC/USD': 'MATIC',
  'AVAX/USD': 'AVAX',
  'BNB/USD': 'BNB',
  'FTM/USD': 'FTM',
  'GLMR/USD': 'GLMR',
  'SOL/USD': 'SOL',
  'DOGE/USD': 'DOGE',
  'SHIB/USD': 'SHIB',
  'XRP/USD': 'XRP',
  'ADA/USD': 'ADA',
  'DOT/USD': 'DOT',
  'LTC/USD': 'LTC',
  'BCH/USD': 'BCH',
  'ATOM/USD': 'ATOM',
  'NEAR/USD': 'NEAR',
};

// DIA Oracle ABI
const DIA_ORACLE_ABI = [
  {
    inputs: [{ internalType: 'string', name: 'key', type: 'string' }],
    name: 'getValue',
    outputs: [
      { internalType: 'uint128', name: 'value', type: 'uint128' },
      { internalType: 'uint128', name: 'timestamp', type: 'uint128' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// ============================================================================
// DIA Client
// ============================================================================

export class DIAClient {
  private publicClient: PublicClient;
  private chain: DIASupportedChain;
  private config: DIAProtocolConfig;
  private oracleAddress: Address;

  constructor(chain: DIASupportedChain, config: DIAProtocolConfig) {
    this.chain = chain;
    this.config = config;
    this.oracleAddress = config.oracleAddress || DIA_ORACLE_ADDRESSES[chain];

    const rpcUrl = config.rpcUrl || DIA_RPC_URLS[chain];

    this.publicClient = createPublicClient({
      chain: CHAIN_MAP[chain],
      transport: http(rpcUrl),
    });
  }

  /**
   * 从 DIA API 获取最新价格数据
   */
  async fetchPriceFromAPI(asset: string): Promise<DIAPriceData | null> {
    try {
      // DIA API endpoint
      const url = `https://api.diadata.org/v1/quotation/${asset}`;

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`DIA API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();

      if (!data || !data.Price) {
        throw new Error('Invalid response from DIA API');
      }

      // DIA 返回的价格是 float，转换为 bigint (使用 8 位小数)
      const price = BigInt(Math.round(data.Price * 1e8));
      const timestamp = Math.floor(new Date(data.Time).getTime() / 1000);

      return {
        symbol: asset,
        price,
        timestamp,
        formattedPrice: data.Price,
        decimals: 8,
        source: data.Source || 'DIA',
      };
    } catch (error) {
      logger.error('Failed to fetch DIA price from API', {
        asset,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * 从链上 DIA Oracle 合约读取价格
   */
  async readPriceFromContract(key: string): Promise<DIAPriceData | null> {
    try {
      const [value, timestamp] = await this.publicClient.readContract({
        address: this.oracleAddress,
        abi: DIA_ORACLE_ABI,
        functionName: 'getValue',
        args: [key],
      });

      const formattedPrice = parseFloat(formatUnits(value, 8));

      return {
        symbol: key,
        price: value,
        timestamp: Number(timestamp),
        formattedPrice,
        decimals: 8,
        source: 'dia-oracle',
      };
    } catch (error) {
      logger.error('Failed to read DIA price from contract', {
        key,
        oracleAddress: this.oracleAddress,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * 批量获取多个资产价格
   */
  async fetchMultiplePrices(assets: string[]): Promise<Map<string, DIAPriceData>> {
    const results = new Map<string, DIAPriceData>();

    // DIA API 支持批量查询
    try {
      const promises = assets.map(async (asset) => {
        const price = await this.fetchPriceFromAPI(asset);
        if (price) {
          results.set(asset, price);
        }
      });

      await Promise.all(promises);
    } catch (error) {
      logger.error('Failed to fetch batch prices from DIA', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return results;
  }

  /**
   * 获取 DIA 支持的所有资产列表
   */
  async fetchAllAssets(): Promise<string[]> {
    try {
      const url = 'https://api.diadata.org/v1/assets';

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`DIA API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (Array.isArray(data)) {
        return data.map((item: { Symbol: string }) => item.Symbol);
      }

      return [];
    } catch (error) {
      logger.error('Failed to fetch DIA assets list', {
        error: error instanceof Error ? error.message : String(error),
      });
      return Object.keys(DIA_ASSETS);
    }
  }

  /**
   * 验证价格新鲜度
   */
  isPriceFresh(timestamp: number, maxAgeSeconds: number = 300): boolean {
    const now = Math.floor(Date.now() / 1000);
    const age = now - timestamp;
    return age <= maxAgeSeconds;
  }

  /**
   * 获取支持的资产列表
   */
  getSupportedAssets(): string[] {
    return Object.keys(DIA_ASSETS);
  }

  /**
   * 获取客户端信息
   */
  getClientInfo(): {
    chain: DIASupportedChain;
    rpcUrl: string;
    oracleAddress: Address;
    supportedAssets: number;
  } {
    return {
      chain: this.chain,
      rpcUrl: this.config.rpcUrl || DIA_RPC_URLS[this.chain],
      oracleAddress: this.oracleAddress,
      supportedAssets: Object.keys(DIA_ASSETS).length,
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * 创建 DIA 客户端
 */
export function createDIAClient(
  chain: DIASupportedChain,
  config?: Partial<DIAProtocolConfig>,
): DIAClient {
  return new DIAClient(chain, {
    rpcUrl: DIA_RPC_URLS[chain],
    ...config,
  });
}

/**
 * 获取所有支持的链
 */
export function getDIASupportedChains(): DIASupportedChain[] {
  return Object.keys(CHAIN_MAP) as DIASupportedChain[];
}

/**
 * 解析 DIA 价格
 */
export function parseDIAPrice(price: bigint, decimals: number = 8): number {
  return parseFloat(formatUnits(price, decimals));
}
