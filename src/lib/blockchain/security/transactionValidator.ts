/**
 * Transaction Validator Module
 *
 * 交易验证模块
 * 验证交易参数、防止恶意交易、检查交易状态
 */

import { validateAddress, validateBytes32, validateBondAmount } from './inputValidation';

import type { ValidationResult } from './inputValidation';
import type { Address, Hash } from 'viem';

// ============================================================================
// 常量定义
// ============================================================================

export const TX_VALIDATION_DEFAULTS = {
  // Gas 限制
  MIN_GAS_LIMIT: BigInt(21000),
  MAX_GAS_LIMIT: BigInt(30000000),
  MAX_GAS_PRICE: BigInt(500000000000), // 500 Gwei

  // 交易确认
  REQUIRED_CONFIRMATIONS: 3,
  MAX_WAIT_TIME_MS: 120000, // 2 minutes

  // 金额限制
  MAX_VALUE_TRANSFER: BigInt('1000000000000000000000000'), // 1M ETH

  // Nonce
  MAX_NONCE_DRIFT: 10,
} as const;

// ============================================================================
// 类型定义
// ============================================================================

export interface TransactionParams {
  to: Address;
  from?: Address;
  value?: bigint;
  data?: `0x${string}`;
  gas?: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  nonce?: number;
  chainId?: number;
}

export interface TransactionValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  sanitized?: TransactionParams;
  riskScore?: number;
}

export interface TransactionStatus {
  hash: Hash;
  status: 'pending' | 'confirmed' | 'failed' | 'reverted';
  confirmations: number;
  blockNumber?: bigint;
  gasUsed?: bigint;
  effectiveGasPrice?: bigint;
  timestamp?: number;
}

export interface TransactionValidatorConfig {
  maxGasLimit: bigint;
  maxGasPrice: bigint;
  maxValueTransfer: bigint;
  requiredConfirmations: number;
}

// ============================================================================
// 交易验证器
// ============================================================================

export class TransactionValidator {
  private config: TransactionValidatorConfig;

  constructor(config: Partial<TransactionValidatorConfig> = {}) {
    this.config = {
      maxGasLimit: config.maxGasLimit ?? TX_VALIDATION_DEFAULTS.MAX_GAS_LIMIT,
      maxGasPrice: config.maxGasPrice ?? TX_VALIDATION_DEFAULTS.MAX_GAS_PRICE,
      maxValueTransfer: config.maxValueTransfer ?? TX_VALIDATION_DEFAULTS.MAX_VALUE_TRANSFER,
      requiredConfirmations:
        config.requiredConfirmations ?? TX_VALIDATION_DEFAULTS.REQUIRED_CONFIRMATIONS,
    };
  }

  /**
   * 验证交易参数
   */
  validate(params: TransactionParams): TransactionValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let riskScore = 0;
    const sanitized: TransactionParams = { to: params.to };

    // 1. 验证目标地址
    const toResult = validateAddress(params.to, 'to');
    if (!toResult.valid) {
      errors.push(...toResult.errors);
    } else {
      sanitized.to = toResult.sanitized as Address;
    }

    // 2. 验证发送者地址（如果提供）
    if (params.from) {
      const fromResult = validateAddress(params.from, 'from');
      if (!fromResult.valid) {
        errors.push(...fromResult.errors);
      } else {
        sanitized.from = fromResult.sanitized as Address;
      }
    }

    // 3. 验证转账金额
    if (params.value !== undefined) {
      if (params.value < 0) {
        errors.push('Value cannot be negative');
      } else if (params.value > this.config.maxValueTransfer) {
        errors.push(`Value exceeds maximum: ${this.config.maxValueTransfer}`);
        riskScore += 30;
      } else {
        sanitized.value = params.value;
        if (params.value > BigInt(0)) {
          warnings.push(`Transaction includes value transfer: ${params.value}`);
          riskScore += 5;
        }
      }
    }

    // 4. 验证 Gas 参数
    if (params.gas !== undefined) {
      if (params.gas < TX_VALIDATION_DEFAULTS.MIN_GAS_LIMIT) {
        errors.push(`Gas limit below minimum: ${TX_VALIDATION_DEFAULTS.MIN_GAS_LIMIT}`);
      } else if (params.gas > this.config.maxGasLimit) {
        errors.push(`Gas limit exceeds maximum: ${this.config.maxGasLimit}`);
        riskScore += 20;
      } else {
        sanitized.gas = params.gas;
      }
    }

    // 5. 验证 Gas 价格
    if (params.gasPrice !== undefined) {
      if (params.gasPrice > this.config.maxGasPrice) {
        errors.push(`Gas price exceeds maximum: ${this.config.maxGasPrice}`);
        riskScore += 25;
      } else {
        sanitized.gasPrice = params.gasPrice;
      }
    }

