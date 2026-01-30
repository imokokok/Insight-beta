/**
 * Oracle State Memory 单元测试
 */

import { describe, it, expect } from 'vitest';
import { pruneMemoryAssertions, pruneMemoryDisputes, applyVoteSumsDelta } from './memory';
import { getMemoryInstance } from '../memoryBackend';
import type { Assertion, Dispute } from '@/lib/types/oracleTypes';

describe('oracleState/memory', () => {
  describe('pruneMemoryAssertions', () => {
    it('should prune old assertions when limit exceeded', () => {
      const mem = getMemoryInstance('test-prune-assertions');

      // Add more assertions than the limit (default is 10,000)
      for (let i = 0; i < 10500; i++) {
        mem.assertions.set(`id-${i}`, {
          id: `id-${i}`,
          assertedAt: new Date(Date.now() - i * 1000).toISOString(),
          status: i % 2 === 0 ? 'Pending' : 'Resolved',
        } as Assertion);
      }

      pruneMemoryAssertions(mem);

      // Should be pruned to 10,000
      expect(mem.assertions.size).toBeLessThanOrEqual(10000);
    });
  });

  describe('pruneMemoryDisputes', () => {
    it('should prune old disputes when limit exceeded', () => {
      const mem = getMemoryInstance('test-prune-disputes');

      // Add more disputes than the limit (default is 10,000)
      for (let i = 0; i < 10500; i++) {
        mem.disputes.set(`D:id-${i}`, {
          id: `D:id-${i}`,
          disputedAt: new Date(Date.now() - i * 1000).toISOString(),
          votingEndsAt: new Date(Date.now() + 86400000).toISOString(),
          status: i % 2 === 0 ? 'Voting' : 'Executed',
        } as Dispute);
      }

      pruneMemoryDisputes(mem);

      // Should be pruned to 10,000
      expect(mem.disputes.size).toBeLessThanOrEqual(10000);
    });
  });

  describe('applyVoteSumsDelta', () => {
    it('should apply vote delta correctly for support vote', () => {
      const mem = getMemoryInstance('test-vote-delta-1');

      applyVoteSumsDelta(mem, 'assertion-1', true, 100n, 1);

      const sums = mem.voteSums.get('assertion-1');
      expect(sums?.forWeight).toBe(100n);
      expect(sums?.againstWeight).toBe(0n);
    });

    it('should apply vote delta correctly for against vote', () => {
      const mem = getMemoryInstance('test-vote-delta-2');

      applyVoteSumsDelta(mem, 'assertion-1', false, 50n, 1);

      const sums = mem.voteSums.get('assertion-1');
      expect(sums?.forWeight).toBe(0n);
      expect(sums?.againstWeight).toBe(50n);
    });

    it('should accumulate multiple deltas', () => {
      const mem = getMemoryInstance('test-vote-delta-3');

      applyVoteSumsDelta(mem, 'assertion-1', true, 100n, 1);
      applyVoteSumsDelta(mem, 'assertion-1', true, 50n, 1);
      applyVoteSumsDelta(mem, 'assertion-1', false, 25n, 1);

      const sums = mem.voteSums.get('assertion-1');
      expect(sums?.forWeight).toBe(150n);
      expect(sums?.againstWeight).toBe(25n);
    });

    it('should handle direction -1 (decrease)', () => {
      const mem = getMemoryInstance('test-vote-delta-4');

      // First add votes
      applyVoteSumsDelta(mem, 'assertion-1', true, 100n, 1);
      // Then remove some
      applyVoteSumsDelta(mem, 'assertion-1', true, 30n, -1);

      const sums = mem.voteSums.get('assertion-1');
      expect(sums?.forWeight).toBe(70n);
    });

    it('should prevent negative weights', () => {
      const mem = getMemoryInstance('test-vote-delta-5');

      // Try to remove more than exists
      applyVoteSumsDelta(mem, 'assertion-1', true, 100n, -1);

      const sums = mem.voteSums.get('assertion-1');
      expect(sums).toBeUndefined(); // Deleted because both are 0
    });

    it('should update dispute vote counts', () => {
      const mem = getMemoryInstance('test-vote-delta-6');

      // Create a dispute first
      mem.disputes.set('D:assertion-1', {
        id: 'D:assertion-1',
        currentVotesFor: 0,
        currentVotesAgainst: 0,
        totalVotes: 0,
      } as Dispute);

      applyVoteSumsDelta(mem, 'assertion-1', true, 100n, 1);
      applyVoteSumsDelta(mem, 'assertion-1', false, 50n, 1);

      const dispute = mem.disputes.get('D:assertion-1');
      expect(dispute?.currentVotesFor).toBe(100);
      expect(dispute?.currentVotesAgainst).toBe(50);
      expect(dispute?.totalVotes).toBe(150);
    });
  });
});
