/**
 * UMA Optimistic Oracle Client (Security Enhanced)
 *
 * UMA 乐观预言机客户端（安全增强版）
 * 支持断言管理、争议检测、事件监听等功能
 * 集成输入验证、缓存、速率限制等安全功能
 */

import {
  createPublicClient,
  http,
  type Address,
  type Hash,
  decodeEventLog,
  type PublicClient,
} from 'viem';

import { logger } from '@/shared/logger';
import type { SupportedChain } from '@/types/unifiedOracleTypes';

import { createQueryCache, createSmartRetry, GAS_CONSTANTS } from './security/gasOptimizer';
import {
  validateAddress,
  validateBytes32,
  type ValidationResult,
} from './security/inputValidation';
import { createRateLimiter, RATE_LIMIT_DEFAULTS } from './security/rateLimiter';
import { UMA_OPTIMISTIC_ORACLE_V3_ABI } from './uma/abi';

import type { QueryCache, SmartRetry } from './security/gasOptimizer';
import type { SlidingWindowRateLimiter } from './security/rateLimiter';

// ============================================================================
// UMA 合约地址配置
// ============================================================================

export const UMA_CONTRACT_ADDRESSES: Partial<
  Record<
    SupportedChain,
    {
      optimisticOracleV3?: Address;
      optimisticOracleV2?: Address;
      dvm?: Address;
      votingToken?: Address;
    }
  >
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
  disputeTimestamp: number;
  disputeBond: bigint;
  disputeStatus: DisputeStatus;
  caller?: Address;
}

export type DisputeStatus = 'None' | 'Active' | 'Resolved';

export interface UMAAssertionEvent {
  assertionId: Hash;
  domainId: Hash;
  claim: string;
  asserter: Address;
  callbackRecipient: Address;
  escalationManager: Address;
  caller: Address;
  expirationTime: number;
  currency: Address;
  bond: bigint;
  identifier: Hash;
  blockNumber: bigint;
  transactionHash: Hash;
  timestamp: number;
}

export interface UMADisputeEvent {
  assertionId: Hash;
  caller: Address;
  disputer: Address;
  blockNumber: bigint;
  transactionHash: Hash;
  timestamp: number;
}

export interface UMASettlementEvent {
  assertionId: Hash;
  settledValue: boolean;
  disputed: boolean;
  bondRecipient: Address;
  blockNumber: bigint;
  transactionHash: Hash;
  timestamp: number;
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
  enableCache?: boolean;
  cacheTtl?: number;
  enableRateLimit?: boolean;
  maxRequestsPerMinute?: number;
}

export interface DisputeDetails {
  assertionId: string;
  disputer: Address;
  disputeTimestamp: number;
  disputeBond: bigint;
  status: DisputeStatus;
  assertion: UMAAssertion | null;
  canSettle: boolean;
  timeUntilSettlement: number;
}

// ============================================================================
// UMA Client (安全增强版)
// ============================================================================

export class UMAClient {
  readonly protocol = 'uma' as const;
  readonly chain: SupportedChain;

  private publicClient: PublicClient;
  private contractAddresses: NonNullable<(typeof UMA_CONTRACT_ADDRESSES)[SupportedChain]>;
  private clientConfig: UMAProtocolConfig;

  // 安全组件
  private cache: QueryCache;
  private retry: SmartRetry;
  private rateLimiter: SlidingWindowRateLimiter | null = null;

  constructor(chain: SupportedChain, rpcUrl: string, config: UMAProtocolConfig = {}) {
    this.chain = chain;
    const addresses = UMA_CONTRACT_ADDRESSES[chain];
    if (!addresses) {
      throw new Error(`UMA not supported on chain: ${chain}`);
    }
    this.contractAddresses = addresses;
    this.clientConfig = config;

    this.publicClient = createPublicClient({
      transport: http(rpcUrl, { timeout: config.timeoutMs ?? 30000 }),
    }) as PublicClient;

    // 初始化安全组件
    this.cache = createQueryCache(
      GAS_CONSTANTS.MAX_CACHE_SIZE,
      config.cacheTtl ?? GAS_CONSTANTS.DEFAULT_CACHE_TTL,
    );
    this.retry = createSmartRetry(GAS_CONSTANTS.MAX_RETRIES, GAS_CONSTANTS.RETRY_DELAY_MS);

    if (config.enableRateLimit !== false) {
      this.rateLimiter = createRateLimiter({
        maxRequestsPerSecond: RATE_LIMIT_DEFAULTS.CONTRACT_MAX_CALLS_PER_SECOND,
        maxRequestsPerMinute:
          config.maxRequestsPerMinute ?? RATE_LIMIT_DEFAULTS.CONTRACT_MAX_CALLS_PER_MINUTE,
      });
    }
  }

