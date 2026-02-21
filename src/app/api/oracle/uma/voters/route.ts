import type { NextRequest } from 'next/server';

import { error, ok } from '@/lib/api/apiResponse';
import { query } from '@/lib/database';
import { AppError } from '@/lib/errors';
import { logger } from '@/shared/logger';

export interface VoterStats {
  address: string;
  totalVotes: number;
  correctVotes: number;
  accuracy: number;
  totalWeight: number;
  avgWeight: number;
  totalRewards: number;
  claimedRewards: number;
  pendingRewards: number;
  firstVoteAt: string | null;
  lastVoteAt: string | null;
}

export interface VoterSummary {
  totalVoters: number;
  totalVotes: number;
  totalWeight: number;
  totalRewards: number;
  claimedRewards: number;
  pendingRewards: number;
}

async function fetchVoterStats(): Promise<VoterStats[]> {
  const result = await query(`
    WITH vote_stats AS (
      SELECT
        v.voter,
        COUNT(*) AS total_votes,
        SUM(CASE WHEN a.status = 'settled' AND 
                  ((v.support = true AND a.settlement_value = 1) OR 
                   (v.support = false AND a.settlement_value = 0)) THEN 1 ELSE 0 END) AS correct_votes,
        SUM(v.weight::numeric) AS total_weight,
        MIN(v.created_at) AS first_vote_at,
        MAX(v.created_at) AS last_vote_at
      FROM uma_votes v
      LEFT JOIN uma_assertions a ON v.assertion_id = a.id
      GROUP BY v.voter
    ),
    reward_stats AS (
      SELECT
        voter,
        SUM(reward_amount::numeric) AS total_rewards,
        SUM(CASE WHEN claimed = true THEN reward_amount::numeric ELSE 0 END) AS claimed_rewards,
        SUM(CASE WHEN claimed = false THEN reward_amount::numeric ELSE 0 END) AS pending_rewards
      FROM uma_voter_rewards
      GROUP BY voter
    )
    SELECT
      vs.voter AS address,
      vs.total_votes AS "totalVotes",
      vs.correct_votes AS "correctVotes",
      CASE WHEN vs.total_votes > 0 THEN (vs.correct_votes::numeric / vs.total_votes::numeric) * 100 ELSE 0 END AS "accuracy",
      vs.total_weight AS "totalWeight",
      CASE WHEN vs.total_votes > 0 THEN vs.total_weight / vs.total_votes ELSE 0 END AS "avgWeight",
      COALESCE(rs.total_rewards, 0) AS "totalRewards",
      COALESCE(rs.claimed_rewards, 0) AS "claimedRewards",
      COALESCE(rs.pending_rewards, 0) AS "pendingRewards",
      vs.first_vote_at AS "firstVoteAt",
      vs.last_vote_at AS "lastVoteAt"
    FROM vote_stats vs
    LEFT JOIN reward_stats rs ON vs.voter = rs.voter
    ORDER BY vs.total_weight DESC, vs.total_votes DESC
  `);

  return result.rows.map((row) => ({
    address: row.address,
    accuracy: Number(row.accuracy),
    totalVotes: Number(row.totalVotes),
    correctVotes: Number(row.correctVotes),
    totalWeight: Number(row.totalWeight),
    avgWeight: Number(row.avgWeight),
    totalRewards: Number(row.totalRewards),
    claimedRewards: Number(row.claimedRewards),
    pendingRewards: Number(row.pendingRewards),
    firstVoteAt: row.firstVoteAt ? row.firstVoteAt.toISOString() : null,
    lastVoteAt: row.lastVoteAt ? row.lastVoteAt.toISOString() : null,
  }));
}

