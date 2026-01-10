import { describe, it, expect, vi, beforeEach } from 'vitest';
import { upsertAssertion, fetchAssertion, getSyncState } from './oracleState';
import { query } from './db';
import { ensureSchema } from './schema';
import { Assertion } from '@/lib/oracleTypes';

vi.mock('./db', () => ({
  query: vi.fn(),
  hasDatabase: vi.fn(() => true),
}));

vi.mock('./schema', () => ({
  ensureSchema: vi.fn(),
}));

describe('oracleState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('upsertAssertion', () => {
    it('inserts or updates assertion', async () => {
      const assertion: Assertion = {
        id: '0x123',
        chain: 'Local',
        asserter: '0xabc',
        protocol: 'Aave',
        market: 'ETH/USD',
        assertion: 'Price is 2000',
        assertedAt: new Date().toISOString(),
        livenessEndsAt: new Date().toISOString(),
        status: 'Pending',
        bondUsd: 1000,
        txHash: '0xhash'
      };

      const queryMock = vi.mocked(query) as unknown as { mockResolvedValueOnce: (value: unknown) => void };
      queryMock.mockResolvedValueOnce({ rowCount: 1 });

      await upsertAssertion(assertion);

      expect(ensureSchema).toHaveBeenCalled();
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO assertions'),
        expect.arrayContaining([assertion.id, assertion.chain, assertion.asserter])
      );
    });
  });

  describe('fetchAssertion', () => {
    it('returns null if not found', async () => {
      const queryMock = vi.mocked(query) as unknown as { mockResolvedValueOnce: (value: unknown) => void };
      queryMock.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await fetchAssertion('0x404');
      expect(result).toBeNull();
    });

    it('returns mapped assertion if found', async () => {
      const mockRow = {
        id: '0x123',
        chain: 'Local',
        asserter: '0xabc',
        protocol: 'Aave',
        market: 'ETH/USD',
        assertion_data: 'Price is 2000',
        asserted_at: new Date(),
        liveness_ends_at: new Date(),
        resolved_at: null,
        status: 'Pending',
        bond_usd: '1000',
        disputer: null,
        tx_hash: '0xhash'
      };

      const queryMock = vi.mocked(query) as unknown as { mockResolvedValueOnce: (value: unknown) => void };
      queryMock.mockResolvedValueOnce({ rows: [mockRow], rowCount: 1 });

      const result = await fetchAssertion('0x123');
      
      expect(result).not.toBeNull();
      expect(result?.id).toBe('0x123');
      expect(result?.bondUsd).toBe(1000);
      expect(result?.assertion).toBe('Price is 2000');
    });
  });

  describe('getSyncState', () => {
    it('returns sync state with defaults', async () => {
      const queryMock = vi.mocked(query) as unknown as { mockResolvedValueOnce: (value: unknown) => void };
      queryMock.mockResolvedValueOnce({ rows: [{ last_processed_block: '100' }] });
      queryMock.mockResolvedValueOnce({ rows: [{ chain: 'Optimism' }] });

      const result = await getSyncState();

      expect(result.lastProcessedBlock).toBe(100n);
      expect(result.chain).toBe('Optimism');
    });
  });
});