    // 6. 验证 EIP-1559 参数
    if (params.maxFeePerGas !== undefined) {
      if (params.maxFeePerGas > this.config.maxGasPrice) {
        errors.push(`Max fee per gas exceeds maximum: ${this.config.maxGasPrice}`);
        riskScore += 25;
      } else {
        sanitized.maxFeePerGas = params.maxFeePerGas;
      }
    }

    if (params.maxPriorityFeePerGas !== undefined) {
      if (params.maxPriorityFeePerGas > this.config.maxGasPrice) {
        errors.push(`Max priority fee per gas exceeds maximum`);
        riskScore += 25;
      } else {
        sanitized.maxPriorityFeePerGas = params.maxPriorityFeePerGas;
      }
    }

    // 7. 验证数据
    if (params.data !== undefined) {
      const dataResult = this.validateTransactionData(params.data);
      if (!dataResult.valid) {
        errors.push(...dataResult.errors);
      } else {
        sanitized.data = params.data;
        if (params.data.length > 1000) {
          warnings.push('Transaction data is large');
          riskScore += 5;
        }
      }
    }

    // 8. 验证 Nonce
    if (params.nonce !== undefined) {
      if (params.nonce < 0) {
        errors.push('Nonce cannot be negative');
      } else {
        sanitized.nonce = params.nonce;
      }
    }

    // 9. 验证 Chain ID
    if (params.chainId !== undefined) {
      if (params.chainId <= 0) {
        errors.push('Chain ID must be positive');
      } else {
        sanitized.chainId = params.chainId;
      }
    }

    // 10. 计算风险评分
    if (params.value && params.value > BigInt(0) && params.data && params.data.length > 2) {
      warnings.push('Transaction has both value and data - potential risk');
      riskScore += 10;
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      sanitized: errors.length === 0 ? sanitized : undefined,
      riskScore: Math.min(riskScore, 100),
    };
  }

  /**
   * 验证交易数据
   */
  private validateTransactionData(data: `0x${string}`): ValidationResult {
    const errors: string[] = [];

    if (!data.startsWith('0x')) {
      errors.push('Data must start with 0x');
      return { valid: false, errors };
    }

    if (data.length % 2 !== 0) {
      errors.push('Data must have even length');
      return { valid: false, errors };
    }

    // 检查是否为有效的十六进制
    const hexPattern = /^0x[0-9a-fA-F]*$/;
    if (!hexPattern.test(data)) {
      errors.push('Data contains invalid characters');
      return { valid: false, errors };
    }

    return { valid: true, errors };
  }

  /**
   * 验证交易哈希
   */
  validateTransactionHash(hash: string): ValidationResult {
    return validateBytes32(hash, 'transactionHash');
  }

  /**
   * 检查交易是否可疑
   */
  detectSuspiciousPatterns(params: TransactionParams): {
    isSuspicious: boolean;
    patterns: string[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  } {
    const patterns: string[] = [];
    let riskScore = 0;

    // 1. 检查高 Gas 价格
    if (params.gasPrice && params.gasPrice > BigInt(100000000000)) {
      // > 100 Gwei
      patterns.push('High gas price');
      riskScore += 20;
    }

    // 2. 检查大额转账
    if (params.value && params.value > BigInt('10000000000000000000000')) {
      // > 10,000 ETH
      patterns.push('Large value transfer');
      riskScore += 40;
    }

    // 3. 检查空数据转账
    if (params.data && params.data === '0x' && params.value && params.value > BigInt(0)) {
      patterns.push('Simple ETH transfer');
      riskScore += 5;
    }

    // 4. 检查合约创建
    if (params.to === undefined || params.to === '0x0000000000000000000000000000000000000000') {
      patterns.push('Contract creation');
      riskScore += 15;
    }

    // 5. 检查可疑的方法签名
    if (params.data && params.data.length >= 10) {
      const methodId = params.data.slice(0, 10);
      const suspiciousMethods = [
        '0x00000000', // potential attack
        '0xdeadbeef', // test pattern
      ];
      if (suspiciousMethods.includes(methodId)) {
        patterns.push('Suspicious method signature');
        riskScore += 50;
      }
    }

    // 6. 检查超大 Gas 限制
    if (params.gas && params.gas > BigInt(10000000)) {
      patterns.push('Very high gas limit');
      riskScore += 15;
    }

    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (riskScore >= 60) {
      riskLevel = 'critical';
    } else if (riskScore >= 40) {
      riskLevel = 'high';
    } else if (riskScore >= 20) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    return {
      isSuspicious: riskScore >= 40,
      patterns,
      riskLevel,
    };
  }
}

