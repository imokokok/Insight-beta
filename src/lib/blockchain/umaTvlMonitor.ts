import { createPublicClient, http, type Address, parseAbi } from 'viem';
import type { Chain } from 'viem/chains';
import { logger } from '@/lib/logger';

export interface TVLConfig {
  chainId: number;
  chainName: string;
  rpcUrl: string;
  optimisticOracleV3Address?: Address;
  optimisticOracleV2Address?: Address;
  dvmAddress?: Address;
  votingTokenAddress: Address;
}

export interface TVLData {
  chainId: number;
  timestamp: number;
  totalStaked: bigint;
  totalBonded: bigint;
  totalRewards: bigint;
  oracleTvl: bigint;
  dvmTvl: bigint;
  activeAssertions: number;
  activeDisputes: number;
}

export interface AssetBreakdown {
  token: Address;
  symbol: string;
  balance: bigint;
  valueUsd: number;
  percentage: number;
}

export interface ChainTvlSummary {
  chainId: number;
  chainName: string;
  totalTvl: bigint;
  assetBreakdown: AssetBreakdown[];
  lastUpdated: number;
}

// 简化的 ERC20 ABI
const ERC20_ABI = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
]);

// Optimistic Oracle V3 ABI - 用于获取 TVL 相关数据 (保留供将来使用)
// const OO_V3_ABI = parseAbi([
//   'function getMinimumBond(address currency) view returns (uint256)',
//   'function cachedCurrencies(address currency) view returns (bool isWhitelisted, uint256 finalFee)',
//   'function getCurrentTime() view returns (uint256)',
// ]);

export class UMATvlMonitor {
  private publicClient: ReturnType<typeof createPublicClient>;
  private config: TVLConfig;

  constructor(config: TVLConfig) {
    this.config = config;

    const chain: Chain = {
      id: config.chainId,
      name: config.chainName,
      rpcUrls: {
        default: { http: [config.rpcUrl] },
      },
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
      },
    };

    this.publicClient = createPublicClient({
      chain,
      transport: http(config.rpcUrl, { timeout: 30_000 }),
    });
  }

  /**
   * 获取 UMA 代币余额
   */
  async getTokenBalance(tokenAddress: Address, account: Address): Promise<bigint> {
    try {
      const balance = await this.publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [account],
      });
      return balance as bigint;
    } catch (error) {
      logger.error('Failed to get token balance', { error, tokenAddress, account });
      return 0n;
    }
  }

  /**
   * 获取代币总供应量
   */
  async getTotalSupply(tokenAddress: Address): Promise<bigint> {
    try {
      const supply = await this.publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'totalSupply',
      });
      return supply as bigint;
    } catch (error) {
      logger.error('Failed to get total supply', { error, tokenAddress });
      return 0n;
    }
  }

  /**
   * 获取代币信息
   */
  async getTokenInfo(tokenAddress: Address): Promise<{ symbol: string; decimals: number }> {
    try {
      const [symbol, decimals] = await Promise.all([
        this.publicClient.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'symbol',
        }) as Promise<string>,
        this.publicClient.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }) as Promise<number>,
      ]);
      return { symbol, decimals };
    } catch (error) {
      logger.error('Failed to get token info', { error, tokenAddress });
      return { symbol: 'UNKNOWN', decimals: 18 };
    }
  }

  /**
   * 获取 Optimistic Oracle 的 TVL
   */
  async getOracleTvl(): Promise<{
    totalBonded: bigint;
    activeAssertions: number;
    currencyBreakdown: Map<string, bigint>;
  }> {
    try {
      // 这里需要从数据库或事件中获取活跃的断言
      // 简化实现：返回基础数据
      const ooAddress =
        this.config.optimisticOracleV3Address || this.config.optimisticOracleV2Address;
      if (!ooAddress) {
        return { totalBonded: 0n, activeAssertions: 0, currencyBreakdown: new Map() };
      }

      // 获取 UMA 代币在 OO 合约中的余额作为 TVL 的一部分
      const umaBalance = await this.getTokenBalance(this.config.votingTokenAddress, ooAddress);

      return {
        totalBonded: umaBalance,
        activeAssertions: 0, // 需要从数据库获取
        currencyBreakdown: new Map([[this.config.votingTokenAddress, umaBalance]]),
      };
    } catch (error) {
      logger.error('Failed to get oracle TVL', { error, chainId: this.config.chainId });
      return { totalBonded: 0n, activeAssertions: 0, currencyBreakdown: new Map() };
    }
  }

  /**
   * 获取 DVM 的 TVL
   */
  async getDvmTvl(): Promise<{
    totalStaked: bigint;
    activeStakers: number;
  }> {
    try {
      if (!this.config.dvmAddress) {
        return { totalStaked: 0n, activeStakers: 0 };
      }

      // 获取 UMA 代币在 DVM 合约中的余额
      const umaBalance = await this.getTokenBalance(
        this.config.votingTokenAddress,
        this.config.dvmAddress,
      );

      return {
        totalStaked: umaBalance,
        activeStakers: 0, // 需要从数据库获取
      };
    } catch (error) {
      logger.error('Failed to get DVM TVL', { error, chainId: this.config.chainId });
      return { totalStaked: 0n, activeStakers: 0 };
    }
  }

  /**
   * 获取完整的 TVL 数据
   */
  async getFullTvlData(): Promise<TVLData> {
    const [oracleTvl, dvmTvl] = await Promise.all([this.getOracleTvl(), this.getDvmTvl()]);

    return {
      chainId: this.config.chainId,
      timestamp: Date.now(),
      totalStaked: dvmTvl.totalStaked,
      totalBonded: oracleTvl.totalBonded,
      totalRewards: 0n, // 需要从奖励合约获取
      oracleTvl: oracleTvl.totalBonded,
      dvmTvl: dvmTvl.totalStaked,
      activeAssertions: oracleTvl.activeAssertions,
      activeDisputes: 0, // 需要从数据库获取
    };
  }

  /**
   * 获取资产分布
   */
  async getAssetBreakdown(): Promise<AssetBreakdown[]> {
    const assets: AssetBreakdown[] = [];

    try {
      // UMA 代币
      const umaInfo = await this.getTokenInfo(this.config.votingTokenAddress);
      const umaTotalSupply = await this.getTotalSupply(this.config.votingTokenAddress);

      // 获取 OO 和 DVM 中的余额
      const ooAddress = this.config.optimisticOracleV3Address;
      const dvmAddress = this.config.dvmAddress;

      let ooBalance = 0n;
      let dvmBalance = 0n;

      if (ooAddress) {
        ooBalance = await this.getTokenBalance(this.config.votingTokenAddress, ooAddress);
      }

      if (dvmAddress) {
        dvmBalance = await this.getTokenBalance(this.config.votingTokenAddress, dvmAddress);
      }

      const totalLocked = ooBalance + dvmBalance;

      if (umaTotalSupply > 0n) {
        assets.push({
          token: this.config.votingTokenAddress,
          symbol: umaInfo.symbol,
          balance: totalLocked,
          valueUsd: 0, // 需要价格数据
          percentage: Number((totalLocked * 10000n) / umaTotalSupply) / 100,
        });
      }

      return assets;
    } catch (error) {
      logger.error('Failed to get asset breakdown', { error, chainId: this.config.chainId });
      return assets;
    }
  }
}

