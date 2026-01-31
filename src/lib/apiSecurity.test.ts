import { describe, it, expect, afterEach, vi } from 'vitest';

vi.stubEnv('INSIGHT_API_SECRET', 'test-secret-key-for-testing-purposes');
vi.stubEnv('NODE_ENV', 'test');

const {
  generateNonce,
  generateTimestamp,
  signRequest,
  verifySignature,
  verifyNonce,
  hashSensitiveData,
  generateApiKey,
  validateApiKey,
} = await import('./api/apiSecurity');

describe('apiSecurity', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateNonce', () => {
    it('generates unique nonces', () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();
      expect(nonce1).toHaveLength(32);
      expect(nonce2).toHaveLength(32);
      expect(nonce1).not.toBe(nonce2);
    });

    it('only contains hex characters', () => {
      const nonce = generateNonce();
      expect(nonce).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('generateTimestamp', () => {
    it('returns current timestamp in milliseconds', () => {
      const before = Date.now();
      const timestamp = generateTimestamp();
      const after = Date.now();
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('signRequest and verifySignature', () => {
    it('signs and verifies a valid request', () => {
      const method = 'GET';
      const path = '/api/test';
      const body = '';
      const timestamp = Date.now();
      const nonce = generateNonce();

      const signature = signRequest(method, path, body, timestamp, nonce);
      expect(typeof signature).toBe('string');
      expect(signature).toHaveLength(64);

      const isValid = verifySignature(method, path, body, timestamp, nonce, signature);
      expect(isValid).toBe(true);
    });

    it('rejects expired requests', () => {
      const method = 'GET';
      const path = '/api/test';
      const body = '';
      const oldTimestamp = Date.now() - 10 * 60 * 1000;
      const nonce = generateNonce();

      const signature = signRequest(method, path, body, oldTimestamp, nonce);
      const isValid = verifySignature(method, path, body, oldTimestamp, nonce, signature);
      expect(isValid).toBe(false);
    });

    it('rejects invalid signatures', () => {
      const method = 'GET';
      const path = '/api/test';
      const body = '';
      const timestamp = Date.now();
      const nonce = generateNonce();

      const isValid = verifySignature(
        method,
        path,
        body,
        timestamp,
        nonce,
        'invalid_signature_value_0000000000000000000000000000000000',
      );
      expect(isValid).toBe(false);
    });

    it('rejects tampered request data', () => {
      const method = 'GET';
      const path = '/api/test';
      const originalBody = '{"amount": 100}';
      const tamperedBody = '{"amount": 1000}';
      const timestamp = Date.now();
      const nonce = generateNonce();

      const signature = signRequest(method, path, originalBody, timestamp, nonce);
      const isValid = verifySignature(method, path, tamperedBody, timestamp, nonce, signature);
      expect(isValid).toBe(false);
    });
  });

  describe('verifyNonce', () => {
    it('accepts new nonces', () => {
      const nonce = generateNonce();
      const isValid = verifyNonce(nonce);
      expect(isValid).toBe(true);
    });

    it('rejects reused nonces', () => {
      const nonce = generateNonce();
      verifyNonce(nonce);
      const isReused = verifyNonce(nonce);
      expect(isReused).toBe(false);
    });
  });

  describe('hashSensitiveData', () => {
    it('hashes data consistently', () => {
      const data = 'sensitive-data';
      const hash1 = hashSensitiveData(data);
      const hash2 = hashSensitiveData(data);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('produces different hashes for different data', () => {
      const hash1 = hashSensitiveData('data1');
      const hash2 = hashSensitiveData('data2');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateApiKey and validateApiKey', () => {
    it('generates valid API key pair', () => {
      const { key, secret } = generateApiKey();
      expect(key).toMatch(/^oracle_monitor_[a-f0-9]+$/);
      expect(secret).toHaveLength(64);
    });

    it('rejects incorrect API key', () => {
      const { key } = generateApiKey();
      const isValid = validateApiKey('wrong_secret', key);
      expect(isValid).toBe(false);
    });

    it('rejects empty input', () => {
      const { key } = generateApiKey();
      const isValid = validateApiKey('', key);
      expect(isValid).toBe(false);
    });
  });
});
