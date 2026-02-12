/**
 * Input Validation Module
 *
 * 输入验证模块
 * 防止恶意输入、注入攻击、参数篡改
 */

import type { Address, Hash } from 'viem';
import { isAddress, isHex, checksumAddress } from 'viem';

// ============================================================================
// 常量定义
// ============================================================================

export const VALIDATION_LIMITS = {
  MAX_SYMBOL_LENGTH: 32,
  MAX_CLAIM_LENGTH: 10000,
  MAX_EXTRA_DATA_LENGTH: 2048,
  MAX_BATCH_SIZE: 100,
  MAX_BOND_AMOUNT: BigInt('1000000000000000000000000'), // 1M tokens
  MIN_BOND_AMOUNT: BigInt('100000000000000'), // 0.0001 tokens (assuming 18 decimals)
  MAX_TIMESTAMP_DRIFT: 300, // 5 minutes
  VALID_CHAIN_IDS: [1, 10, 56, 137, 250, 42161, 43114, 8453, 11155111],
} as const;

// ============================================================================
// 验证结果类型
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
  sanitized?: unknown;
}

// ============================================================================
// 地址验证
// ============================================================================

export function validateAddress(address: string, fieldName: string = 'address'): ValidationResult {
  const errors: string[] = [];
  let sanitized: Address | undefined;

  if (!address || typeof address !== 'string') {
    errors.push(`${fieldName} is required and must be a string`);
    return { valid: false, errors };
  }

  const trimmed = address.trim();

  if (trimmed.length === 0) {
    errors.push(`${fieldName} cannot be empty`);
    return { valid: false, errors };
  }

  if (!isHex(trimmed)) {
    errors.push(`${fieldName} must be a valid hex string`);
    return { valid: false, errors };
  }

  if (!isAddress(trimmed)) {
    errors.push(`${fieldName} is not a valid Ethereum address`);
    return { valid: false, errors };
  }

  // 检查零地址
  if (trimmed.toLowerCase() === '0x0000000000000000000000000000000000000000') {
    errors.push(`${fieldName} cannot be the zero address`);
    return { valid: false, errors };
  }

  try {
    sanitized = checksumAddress(trimmed);
  } catch {
    errors.push(`Failed to checksum ${fieldName}`);
    return { valid: false, errors };
  }

  return { valid: true, errors: [], sanitized };
}

export function validateAddressArray(
  addresses: string[],
  fieldName: string = 'addresses',
): ValidationResult {
  const errors: string[] = [];
  const sanitized: Address[] = [];

  if (!Array.isArray(addresses)) {
    errors.push(`${fieldName} must be an array`);
    return { valid: false, errors };
  }

  if (addresses.length > VALIDATION_LIMITS.MAX_BATCH_SIZE) {
    errors.push(`${fieldName} exceeds maximum batch size of ${VALIDATION_LIMITS.MAX_BATCH_SIZE}`);
    return { valid: false, errors };
  }

  for (let i = 0; i < addresses.length; i++) {
    const addr = addresses[i];
    if (!addr) continue;
    const result = validateAddress(addr as string, `${fieldName}[${i}]`);
    if (!result.valid) {
      errors.push(...result.errors);
    } else if (result.sanitized) {
      sanitized.push(result.sanitized as Address);
    }
  }

  return { valid: errors.length === 0, errors, sanitized };
}

// ============================================================================
// Hash 验证
// ============================================================================

export function validateBytes32(hash: string, fieldName: string = 'hash'): ValidationResult {
  const errors: string[] = [];

  if (!hash || typeof hash !== 'string') {
    errors.push(`${fieldName} is required and must be a string`);
    return { valid: false, errors };
  }

  const trimmed = hash.trim();

  if (!isHex(trimmed)) {
    errors.push(`${fieldName} must be a valid hex string`);
    return { valid: false, errors };
  }

  if (trimmed.length !== 66) {
    errors.push(`${fieldName} must be exactly 32 bytes (66 characters including 0x)`);
    return { valid: false, errors };
  }

  return { valid: true, errors: [], sanitized: trimmed as Hash };
}

// ============================================================================
// 符号验证
// ============================================================================

const VALID_SYMBOL_PATTERN = /^[A-Z][A-Z0-9/]{0,31}$/;