// TVL 监控配置
export const TVL_MONITOR_CONFIGS: Record<number, Partial<TVLConfig>> = {
  1: {
    // Ethereum Mainnet
    chainName: 'Ethereum Mainnet',
    optimisticOracleV3Address: '0xA5B9d8a0B0Fa04B710D7ee40D90d2551E58d0F65',
    optimisticOracleV2Address: '0x9923D42eF195B0fA36D6f80f5629Ce76D1eF8754',
    dvmAddress: '0xD2C6eB7528Eb6A04F33C4E52dE1F0D3fE32aEf55',
    votingTokenAddress: '0x04Fa0d235C4abf4BcF4787aF4CF447DE572eF828',
  },
  137: {
    // Polygon
    chainName: 'Polygon',
    optimisticOracleV3Address: '0xDd46919fE564dE5bC5Cfc966aF2B79dc5A60A73d',
    dvmAddress: '0xD2C6eB7528Eb6A04F33C4E52dE1F0D3fE32aEf55',
    votingTokenAddress: '0x3066818837c5e6eD6601bd5a91B0762877A6B731',
  },
  42161: {
    // Arbitrum
    chainName: 'Arbitrum One',
    optimisticOracleV3Address: '0x2d0D2cB02b5eBA6e82b8277BDeF58612f650B401',
    dvmAddress: '0xD2C6eB7528Eb6A04F33C4E52dE1F0D3fE32aEf55',
    votingTokenAddress: '0xd693Ec944A85eeca4247eC1c3b130DCa9B0C3b22',
  },
  10: {
    // Optimism
    chainName: 'Optimism',
    optimisticOracleV3Address: '0x0335B4C63c688d560C24c80295a6Ca09C5eC93d4',
    votingTokenAddress: '0xE7798f023fC62146e8Aa1b36Da45fb70855a77Ea',
  },
};

export function createTvlMonitor(
  chainId: number,
  rpcUrl: string,
  customConfig?: Partial<TVLConfig>,
): UMATvlMonitor {
  const config = TVL_MONITOR_CONFIGS[chainId];
  if (!config && !customConfig) {
    throw new Error(`Unsupported chain ID for TVL monitoring: ${chainId}`);
  }

  return new UMATvlMonitor({
    chainId,
    chainName: config?.chainName || `Chain ${chainId}`,
    rpcUrl,
    votingTokenAddress: customConfig?.votingTokenAddress || config?.votingTokenAddress || '0x0',
    ...config,
    ...customConfig,
  });
}