  // ============================================================================
  // 输入验证方法
  // ============================================================================

  private validateAssertionId(assertionId: string): ValidationResult {
    return validateBytes32(assertionId, 'assertionId');
  }

  private validateCurrency(currency: Address): ValidationResult {
    return validateAddress(currency, 'currency');
  }

  // ============================================================================
  // 缓存辅助方法
  // ============================================================================

  private getCached<T>(key: string): T | null {
    if (this.clientConfig.enableCache === false) return null;
    return this.cache.get(key) as T | null;
  }

  private setCache<T>(key: string, value: T): void {
    if (this.clientConfig.enableCache !== false) {
      this.cache.set(key, value);
    }
  }

  // ============================================================================
  // 速率限制检查
  // ============================================================================

  private checkRateLimit(): void {
    if (this.rateLimiter) {
      const result = this.rateLimiter.checkAndRecord(`uma-${this.chain}`);
      if (!result.allowed) {
        throw new Error(`Rate limit exceeded. Retry after ${result.retryAfter} seconds.`);
      }
    }
  }

  // ============================================================================
  // 断言相关方法
  // ============================================================================

  async getAssertion(assertionId: string): Promise<UMAAssertion | null> {
    const validation = this.validateAssertionId(assertionId);
    if (!validation.valid) {
      logger.warn('Invalid assertion ID', { errors: validation.errors });
      return null;
    }

    const cacheKey = `assertion:${assertionId}`;
    const cached = this.getCached<UMAAssertion>(cacheKey);
    if (cached) return cached;

    this.checkRateLimit();

    if (!this.contractAddresses.optimisticOracleV3) {
      throw new Error('Optimistic Oracle V3 not supported on this chain');
    }

    try {
      const result = await this.retry.execute(() =>
        this.publicClient.readContract({
          address: this.contractAddresses.optimisticOracleV3!,
          abi: UMA_OPTIMISTIC_ORACLE_V3_ABI,
          functionName: 'getAssertion',
          args: [assertionId as `0x${string}`],
        }),
      );

      const assertion = result as unknown as {
        identifier: `0x${string}`;
        timestamp: bigint;
        data: `0x${string}`;
        requester: Address;
        resolved: boolean;
        disputed: boolean;
        settlementResolution: bigint;
        currency: Address;
        bond: bigint;
        expirationTime: bigint;
      };

      const data: UMAAssertion = {
        assertionId,
        identifier: assertion.identifier,
        timestamp: Number(assertion.timestamp),
        data: assertion.data,
        requester: assertion.requester,
        resolved: assertion.resolved,
        disputed: assertion.disputed,
        settlementResolution: assertion.settlementResolution,
        currency: assertion.currency,
        bond: assertion.bond,
        expirationTime: Number(assertion.expirationTime),
      };

      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      logger.error('Failed to get UMA assertion', { error, assertionId });
      return null;
    }
  }

  async getAssertionResult(assertionId: string): Promise<boolean | null> {
    const validation = this.validateAssertionId(assertionId);
    if (!validation.valid) return null;

    const cacheKey = `assertionResult:${assertionId}`;
    const cached = this.getCached<boolean>(cacheKey);
    if (cached !== null) return cached;

    this.checkRateLimit();

    if (!this.contractAddresses.optimisticOracleV3) return null;

    try {
      const result = await this.retry.execute(() =>
        this.publicClient.readContract({
          address: this.contractAddresses.optimisticOracleV3!,
          abi: UMA_OPTIMISTIC_ORACLE_V3_ABI,
          functionName: 'getAssertionResult',
          args: [assertionId as `0x${string}`],
        }),
      );

      const value = result as boolean;
      this.setCache(cacheKey, value);
      return value;
    } catch (error) {
      logger.error('Failed to get assertion result', { error, assertionId });
      return null;
    }
  }