// ============================================================================
// UMA 特定交易验证器
// ============================================================================

export class UMATransactionValidator extends TransactionValidator {
  /**
   * 验证 UMA 断言交易
   */
  validateAssertionTransaction(params: {
    claim: string;
    currency: Address;
    bond: bigint;
    identifier?: Hash;
  }): TransactionValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证 claim
    if (!params.claim || params.claim.trim().length === 0) {
      errors.push('Claim cannot be empty');
    } else if (params.claim.length > 10000) {
      errors.push('Claim is too long');
    }

    // 验证 currency
    const currencyResult = validateAddress(params.currency, 'currency');
    if (!currencyResult.valid) {
      errors.push(...currencyResult.errors);
    }

    // 验证 bond
    const bondResult = validateBondAmount(params.bond, 'bond');
    if (!bondResult.valid) {
      errors.push(...bondResult.errors);
    }

    // 验证 identifier
    if (params.identifier) {
      const idResult = validateBytes32(params.identifier, 'identifier');
      if (!idResult.valid) {
        errors.push(...idResult.errors);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 验证 UMA 争议交易
   */
  validateDisputeTransaction(params: {
    assertionId: Hash;
    disputer: Address;
    bondAmount: bigint;
  }): TransactionValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证 assertionId
    const assertionIdResult = validateBytes32(params.assertionId, 'assertionId');
    if (!assertionIdResult.valid) {
      errors.push(...assertionIdResult.errors);
    }

    // 验证 disputer
    const disputerResult = validateAddress(params.disputer, 'disputer');
    if (!disputerResult.valid) {
      errors.push(...disputerResult.errors);
    }

    // 验证 bondAmount
    const bondResult = validateBondAmount(params.bondAmount, 'bondAmount');
    if (!bondResult.valid) {
      errors.push(...bondResult.errors);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 验证 UMA 结算交易
   */
  validateSettlementTransaction(assertionId: Hash): TransactionValidationResult {
    const errors: string[] = [];

    const idResult = validateBytes32(assertionId, 'assertionId');
    if (!idResult.valid) {
      errors.push(...idResult.errors);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
    };
  }
}

// ============================================================================
// 交易状态监控器
// ============================================================================

export class TransactionMonitor {
  private pendingTransactions: Map<
    Hash,
    {
      params: TransactionParams;
      submittedAt: number;
      status: TransactionStatus;
    }
  > = new Map();

  /**
   * 记录提交的交易
   */
  recordSubmission(hash: Hash, params: TransactionParams): void {
    this.pendingTransactions.set(hash, {
      params,
      submittedAt: Date.now(),
      status: {
        hash,
        status: 'pending',
        confirmations: 0,
      },
    });
  }

  /**
   * 更新交易状态
   */
  updateStatus(hash: Hash, status: Partial<TransactionStatus>): void {
    const tx = this.pendingTransactions.get(hash);
    if (tx) {
      tx.status = { ...tx.status, ...status };
    }
  }

  /**
   * 获取交易状态
   */
  getStatus(hash: Hash): TransactionStatus | undefined {
    return this.pendingTransactions.get(hash)?.status;
  }

  /**
   * 获取所有待处理交易
   */
  getPendingTransactions(): Hash[] {
    const pending: Hash[] = [];
    for (const [hash, tx] of this.pendingTransactions) {
      if (tx.status.status === 'pending') {
        pending.push(hash);
      }
    }
    return pending;
  }

  /**
   * 清理已确认/失败的交易
   */
  cleanup(maxAge: number = 3600000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [hash, tx] of this.pendingTransactions) {
      if (tx.status.status !== 'pending' && now - tx.submittedAt > maxAge) {
        this.pendingTransactions.delete(hash);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * 检查是否有超时交易
   */
  getTimedOutTransactions(timeoutMs: number = TX_VALIDATION_DEFAULTS.MAX_WAIT_TIME_MS): Hash[] {
    const now = Date.now();
    const timedOut: Hash[] = [];

    for (const [hash, tx] of this.pendingTransactions) {
      if (tx.status.status === 'pending' && now - tx.submittedAt > timeoutMs) {
        timedOut.push(hash);
      }
    }

    return timedOut;
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

export function createTransactionValidator(
  config?: Partial<TransactionValidatorConfig>,
): TransactionValidator {
  return new TransactionValidator(config);
}

export function createUMATransactionValidator(
  config?: Partial<TransactionValidatorConfig>,
): UMATransactionValidator {
  return new UMATransactionValidator(config);
}

export function createTransactionMonitor(): TransactionMonitor {
  return new TransactionMonitor();
}
