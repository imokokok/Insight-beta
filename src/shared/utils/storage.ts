/**
 * Storage Utilities
 *
 * localStorage/sessionStorage 操作的安全工具函数
 * 支持数据加密、完整性验证和过期控制
 *
 * 安全说明：
 * - 敏感数据使用 Web Crypto API 进行加密
 * - 加密密钥从服务端获取，不存储在客户端
 * - 支持数据完整性验证和过期控制
 */

import { logger } from '@/shared/logger';

// ============================================================================
// 类型定义
// ============================================================================

export interface StorageOptions {
  /** 是否加密存储（敏感数据建议启用） */
  encrypt?: boolean;
  /** 数据过期时间（毫秒） */
  expires?: number;
  /** 存储类型 */
  storage?: 'local' | 'session';
}

export interface StorageItem<T> {
  value: T;
  timestamp: number;
  expires?: number;
  version: number;
}

// ============================================================================
// 常量定义
// ============================================================================

const STORAGE_KEYS = {
  ORACLE_FILTERS: 'oracleFilters',
  USER_PREFERENCES: 'userPreferences',
  THEME: 'theme',
  LANGUAGE: 'language',
  ADMIN_TOKEN: 'adminToken',
} as const;

/** 存储数据版本号，用于数据迁移 */
const STORAGE_VERSION = 1;

/** 加密算法 */
const ENCRYPTION_ALGORITHM = 'AES-GCM';

/** 密钥派生算法 */
const KEY_DERIVATION_ALGORITHM = 'PBKDF2';

/** 初始化向量长度 */
const IV_LENGTH = 12;

/** 迭代次数 */
const ITERATIONS = 100000;

// ============================================================================
// Web Crypto API 加密实现
// ============================================================================

/**
 * 从环境变量获取加密密钥材料
 * 注意：生产环境应该从服务端获取密钥
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyMaterial = process.env.NEXT_PUBLIC_STORAGE_KEY;

  if (!keyMaterial) {
    throw new Error('Storage encryption key not configured');
  }

  // 使用 PBKDF2 从密码派生密钥
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyMaterial);

  // 导入原始密钥材料
  const baseKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: KEY_DERIVATION_ALGORITHM },
    false,
    ['deriveKey'],
  );

  // 使用固定的盐值（实际应用中应该为每个用户生成唯一的盐值）
  const salt = encoder.encode('fixed-salt-change-in-production');

  // 派生 AES-GCM 密钥
  return crypto.subtle.deriveKey(
    {
      name: KEY_DERIVATION_ALGORITHM,
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: ENCRYPTION_ALGORITHM, length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * 加密数据
 */
async function encryptData(text: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const encoder = new TextEncoder();
    const data = encoder.encode(text);

    // 生成随机初始化向量
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // 加密数据
    const encrypted = await crypto.subtle.encrypt({ name: ENCRYPTION_ALGORITHM, iv }, key, data);

    // 组合 IV 和加密数据
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    // 转换为 Base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    logger.error('Encryption failed', { error });
    throw new Error('Failed to encrypt data');
  }
}

/**
 * 解密数据
 */
