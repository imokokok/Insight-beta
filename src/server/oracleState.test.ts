import { describe, it, expect, vi, beforeEach } from 'vitest';
import { upsertAssertion, fetchAssertion, getSyncState, insertVoteEvent, recomputeDisputeVotes, upsertDispute, fetchDispute } from './oracleState';
import { listAssertions, listDisputes } from './oracleStore';
import { query, hasDatabase } from './db';
import { ensureSchema } from './schema';
import { Assertion, Dispute } from '@/lib/oracleTypes';
import { getMemoryStore } from './memoryBackend';
import { mockAssertions, mockDisputes } from '@/lib/mockData';

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
    (globalThis as unknown as { __insightMemoryStore?: unknown }).__insightMemoryStore = undefined;
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

  describe('votes (memory)', () => {
    beforeEach(() => {
      vi.mocked(hasDatabase).mockReturnValue(false);
    });

    it('dedupes vote keys and prunes on dispute execution', async () => {
      const dispute: Dispute = {
        id: "D:0x123",
        chain: "Local",
        assertionId: "0x123",
        market: "ETH/USD",
        disputeReason: "test",
        disputer: "0xabc",
        disputedAt: new Date().toISOString(),
        votingEndsAt: new Date().toISOString(),
        status: "Voting",
        currentVotesFor: 0,
        currentVotesAgainst: 0,
        totalVotes: 0
      };

      await upsertDispute(dispute);
      const inserted = await insertVoteEvent({
        chain: "Local",
        assertionId: "0x123",
        voter: "0xvoter",
        support: true,
        weight: 10n,
        txHash: "0xhash",
        blockNumber: 100n,
        logIndex: 1
      });
      const inserted2 = await insertVoteEvent({
        chain: "Local",
        assertionId: "0x123",
        voter: "0xvoter",
        support: true,
        weight: 10n,
        txHash: "0xhash",
        blockNumber: 100n,
        logIndex: 1
      });

      expect(inserted).toBe(true);
      expect(inserted2).toBe(false);

      const updated = await fetchDispute("D:0x123");
      expect(updated?.totalVotes).toBe(10);

      const mem = getMemoryStore();
      expect(mem.votes.size).toBe(1);
      expect(mem.voteSums.has("0x123")).toBe(true);

      await upsertDispute({ ...dispute, status: "Executed" });
      expect(mem.votes.size).toBe(0);
      expect(mem.voteSums.has("0x123")).toBe(false);
    });

    it('prunes votes by block window and keeps sums consistent', async () => {
      const prevMax = process.env.INSIGHT_MEMORY_MAX_VOTE_KEYS;
      const prevWindow = process.env.INSIGHT_MEMORY_VOTE_BLOCK_WINDOW;
      process.env.INSIGHT_MEMORY_MAX_VOTE_KEYS = "1";
      process.env.INSIGHT_MEMORY_VOTE_BLOCK_WINDOW = "0";
      try {
        const dispute: Dispute = {
          id: "D:0xaaa",
          chain: "Local",
          assertionId: "0xaaa",
          market: "ETH/USD",
          disputeReason: "test",
          disputer: "0xabc",
          disputedAt: new Date().toISOString(),
          votingEndsAt: new Date().toISOString(),
          status: "Voting",
          currentVotesFor: 0,
          currentVotesAgainst: 0,
          totalVotes: 0
        };
        await upsertDispute(dispute);

        await insertVoteEvent({ chain: "Local", assertionId: "0xaaa", voter: "0x1", support: true, weight: 10n, txHash: "0xhash", blockNumber: 1n, logIndex: 1 });
        await insertVoteEvent({ chain: "Local", assertionId: "0xaaa", voter: "0x2", support: true, weight: 20n, txHash: "0xhash", blockNumber: 2n, logIndex: 2 });
        await insertVoteEvent({ chain: "Local", assertionId: "0xaaa", voter: "0x3", support: true, weight: 30n, txHash: "0xhash", blockNumber: 3n, logIndex: 3 });

        const mem = getMemoryStore();
        expect(mem.votes.size).toBe(1);
        const updated = await fetchDispute("D:0xaaa");
        expect(updated?.totalVotes).toBe(30);
        expect(updated?.currentVotesFor).toBe(30);
        expect(updated?.currentVotesAgainst).toBe(0);
      } finally {
        if (prevMax === undefined) delete process.env.INSIGHT_MEMORY_MAX_VOTE_KEYS;
        else process.env.INSIGHT_MEMORY_MAX_VOTE_KEYS = prevMax;
        if (prevWindow === undefined) delete process.env.INSIGHT_MEMORY_VOTE_BLOCK_WINDOW;
        else process.env.INSIGHT_MEMORY_VOTE_BLOCK_WINDOW = prevWindow;
      }
    });

    it('prunes votes by FIFO and keeps sums consistent', async () => {
      const prevMax = process.env.INSIGHT_MEMORY_MAX_VOTE_KEYS;
      const prevWindow = process.env.INSIGHT_MEMORY_VOTE_BLOCK_WINDOW;
      process.env.INSIGHT_MEMORY_MAX_VOTE_KEYS = "2";
      process.env.INSIGHT_MEMORY_VOTE_BLOCK_WINDOW = "1000";
      try {
        const dispute: Dispute = {
          id: "D:0xbbb",
          chain: "Local",
          assertionId: "0xbbb",
          market: "ETH/USD",
          disputeReason: "test",
          disputer: "0xabc",
          disputedAt: new Date().toISOString(),
          votingEndsAt: new Date().toISOString(),
          status: "Voting",
          currentVotesFor: 0,
          currentVotesAgainst: 0,
          totalVotes: 0
        };
        await upsertDispute(dispute);

        await insertVoteEvent({ chain: "Local", assertionId: "0xbbb", voter: "0x1", support: true, weight: 10n, txHash: "0xhash2", blockNumber: 10n, logIndex: 1 });
        await insertVoteEvent({ chain: "Local", assertionId: "0xbbb", voter: "0x2", support: true, weight: 20n, txHash: "0xhash2", blockNumber: 11n, logIndex: 2 });
        await insertVoteEvent({ chain: "Local", assertionId: "0xbbb", voter: "0x3", support: true, weight: 30n, txHash: "0xhash2", blockNumber: 12n, logIndex: 3 });

        const mem = getMemoryStore();
        expect(mem.votes.size).toBe(2);
        const updated = await fetchDispute("D:0xbbb");
        expect(updated?.totalVotes).toBe(50);
        expect(updated?.currentVotesFor).toBe(50);
        expect(updated?.currentVotesAgainst).toBe(0);
      } finally {
        if (prevMax === undefined) delete process.env.INSIGHT_MEMORY_MAX_VOTE_KEYS;
        else process.env.INSIGHT_MEMORY_MAX_VOTE_KEYS = prevMax;
        if (prevWindow === undefined) delete process.env.INSIGHT_MEMORY_VOTE_BLOCK_WINDOW;
        else process.env.INSIGHT_MEMORY_VOTE_BLOCK_WINDOW = prevWindow;
      }
    });

    it('caps assertions and keeps pending over resolved', async () => {
      const prevMax = process.env.INSIGHT_MEMORY_MAX_ASSERTIONS;
      process.env.INSIGHT_MEMORY_MAX_ASSERTIONS = "10";
      
      try {
        const base: Omit<Assertion, "id" | "status"> = {
          chain: "Local",
          asserter: "0xabc",
          protocol: "Aave",
          market: "ETH/USD",
          assertion: "x",
          assertedAt: new Date().toISOString(),
          livenessEndsAt: new Date().toISOString(),
          bondUsd: 1,
          txHash: "0xhash"
        };

        await upsertAssertion({ ...base, id: "keep-pending", status: "Pending" });
        for (let i = 0; i < 20; i++) {
          await upsertAssertion({
            ...base,
            id: `r/${i}`,
            status: "Resolved",
            resolvedAt: new Date(Date.now() - i * 1000).toISOString()
          });
        }

        const mem = getMemoryStore();
        expect(mem.assertions.size).toBeLessThanOrEqual(10);
        expect(mem.assertions.has("keep-pending")).toBe(true);
      } finally {
        if (prevMax === undefined) delete process.env.INSIGHT_MEMORY_MAX_ASSERTIONS;
        else process.env.INSIGHT_MEMORY_MAX_ASSERTIONS = prevMax;
      }
    });
  });
});

