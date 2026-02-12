/**
 * UMA Transaction Client (Security Enhanced)
 *
 * UMA 交易客户端（安全增强版）
 * 支持断言创建、争议提交、结算等写入操作
 * 集成输入验证、交易验证、重入防护等安全功能
 */

import {
  createPublicClient,
  http,
  type Address,
  type Hash,
  type WalletClient,
  type PublicClient,
  decodeEventLog,
  encodeFunctionData,
} from 'viem';

import { logger } from '@/shared/logger';
import type { SupportedChain } from '@/types/unifiedOracleTypes';

import {
  validateUMAAssertionParams,
  validateAddress,
  validateBytes32,
  validateBondAmount,
  VALIDATION_LIMITS,
} from './security/inputValidation';
import { createRateLimiter, RATE_LIMIT_DEFAULTS } from './security/rateLimiter';
import { createReentrancyGuard } from './security/reentrancyGuard';
import {
  createUMATransactionValidator,
  createTransactionMonitor,
} from './security/transactionValidator';
import { UMA_OPTIMISTIC_ORACLE_V3_ABI } from './uma/abi';
import { UMA_CONTRACT_ADDRESSES } from './umaOracle';

import type { SlidingWindowRateLimiter } from './security/rateLimiter';
import type { ReentrancyGuard } from './security/reentrancyGuard';
import type { UMATransactionValidator, TransactionMonitor } from './security/transactionValidator';

// ============================================================================
// 类型定义
// ============================================================================

export interface AssertTruthParams {
  claim: string;
  currency: Address;
  bond: bigint;
  identifier?: Hash;
  escalateManually?: boolean;
  extraData?: `0x${string}`;
}

export interface DisputeAssertionParams {
  assertionId: Hash;
  disputer: Address;
  bondAmount: bigint;
}

export interface SettleAssertionParams {
  assertionId: Hash;
}

export interface UMATransactionResult {
  success: boolean;
  transactionHash?: Hash;
  assertionId?: Hash;
  error?: string;
  warnings?: string[];
  gasUsed?: bigint;
}

export interface UMATransactionClientConfig {
  chain: SupportedChain;
  rpcUrl: string;
  walletClient?: WalletClient;
  enableRateLimit?: boolean;
  maxRequestsPerMinute?: number;
}

// ============================================================================
// UMA Transaction Client (安全增强版)
// ============================================================================

export class UMATransactionClient {
  readonly chain: SupportedChain;
  private contractAddresses: NonNullable<(typeof UMA_CONTRACT_ADDRESSES)[SupportedChain]>;
  private walletClient: WalletClient | undefined;
  private publicClient: PublicClient;

  // 安全组件
  private validator: UMATransactionValidator;
  private reentrancyGuard: ReentrancyGuard;
  private monitor: TransactionMonitor;
  private rateLimiter: SlidingWindowRateLimiter | null = null;

  constructor(config: UMATransactionClientConfig) {
    this.chain = config.chain;
    const addresses = UMA_CONTRACT_ADDRESSES[config.chain];
    if (!addresses) {
      throw new Error(`UMA not supported on chain: ${config.chain}`);
    }
    this.contractAddresses = addresses;
    this.walletClient = config.walletClient;

    this.publicClient = createPublicClient({
      transport: http(config.rpcUrl),
    }) as PublicClient;

    // 初始化安全组件
    this.validator = createUMATransactionValidator();
    this.reentrancyGuard = createReentrancyGuard();
    this.monitor = createTransactionMonitor();

    if (config.enableRateLimit !== false) {
      this.rateLimiter = createRateLimiter({
        maxRequestsPerSecond: 5,
        maxRequestsPerMinute:
          config.maxRequestsPerMinute ?? RATE_LIMIT_DEFAULTS.WRITE_MAX_REQUESTS_PER_MINUTE,
      });
    }
  }

  setWalletClient(walletClient: WalletClient): void {
    this.walletClient = walletClient;
  }

  private ensureWalletClient(): WalletClient {
    if (!this.walletClient) {
      throw new Error('Wallet client not configured. Please connect wallet first.');
    }
    return this.walletClient;
  }

