import { describe, it, expect } from 'vitest';
import { normalizeWalletError } from './walletErrors';

describe('Wallet Error Normalization', () => {
  describe('User Rejected Errors', () => {
    it('should identify user rejected by code 4001', () => {
      const error = { code: 4001, message: 'User rejected request' };
      const result = normalizeWalletError(error);

      expect(result.kind).toBe('USER_REJECTED');
      expect(result.severity).toBe('info');
      expect(result.userMessage).toContain('rejected');
    });

    it('should identify user rejected by message content', () => {
      const error = new Error('Transaction was rejected by user');
      const result = normalizeWalletError(error);

      expect(result.kind).toBe('USER_REJECTED');
      expect(result.recoveryAction).toContain('review');
    });
  });

  describe('Insufficient Funds Errors', () => {
    it('should identify insufficient funds error', () => {
      const error = new Error('insufficient funds for gas');
      const result = normalizeWalletError(error);

      expect(result.kind).toBe('INSUFFICIENT_FUNDS');
      expect(result.severity).toBe('error');
      expect(result.userMessage).toContain('Insufficient balance');
    });

    it('should identify not enough ether error', () => {
      const error = new Error('not enough ether to cover gas');
      const result = normalizeWalletError(error);

      expect(result.kind).toBe('INSUFFICIENT_FUNDS');
    });
  });

  describe('Network Errors', () => {
    it('should identify network connection errors', () => {
      const error = new Error('Network connection failed');
      const result = normalizeWalletError(error);

      expect(result.kind).toBe('NETWORK_ERROR');
      expect(result.severity).toBe('warning');
      expect(result.userMessage).toContain('Network connection error');
    });

    it('should identify fetch errors', () => {
      const error = new Error('fetch error occurred');
      const result = normalizeWalletError(error);

      expect(result.kind).toBe('NETWORK_ERROR');
    });
  });

  describe('Timeout Errors', () => {
    it('should identify timeout errors', () => {
      const error = new Error('Request timed out after 30000ms');
      const result = normalizeWalletError(error);

      expect(result.kind).toBe('TIMEOUT');
      expect(result.severity).toBe('warning');
      expect(result.userMessage).toContain('timed out');
    });

    it('should identify deadline exceeded errors', () => {
      const error = new Error('Deadline exceeded');
      const result = normalizeWalletError(error);

      expect(result.kind).toBe('TIMEOUT');
    });
  });

  describe('Unknown Errors', () => {
    it('should handle completely unknown errors', () => {
      const error = new Error('Some cryptic error message');
      const result = normalizeWalletError(error);

      expect(result.kind).toBe('UNKNOWN');
      expect(result.severity).toBe('error');
      expect(result.userMessage).toContain('unexpected');
    });

    it('should handle non-Error objects', () => {
      const error = null;
      const result = normalizeWalletError(error);

      expect(result.kind).toBe('UNKNOWN');
      expect(result.severity).toBe('error');
    });
  });
});

describe('Error Recovery Actions', () => {
  it('should provide recovery actions for CHAIN_NOT_ADDED', () => {
    const error = { code: 4902, message: 'Unrecognized chain ID' };
    const result = normalizeWalletError(error);

    expect(result.kind).toBe('CHAIN_NOT_ADDED');
    expect(result.recoveryAction).toContain('Add Network');
    expect(result.documentationLink).toBeDefined();
  });

  it('should provide recovery actions for WRONG_NETWORK', () => {
    const error = new Error('Wrong network detected');
    const result = normalizeWalletError(error);

    expect(result.kind).toBe('WRONG_NETWORK');
    expect(result.recoveryAction).toContain('Switch Network');
  });

  it('should provide recovery actions for REQUEST_PENDING', () => {
    const error = { code: -32002, message: 'Request already pending' };
    const result = normalizeWalletError(error);

    expect(result.kind).toBe('REQUEST_PENDING');
    expect(result.recoveryAction).toContain('wait');
  });
});

describe('Error Severity Levels', () => {
  it('should assign critical severity to contract not found errors', () => {
    const error = new Error('Contract not found at address');
    const result = normalizeWalletError(error);

    expect(result.kind).toBe('CONTRACT_NOT_FOUND');
    expect(result.severity).toBe('error');
  });

  it('should assign warning severity to gas estimation errors', () => {
    const error = new Error('Gas estimation failed');
    const result = normalizeWalletError(error);

    expect(result.kind).toBe('GAS_ESTIMATION_FAILED');
    expect(result.severity).toBe('warning');
  });

  it('should assign error severity to transaction failed errors', () => {
    const error = new Error('Execution reverted: Invalid state');
    const result = normalizeWalletError(error);

    expect(result.kind).toBe('TRANSACTION_FAILED');
    expect(result.severity).toBe('error');
    expect(result.userMessage.toLowerCase()).toContain('invalid state');
  });
});

describe('Edge Cases', () => {
  it('should handle objects with no message property', () => {
    const error = { code: 9999 };
    const result = normalizeWalletError(error);

    expect(result.kind).toBe('UNKNOWN');
  });

  it('should handle objects with undefined code', () => {
    const error = { code: undefined, message: 'Some error' };
    const result = normalizeWalletError(error);

    expect(result.rawMessage).toBe('Some error');
  });

  it('should handle empty string messages', () => {
    const error = new Error('');
    const result = normalizeWalletError(error);

    expect(result.kind).toBe('UNKNOWN');
  });

  it('should handle very long error messages', () => {
    const longMessage = 'a'.repeat(10000);
    const error = new Error(longMessage);
    const result = normalizeWalletError(error);

    expect(result.rawMessage).toHaveLength(10000);
  });

  it('should handle error objects with circular references', () => {
    const circularError: Record<string, unknown> = { message: 'Test error' };
    circularError.self = circularError;

    const result = normalizeWalletError(circularError as unknown as Error);

    expect(result.kind).toBe('UNKNOWN');
    expect(result.userMessage).toBeDefined();
  });
});

describe('Error Kind Classification', () => {
  it('should correctly classify WALLET_NOT_FOUND', () => {
    const error = new Error('No wallet detected');
    const result = normalizeWalletError(error);

    expect(result.kind).toBe('WALLET_NOT_FOUND');
    expect(result.severity).toBe('error');
  });

  it('should correctly classify TRANSACTION_FAILED', () => {
    const error = new Error('call revert');
    const result = normalizeWalletError(error);

    expect(result.kind).toBe('TRANSACTION_FAILED');
  });

  it('should correctly classify CONTRACT_NOT_FOUND', () => {
    const error = new Error('Contract not found at address');
    const result = normalizeWalletError(error);

    expect(result.kind).toBe('CONTRACT_NOT_FOUND');
  });
});

describe('Error Detail Interface', () => {
  it('should return complete error detail structure', () => {
    const error = new Error('Test error');
    const result = normalizeWalletError(error);

    expect(result).toHaveProperty('kind');
    expect(result).toHaveProperty('userMessage');
    expect(result).toHaveProperty('severity');
    expect(result).toHaveProperty('recoveryAction');
    expect(result).toHaveProperty('rawMessage');
  });

  it('should include documentation links for relevant errors', () => {
    const walletError = new Error('Wallet not found');
    const networkError = new Error('Network error');

    const walletResult = normalizeWalletError(walletError);
    const networkResult = normalizeWalletError(networkError);

    expect(walletResult.documentationLink).toBeDefined();
    expect(networkResult.documentationLink).toBeUndefined();
  });
});