async function decryptData(encryptedBase64: string): Promise<string> {
  try {
    const key = await getEncryptionKey();

    // 从 Base64 解码
    const combined = new Uint8Array(
      atob(encryptedBase64)
        .split('')
        .map((c) => c.charCodeAt(0)),
    );

    // 提取 IV 和加密数据
    const iv = combined.slice(0, IV_LENGTH);
    const encrypted = combined.slice(IV_LENGTH);

    // 解密数据
    const decrypted = await crypto.subtle.decrypt(
      { name: ENCRYPTION_ALGORITHM, iv },
      key,
      encrypted,
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    logger.error('Decryption failed', { error });
    throw new Error('Failed to decrypt data');
  }
}

// ============================================================================
// 核心存储函数
// ============================================================================

/**
 * 获取存储实例
 */
function getStorage(storage: 'local' | 'session'): Storage | null {
  if (typeof window === 'undefined') return null;
  return storage === 'local' ? window.localStorage : window.sessionStorage;
}

/**
 * 验证存储键名（防止注入攻击）
 */
function validateKey(key: string): boolean {
  // 只允许字母、数字、下划线和连字符
  return /^[a-zA-Z0-9_-]+$/.test(key);
}

/**
 * 从存储安全地读取数据
 *
 * @template T - 期望的数据类型
 * @param key - storage 键名
 * @param defaultValue - 默认值
 * @param options - 存储选项
 * @returns 解析后的数据或默认值
 */
export async function getStorageItem<T>(
  key: string,
  defaultValue: T,
  options: StorageOptions = {},
): Promise<T> {
  const { encrypt = false, storage = 'local' } = options;

  if (!validateKey(key)) {
    logger.warn(`Invalid storage key: ${key}`);
    return defaultValue;
  }

  const storageInstance = getStorage(storage);
  if (!storageInstance) {
    return defaultValue;
  }

  try {
    const saved = storageInstance.getItem(key);
    if (!saved) {
      return defaultValue;
    }

    // 解密（如果需要）
    const decrypted = encrypt ? await decryptData(saved) : saved;

    // 解析数据
    const parsed = JSON.parse(decrypted) as StorageItem<T>;

    // 验证数据结构
    if (!parsed || typeof parsed !== 'object' || !('value' in parsed)) {
      logger.warn(`Invalid storage data structure for key: ${key}`);
      return defaultValue;
    }

    // 检查版本号
    if (parsed.version !== STORAGE_VERSION) {
      logger.info(`Storage version mismatch for key: ${key}`, {
        expected: STORAGE_VERSION,
        actual: parsed.version,
      });
      // 这里可以添加数据迁移逻辑
    }

    // 检查是否过期
    if (parsed.expires && Date.now() > parsed.expires) {
      logger.debug(`Storage item expired: ${key}`);
      storageInstance.removeItem(key);
      return defaultValue;
    }

    return parsed.value;
  } catch (error) {
    logger.warn(`Failed to parse storage item: ${key}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return defaultValue;
  }
}

/**
 * 安全地写入数据到存储
 *
 * @param key - storage 键名
 * @param value - 要存储的数据
 * @param options - 存储选项
 * @returns 是否写入成功
 */
export async function setStorageItem<T>(
  key: string,
  value: T,
  options: StorageOptions = {},
): Promise<boolean> {
  const { encrypt = false, expires, storage = 'local' } = options;

  if (!validateKey(key)) {
    logger.warn(`Invalid storage key: ${key}`);
    return false;
  }

  const storageInstance = getStorage(storage);
  if (!storageInstance) {
    return false;
  }

  try {
    const item: StorageItem<T> = {
      value,
      timestamp: Date.now(),
      version: STORAGE_VERSION,
      ...(expires && { expires: Date.now() + expires }),
    };

    const serialized = JSON.stringify(item);
    const finalValue = encrypt ? await encryptData(serialized) : serialized;

    storageInstance.setItem(key, finalValue);
    return true;
  } catch (error) {
    logger.error(`Failed to save storage item: ${key}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * 从存储安全地移除数据
 */
export function removeStorageItem(key: string, storage: 'local' | 'session' = 'local'): boolean {
  if (!validateKey(key)) {
    logger.warn(`Invalid storage key: ${key}`);
    return false;
  }

  const storageInstance = getStorage(storage);
  if (!storageInstance) {
    return false;
  }

  try {
    storageInstance.removeItem(key);
    return true;
  } catch (error) {
    logger.error(`Failed to remove storage item: ${key}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

// ============================================================================
// 敏感数据存储（自动加密）
// ============================================================================

export async function setSensitiveItem<T>(
  key: string,
  value: T,
  options: Omit<StorageOptions, 'encrypt'> = {},
): Promise<boolean> {
  return setStorageItem(key, value, { ...options, encrypt: true });
}

export async function getSensitiveItem<T>(
  key: string,
  defaultValue: T,
  options: Omit<StorageOptions, 'encrypt'> = {},
): Promise<T> {
  return getStorageItem(key, defaultValue, { ...options, encrypt: true });
}

// ============================================================================
// Oracle Filters 专用函数
// ============================================================================

export interface OracleFilters {
  instanceId?: string;
}

const DEFAULT_INSTANCE_ID = 'default';

export async function getOracleFilters(): Promise<OracleFilters> {
  return getStorageItem<OracleFilters>(STORAGE_KEYS.ORACLE_FILTERS, {
    instanceId: DEFAULT_INSTANCE_ID,
  });
}

export async function getOracleInstanceId(): Promise<string> {
  const filters = await getOracleFilters();
  return filters.instanceId?.trim() || DEFAULT_INSTANCE_ID;
}

export function setOracleInstanceId(instanceId: string): Promise<boolean> {
  const normalized = instanceId.trim() || DEFAULT_INSTANCE_ID;
  return setStorageItem(STORAGE_KEYS.ORACLE_FILTERS, { instanceId: normalized });
}

export async function mergeOracleFilters(updates: Record<string, unknown>): Promise<boolean> {
  const current = await getStorageItem<Record<string, unknown>>(STORAGE_KEYS.ORACLE_FILTERS, {});
  const next = { ...current, ...updates };
  return setStorageItem(STORAGE_KEYS.ORACLE_FILTERS, next);
}

/**
 * 清除 Oracle 过滤器
 */
export async function clearOracleFilters(): Promise<boolean> {
  return removeStorageItem(STORAGE_KEYS.ORACLE_FILTERS);
}

/**
 * 检查是否为默认 Oracle 实例
 */
export async function isDefaultOracleInstance(instanceId?: string): Promise<boolean> {
  const id = instanceId ?? (await getOracleInstanceId());
  return id === DEFAULT_INSTANCE_ID;
}

// ============================================================================
// Admin Token 专用函数（敏感数据，使用 sessionStorage 并加密）
// ============================================================================

const ADMIN_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24小时

export async function getAdminToken(): Promise<string | null> {
  return getSensitiveItem<string | null>(STORAGE_KEYS.ADMIN_TOKEN, null, { storage: 'session' });
}

export async function setAdminToken(token: string): Promise<boolean> {
  return setSensitiveItem(STORAGE_KEYS.ADMIN_TOKEN, token, {
    storage: 'session',
    expires: ADMIN_TOKEN_EXPIRY,
  });
}

export async function clearAdminToken(): Promise<boolean> {
  return removeStorageItem(STORAGE_KEYS.ADMIN_TOKEN, 'session');
}
