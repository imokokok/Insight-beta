import crypto from 'crypto';
import { logger } from '@/lib/logger';

const API_SECRET = (() => {
  const secret = process.env.INSIGHT_API_SECRET;
  if (!secret || secret.trim() === '') {
    throw new Error(
      'INSIGHT_API_SECRET environment variable is required. ' +
        'Do not use the default development secret in production.',
    );
  }
  if (
    secret === 'default-dev-secret-change-in-production' &&
    process.env.NODE_ENV === 'production'
  ) {
    throw new Error(
      'INSIGHT_API_SECRET cannot be the default development secret in production. ' +
        'Please set a strong, random secret.',
    );
  }
  return secret.trim();
})();

export interface SignedRequest {
  signature: string;
  timestamp: number;
  nonce: string;
}

export function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function generateTimestamp(): number {
  return Date.now();
}

export function signRequest(
  method: string,
  path: string,
  body: string,
  timestamp: number,
  nonce: string,
): string {
  const payload = `${method}:${path}:${timestamp}:${nonce}:${body}`;
  return crypto.createHmac('sha256', API_SECRET).update(payload).digest('hex');
}

export function verifySignature(
  method: string,
  path: string,
  body: string,
  timestamp: number,
  nonce: string,
  signature: string,
): boolean {
  const maxAge = 5 * 60 * 1000;
  const clockSkew = 60 * 1000;
  const now = Date.now();
  const age = now - timestamp;

  if (age > maxAge || age < -clockSkew) {
    logger.warn('Request timestamp invalid', { age, maxAge, clockSkew });
    return false;
  }

  const expectedSignature = signRequest(method, path, body, timestamp, nonce);
  const signatureBuffer = (() => {
    try {
      return Uint8Array.from(Buffer.from(signature, 'hex'));
    } catch {
      return null;
    }
  })();
  const expectedBuffer = Uint8Array.from(Buffer.from(expectedSignature, 'hex'));

  if (!signatureBuffer || signatureBuffer.length !== expectedBuffer.length) {
    logger.warn('Invalid signature format or length', { method, path });
    return false;
  }

  const isValid = crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

  if (!isValid) {
    logger.warn('Invalid signature detected', { method, path });
  }

  return isValid;
}

const nonceCache = new Map<string, number>();

const NONCE_CACHE_MAX_SIZE = 10000;
const NONCE_CACHE_TTL_MS = 15 * 60 * 1000;

function cleanupNonceCache() {
  const now = Date.now();
  let cleaned = 0;
  const maxToClean = 5000;

  for (const [nonce, addedAt] of nonceCache.entries()) {
    if (now - addedAt > NONCE_CACHE_TTL_MS) {
      nonceCache.delete(nonce);
      cleaned++;
      if (cleaned >= maxToClean) break;
    }
  }
}

if (nonceCache.size > NONCE_CACHE_MAX_SIZE) {
  cleanupNonceCache();
}

// 存储 interval ID 以便清理
let nonceCacheInterval: NodeJS.Timeout | null = null;

export function startNonceCacheCleanup(): void {
  if (nonceCacheInterval) return;
  nonceCacheInterval = setInterval(() => {
    cleanupNonceCache();
    if (nonceCache.size > NONCE_CACHE_MAX_SIZE) {
      const entriesToDelete = Array.from(nonceCache.entries())
        .sort(([, a], [, b]) => a - b)
        .slice(0, Math.floor(NONCE_CACHE_MAX_SIZE * 0.3))
        .map(([key]) => key);
      for (const key of entriesToDelete) {
        nonceCache.delete(key);
      }
    }
  }, 60 * 1000);
}

export function stopNonceCacheCleanup(): void {
  if (nonceCacheInterval) {
    clearInterval(nonceCacheInterval);
    nonceCacheInterval = null;
  }
}

// 自动启动清理
startNonceCacheCleanup();

export function verifyNonce(nonce: string): boolean {
  if (nonceCache.has(nonce)) {
    logger.warn('Nonce reuse detected', { nonce });
    return false;
  }

  nonceCache.set(nonce, Date.now());
  return true;
}

export function hashSensitiveData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function encryptData(data: string): string {
  const ivBuffer = crypto.randomBytes(16);
  const iv = Uint8Array.from(ivBuffer);
  const key = Uint8Array.from(crypto.scryptSync(API_SECRET, 'salt', 32));
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([
    Uint8Array.from(cipher.update(data, 'utf8')),
    Uint8Array.from(cipher.final()),
  ]);
  const authTag = cipher.getAuthTag();

  return `${ivBuffer.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptData(encryptedData: string): string {
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const ivHex = parts[0];
  const authTagHex = parts[1];
  const encryptedHex = parts[2];

  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = Uint8Array.from(Buffer.from(ivHex, 'hex'));
  const authTag = Uint8Array.from(Buffer.from(authTagHex, 'hex'));
  const encrypted = Buffer.from(encryptedHex, 'hex');

  const key = Uint8Array.from(crypto.scryptSync(API_SECRET, 'salt', 32));
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

export function generateApiKey(): { key: string; secret: string } {
  const newKey = `oracle_monitor_${crypto.randomBytes(8).toString('hex')}`;
  const secret = crypto.randomBytes(32).toString('hex');

  const hashedSecret = crypto.createHash('sha256').update(secret).digest('hex');

  return { key: newKey, secret: hashedSecret };
}

export function validateApiKey(input: string, storedHash: string): boolean {
  const inputHash = crypto.createHash('sha256').update(input).digest('hex');

  const inputBuffer = Uint8Array.from(Buffer.from(inputHash));
  const storedBuffer = Uint8Array.from(Buffer.from(storedHash));

  if (inputBuffer.length !== storedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(inputBuffer, storedBuffer);
}

export const apiSecurity = {
  generateNonce,
  generateTimestamp,
  signRequest,
  verifySignature,
  verifyNonce,
  hashSensitiveData,
  encryptData,
  decryptData,
  generateApiKey,
  validateApiKey,
};

export default apiSecurity;
