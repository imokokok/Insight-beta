import { ok, error } from '@/lib/api/apiResponse';

export interface Vote {
  id: string;
  assertionId: string;
  voter: string;
  support: boolean;
  weight: number;
  txHash: string;
  timestamp: string;
  blockNumber: number;
}

export interface VoterStats {
  address: string;
  totalVotes: number;
  correctVotes: number;
  accuracy: number;
  totalWeight: number;
  avgWeight: number;
  firstVoteAt: string;
  lastVoteAt: string;
}

export interface VoteSummary {
  totalVotes: number;
  supportVotes: number;
  againstVotes: number;
  totalWeight: number;
  avgWeight: number;
  uniqueVoters: number;
}

function generateMockVotes(assertionId?: string): Vote[] {
  const baseAssertionId =
    assertionId || '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const voters = [
    '0xabcdef1234567890abcdef1234567890abcdef12',
    '0x1234567890abcdef1234567890abcdef12345678',
    '0x9876543210fedcba9876543210fedcba98765432',
    '0xfedcba9876543210fedcba9876543210fedcba98',
    '0x5555555555555555555555555555555555555555',
    '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    '0xcccccccccccccccccccccccccccccccccccccccc',
  ];

  const votes: Vote[] = [];
  const now = Date.now();

  for (let i = 0; i < 15; i++) {
    const voterIndex = i % voters.length;
    const voter = voters[voterIndex]!;
    votes.push({
      id: `vote-${i + 1}`,
      assertionId: baseAssertionId,
      voter,
      support: Math.random() > 0.4,
      weight: Math.floor(Math.random() * 9000) + 1000,
      txHash:
        `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`.slice(
          0,
          66,
        ),
      timestamp: new Date(now - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      blockNumber: 18000000 + Math.floor(Math.random() * 100000),
    });
  }

  return votes.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function calculateVoterStats(votes: Vote[]): VoterStats[] {
  const voterMap = new Map<
    string,
    {
      votes: Vote[];
      totalWeight: number;
      correctVotes: number;
      firstVoteAt: string;
      lastVoteAt: string;
    }
  >();

  votes.forEach((vote) => {
    const existing = voterMap.get(vote.voter) || {
      votes: [],
      totalWeight: 0,
      correctVotes: 0,
      firstVoteAt: vote.timestamp,
      lastVoteAt: vote.timestamp,
    };

    existing.votes.push(vote);
    existing.totalWeight += vote.weight;
    if (vote.support) existing.correctVotes++;
    if (new Date(vote.timestamp) < new Date(existing.firstVoteAt)) {
      existing.firstVoteAt = vote.timestamp;
    }
    if (new Date(vote.timestamp) > new Date(existing.lastVoteAt)) {
      existing.lastVoteAt = vote.timestamp;
    }

    voterMap.set(vote.voter, existing);
  });

  return Array.from(voterMap.entries())
    .map(([address, data]) => ({
      address,
      totalVotes: data.votes.length,
      correctVotes: data.correctVotes,
      accuracy: data.votes.length > 0 ? (data.correctVotes / data.votes.length) * 100 : 0,
      totalWeight: data.totalWeight,
      avgWeight: data.votes.length > 0 ? data.totalWeight / data.votes.length : 0,
      firstVoteAt: data.firstVoteAt,
      lastVoteAt: data.lastVoteAt,
    }))
    .sort((a, b) => b.totalWeight - a.totalWeight);
}

function calculateSummary(votes: Vote[]): VoteSummary {
  const uniqueVoters = new Set(votes.map((v) => v.voter)).size;
  const supportVotes = votes.filter((v) => v.support).length;
  const totalWeight = votes.reduce((sum, v) => sum + v.weight, 0);

  return {
    totalVotes: votes.length,
    supportVotes,
    againstVotes: votes.length - supportVotes,
    totalWeight,
    avgWeight: votes.length > 0 ? totalWeight / votes.length : 0,
    uniqueVoters,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const assertionId = searchParams.get('assertionId') || undefined;

    const votes = generateMockVotes(assertionId);
    const voterStats = calculateVoterStats(votes);
    const summary = calculateSummary(votes);

    return ok({
      votes,
      voterStats,
      totalVotes: votes.length,
      summary,
      metadata: {
        source: 'uma-optimistic-oracle',
        lastUpdated: new Date().toISOString(),
        note: 'Mock data - to be replaced with real UMA voting data',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch UMA votes';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