  async isAssertionDisputed(assertionId: string): Promise<boolean> {
    const validation = this.validateAssertionId(assertionId);
    if (!validation.valid) return false;

    this.checkRateLimit();

    if (!this.contractAddresses.optimisticOracleV3) return false;

    try {
      const result = await this.retry.execute(() =>
        this.publicClient.readContract({
          address: this.contractAddresses.optimisticOracleV3!,
          abi: UMA_OPTIMISTIC_ORACLE_V3_ABI,
          functionName: 'assertionDisputed',
          args: [assertionId as `0x${string}`],
        }),
      );
      return result as boolean;
    } catch (error) {
      logger.error('Failed to check if assertion is disputed', { error, assertionId });
      return false;
    }
  }

  async getMinimumBond(currency: Address): Promise<bigint> {
    const validation = this.validateCurrency(currency);
    if (!validation.valid) return BigInt(0);

    const cacheKey = `minimumBond:${currency}`;
    const cached = this.getCached<bigint>(cacheKey);
    if (cached !== null) return cached;

    this.checkRateLimit();

    if (!this.contractAddresses.optimisticOracleV3) return BigInt(0);

    try {
      const result = await this.retry.execute(() =>
        this.publicClient.readContract({
          address: this.contractAddresses.optimisticOracleV3!,
          abi: UMA_OPTIMISTIC_ORACLE_V3_ABI,
          functionName: 'getMinimumBond',
          args: [currency],
        }),
      );

      const value = result as bigint;
      this.setCache(cacheKey, value);
      return value;
    } catch (error) {
      logger.error('Failed to get minimum bond', { error, currency });
      return BigInt(0);
    }
  }

  async getFinalFee(currency: Address): Promise<bigint> {
    const validation = this.validateCurrency(currency);
    if (!validation.valid) return BigInt(0);

    const cacheKey = `finalFee:${currency}`;
    const cached = this.getCached<bigint>(cacheKey);
    if (cached !== null) return cached;

    this.checkRateLimit();

    if (!this.contractAddresses.optimisticOracleV3) return BigInt(0);

    try {
      const result = await this.retry.execute(() =>
        this.publicClient.readContract({
          address: this.contractAddresses.optimisticOracleV3!,
          abi: UMA_OPTIMISTIC_ORACLE_V3_ABI,
          functionName: 'finalFee',
          args: [currency],
        }),
      );

      const value = result as bigint;
      this.setCache(cacheKey, value);
      return value;
    } catch (error) {
      logger.error('Failed to get final fee', { error, currency });
      return BigInt(0);
    }
  }

  async getDefaultLiveness(): Promise<number> {
    const cacheKey = 'defaultLiveness';
    const cached = this.getCached<number>(cacheKey);
    if (cached !== null) return cached;

    this.checkRateLimit();

    if (!this.contractAddresses.optimisticOracleV3) return 7200;

    try {
      const result = await this.retry.execute(() =>
        this.publicClient.readContract({
          address: this.contractAddresses.optimisticOracleV3!,
          abi: UMA_OPTIMISTIC_ORACLE_V3_ABI,
          functionName: 'defaultLiveness',
        }),
      );

      const value = Number(result);
      this.setCache(cacheKey, value);
      return value;
    } catch (error) {
      logger.error('Failed to get default liveness', { error });
      return 7200;
    }
  }

  // ============================================================================
  // 争议相关方法
  // ============================================================================

  async getDispute(assertionId: string): Promise<UMADispute | null> {
    const validation = this.validateAssertionId(assertionId);
    if (!validation.valid) return null;

    const cacheKey = `dispute:${assertionId}`;
    const cached = this.getCached<UMADispute>(cacheKey);
    if (cached) return cached;

    this.checkRateLimit();

    if (!this.contractAddresses.optimisticOracleV3) return null;

    try {
      const result = await this.retry.execute(() =>
        this.publicClient.readContract({
          address: this.contractAddresses.optimisticOracleV3!,
          abi: UMA_OPTIMISTIC_ORACLE_V3_ABI,
          functionName: 'getDispute',
          args: [assertionId as `0x${string}`],
        }),
      );

      const dispute = result as unknown as {
        disputer: Address;
        disputeTimestamp: bigint;
        disputeBond: bigint;
        disputeStatus: number;
      };
      const statusMap: DisputeStatus[] = ['None', 'Active', 'Resolved'];

      const data: UMADispute = {
        disputeId: `${assertionId}-dispute`,
        assertionId,
        disputer: dispute.disputer,
        disputeTimestamp: Number(dispute.disputeTimestamp),
        disputeBond: dispute.disputeBond,
        disputeStatus: statusMap[dispute.disputeStatus] || 'None',
      };

      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      logger.error('Failed to get dispute', { error, assertionId });
      return null;
    }
  }