export function validateSymbol(symbol: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!symbol || typeof symbol !== 'string') {
    errors.push('Symbol is required and must be a string');
    return { valid: false, errors };
  }

  const trimmed = symbol.trim().toUpperCase();

  if (trimmed.length === 0) {
    errors.push('Symbol cannot be empty');
    return { valid: false, errors };
  }

  if (trimmed.length > VALIDATION_LIMITS.MAX_SYMBOL_LENGTH) {
    errors.push(`Symbol exceeds maximum length of ${VALIDATION_LIMITS.MAX_SYMBOL_LENGTH}`);
    return { valid: false, errors };
  }

  if (!VALID_SYMBOL_PATTERN.test(trimmed)) {
    errors.push('Symbol must start with a letter and contain only alphanumeric characters or /');
    return { valid: false, errors };
  }

  // 检查潜在的注入模式
  const suspiciousPatterns = ['<', '>', '{', '}', ';', "'", '"', '\\', '\n', '\r'];
  for (const pattern of suspiciousPatterns) {
    if (trimmed.includes(pattern)) {
      errors.push(`Symbol contains suspicious character: ${pattern}`);
    }
  }

  return { valid: errors.length === 0, errors, warnings, sanitized: trimmed };
}

// ============================================================================
// 金额验证
// ============================================================================

export function validateBondAmount(
  amount: bigint | string,
  fieldName: string = 'amount',
): ValidationResult {
  const errors: string[] = [];
  let sanitized: bigint;

  if (typeof amount === 'string') {
    if (!/^\d+$/.test(amount)) {
      errors.push(`${fieldName} must be a valid number string`);
      return { valid: false, errors };
    }
    try {
      sanitized = BigInt(amount);
    } catch {
      errors.push(`${fieldName} is not a valid bigint`);
      return { valid: false, errors };
    }
  } else if (typeof amount === 'bigint') {
    sanitized = amount;
  } else {
    errors.push(`${fieldName} must be a bigint or string`);
    return { valid: false, errors };
  }

  if (sanitized < VALIDATION_LIMITS.MIN_BOND_AMOUNT) {
    errors.push(`${fieldName} is below minimum: ${VALIDATION_LIMITS.MIN_BOND_AMOUNT}`);
  }

  if (sanitized > VALIDATION_LIMITS.MAX_BOND_AMOUNT) {
    errors.push(`${fieldName} exceeds maximum: ${VALIDATION_LIMITS.MAX_BOND_AMOUNT}`);
  }

  return { valid: errors.length === 0, errors, sanitized };
}

// ============================================================================
// Claim 验证
// ============================================================================

const SUSPICIOUS_CLAIM_PATTERNS = [
  /<script/i,
  /javascript:/i,
  /on\w+=/i,
  /data:/i,
  /vbscript:/i,
];

export function validateClaim(claim: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!claim || typeof claim !== 'string') {
    errors.push('Claim is required and must be a string');
    return { valid: false, errors };
  }

  if (claim.length > VALIDATION_LIMITS.MAX_CLAIM_LENGTH) {
    errors.push(`Claim exceeds maximum length of ${VALIDATION_LIMITS.MAX_CLAIM_LENGTH}`);
    return { valid: false, errors };
  }

  // 检查可疑模式
  for (const pattern of SUSPICIOUS_CLAIM_PATTERNS) {
    if (pattern.test(claim)) {
      warnings.push(`Claim contains potentially suspicious pattern: ${pattern.source}`);
    }
  }

  // 检查空字节
  if (claim.includes('\0')) {
    errors.push('Claim contains null bytes');
  }

  return { valid: errors.length === 0, errors, warnings, sanitized: claim };
}

// ============================================================================
// 时间戳验证
// ============================================================================

export function validateTimestamp(
  timestamp: number,
  allowFuture: boolean = false,
): ValidationResult {
  const errors: string[] = [];
  const now = Math.floor(Date.now() / 1000);

  if (!Number.isFinite(timestamp) || timestamp < 0) {
    errors.push('Timestamp must be a valid positive number');
    return { valid: false, errors };
  }

  // 检查是否太旧（1970年之前）
  if (timestamp < 0) {
    errors.push('Timestamp cannot be negative');
  }

  // 检查是否在未来
  if (!allowFuture && timestamp > now + VALIDATION_LIMITS.MAX_TIMESTAMP_DRIFT) {
    errors.push('Timestamp is too far in the future');
  }

  // 检查是否太旧（超过1年）
  const oneYearAgo = now - 365 * 24 * 60 * 60;
  if (timestamp < oneYearAgo) {
    errors.push('Timestamp is too old (more than 1 year)');
  }

  return { valid: errors.length === 0, errors, sanitized: timestamp };
}

