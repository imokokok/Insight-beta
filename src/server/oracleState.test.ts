import { describe, it, expect, vi, beforeEach } from 'vitest';
import { upsertAssertion, fetchAssertion, getSyncState, insertVoteEvent, recomputeDisputeVotes } from './oracleState';
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

  describe('votes', () => {
    it('inserts vote event idempotently', async () => {
      const queryMock = vi.mocked(query) as unknown as { mockResolvedValueOnce: (value: unknown) => void };
      queryMock.mockResolvedValueOnce({ rows: [{ 1: 1 }] });
      const inserted = await insertVoteEvent({
        chain: 'Local',
        assertionId: '0x123',
        voter: '0xabc',
        support: true,
        weight: 10n,
        txHash: '0xhash',
        blockNumber: 100n,
        logIndex: 1
      });
      expect(inserted).toBe(true);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO votes'),
        expect.arrayContaining(['Local', '0x123', '0xabc'])
      );

      queryMock.mockResolvedValueOnce({ rows: [] });
      const inserted2 = await insertVoteEvent({
        chain: 'Local',
        assertionId: '0x123',
        voter: '0xabc',
        support: true,
        weight: 10n,
        txHash: '0xhash',
        blockNumber: 100n,
        logIndex: 1
      });
      expect(inserted2).toBe(false);
    });

    it('recomputes dispute votes from vote events', async () => {
      const queryMock = vi.mocked(query) as unknown as { mockResolvedValueOnce: (value: unknown) => void };
      queryMock.mockResolvedValueOnce({ rows: [{ votes_for: '5', votes_against: '2', total_votes: '7' }] });
      queryMock.mockResolvedValueOnce({ rowCount: 1, rows: [] });

      await recomputeDisputeVotes('0x123');

      expect(query).toHaveBeenCalledWith(expect.stringContaining('FROM votes'), ['0x123']);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE disputes'),
        ['0x123', '5', '2', '7']
      );
    });
  });
});
