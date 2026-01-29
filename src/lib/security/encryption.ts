import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

export interface EncryptedData {
  iv: string;
  authTag: string;
  encrypted: string;
}

function getEncryptionKey(): string {
  return process.env.INSIGHT_CONFIG_ENCRYPTION_KEY ?? '';
}

export function isEncryptionEnabled(): boolean {
  return getEncryptionKey().length >= 32;
}

function getKey(): Buffer {
  if (!isEncryptionEnabled()) {
    throw new Error('Encryption key not configured');
  }
  // Use first 32 bytes of key
  return Buffer.from(getEncryptionKey().slice(0, 32), 'utf8');
}

export function encrypt(text: string): EncryptedData | null {
  if (!text) return null;
  if (!isEncryptionEnabled()) {
    // Return plain text if encryption not configured
    return null;
  }

  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      encrypted,
    };
  } catch (error) {
    console.error('Encryption failed:', error);
    return null;
  }
}

export function decrypt(data: EncryptedData | string | null | undefined): string | null {
  if (!data) return null;

  // If it's a plain string, return as-is (backward compatibility)
  if (typeof data === 'string') {
    return data;
  }

  if (!isEncryptionEnabled()) {
    console.warn('Decryption attempted but encryption key not configured');
    return null;
  }

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(data.iv, 'hex'));

    decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));

    let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
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

export function redactSensitiveData(
  data: Record<string, unknown>,
  fields: string[],
): Record<string, unknown> {
  const result = { ...data };
  for (const field of fields) {
    if (field in result && typeof result[field] === 'string') {
      const value = result[field] as string;
      if (value) {
        // Show first 8 chars and last 4 chars, mask the rest
        if (value.length > 12) {
          result[field] = `${value.slice(0, 8)}...${value.slice(-4)}`;
        } else {
          result[field] = '***';
        }
      }
    }
  }
  return result;
}

export function maskInLog(value: string | undefined | null): string {
  if (!value) return '';
  if (value.length <= 8) return '***';
  return `${value.slice(0, 4)}***${value.slice(-4)}`;
}
