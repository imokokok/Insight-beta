import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  upsertRewardRecord,
  upsertStakingRecord,
  insertSlashingRecord,
  getVoterRewards,
  calculateVoterStats,
  getRewardsStats,
} from './umaRewards';

// Mock dependencies
vi.mock('@/server/db', () => ({
  hasDatabase: vi.fn(() => false),
  query: vi.fn(),
}));

vi.mock('@/server/kvStore', () => ({
  readJsonFile: vi.fn(() => Promise.resolve({})),
  writeJsonFile: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/server/memoryBackend', () => ({
  getMemoryStore: vi.fn(() => new Map()),
  memoryNowIso: vi.fn(() => '2024-01-01T00:00:00.000Z'),
}));

describe('umaRewards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('upsertRewardRecord', () => {
    it('should create a new reward record', async () => {
      const record = {
        voter: '0x1234567890123456789012345678901234567890',
        assertionId: '0xabc123',
        rewardAmount: '1000000000000000000',
        claimed: false,
        claimDeadline: '2024-12-31T00:00:00.000Z',
        chain: '1',
        blockNumber: '1000000',
        txHash: '0xdef456',
      };

      const result = await upsertRewardRecord(record);

      expect(result).toMatchObject({
        voter: record.voter,
        assertionId: record.assertionId,
        rewardAmount: record.rewardAmount,
        claimed: false,
      });
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
    });

    it('should update existing reward record', async () => {
      const record = {
        voter: '0x1234567890123456789012345678901234567890',
        assertionId: '0xabc123',
        rewardAmount: '2000000000000000000',
        claimed: true,
        claimedAt: '2024-01-15T00:00:00.000Z',
        claimDeadline: '2024-12-31T00:00:00.000Z',
        chain: '1',
        blockNumber: '1000001',
        txHash: '0xdef457',
      };

      const result = await upsertRewardRecord(record);

      expect(result.claimed).toBe(true);
      expect(result.claimedAt).toBe(record.claimedAt);
    });
  });

  describe('upsertStakingRecord', () => {
    it('should create a new staking record', async () => {
      const record = {
        voter: '0x1234567890123456789012345678901234567890',
        stakedAmount: '5000000000000000000',
        pendingRewards: '100000000000000000',
        lastUpdateTime: '2024-01-01T00:00:00.000Z',
        chain: '1',
        blockNumber: '1000000',
        txHash: '0xdef456',
      };

      const result = await upsertStakingRecord(record);

      expect(result).toMatchObject({
        voter: record.voter,
        stakedAmount: record.stakedAmount,
        pendingRewards: record.pendingRewards,
      });
    });
  });

  describe('insertSlashingRecord', () => {
    it('should create a new slashing record', async () => {
      const record = {
        voter: '0x1234567890123456789012345678901234567890',
        assertionId: '0xabc123',
        slashAmount: '500000000000000000',
        reason: 'Incorrect vote',
        timestamp: '2024-01-01T00:00:00.000Z',
        chain: '1',
        blockNumber: '1000000',
        txHash: '0xdef456',
      };

      const result = await insertSlashingRecord(record);

      expect(result).toMatchObject({
        voter: record.voter,
        slashAmount: record.slashAmount,
        reason: record.reason,
      });
    });
  });

  describe('getVoterRewards', () => {
    it('should return empty array for new voter', async () => {
      const result = await getVoterRewards('0xNewVoter');

      expect(result.records).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should filter by claimed status', async () => {
      // First create some rewards
      await upsertRewardRecord({
        voter: '0xTestVoter',
        assertionId: '0x1',
        rewardAmount: '1000',
        claimed: true,
        claimedAt: '2024-01-01T00:00:00.000Z',
        claimDeadline: '2024-12-31T00:00:00.000Z',
        chain: '1',
        blockNumber: '1000',
        txHash: '0x1',
      });

      await upsertRewardRecord({
        voter: '0xTestVoter',
        assertionId: '0x2',
        rewardAmount: '2000',
        claimed: false,
        claimDeadline: '2024-12-31T00:00:00.000Z',
        chain: '1',
        blockNumber: '1001',
        txHash: '0x2',
      });

      const claimedResult = await getVoterRewards('0xTestVoter', { claimed: true });
      expect(claimedResult.total).toBe(1);

      const pendingResult = await getVoterRewards('0xTestVoter', { claimed: false });
      expect(pendingResult.total).toBe(1);
    });
  });

  describe('calculateVoterStats', () => {
    it('should calculate stats for voter with no activity', async () => {
      const stats = await calculateVoterStats('0xNewVoter');

      expect(stats.voter).toBe('0xNewVoter');
      expect(stats.totalRewards).toBe('0');
      expect(stats.totalSlashed).toBe('0');
      expect(stats.currentStake).toBe('0');
      expect(stats.accuracyRate).toBe(0);
    });

    it('should calculate accuracy rate correctly', async () => {
      // Create rewards (correct votes)
      await upsertRewardRecord({
        voter: '0xTestVoter',
        assertionId: '0x1',
        rewardAmount: '1000',
        claimed: true,
        claimedAt: '2024-01-01T00:00:00.000Z',
        claimDeadline: '2024-12-31T00:00:00.000Z',
        chain: '1',
        blockNumber: '1000',
        txHash: '0x1',
      });

      // Create slashing (incorrect vote)
      await insertSlashingRecord({
        voter: '0xTestVoter',
        assertionId: '0x2',
        slashAmount: '500',
        reason: 'Incorrect vote',
        timestamp: '2024-01-01T00:00:00.000Z',
        chain: '1',
        blockNumber: '1001',
        txHash: '0x2',
      });

      const stats = await calculateVoterStats('0xTestVoter');

      expect(stats.totalVotes).toBe(2);
      expect(stats.correctVotes).toBe(1);
      expect(stats.accuracyRate).toBe(0.5);
    });
  });

  describe('getRewardsStats', () => {
    it('should return zero stats for empty system', async () => {
      const stats = await getRewardsStats();

      expect(stats.totalRewardsDistributed).toBe('0');
      expect(stats.totalStaked).toBe('0');
      expect(stats.totalSlashed).toBe('0');
      expect(stats.activeStakers).toBe(0);
    });

    it('should aggregate stats correctly', async () => {
      // Create multiple stakers
      await upsertStakingRecord({
        voter: '0xStaker1',
        stakedAmount: '1000000000000000000',
        pendingRewards: '100000000000000000',
        lastUpdateTime: '2024-01-01T00:00:00.000Z',
        chain: '1',
        blockNumber: '1000',
        txHash: '0x1',
      });

      await upsertStakingRecord({
        voter: '0xStaker2',
        stakedAmount: '2000000000000000000',
        pendingRewards: '200000000000000000',
        lastUpdateTime: '2024-01-01T00:00:00.000Z',
        chain: '1',
        blockNumber: '1001',
        txHash: '0x2',
      });

      // Create claimed rewards
      await upsertRewardRecord({
        voter: '0xStaker1',
        assertionId: '0x1',
        rewardAmount: '500000000000000000',
        claimed: true,
        claimedAt: '2024-01-01T00:00:00.000Z',
        claimDeadline: '2024-12-31T00:00:00.000Z',
        chain: '1',
        blockNumber: '1002',
        txHash: '0x3',
      });

      const stats = await getRewardsStats();

      expect(stats.activeStakers).toBe(2);
      expect(stats.totalStaked).toBe('3000000000000000000');
      expect(stats.totalRewardsDistributed).toBe('500000000000000000');
    });
  });
});
