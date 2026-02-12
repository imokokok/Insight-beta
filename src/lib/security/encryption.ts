import crypto from 'node:crypto';

import { logger } from '@/shared/logger';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

interface EncryptedData {
  iv: string;
  authTag: string;
  encrypted: string;
  salt: string;
  version: number;
}

function getEncryptionKey(): string {
  return process.env.INSIGHT_CONFIG_ENCRYPTION_KEY ?? '';
}

/**
 * 检查加密是否启用
 * 使用 Buffer.byteLength 确保正确处理多字节字符
 */
export function isEncryptionEnabled(): boolean {
  const key = getEncryptionKey();
  return Buffer.byteLength(key, 'utf8') >= 32;
}

/**
 * 使用 PBKDF2 派生加密密钥
 * 这比简单截断密钥更安全
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');
}

function getKey(salt: Buffer): Buffer {
  if (!isEncryptionEnabled()) {
    throw new Error('Encryption key not configured');
  }
  return deriveKey(getEncryptionKey(), salt);
}

export function encrypt(text: string): EncryptedData | null {
  if (!text) return null;
  if (!isEncryptionEnabled()) {
    return null;
  }

  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(salt), iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      encrypted,
      salt: salt.toString('hex'),
      version: 2, // 标记为新版本加密格式
    };
  } catch (error) {
    logger.error('Encryption failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * 解密数据
 * 支持新版本(v2)和旧版本(v1)加密格式
 */
export function decrypt(data: EncryptedData | string | null | undefined): string | null {
  if (!data) return null;

  // If it's a plain string, return as-is (backward compatibility)
  if (typeof data === 'string') {
    return data;
  }

  if (!isEncryptionEnabled()) {
    logger.warn('Decryption attempted but encryption key not configured');
    return null;
  }

  try {
    // 处理新版本(v2)加密格式
    if (data.version === 2 && data.salt) {
      const salt = Buffer.from(data.salt, 'hex');
      const decipher = crypto.createDecipheriv(
        ALGORITHM,
        getKey(salt),
        Buffer.from(data.iv, 'hex'),
      );

      decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));

      let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    }

    // 处理旧版本(v1)加密格式（向后兼容）
    const key = Buffer.from(getEncryptionKey().slice(0, 32), 'utf8');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(data.iv, 'hex'));

    decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));

    let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    logger.error('Decryption failed', {
      error: error instanceof Error ? error.message : String(error),
      hasVersion: 'version' in (data || {}),
      version: (data as EncryptedData)?.version,
    });
    return null;
  }
}

export function encryptString(text: string): string | null {
  const encrypted = encrypt(text);
  if (!encrypted) return null;
  return JSON.stringify(encrypted);
}

export function decryptString(jsonString: string | null | undefined): string | null {
  if (!jsonString) return null;

  // Try to parse as JSON (encrypted format)
  try {
    const data = JSON.parse(jsonString) as EncryptedData;
    if (data.iv && data.authTag && data.encrypted) {
      return decrypt(data);
    }
  } catch {
    // Not valid JSON, treat as plain text
  }

  return jsonString;
}

/**
 * 脱敏敏感数据
 */
export function redactSensitiveData<T extends Record<string, unknown>>(
  data: T,
  sensitiveFields: string[]
): T {
  const result = { ...data } as Record<string, unknown>;

  for (const field of sensitiveFields) {
    const value = result[field];
    if (typeof value === 'string') {
      result[field] = maskInLog(value);
    }
  }

  return result as T;
}

/**
 * 在日志中掩码字符串
 */
export function maskInLog(value: string | null | undefined): string {
  if (!value) return '';
  if (typeof value !== 'string') return '';

  const length = value.length;
  if (length <= 8) {
    return '***';
  }

  // Show first 4 and last 4 characters
  return `${value.slice(0, 4)}***${value.slice(-4)}`;
}

/**
 * 获取加密状态
 */
export function getEncryptionStatus(): {
  enabled: boolean;
  keyByteLength: number;
  algorithm?: string;
  version?: number;
} {
  const key = getEncryptionKey();
  const keyByteLength = Buffer.byteLength(key, 'utf8');

  return {
    enabled: isEncryptionEnabled(),
    keyByteLength,
    algorithm: isEncryptionEnabled() ? ALGORITHM : undefined,
    version: 2,
  };
}




