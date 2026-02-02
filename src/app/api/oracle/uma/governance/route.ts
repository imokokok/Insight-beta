/**
 * UMA Governance API Route
 *
 * UMA 治理数据 API
 * 提供提案、投票、治理统计等信息
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { query } from '@/server/db';

// ============================================================================
// Types
// ============================================================================

type ProposalState = 'Pending' | 'Active' | 'Succeeded' | 'Defeated' | 'Executed' | 'Canceled';

interface Proposal {
  id: string;
  title: string;
  description: string;
  proposer: string;
  state: ProposalState;
  startBlock: number;
  endBlock: number;
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
  quorum: string;
  eta: number | null;
  createdAt: string;
  executedAt: string | null;
  canceledAt: string | null;
  chain: string;
}

interface GovernanceStats {
  totalProposals: number;
  activeProposals: number;
  executedProposals: number;
  defeatedProposals: number;
  totalVotes: number;
  uniqueVoters: number;
  averageParticipation: number;
  totalVotingPower: string;
}

interface Vote {
  id: string;
  proposalId: string;
  voter: string;
  support: 'for' | 'against' | 'abstain';
  votes: string;
  reason: string | null;
  blockNumber: number;
  timestamp: string;
}

// ============================================================================
// GET /api/oracle/uma/governance
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chain = searchParams.get('chain') || 'ethereum';
    const includeProposals = searchParams.get('proposals') !== 'false';
    const includeStats = searchParams.get('stats') !== 'false';
    const state = searchParams.get('state') as ProposalState | null;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const result: {
      proposals?: Proposal[];
      stats?: GovernanceStats;
      votes?: Vote[];
    } = {};

    // 获取提案列表
    if (includeProposals) {
      result.proposals = await fetchProposals(chain, state, limit, offset);
    }

    // 获取治理统计
    if (includeStats) {
      result.stats = await fetchGovernanceStats(chain);
    }

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        chain,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to fetch UMA governance data', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch governance data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 获取提案列表
 */
async function fetchProposals(
  chain: string,
  state: ProposalState | null,
  limit: number,
  offset: number,
): Promise<Proposal[]> {
  try {
    // 从数据库获取提案
    let sql = `
      SELECT 
        id,
        title,
        description,
        proposer,
        state,
        start_block as "startBlock",
        end_block as "endBlock",
        for_votes as "forVotes",
        against_votes as "againstVotes",
        abstain_votes as "abstainVotes",
        quorum,
        eta,
        created_at as "createdAt",
        executed_at as "executedAt",
        canceled_at as "canceledAt",
        chain
      FROM uma_governance_proposals
      WHERE chain = $1
    `;
    const params: (string | number)[] = [chain];
    let paramIndex = 2;

    if (state) {
      sql += ` AND state = $${paramIndex++}`;
      params.push(state);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    if (result.rows.length > 0) {
      return result.rows.map((row) => ({
        id: row.id as string,
        title: row.title as string,
        description: row.description as string,
        proposer: row.proposer as string,
        state: row.state as ProposalState,
        startBlock: row.startBlock as number,
        endBlock: row.endBlock as number,
        forVotes: String(row.forVotes || '0'),
        againstVotes: String(row.againstVotes || '0'),
        abstainVotes: String(row.abstainVotes || '0'),
        quorum: String(row.quorum || '0'),
        eta: row.eta as number | null,
        createdAt: row.createdAt as string,
        executedAt: row.executedAt as string | null,
        canceledAt: row.canceledAt as string | null,
        chain: row.chain as string,
      }));
    }

    // 如果数据库没有数据，返回空数组
    return [];
  } catch (error) {
    logger.error('Failed to fetch proposals', { error, chain });
    return [];
  }
}

/**
 * 获取治理统计
 */
async function fetchGovernanceStats(chain: string): Promise<GovernanceStats> {
  try {
    const result = await query(
      `
      SELECT 
        COUNT(*) as "totalProposals",
        COUNT(CASE WHEN state = 'Active' THEN 1 END) as "activeProposals",
        COUNT(CASE WHEN state = 'Executed' THEN 1 END) as "executedProposals",
        COUNT(CASE WHEN state = 'Defeated' THEN 1 END) as "defeatedProposals",
        COALESCE(SUM(CAST(for_votes AS NUMERIC) + CAST(against_votes AS NUMERIC) + CAST(abstain_votes AS NUMERIC)), 0)::text as "totalVotes",
        COUNT(DISTINCT proposer) as "uniqueVoters"
      FROM uma_governance_proposals
      WHERE chain = $1
    `,
      [chain],
    );

    if (result.rows.length > 0) {
      const row = result.rows[0];
      if (!row) {
        return {
          totalProposals: 0,
          activeProposals: 0,
          executedProposals: 0,
          defeatedProposals: 0,
          totalVotes: 0,
          uniqueVoters: 0,
          averageParticipation: 0,
          totalVotingPower: '0',
        };
      }
      return {
        totalProposals: parseInt(row.totalProposals as string),
        activeProposals: parseInt(row.activeProposals as string),
        executedProposals: parseInt(row.executedProposals as string),
        defeatedProposals: parseInt(row.defeatedProposals as string),
        totalVotes: parseInt(row.totalVotes as string) || 0,
        uniqueVoters: parseInt(row.uniqueVoters as string),
        averageParticipation: 0, // 需要额外计算
        totalVotingPower: '0',
      };
    }

    return getDefaultGovernanceStats();
  } catch (error) {
    logger.error('Failed to fetch governance stats', { error, chain });
    return getDefaultGovernanceStats();
  }
}

/**
 * 获取默认治理统计
 */
function getDefaultGovernanceStats(): GovernanceStats {
  return {
    totalProposals: 0,
    activeProposals: 0,
    executedProposals: 0,
    defeatedProposals: 0,
    totalVotes: 0,
    uniqueVoters: 0,
    averageParticipation: 0,
    totalVotingPower: '0',
  };
}
