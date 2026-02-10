/**
 * UMA Optimistic Oracle Client
 *
 * UMA 乐观预言机客户端
 * 支持争议事件检测、断言健康检查等
 */

import { createPublicClient, http, type Address, parseAbi } from 'viem';

import { logger } from '@/lib/logger';
import type { SupportedChain } from '@/lib/types/unifiedOracleTypes';

// ============================================================================
// UMA Optimistic Oracle ABI
// ============================================================================

const OPTIMISTIC_ORACLE_V3_ABI = parseAbi([
  'function getAssertion(bytes32 assertionId) external view returns (tuple(bytes32 identifier, uint256 timestamp, bytes data, address requester, bool resolved, bool disputed, uint256 settlementResolution, address currency, uint256 bond, uint256 expirationTime))',
  'function getMinimumBond(address currency) external view returns (uint256)',
  'function cachedCurrencies(address currency) external view returns (bool isWhitelisted, uint256 finalFee)',
  'function getCurrentTime() external view returns (uint256)',
]);

// ============================================================================
// UMA 合约地址配置
// ============================================================================

export const UMA_CONTRACT_ADDRESSES: Record<
  SupportedChain,
  {
    optimisticOracleV3?: Address;
    optimisticOracleV2?: Address;
    dvm?: Address;
    votingToken?: Address;
  }
> = {
  ethereum: {
    optimisticOracleV3: '0xA5B9d8a0B0Fa04B710D7ee40D90d2551E58d0F65',
    optimisticOracleV2: '0x9923D42eF195B0fA36D6f80f5629Ce76D1eF8754',
    dvm: '0xD2C6eB7528Eb6A04F33C4E52dE1F0D3fE32aEf55',
    votingToken: '0x04Fa0d235C4abf4BcF4787aF4CF447DE572eF828',
  },
  polygon: {
    optimisticOracleV3: '0xDd46919fE564dE5bC5Cfc966aF2B79dc5A60A73d',
    dvm: '0xD2C6eB7528Eb6A04F33C4E52dE1F0D3fE32aEf55',
    votingToken: '0x3066818837c5e6eD6601bd5a91B0762877A6B731',
  },
  arbitrum: {
    optimisticOracleV3: '0x2d0D2cB02b5eBA6e82b8277BDeF58612f650B401',
    dvm: '0xD2C6eB7528Eb6A04F33C4E52dE1F0D3fE32aEf55',
    votingToken: '0xd693Ec944A85eeca4247eC1c3b130DCa9B0C3b22',
  },
  optimism: {
    optimisticOracleV3: '0x0335B4C63c688d560C24c80295a6Ca09C5eC93d4',
    votingToken: '0xE7798f023fC62146e8Aa1b36Da45fb70855a77Ea',
  },
  base: {
    optimisticOracleV3: '0x2d0D2cB02b5eBA6e82b8277BDeF58612f650B401',
    votingToken: '0x08e60A4f1eE4E31C861C2C7fEfB5Bf7E8C6D4A7E',
  },
  sepolia: {
    optimisticOracleV3: '0xFd9e2642a170aDD10F53Ee91a63d1D7a7e3A9F28',
    votingToken: '0x04Fa0d235C4abf4BcF4787aF4CF447DE572eF828',
  },
};

// ============================================================================
// 类型定义
// ============================================================================

export interface UMAAssertion {
  assertionId: string;
  identifier: string;
  timestamp: number;
  data: string;
  requester: Address;
  resolved: boolean;
  disputed: boolean;
  settlementResolution: bigint;
  currency: Address;
  bond: bigint;
  expirationTime: number;
}

export interface UMADispute {
  disputeId: string;
  assertionId: string;
  disputer: Address;
  timestamp: number;
  status: 'pending' | 'resolved' | 'rejected';
}

export interface UMAHealthStatus {
  healthy: boolean;
  lastUpdate: Date;
  stalenessSeconds: number;
  issues: string[];
  activeAssertions: number;
  activeDisputes: number;
  totalBonded: bigint;
}

export interface UMAProtocolConfig {
  timeoutMs?: number;
  stalenessThreshold?: number;
  minBondThreshold?: bigint;
}

// ============================================================================
// UMA Client
// ============================================================================