  async getDisputeDetails(assertionId: string): Promise<DisputeDetails | null> {
    const validation = this.validateAssertionId(assertionId);
    if (!validation.valid) return null;

    const [dispute, assertion] = await Promise.all([
      this.getDispute(assertionId),
      this.getAssertion(assertionId),
    ]);

    if (!dispute) return null;

    const currentTime = Math.floor(Date.now() / 1000);
    const canSettle = assertion
      ? assertion.expirationTime < currentTime && !assertion.resolved
      : false;
    const timeUntilSettlement = assertion ? Math.max(0, assertion.expirationTime - currentTime) : 0;

    return {
      assertionId,
      disputer: dispute.disputer,
      disputeTimestamp: dispute.disputeTimestamp,
      disputeBond: dispute.disputeBond,
      status: dispute.disputeStatus,
      assertion,
      canSettle,
      timeUntilSettlement,
    };
  }

  async detectActiveDisputes(
    fromBlock?: bigint,
    toBlock?: bigint,
  ): Promise<{
    disputes: UMADispute[];
    totalDisputes: number;
    pendingDisputes: number;
  }> {
    this.checkRateLimit();

    if (!this.contractAddresses.optimisticOracleV3) {
      return { disputes: [], totalDisputes: 0, pendingDisputes: 0 };
    }

    try {
      const currentBlock = await this.publicClient.getBlockNumber();
      const startBlock = fromBlock ?? currentBlock - BigInt(10000);
      const endBlock = toBlock ?? currentBlock;

      const logs = await this.retry.execute(() =>
        this.publicClient.getLogs({
          address: this.contractAddresses.optimisticOracleV3!,
          event: UMA_OPTIMISTIC_ORACLE_V3_ABI[12],
          fromBlock: startBlock,
          toBlock: endBlock,
        }),
      );

      const disputes: UMADispute[] = [];
      let pendingDisputes = 0;

      for (const log of logs) {
        const decodedLog = decodeEventLog({
          abi: UMA_OPTIMISTIC_ORACLE_V3_ABI,
          data: log.data,
          topics: log.topics,
        });

        if (decodedLog.eventName === 'AssertionDisputed') {
          const args = decodedLog.args as { assertionId: Hash; caller: Address; disputer: Address };
          const disputeDetails = await this.getDispute(args.assertionId);
          if (disputeDetails) {
            disputes.push({
              disputeId: `${args.assertionId}-dispute`,
              assertionId: args.assertionId,
              disputer: args.disputer,
              disputeTimestamp: disputeDetails.disputeTimestamp,
              disputeBond: disputeDetails.disputeBond,
              disputeStatus: disputeDetails.disputeStatus,
              caller: args.caller,
            });

            if (disputeDetails.disputeStatus === 'Active') pendingDisputes++;
          }
        }
      }

      logger.info('UMA dispute detection completed', {
        chain: this.chain,
        totalDisputes: disputes.length,
        pendingDisputes,
        blockRange: `${startBlock}-${endBlock}`,
      });

      return { disputes, totalDisputes: disputes.length, pendingDisputes };
    } catch (error) {
      logger.error('Failed to detect active disputes', {
        error,
        chain: this.chain,
        fromBlock,
        toBlock,
      });
      return { disputes: [], totalDisputes: 0, pendingDisputes: 0 };
    }
  }

  async checkDisputeStatus(disputeId: string): Promise<{
    status: 'pending' | 'resolved' | 'rejected' | 'unknown';
    resolution?: bigint;
    resolvedAt?: number;
  }> {
    const assertionId = disputeId.replace('-dispute', '');
    const dispute = await this.getDispute(assertionId);

    if (!dispute) return { status: 'unknown' };

    switch (dispute.disputeStatus) {
      case 'Active':
        return { status: 'pending' };
      case 'Resolved': {
        const assertion = await this.getAssertion(assertionId);
        return {
          status: 'resolved',
          resolution: assertion?.settlementResolution ?? BigInt(0),
          resolvedAt: assertion?.timestamp,
        };
      }
      case 'None':
      default:
        return { status: 'unknown' };
    }
  }

