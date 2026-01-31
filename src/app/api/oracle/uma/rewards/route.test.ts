import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { GET, POST } from './route';

// Mock dependencies
vi.mock('@/server/oracle/umaRewards', () => ({
  getVoterRewards: vi.fn(),
  getRewardsStats: vi.fn(),
  calculateVoterStats: vi.fn(),
}));

vi.mock('@/server/oracle/umaRewardsSync', () => ({
  syncDVMEvents: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('GET /api/oracle/uma/rewards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should return global stats when no voter specified', async () => {
    const { getRewardsStats } = await import('@/server/oracle/umaRewards');
    vi.mocked(getRewardsStats).mockResolvedValue({
      totalRewardsDistributed: '1000000000000000000',
      totalStaked: '5000000000000000000',
      totalSlashed: '100000000000000000',
      activeStakers: 10,
      averageStake: '500000000000000000',
    });

    const request = new Request('http://localhost/api/oracle/uma/rewards');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.data.totalRewardsDistributed).toBe('1000000000000000000');
  });

  it('should return voter rewards when voter specified', async () => {
    const { getVoterRewards, calculateVoterStats } = await import('@/server/oracle/umaRewards');
    vi.mocked(getVoterRewards).mockResolvedValue({
      records: [
        {
          id: '1',
          voter: '0x123',
          assertionId: '0xabc',
          rewardAmount: '1000',
          claimed: true,
          claimDeadline: '2024-12-31',
          chain: '1',
          blockNumber: '1000',
          txHash: '0xdef',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ],
      total: 1,
    });
    vi.mocked(calculateVoterStats).mockResolvedValue({
      voter: '0x123',
      totalRewards: '1000',
      totalSlashed: '0',
      currentStake: '5000',
      pendingRewards: '100',
      participationRate: 0.8,
      accuracyRate: 0.9,
      totalVotes: 10,
      correctVotes: 9,
    });

    const request = new Request(
      'http://localhost/api/oracle/uma/rewards?voter=0x1234567890123456789012345678901234567890',
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.data.voter).toBe('0x1234567890123456789012345678901234567890');
    expect(data.data.rewards).toHaveLength(1);
  });

  it('should filter by claimed status', async () => {
    const { getVoterRewards } = await import('@/server/oracle/umaRewards');
    vi.mocked(getVoterRewards).mockResolvedValue({
      records: [],
      total: 0,
    });

    const request = new Request(
      'http://localhost/api/oracle/uma/rewards?voter=0x1234567890123456789012345678901234567890&claimed=true',
    );
    await GET(request);

    expect(getVoterRewards).toHaveBeenCalledWith(
      '0x1234567890123456789012345678901234567890',
      expect.objectContaining({ claimed: true }),
    );
  });
});

describe('POST /api/oracle/uma/rewards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should trigger rewards sync for admin', async () => {
    const { requireAuth } = await import('@/lib/auth');
    const { syncDVMEvents } = await import('@/server/oracle/umaRewardsSync');

    vi.mocked(requireAuth).mockResolvedValue({ isAdmin: true });
    vi.mocked(syncDVMEvents).mockResolvedValue({
      rewardsSynced: 5,
      stakingSynced: 3,
      slashingSynced: 1,
    });

    const request = new Request('http://localhost/api/oracle/uma/rewards', { method: 'POST' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.data.rewardsSynced).toBe(5);
  });

  it('should reject non-admin users', async () => {
    const { requireAuth } = await import('@/lib/auth');
    vi.mocked(requireAuth).mockResolvedValue({ isAdmin: false });

    const request = new Request('http://localhost/api/oracle/uma/rewards', { method: 'POST' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.ok).toBe(false);
    expect(data.error).toContain('Admin permission required');
  });
});