describe('oracleStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses mocks when assertions table is empty', async () => {
    vi.mocked(hasDatabase).mockReturnValue(true);
    const queryMock = vi.mocked(query) as unknown as { mockResolvedValueOnce: (value: unknown) => void };
    queryMock.mockResolvedValueOnce({ rows: [{ has_rows: false }], rowCount: 1 });

    const result = await listAssertions({ limit: 30, cursor: 0 });

    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("SELECT EXISTS (SELECT 1 FROM assertions) as has_rows")
    );
    expect(result.total).toBe(mockAssertions.length);
    expect(result.items).toHaveLength(Math.min(30, mockAssertions.length));
  });

  it('uses mocks when disputes table is empty', async () => {
    vi.mocked(hasDatabase).mockReturnValue(true);
    const queryMock = vi.mocked(query) as unknown as { mockResolvedValueOnce: (value: unknown) => void };
    queryMock.mockResolvedValueOnce({ rows: [{ has_rows: false }], rowCount: 1 });

    const result = await listDisputes({ limit: 30, cursor: 0 });

    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("SELECT EXISTS (SELECT 1 FROM disputes) as has_rows")
    );
    expect(result.total).toBe(mockDisputes.length);
    expect(result.items).toHaveLength(Math.min(30, mockDisputes.length));
  });
});