export class UMAClient {
  readonly protocol = 'uma' as const;
  readonly chain: SupportedChain;

  private publicClient: ReturnType<typeof createPublicClient>;
  private contractAddresses: (typeof UMA_CONTRACT_ADDRESSES)[SupportedChain];
  private clientConfig: UMAProtocolConfig;

  constructor(chain: SupportedChain, rpcUrl: string, config: UMAProtocolConfig = {}) {
    this.chain = chain;
    this.contractAddresses = UMA_CONTRACT_ADDRESSES[chain];
    this.clientConfig = config;

    // 初始化 viem 客户端
    this.publicClient = createPublicClient({
      transport: http(rpcUrl, { timeout: config.timeoutMs ?? 30000 }),
    });
  }

  // ============================================================================
  // 断言相关方法
  // ============================================================================

  /**
   * 获取断言详情
   */
  async getAssertion(assertionId: string): Promise<UMAAssertion | null> {
    if (!this.contractAddresses.optimisticOracleV3) {
      throw new Error('Optimistic Oracle V3 not supported on this chain');
    }

    try {
      const result = await this.publicClient.readContract({
        address: this.contractAddresses.optimisticOracleV3,
        abi: OPTIMISTIC_ORACLE_V3_ABI,
        functionName: 'getAssertion',
        args: [assertionId as `0x${string}`],
      });

      const assertion = result as [
        string,
        bigint,
        string,
        Address,
        boolean,
        boolean,
        bigint,
        Address,
        bigint,
        bigint,
      ];

      return {
        assertionId,
        identifier: assertion[0],
        timestamp: Number(assertion[1]),
        data: assertion[2],
        requester: assertion[3],
        resolved: assertion[4],
        disputed: assertion[5],
        settlementResolution: assertion[6],
        currency: assertion[7],
        bond: assertion[8],
        expirationTime: Number(assertion[9]),
      };
    } catch (error) {
      logger.error('Failed to get UMA assertion', { error, assertionId });
      return null;
    }
  }

  /**
   * 获取最小保证金要求
   */
  async getMinimumBond(currency: Address): Promise<bigint> {
    if (!this.contractAddresses.optimisticOracleV3) {
      return 0n;
    }

    try {
      const result = await this.publicClient.readContract({
        address: this.contractAddresses.optimisticOracleV3,
        abi: OPTIMISTIC_ORACLE_V3_ABI,
        functionName: 'getMinimumBond',
        args: [currency],
      });
      return result as bigint;
    } catch (error) {
      logger.error('Failed to get minimum bond', { error, currency });
      return 0n;
    }
  }

  // ============================================================================
  // 健康检查方法
  // ============================================================================