  // ============================================================================
  // 事件监听方法
  // ============================================================================

  async getAssertionEvents(fromBlock?: bigint, toBlock?: bigint): Promise<UMAAssertionEvent[]> {
    this.checkRateLimit();

    if (!this.contractAddresses.optimisticOracleV3) return [];

    try {
      const currentBlock = await this.publicClient.getBlockNumber();
      const startBlock = fromBlock ?? currentBlock - BigInt(10000);
      const endBlock = toBlock ?? currentBlock;

      const logs = await this.retry.execute(() =>
        this.publicClient.getLogs({
          address: this.contractAddresses.optimisticOracleV3!,
          event: UMA_OPTIMISTIC_ORACLE_V3_ABI[11],
          fromBlock: startBlock,
          toBlock: endBlock,
        }),
      );

      const events: UMAAssertionEvent[] = [];

      for (const log of logs) {
        const decodedLog = decodeEventLog({
          abi: UMA_OPTIMISTIC_ORACLE_V3_ABI,
          data: log.data,
          topics: log.topics,
        });

        if (decodedLog.eventName === 'AssertionMade') {
          const args = decodedLog.args as {
            assertionId: Hash;
            domainId: Hash;
            claim: `0x${string}`;
            asserter: Address;
            callbackRecipient: Address;
            escalationManager: Address;
            caller: Address;
            expirationTime: bigint;
            currency: Address;
            bond: bigint;
            identifier: Hash;
          };
          const block = await this.publicClient.getBlock({ blockNumber: log.blockNumber });

          events.push({
            assertionId: args.assertionId,
            domainId: args.domainId,
            claim: args.claim,
            asserter: args.asserter,
            callbackRecipient: args.callbackRecipient,
            escalationManager: args.escalationManager,
            caller: args.caller,
            expirationTime: Number(args.expirationTime),
            currency: args.currency,
            bond: args.bond,
            identifier: args.identifier,
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
            timestamp: Number(block.timestamp),
          });
        }
      }

      return events;
    } catch (error) {
      logger.error('Failed to get assertion events', { error, chain: this.chain });
      return [];
    }
  }

  async getDisputeEvents(fromBlock?: bigint, toBlock?: bigint): Promise<UMADisputeEvent[]> {
    this.checkRateLimit();

    if (!this.contractAddresses.optimisticOracleV3) return [];

    try {
      const currentBlock = await this.publicClient.getBlockNumber();
      const startBlock = fromBlock ?? currentBlock - BigInt(10000);
      const endBlock = toBlock ?? currentBlock;

      const logs = await this.retry.execute(() =>
        this.publicClient.getLogs({
          address: this.contractAddresses.optimisticOracleV3!,
          event: UMA_OPTIMISTIC_ORACLE_V3_ABI[12],
          fromBlock: startBlock,
          toBlock: endBlock,
        }),
      );

      const events: UMADisputeEvent[] = [];

      for (const log of logs) {
        const decodedLog = decodeEventLog({
          abi: UMA_OPTIMISTIC_ORACLE_V3_ABI,
          data: log.data,
          topics: log.topics,
        });

        if (decodedLog.eventName === 'AssertionDisputed') {
          const args = decodedLog.args as { assertionId: Hash; caller: Address; disputer: Address };
          const block = await this.publicClient.getBlock({ blockNumber: log.blockNumber });

          events.push({
            assertionId: args.assertionId,
            caller: args.caller,
            disputer: args.disputer,
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
            timestamp: Number(block.timestamp),
          });
        }
      }

      return events;
    } catch (error) {
      logger.error('Failed to get dispute events', { error, chain: this.chain });
      return [];
    }
  }