// ============================================================================
// Chain ID 验证
// ============================================================================

export function validateChainId(chainId: number): ValidationResult {
  const errors: string[] = [];

  if (!Number.isFinite(chainId) || chainId <= 0) {
    errors.push('Chain ID must be a positive number');
    return { valid: false, errors };
  }

  const validChainIds = VALIDATION_LIMITS.VALID_CHAIN_IDS as readonly number[];
  if (!validChainIds.includes(chainId as number)) {
    errors.push(`Chain ID ${chainId} is not supported`);
  }

  return { valid: errors.length === 0, errors, sanitized: chainId };
}

// ============================================================================
// 批量验证
// ============================================================================

export function validateBatch<T>(
  items: T[],
  validator: (item: T) => ValidationResult,
  maxBatchSize: number = VALIDATION_LIMITS.MAX_BATCH_SIZE,
): ValidationResult {
  const errors: string[] = [];
  const sanitized: unknown[] = [];

  if (!Array.isArray(items)) {
    errors.push('Input must be an array');
    return { valid: false, errors };
  }

  if (items.length > maxBatchSize) {
    errors.push(`Batch size exceeds maximum of ${maxBatchSize}`);
    return { valid: false, errors };
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item === undefined) continue;
    const result = validator(item);
    if (!result.valid) {
      errors.push(...result.errors.map((e) => `[${i}]: ${e}`));
    } else if (result.sanitized !== undefined) {
      sanitized.push(result.sanitized);
    }
  }

  return { valid: errors.length === 0, errors, sanitized };
}

// ============================================================================
// Extra Data 验证
// ============================================================================

export function validateExtraData(data: string): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'string') {
    return { valid: true, errors: [], sanitized: '0x' };
  }

  if (data.length > VALIDATION_LIMITS.MAX_EXTRA_DATA_LENGTH) {
    errors.push(`Extra data exceeds maximum length of ${VALIDATION_LIMITS.MAX_EXTRA_DATA_LENGTH}`);
    return { valid: false, errors };
  }

  if (!isHex(data)) {
    errors.push('Extra data must be a valid hex string');
    return { valid: false, errors };
  }

  return { valid: true, errors: [], sanitized: data as `0x${string}` };
}

// ============================================================================
// UMA 断言参数验证
// ============================================================================

export interface UMAAssertionParams {
  claim: string;
  currency: Address;
  bond: bigint;
  identifier?: Hash;
  escalateManually?: boolean;
  extraData?: string;
}

export function validateUMAAssertionParams(params: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!params || typeof params !== 'object') {
    errors.push('Params must be an object');
    return { valid: false, errors };
  }

  const p = params as Record<string, unknown>;

  // 验证 claim
  const claimResult = validateClaim(p.claim as string);
  if (!claimResult.valid) {
    errors.push(...claimResult.errors);
  }
  if (claimResult.warnings) {
    warnings.push(...claimResult.warnings);
  }

  // 验证 currency
  const currencyResult = validateAddress(p.currency as string, 'currency');
  if (!currencyResult.valid) {
    errors.push(...currencyResult.errors);
  }

  // 验证 bond
  const bondResult = validateBondAmount(p.bond as bigint, 'bond');
  if (!bondResult.valid) {
    errors.push(...bondResult.errors);
  }

  // 验证 identifier (可选)
  if (p.identifier !== undefined) {
    const identifierResult = validateBytes32(p.identifier as string, 'identifier');
    if (!identifierResult.valid) {
      errors.push(...identifierResult.errors);
    }
  }

  // 验证 extraData (可选)
  if (p.extraData !== undefined) {
    const extraDataResult = validateExtraData(p.extraData as string);
    if (!extraDataResult.valid) {
      errors.push(...extraDataResult.errors);
    }
  }

  // 验证 escalateManually
  if (p.escalateManually !== undefined && typeof p.escalateManually !== 'boolean') {
    errors.push('escalateManually must be a boolean');
  }

  const sanitized: UMAAssertionParams = {
    claim: (claimResult.sanitized as string) || '',
    currency: (currencyResult.sanitized as Address) || ('0x' as Address),
    bond: (bondResult.sanitized as bigint) || BigInt(0),
    identifier: p.identifier as Hash | undefined,
    escalateManually: p.escalateManually as boolean | undefined,
    extraData: (p.extraData as string) || '0x',
  };

  return { valid: errors.length === 0, errors, warnings, sanitized };
}