  /**
   * 检查价格喂价健康状态
   * 对于 UMA，这实际上是检查断言的健康状态
   */
  async checkFeedHealth(assertionId: string): Promise<UMAHealthStatus> {
    const issues: string[] = [];

    try {
      const assertion = await this.getAssertion(assertionId);

      if (!assertion) {
        return {
          healthy: false,
          lastUpdate: new Date(0),
          stalenessSeconds: Infinity,
          issues: [`Assertion ${assertionId} not found`],
          activeAssertions: 0,
          activeDisputes: 0,
          totalBonded: 0n,
        };
      }

      const lastUpdate = new Date(assertion.timestamp * 1000);
      const now = new Date();
      const stalenessSeconds = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);

      // 检查数据新鲜度
      const stalenessThreshold = this.clientConfig.stalenessThreshold ?? 600;
      if (stalenessSeconds > stalenessThreshold) {
        issues.push(`Assertion is stale: ${stalenessSeconds}s old`);
      }

      // 检查是否被争议
      if (assertion.disputed) {
        issues.push('Assertion has been disputed');
      }

      // 检查是否已解决
      if (assertion.resolved) {
        issues.push('Assertion has already been resolved');
      }

      // 检查保证金
      const minBond = await this.getMinimumBond(assertion.currency);
      if (assertion.bond < minBond) {
        issues.push(`Bond below minimum: ${assertion.bond} < ${minBond}`);
      }

      // 检查是否过期
      const currentTime = Math.floor(Date.now() / 1000);
      if (assertion.expirationTime < currentTime && !assertion.resolved) {
        issues.push('Assertion has expired without resolution');
      }

      return {
        healthy: issues.length === 0,
        lastUpdate,
        stalenessSeconds,
        issues,
        activeAssertions: assertion.resolved || assertion.disputed ? 0 : 1,
        activeDisputes: assertion.disputed ? 1 : 0,
        totalBonded: assertion.bond,
      };
    } catch (error) {
      return {
        healthy: false,
        lastUpdate: new Date(0),
        stalenessSeconds: Infinity,
        issues: [
          `Failed to check UMA assertion health: ${error instanceof Error ? error.message : String(error)}`,
        ],
        activeAssertions: 0,
        activeDisputes: 0,
        totalBonded: 0n,
      };
    }
  }

  /**
   * 执行整体健康检查
   */
  async checkHealth(): Promise<{
    healthy: boolean;
    latency: number;
    issues: string[];
  }> {
    const startTime = Date.now();
    const issues: string[] = [];

    try {
      // 检查合约连接
      if (!this.contractAddresses.optimisticOracleV3) {
        issues.push('Optimistic Oracle V3 not configured for this chain');
      }

      // 尝试获取当前时间
      if (this.contractAddresses.optimisticOracleV3) {
        try {
          await this.publicClient.readContract({
            address: this.contractAddresses.optimisticOracleV3,
            abi: OPTIMISTIC_ORACLE_V3_ABI,
            functionName: 'getCurrentTime',
          });
        } catch {
          issues.push('Failed to connect to Optimistic Oracle V3');
        }
      }

      const latency = Date.now() - startTime;

      return {
        healthy: issues.length === 0,
        latency,
        issues,
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        healthy: false,
        latency,
        issues: [`Health check failed: ${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }

  // ============================================================================
  // 争议检测方法
  // ============================================================================

  /**
   * 检测活跃争议
   * 注意：这需要从事件日志中获取数据，这里提供简化实现
   */
  async detectActiveDisputes(
    fromBlock?: bigint,
    toBlock?: bigint,
  ): Promise<{
    disputes: UMADispute[];
    totalDisputes: number;
    pendingDisputes: number;
  }> {
    // 简化实现：返回基础数据
    // 实际实现需要从事件日志中解析 DisputeAssertion 事件
    logger.info('Detecting UMA disputes', { fromBlock, toBlock, chain: this.chain });

    return {
      disputes: [],
      totalDisputes: 0,
      pendingDisputes: 0,
    };
  }

  /**
   * 检查争议状态
   */
  async checkDisputeStatus(disputeId: string): Promise<{
    status: 'pending' | 'resolved' | 'rejected' | 'unknown';
    resolution?: bigint;
    resolvedAt?: number;
  }> {
    // 简化实现
    logger.info('Checking UMA dispute status', { disputeId, chain: this.chain });

    return {
      status: 'unknown',
    };
  }

  // ============================================================================
  // 协议能力
  // ============================================================================

  getCapabilities() {
    return {
      priceFeeds: true,
      assertions: true,
      disputes: true,
      vrf: false,
      customData: true,
      batchQueries: false,
    };
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

export function createUMAClient(
  chain: SupportedChain,
  rpcUrl: string,
  config?: UMAProtocolConfig,
): UMAClient {
  return new UMAClient(chain, rpcUrl, config);
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取支持的 UMA 链列表
 */
export function getSupportedUMAChains(): SupportedChain[] {
  return Object.entries(UMA_CONTRACT_ADDRESSES)
    .filter(([_, addresses]) => addresses.optimisticOracleV3 !== undefined)
    .map(([chain]) => chain as SupportedChain);
}

/**
 * 检查链是否支持 UMA
 */
export function isChainSupportedByUMA(chain: SupportedChain): boolean {
  return UMA_CONTRACT_ADDRESSES[chain]?.optimisticOracleV3 !== undefined;
}

/**
 * 获取合约地址
 */
export function getUMAContractAddresses(chain: SupportedChain): {
  optimisticOracleV3?: Address;
  optimisticOracleV2?: Address;
  dvm?: Address;
  votingToken?: Address;
} {
  return UMA_CONTRACT_ADDRESSES[chain] || {};
}
