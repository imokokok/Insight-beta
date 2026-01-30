/**
 * Oracle State Utils 单元测试
 */

import { describe, it, expect } from 'vitest';
import {
  toBigIntOr,
  toIsoOrNull,
  toNullableNumber,
  toNullableString,
  toTimeMs,
  bigintToSafeNumber,
  normalizeInstanceId,
  mapAssertionRow,
  mapDisputeRow,
} from './utils';
import type { DbAssertionRow, DbDisputeRow } from '@/lib/types/oracleTypes';

describe('oracleState/utils', () => {
  describe('toBigIntOr', () => {
    it('should return bigint value as is', () => {
      expect(toBigIntOr(100n, 0n)).toBe(100n);
    });

    it('should convert number to bigint', () => {
      expect(toBigIntOr(100, 0n)).toBe(100n);
      expect(toBigIntOr(100.5, 0n)).toBe(100n);
    });

    it('should convert string to bigint', () => {
      expect(toBigIntOr('100', 0n)).toBe(100n);
      expect(toBigIntOr('  100  ', 0n)).toBe(100n);
    });

    it('should return fallback for invalid values', () => {
      expect(toBigIntOr(null, 0n)).toBe(0n);
      expect(toBigIntOr(undefined, 0n)).toBe(0n);
      expect(toBigIntOr('', 0n)).toBe(0n);
      expect(toBigIntOr('invalid', 0n)).toBe(0n);
      expect(toBigIntOr({}, 0n)).toBe(0n);
    });
  });

  describe('toIsoOrNull', () => {
    it('should convert Date to ISO string', () => {
      const date = new Date('2024-01-01T00:00:00.000Z');
      expect(toIsoOrNull(date)).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should convert string to ISO string', () => {
      expect(toIsoOrNull('2024-01-01')).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should return null for invalid values', () => {
      expect(toIsoOrNull(null)).toBeNull();
      expect(toIsoOrNull(undefined)).toBeNull();
      expect(toIsoOrNull('')).toBeNull();
      expect(toIsoOrNull('invalid')).toBeNull();
    });
  });

  describe('toNullableNumber', () => {
    it('should return number as is', () => {
      expect(toNullableNumber(100)).toBe(100);
      expect(toNullableNumber(0)).toBe(0);
    });

    it('should convert string to number', () => {
      expect(toNullableNumber('100')).toBe(100);
      expect(toNullableNumber('100.5')).toBe(100.5);
    });

    it('should return null for invalid values', () => {
      expect(toNullableNumber(null)).toBeNull();
      expect(toNullableNumber(undefined)).toBeNull();
      expect(toNullableNumber('invalid')).toBeNull();
      expect(toNullableNumber(NaN)).toBeNull();
    });

    it('should convert empty string to 0', () => {
      // Number('') returns 0, which is a valid number
      expect(toNullableNumber('')).toBe(0);
    });
  });

  describe('toNullableString', () => {
    it('should return string as is', () => {
      expect(toNullableString('test')).toBe('test');
      expect(toNullableString('')).toBe('');
    });

    it('should return null for non-string values', () => {
      expect(toNullableString(null)).toBeNull();
      expect(toNullableString(undefined)).toBeNull();
      expect(toNullableString(123)).toBeNull();
      expect(toNullableString({})).toBeNull();
    });
  });

  describe('toTimeMs', () => {
    it('should convert ISO string to milliseconds', () => {
      const result = toTimeMs('2024-01-01T00:00:00.000Z');
      expect(result).toBe(new Date('2024-01-01T00:00:00.000Z').getTime());
    });

    it('should return 0 for undefined', () => {
      expect(toTimeMs(undefined)).toBe(0);
    });

    it('should return 0 for invalid string', () => {
      expect(toTimeMs('invalid')).toBe(0);
    });
  });

  describe('bigintToSafeNumber', () => {
    it('should convert bigint to number safely', () => {
      expect(bigintToSafeNumber(100n)).toBe(100);
      expect(bigintToSafeNumber(0n)).toBe(0);
      expect(bigintToSafeNumber(-100n)).toBe(-100);
    });

    it('should clamp to MAX_SAFE_INTEGER', () => {
      const overflow = BigInt(Number.MAX_SAFE_INTEGER) + 1000n;
      expect(bigintToSafeNumber(overflow)).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should clamp to MIN_SAFE_INTEGER', () => {
      const underflow = BigInt(Number.MIN_SAFE_INTEGER) - 1000n;
      expect(bigintToSafeNumber(underflow)).toBe(Number.MIN_SAFE_INTEGER);
    });
  });

  describe('normalizeInstanceId', () => {
    it('should return provided instanceId', () => {
      expect(normalizeInstanceId('custom', 'default')).toBe('custom');
    });

    it('should return default when instanceId is undefined', () => {
      expect(normalizeInstanceId(undefined, 'default')).toBe('default');
    });

    it('should trim whitespace', () => {
      expect(normalizeInstanceId('  custom  ', 'default')).toBe('custom');
    });

    it('should return default when trimmed is empty', () => {
      expect(normalizeInstanceId('   ', 'default')).toBe('default');
    });
  });

  describe('mapAssertionRow', () => {
    it('should map database row to assertion object', () => {
      const row = {
        id: '0x123',
        instance_id: 'test',
        chain: 'testnet',
        asserter: '0xabc',
        protocol: 'test-protocol',
        market: 'test-market',
        assertion_data: 'test assertion',
        asserted_at: new Date('2024-01-01T00:00:00.000Z'),
        liveness_ends_at: new Date('2024-01-02T00:00:00.000Z'),
        block_number: 100,
        log_index: 5,
        resolved_at: null,
        settlement_resolution: null,
        status: 'Pending',
        bond_usd: '1000',
        disputer: null,
        tx_hash: '0xdef',
      } as unknown as DbAssertionRow;

      const result = mapAssertionRow(row);

      expect(result).toMatchObject({
        id: '0x123',
        chain: 'testnet',
        asserter: '0xabc',
        protocol: 'test-protocol',
        market: 'test-market',
        assertion: 'test assertion',
        blockNumber: '100',
        logIndex: 5,
        status: 'Pending',
        bondUsd: 1000,
        txHash: '0xdef',
      });
    });
  });

  describe('mapDisputeRow', () => {
    it('should map database row to dispute object', () => {
      const row = {
        id: 'D:0x123',
        instance_id: 'test',
        chain: 'testnet',
        assertion_id: '0x123',
        market: 'test-market',
        reason: 'test reason',
        disputer: '0xabc',
        disputed_at: new Date('2024-01-01T00:00:00.000Z'),
        voting_ends_at: new Date('2099-01-01T00:00:00.000Z'),
        tx_hash: '0xdef',
        block_number: 100,
        log_index: 5,
        status: 'Voting',
        votes_for: '100',
        votes_against: '50',
        total_votes: '150',
      } as unknown as DbDisputeRow;

      const result = mapDisputeRow(row);

      expect(result).toMatchObject({
        id: 'D:0x123',
        chain: 'testnet',
        assertionId: '0x123',
        market: 'test-market',
        disputeReason: 'test reason',
        disputer: '0xabc',
        blockNumber: '100',
        logIndex: 5,
        status: 'Voting',
        currentVotesFor: 100,
        currentVotesAgainst: 50,
        totalVotes: 150,
      });
    });

    it('should compute Pending Execution status when voting ended', () => {
      const row = {
        id: 'D:0x123',
        instance_id: 'test',
        chain: 'testnet',
        assertion_id: '0x123',
        market: 'test-market',
        reason: 'test reason',
        disputer: '0xabc',
        disputed_at: new Date('2020-01-01T00:00:00.000Z'),
        voting_ends_at: new Date('2020-01-02T00:00:00.000Z'),
        tx_hash: '0xdef',
        block_number: 100,
        log_index: 5,
        status: 'Voting',
        votes_for: '100',
        votes_against: '50',
        total_votes: '150',
      } as unknown as DbDisputeRow;

      const result = mapDisputeRow(row);
      expect(result.status).toBe('Pending Execution');
    });
  });
});