  async getSettlementEvents(fromBlock?: bigint, toBlock?: bigint): Promise<UMASettlementEvent[]> {
    this.checkRateLimit();

    if (!this.contractAddresses.optimisticOracleV3) return [];

    try {
      const currentBlock = await this.publicClient.getBlockNumber();
      const startBlock = fromBlock ?? currentBlock - BigInt(10000);
      const endBlock = toBlock ?? currentBlock;

      const logs = await this.retry.execute(() =>
        this.publicClient.getLogs({
          address: this.contractAddresses.optimisticOracleV3!,
          event: UMA_OPTIMISTIC_ORACLE_V3_ABI[13],
          fromBlock: startBlock,
          toBlock: endBlock,
        }),
      );

      const events: UMASettlementEvent[] = [];

      for (const log of logs) {
        const decodedLog = decodeEventLog({
          abi: UMA_OPTIMISTIC_ORACLE_V3_ABI,
          data: log.data,
          topics: log.topics,
        });

        if (decodedLog.eventName === 'AssertionSettled') {
          const args = decodedLog.args as {
            assertionId: Hash;
            settledValue: boolean;
            disputed: boolean;
            bondRecipient: Address;
          };
          const block = await this.publicClient.getBlock({ blockNumber: log.blockNumber });

          events.push({
            assertionId: args.assertionId,
            settledValue: args.settledValue,
            disputed: args.disputed,
            bondRecipient: args.bondRecipient,
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
            timestamp: Number(block.timestamp),
          });
        }
      }

      return events;
    } catch (error) {
      logger.error('Failed to get settlement events', { error, chain: this.chain });
      return [];
    }
  }

  // ============================================================================
  // 健康检查方法
  // ============================================================================

  async checkFeedHealth(assertionId: string): Promise<UMAHealthStatus> {
    const validation = this.validateAssertionId(assertionId);
    if (!validation.valid) {
      return {
        healthy: false,
        lastUpdate: new Date(0),
        stalenessSeconds: Infinity,
        issues: validation.errors,
        activeAssertions: 0,
        activeDisputes: 0,
        totalBonded: BigInt(0),
      };
    }

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
          totalBonded: BigInt(0),
        };
      }

      const lastUpdate = new Date(assertion.timestamp * 1000);
      const now = new Date();
      const stalenessSeconds = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);

      const stalenessThreshold = this.clientConfig.stalenessThreshold ?? 600;
      if (stalenessSeconds > stalenessThreshold) {
        issues.push(`Assertion is stale: ${stalenessSeconds}s old`);
      }

      if (assertion.disputed) issues.push('Assertion has been disputed');
      if (assertion.resolved) issues.push('Assertion has already been resolved');

      const minBond = await this.getMinimumBond(assertion.currency);
      if (assertion.bond < minBond) {
        issues.push(`Bond below minimum: ${assertion.bond} < ${minBond}`);
      }

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
        totalBonded: BigInt(0),
      };
    }
  }

  async checkHealth(): Promise<{ healthy: boolean; latency: number; issues: string[] }> {
    const startTime = Date.now();
    const issues: string[] = [];

    try {
      if (!this.contractAddresses.optimisticOracleV3) {
        issues.push('Optimistic Oracle V3 not configured for this chain');
      }

      if (this.contractAddresses.optimisticOracleV3) {
        try {
          await this.retry.execute(() =>
            this.publicClient.readContract({
              address: this.contractAddresses.optimisticOracleV3!,
              abi: UMA_OPTIMISTIC_ORACLE_V3_ABI,
              functionName: 'getCurrentTime',
            }),
          );
        } catch {
          issues.push('Failed to connect to Optimistic Oracle V3');
        }
      }

      const latency = Date.now() - startTime;
      return { healthy: issues.length === 0, latency, issues };
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
  // 缓存管理
  // ============================================================================

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; maxSize: number; ttl: number } {
    return this.cache.getStats();
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

export function isChainSupportedByUMA(chain: SupportedChain): boolean {
  return UMA_CONTRACT_ADDRESSES[chain]?.optimisticOracleV3 !== undefined;
}

export function getSupportedUMAChains(): SupportedChain[] {
  return Object.entries(UMA_CONTRACT_ADDRESSES)
    .filter(([, addresses]) => addresses?.optimisticOracleV3 !== undefined)
    .map(([chain]) => chain as SupportedChain);
}

export function getUMAContractAddresses(chain: SupportedChain): {
  optimisticOracleV3?: Address;
  optimisticOracleV2?: Address;
  dvm?: Address;
  votingToken?: Address;
} {
  return UMA_CONTRACT_ADDRESSES[chain] ?? {};
}