  private ensureContractAddress(): Address {
    if (!this.contractAddresses.optimisticOracleV3) {
      throw new Error('Optimistic Oracle V3 not supported on this chain');
    }
    return this.contractAddresses.optimisticOracleV3;
  }

  private checkRateLimit(): void {
    if (this.rateLimiter) {
      const result = this.rateLimiter.checkAndRecord(`uma-tx-${this.chain}`);
      if (!result.allowed) {
        throw new Error(`Rate limit exceeded. Retry after ${result.retryAfter} seconds.`);
      }
    }
  }

  // ============================================================================
  // 断言创建
  // ============================================================================

  async assertTruth(params: AssertTruthParams): Promise<UMATransactionResult> {
    const warnings: string[] = [];

    // 1. 输入验证
    const validation = validateUMAAssertionParams(params);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join('; '),
        warnings: validation.warnings,
      };
    }
    if (validation.warnings) {
      warnings.push(...validation.warnings);
    }

    // 2. 交易验证
    const txValidation = this.validator.validateAssertionTransaction({
      claim: params.claim,
      currency: params.currency,
      bond: params.bond,
      identifier: params.identifier,
    });
    if (!txValidation.valid) {
      return {
        success: false,
        error: txValidation.errors.join('; '),
        warnings: txValidation.warnings,
      };
    }

    // 3. 速率限制
    this.checkRateLimit();

    // 4. 重入防护
    return this.reentrancyGuard.withLock(`assertTruth-${this.chain}`, 'assertTruth', async () => {
      const walletClient = this.ensureWalletClient();
      const contractAddress = this.ensureContractAddress();

      try {
        const account = walletClient.account;
        if (!account) {
          throw new Error('Wallet account not available');
        }

        const defaultIdentifier =
          '0x554d49502d313238000000000000000000000000000000000000000000000000' as Hash;
        const identifier = params.identifier ?? defaultIdentifier;
        const escalateManually = params.escalateManually ?? false;
        const extraData = params.extraData ?? '0x';

        const { request } = await this.publicClient.simulateContract({
          address: contractAddress,
          abi: UMA_OPTIMISTIC_ORACLE_V3_ABI,
          functionName: 'assertTruth',
          args: [
            params.claim,
            params.currency,
            params.bond,
            identifier,
            escalateManually,
            extraData,
          ],
          account,
        });

        const hash = await walletClient.writeContract(request);

        // 记录交易
        this.monitor.recordSubmission(hash, {
          to: contractAddress,
          from: account.address,
          value: params.bond,
        });

        const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

        // 更新状态
        this.monitor.updateStatus(hash, {
          status: receipt.status === 'success' ? 'confirmed' : 'failed',
          confirmations: 1,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed,
          effectiveGasPrice: receipt.effectiveGasPrice,
        });

        let assertionId: Hash | undefined;
        for (const log of receipt.logs) {
          try {
            const decodedLog = decodeEventLog({
              abi: UMA_OPTIMISTIC_ORACLE_V3_ABI,
              data: log.data,
              topics: log.topics,
            });
            if (decodedLog.eventName === 'AssertionMade') {
              const args = decodedLog.args as { assertionId: Hash };
              assertionId = args.assertionId;
            }
          } catch {
            // Skip non-matching logs
          }
        }

        logger.info('UMA assertion created', {
          chain: this.chain,
          transactionHash: hash,
          assertionId,
          claim: params.claim.substring(0, 100),
          gasUsed: receipt.gasUsed.toString(),
        });

        return {
          success: true,
          transactionHash: hash,
          assertionId,
          warnings,
          gasUsed: receipt.gasUsed,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Failed to create UMA assertion', {
          error: errorMessage,
          chain: this.chain,
          params: { ...params, claim: params.claim.substring(0, 100) },
        });
        return {
          success: false,
          error: errorMessage,
          warnings,
        };
      }
    });
  }

  // ============================================================================
  // 争议提交
  // ============================================================================

  async disputeAssertion(params: DisputeAssertionParams): Promise<UMATransactionResult> {
    const warnings: string[] = [];

    // 1. 输入验证
    const assertionIdValidation = validateBytes32(params.assertionId, 'assertionId');
    if (!assertionIdValidation.valid) {
      return { success: false, error: assertionIdValidation.errors.join('; ') };
    }

    const disputerValidation = validateAddress(params.disputer, 'disputer');
    if (!disputerValidation.valid) {
      return { success: false, error: disputerValidation.errors.join('; ') };
    }

    const bondValidation = validateBondAmount(params.bondAmount, 'bondAmount');
    if (!bondValidation.valid) {
      return { success: false, error: bondValidation.errors.join('; ') };
    }

    // 2. 交易验证
    const txValidation = this.validator.validateDisputeTransaction({
      assertionId: params.assertionId,
      disputer: params.disputer,
      bondAmount: params.bondAmount,
    });
    if (!txValidation.valid) {
      return {
        success: false,
        error: txValidation.errors.join('; '),
        warnings: txValidation.warnings,
      };
    }

    // 3. 速率限制
    this.checkRateLimit();

    // 4. 重入防护
    return this.reentrancyGuard.withLock(
      `disputeAssertion-${params.assertionId}`,
      'disputeAssertion',
      async () => {
        const walletClient = this.ensureWalletClient();
        const contractAddress = this.ensureContractAddress();

        try {
          const account = walletClient.account;
          if (!account) {
            throw new Error('Wallet account not available');
          }

          const { request } = await this.publicClient.simulateContract({
            address: contractAddress,
            abi: UMA_OPTIMISTIC_ORACLE_V3_ABI,
            functionName: 'disputeAssertion',
            args: [params.assertionId, params.disputer],
            account,
            value: params.bondAmount,
          });

          const hash = await walletClient.writeContract(request);

          // 记录交易
          this.monitor.recordSubmission(hash, {
            to: contractAddress,
            from: account.address,
            value: params.bondAmount,
          });

          const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

          // 更新状态
          this.monitor.updateStatus(hash, {
            status: receipt.status === 'success' ? 'confirmed' : 'failed',
            confirmations: 1,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed,
          });

          logger.info('UMA assertion disputed', {
            chain: this.chain,
            transactionHash: hash,
            assertionId: params.assertionId,
            disputer: params.disputer,
            gasUsed: receipt.gasUsed.toString(),
          });

          return {
            success: true,
            transactionHash: hash,
            assertionId: params.assertionId,
            warnings,
            gasUsed: receipt.gasUsed,
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error('Failed to dispute UMA assertion', {
            error: errorMessage,
            chain: this.chain,
            assertionId: params.assertionId,
          });
          return {
            success: false,
            error: errorMessage,
            warnings,
          };
        }
      },
    );
  }

  // ============================================================================
  // 断言结算
  // ============================================================================

  async settleAssertion(params: SettleAssertionParams): Promise<UMATransactionResult> {
    const warnings: string[] = [];

    // 1. 输入验证
    const validation = validateBytes32(params.assertionId, 'assertionId');
    if (!validation.valid) {
      return { success: false, error: validation.errors.join('; ') };
    }

    // 2. 交易验证
    const txValidation = this.validator.validateSettlementTransaction(params.assertionId);
    if (!txValidation.valid) {
      return {
        success: false,
        error: txValidation.errors.join('; '),
        warnings: txValidation.warnings,
      };
    }

    // 3. 速率限制
    this.checkRateLimit();

    // 4. 重入防护
    return this.reentrancyGuard.withLock(
      `settleAssertion-${params.assertionId}`,
      'settleAssertion',
      async () => {
        const walletClient = this.ensureWalletClient();
        const contractAddress = this.ensureContractAddress();

        try {
          const account = walletClient.account;
          if (!account) {
            throw new Error('Wallet account not available');
          }

          const { request } = await this.publicClient.simulateContract({
            address: contractAddress,
            abi: UMA_OPTIMISTIC_ORACLE_V3_ABI,
            functionName: 'settleAssertion',
            args: [params.assertionId],
            account,
          });

          const hash = await walletClient.writeContract(request);

          // 记录交易
          this.monitor.recordSubmission(hash, {
            to: contractAddress,
            from: account.address,
          });

          const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

          // 更新状态
          this.monitor.updateStatus(hash, {
            status: receipt.status === 'success' ? 'confirmed' : 'failed',
            confirmations: 1,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed,
          });

          let settledValue: boolean | undefined;
          for (const log of receipt.logs) {
            try {
              const decodedLog = decodeEventLog({
                abi: UMA_OPTIMISTIC_ORACLE_V3_ABI,
                data: log.data,
                topics: log.topics,
              });
              if (decodedLog.eventName === 'AssertionSettled') {
                const args = decodedLog.args as { settledValue: boolean };
                settledValue = args.settledValue;
              }
            } catch {
              // Skip non-matching logs
            }
          }

          logger.info('UMA assertion settled', {
            chain: this.chain,
            transactionHash: hash,
            assertionId: params.assertionId,
            settledValue,
            gasUsed: receipt.gasUsed.toString(),
          });

          return {
            success: true,
            transactionHash: hash,
            assertionId: params.assertionId,
            warnings,
            gasUsed: receipt.gasUsed,
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error('Failed to settle UMA assertion', {
            error: errorMessage,
            chain: this.chain,
            assertionId: params.assertionId,
          });
          return {
            success: false,
            error: errorMessage,
            warnings,
          };
        }
      },
    );
  }

  // ============================================================================
  // 批量操作
  // ============================================================================

  async settleMultipleAssertions(assertionIds: Hash[]): Promise<UMATransactionResult[]> {
    // 验证批量大小
    if (assertionIds.length > VALIDATION_LIMITS.MAX_BATCH_SIZE) {
      throw new Error(`Batch size exceeds maximum of ${VALIDATION_LIMITS.MAX_BATCH_SIZE}`);
    }

    const results: UMATransactionResult[] = [];

    for (const assertionId of assertionIds) {
      const result = await this.settleAssertion({ assertionId });
      results.push(result);

      if (!result.success) {
        logger.warn('Batch settlement failed for assertion', {
          assertionId,
          error: result.error,
        });
      }
    }

    return results;
  }

  // ============================================================================
  // 交易监控
  // ============================================================================

  getTransactionStatus(hash: Hash) {
    return this.monitor.getStatus(hash);
  }

  getPendingTransactions(): Hash[] {
    return this.monitor.getPendingTransactions();
  }

  getTimedOutTransactions(timeoutMs?: number): Hash[] {
    return this.monitor.getTimedOutTransactions(timeoutMs);
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

export function createUMATransactionClient(
  chain: SupportedChain,
  rpcUrl: string,
  walletClient?: WalletClient,
): UMATransactionClient {
  return new UMATransactionClient({
    chain,
    rpcUrl,
    walletClient,
  });
}

// ============================================================================
// 辅助函数
// ============================================================================

export function encodeAssertTruthCall(params: AssertTruthParams): `0x${string}` {
  const defaultIdentifier =
    '0x554d49502d313238000000000000000000000000000000000000000000000000' as Hash;
  const identifier = params.identifier ?? defaultIdentifier;
  const escalateManually = params.escalateManually ?? false;
  const extraData = params.extraData ?? '0x';

  return encodeFunctionData({
    abi: UMA_OPTIMISTIC_ORACLE_V3_ABI,
    functionName: 'assertTruth',
    args: [params.claim, params.currency, params.bond, identifier, escalateManually, extraData],
  });
}

export function encodeDisputeAssertionCall(params: DisputeAssertionParams): `0x${string}` {
  return encodeFunctionData({
    abi: UMA_OPTIMISTIC_ORACLE_V3_ABI,
    functionName: 'disputeAssertion',
    args: [params.assertionId, params.disputer],
  });
}

export function encodeSettleAssertionCall(assertionId: Hash): `0x${string}` {
  return encodeFunctionData({
    abi: UMA_OPTIMISTIC_ORACLE_V3_ABI,
    functionName: 'settleAssertion',
    args: [assertionId],
  });
}

export function calculateRequiredBond(
  baseBond: bigint,
  finalFee: bigint,
  multiplier: number = 1,
): bigint {
  return baseBond * BigInt(multiplier) + finalFee;
}