async function fetchVoterSummary(): Promise<VoterSummary> {
  const result = await query(`
    WITH vote_summary AS (
      SELECT
        COUNT(DISTINCT voter) AS total_voters,
        COUNT(*) AS total_votes,
        SUM(weight::numeric) AS total_weight
      FROM uma_votes
    ),
    reward_summary AS (
      SELECT
        SUM(reward_amount::numeric) AS total_rewards,
        SUM(CASE WHEN claimed = true THEN reward_amount::numeric ELSE 0 END) AS claimed_rewards,
        SUM(CASE WHEN claimed = false THEN reward_amount::numeric ELSE 0 END) AS pending_rewards
      FROM uma_voter_rewards
    )
    SELECT
      vs.total_voters AS "totalVoters",
      vs.total_votes AS "totalVotes",
      vs.total_weight AS "totalWeight",
      COALESCE(rs.total_rewards, 0) AS "totalRewards",
      COALESCE(rs.claimed_rewards, 0) AS "claimedRewards",
      COALESCE(rs.pending_rewards, 0) AS "pendingRewards"
    FROM vote_summary vs, reward_summary rs
  `);

  const row = result.rows[0];
  return {
    totalVoters: Number(row?.totalVoters || 0),
    totalVotes: Number(row?.totalVotes || 0),
    totalWeight: Number(row?.totalWeight || 0),
    totalRewards: Number(row?.totalRewards || 0),
    claimedRewards: Number(row?.claimedRewards || 0),
    pendingRewards: Number(row?.pendingRewards || 0),
  };
}

function generateMockVoterStats(): VoterStats[] {
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

  return voters.map((voter) => {
    const totalVotes = Math.floor(Math.random() * 50) + 10;
    const correctVotes = Math.floor(totalVotes * (Math.random() * 0.4 + 0.6));
    const totalWeight = Math.floor(Math.random() * 100000) + 10000;
    const totalRewards = Math.floor(Math.random() * 5000) + 100;

    return {
      address: voter,
      totalVotes,
      correctVotes,
      accuracy: (correctVotes / totalVotes) * 100,
      totalWeight,
      avgWeight: totalWeight / totalVotes,
      totalRewards,
      claimedRewards: Math.floor(totalRewards * 0.6),
      pendingRewards: Math.floor(totalRewards * 0.4),
      firstVoteAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      lastVoteAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }).sort((a, b) => b.totalWeight - a.totalWeight);
}

function generateMockSummary(): VoterSummary {
  const stats = generateMockVoterStats();
  return {
    totalVoters: stats.length,
    totalVotes: stats.reduce((sum, s) => sum + s.totalVotes, 0),
    totalWeight: stats.reduce((sum, s) => sum + s.totalWeight, 0),
    totalRewards: stats.reduce((sum, s) => sum + s.totalRewards, 0),
    claimedRewards: stats.reduce((sum, s) => sum + s.claimedRewards, 0),
    pendingRewards: stats.reduce((sum, s) => sum + s.pendingRewards, 0),
  };
}

export async function GET(request: NextRequest) {
  const requestStartTime = performance.now();

  try {
    const { searchParams } = new URL(request.url);
    const useMock =
      searchParams.get('useMock') === 'true' || process.env.NODE_ENV === 'development';

    let voterStats: VoterStats[];
    let summary: VoterSummary;

    if (useMock) {
      voterStats = generateMockVoterStats();
      summary = generateMockSummary();
    } else {
      try {
        [voterStats, summary] = await Promise.all([
          fetchVoterStats(),
          fetchVoterSummary(),
        ]);
      } catch {
        voterStats = generateMockVoterStats();
        summary = generateMockSummary();
      }
    }

    const requestTime = performance.now() - requestStartTime;
    logger.info('UMA voters API request completed', {
      performance: { totalRequestTimeMs: Math.round(requestTime) },
      isMock: useMock,
      totalVoters: summary.totalVoters,
      totalVotes: summary.totalVotes,
    });

    return ok({
      voters: voterStats,
      summary,
      isMock: useMock,
      metadata: {
        source: 'uma-optimistic-oracle',
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (err) {
    const requestTime = performance.now() - requestStartTime;

    logger.error('UMA voters API error', {
      error: err,
      performance: { totalRequestTimeMs: Math.round(requestTime) },
    });

    return error(
      new AppError('Failed to fetch UMA voters data', {
        category: 'INTERNAL',
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        details: { message: err instanceof Error ? err.message : 'Unknown error' },
      }),
    );
  }
}
