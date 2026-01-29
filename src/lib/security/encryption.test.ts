import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  encrypt,
  decrypt,
  encryptString,
  decryptString,
  redactSensitiveData,
  maskInLog,
  isEncryptionEnabled,
} from './encryption';

// Save original env
const originalEnv = process.env.INSIGHT_CONFIG_ENCRYPTION_KEY;

describe('Encryption', () => {
  beforeEach(() => {
    // Set a valid encryption key for tests
    process.env.INSIGHT_CONFIG_ENCRYPTION_KEY = 'a'.repeat(32);
  });

  afterEach(() => {
    // Restore original env
    process.env.INSIGHT_CONFIG_ENCRYPTION_KEY = originalEnv;
  });

  describe('isEncryptionEnabled', () => {
    it('returns true when key is set', () => {
      expect(isEncryptionEnabled()).toBe(true);
    });

    it('returns false when key is not set', () => {
      delete process.env.INSIGHT_CONFIG_ENCRYPTION_KEY;
      expect(isEncryptionEnabled()).toBe(false);
    });

    it('returns false when key is too short', () => {
      process.env.INSIGHT_CONFIG_ENCRYPTION_KEY = 'short';
      expect(isEncryptionEnabled()).toBe(false);
    });
  });

  describe('encrypt/decrypt', () => {
    it('encrypts and decrypts text correctly', () => {
      const originalText = 'https://rpc.example.com';

      const encrypted = encrypt(originalText);
      expect(encrypted).toBeTruthy();
      expect(encrypted?.iv).toBeTruthy();
      expect(encrypted?.authTag).toBeTruthy();
      expect(encrypted?.encrypted).toBeTruthy();
      expect(encrypted?.encrypted).not.toBe(originalText);

      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(originalText);
    });

    it('returns null for empty text', () => {
      expect(encrypt('')).toBe(null);
      expect(decrypt(null)).toBe(null);
      expect(decrypt(undefined)).toBe(null);
    });

    it('handles encryption failure gracefully', () => {
      // Invalid key
      process.env.INSIGHT_CONFIG_ENCRYPTION_KEY = '';
      const result = encrypt('test');
      expect(result).toBe(null);
    });

    it('handles decryption failure gracefully', () => {
      const result = decrypt({ iv: 'invalid', authTag: 'invalid', encrypted: 'invalid' });
      expect(result).toBe(null);
    });

    it('returns plain string when decryption key not configured', () => {
      delete process.env.INSIGHT_CONFIG_ENCRYPTION_KEY;
      const result = decrypt('plain text');
      expect(result).toBe('plain text');
    });
  });

  describe('encryptString/decryptString', () => {
    it('encrypts and decrypts string correctly', () => {
      const originalText = 'https://rpc.example.com';

      const encryptedString = encryptString(originalText);
      expect(encryptedString).toBeTruthy();
      expect(encryptedString).not.toBe(originalText);

      const decrypted = decryptString(encryptedString);
      expect(decrypted).toBe(originalText);
    });

    it('handles plain text for backward compatibility', () => {
      const plainText = 'https://rpc.example.com';

      const result = decryptString(plainText);
      expect(result).toBe(plainText);
    });

    it('returns null for invalid JSON', () => {
      const result = decryptString('invalid json');
      expect(result).toBe('invalid json'); // Falls back to plain text
    });

    it('returns null for empty input', () => {
      expect(encryptString('')).toBe(null);
      expect(decryptString('')).toBe(null);
      expect(decryptString(null)).toBe(null);
    });
  });

  describe('redactSensitiveData', () => {
    it('redacts sensitive fields correctly', () => {
      const data = {
        rpcUrl: 'https://rpc.example.com',
        contractAddress: '0x1234567890abcdef',
        adminToken: 'secret-token-12345',
        chain: 'Polygon',
      };

      const result = redactSensitiveData(data, ['rpcUrl', 'adminToken']);

      expect(result.rpcUrl).toBe('https://....com');
      expect(result.adminToken).toBe('secret-t...2345');
      expect(result.contractAddress).toBe('0x1234567890abcdef'); // Not redacted
      expect(result.chain).toBe('Polygon'); // Not redacted
    });

    it('handles short strings', () => {
      const data = {
        rpcUrl: 'short',
        adminToken: 'tiny',
      };

      const result = redactSensitiveData(data, ['rpcUrl', 'adminToken']);

      expect(result.rpcUrl).toBe('***');
      expect(result.adminToken).toBe('***');
    });

    it('handles empty or non-string values', () => {
      const data = {
        rpcUrl: '',
        adminToken: null,
        contractAddress: undefined,
        chain: 123,
      };

      const result = redactSensitiveData(data, [
        'rpcUrl',
        'adminToken',
        'contractAddress',
        'chain',
      ]);

      expect(result.rpcUrl).toBe(''); // Empty string remains empty
      expect(result.adminToken).toBe(null); // Non-string not processed
      expect(result.contractAddress).toBe(undefined); // Non-string not processed
      expect(result.chain).toBe(123); // Non-string not processed
    });

    it('does not modify original object', () => {
      const data = {
        rpcUrl: 'https://rpc.example.com',
        chain: 'Polygon',
      };

      const originalData = { ...data };
      redactSensitiveData(data, ['rpcUrl']);

      expect(data).toEqual(originalData);
    });
  });

  describe('maskInLog', () => {
    it('masks long strings correctly', () => {
      expect(maskInLog('https://rpc.example.com')).toBe('http***.com');
      expect(maskInLog('0x1234567890abcdef')).toBe('0x12***cdef');
    });

    it('handles short strings', () => {
      expect(maskInLog('short')).toBe('***');
      expect(maskInLog('tiny')).toBe('***');
    });

    it('handles empty or null values', () => {
      expect(maskInLog('')).toBe('');
      expect(maskInLog(null)).toBe('');
      expect(maskInLog(undefined)).toBe('');
    });
  });
});
