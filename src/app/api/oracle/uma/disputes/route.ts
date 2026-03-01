import type { NextRequest } from 'next/server';

import { error, ok } from '@/lib/api/apiResponse';
import { query } from '@/lib/database/db';
import { AppError } from '@/lib/errors';
import { logger } from '@/shared/logger';

export interface Dispute {
  id: string;
  assertionId: string;
  chain: string;
  identifier: string | null;
  ancillaryData: string | null;
  disputer: string;
  disputeBond: string;
  disputedAt: string;
  votingEndsAt: string | null;
  status: string;
  currentVotesFor: string;
  currentVotesAgainst: string;
  totalVotes: string;
  txHash: string;
  blockNumber: number;
  logIndex: number;
  version: string;
  createdAt: string;
  updatedAt: string;
}

interface DisputesQueryParams {
  disputer?: string;
  status?: string;
  chain?: string;
  assertionId?: string;
  limit: number;
  offset: number;
}

interface DisputeRow {
  id: string;
  instance_id: string;
  chain: string;
  assertion_id: string;
  identifier: string | null;
  ancillary_data: string | null;
  disputer: string;
  dispute_bond: string;
  disputed_at: Date;
  voting_ends_at: Date | null;
  status: string;
  current_votes_for: string;
  current_votes_against: string;
  total_votes: string;
  tx_hash: string;
  block_number: string;
  log_index: number;
  version: string;
  created_at: Date;
  updated_at: Date;
}

function mapRowToDispute(row: DisputeRow): Dispute {
  return {
    id: row.id,
    assertionId: row.assertion_id,
    chain: row.chain,
    identifier: row.identifier,
    ancillaryData: row.ancillary_data,
    disputer: row.disputer,
    disputeBond: row.dispute_bond,
    disputedAt: row.disputed_at.toISOString(),
    votingEndsAt: row.voting_ends_at ? row.voting_ends_at.toISOString() : null,
    status: row.status,
    currentVotesFor: row.current_votes_for,
    currentVotesAgainst: row.current_votes_against,
    totalVotes: row.total_votes,
    txHash: row.tx_hash,
    blockNumber: parseInt(row.block_number, 10),
    logIndex: row.log_index,
    version: row.version,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  const requestStartTime = performance.now();

  try {
    const { searchParams } = new URL(request.url);
    const params: DisputesQueryParams = {
      disputer: searchParams.get('disputer') || undefined,
      status: searchParams.get('status') || undefined,
      chain: searchParams.get('chain') || undefined,
      assertionId: searchParams.get('assertionId') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 100,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0,
    };

    const conditions: string[] = [];
    const queryParams: (string | number)[] = [];
    let paramIndex = 1;

    if (params.disputer) {
      conditions.push(`disputer = $${paramIndex}`);
      queryParams.push(params.disputer.toLowerCase());
      paramIndex++;
    }

    if (params.status) {
      conditions.push(`status = $${paramIndex}`);
      queryParams.push(params.status);
      paramIndex++;
    }

    if (params.chain) {
      conditions.push(`chain = $${paramIndex}`);
      queryParams.push(params.chain);
      paramIndex++;
    }

    if (params.assertionId) {
      conditions.push(`assertion_id = $${paramIndex}`);
      queryParams.push(params.assertionId);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) as total FROM uma_disputes ${whereClause}`;
    const countResult = await query<{ total: string }>(countQuery, queryParams);
    const total = parseInt(countResult.rows[0]?.total || '0', 10);

    const dataQuery = `
      SELECT 
        id,
        instance_id,
        chain,
        assertion_id,
        identifier,
        ancillary_data,
        disputer,
        dispute_bond,
        disputed_at,
        voting_ends_at,
        status,
        current_votes_for,
        current_votes_against,
        total_votes,
        tx_hash,
        block_number,
        log_index,
        version,
        created_at,
        updated_at
      FROM uma_disputes
      ${whereClause}
      ORDER BY disputed_at DESC
      LIMIT $${paramIndex}
      OFFSET $${paramIndex + 1}
    `;

    const dataParams = [...queryParams, params.limit, params.offset];
    const result = await query<DisputeRow>(dataQuery, dataParams);

    const disputes = result.rows.map(mapRowToDispute);

    const requestTime = performance.now() - requestStartTime;
    logger.info('UMA Disputes API request completed', {
      performance: { totalRequestTimeMs: Math.round(requestTime) },
      count: disputes.length,
      total,
      filters: {
        disputer: params.disputer,
        status: params.status,
        chain: params.chain,
        assertionId: params.assertionId,
      },
    });

    return ok({
      disputes,
      total,
      pagination: {
        limit: params.limit,
        offset: params.offset,
        hasMore: params.offset + disputes.length < total,
      },
      metadata: {
        source: 'uma-optimistic-oracle',
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (err) {
    const requestTime = performance.now() - requestStartTime;

    logger.error('UMA Disputes API error', {
      error: err,
      performance: { totalRequestTimeMs: Math.round(requestTime) },
    });

    if (err instanceof Error && err.message === 'missing_database_url') {
      return error(
        new AppError('Database not configured', {
          category: 'INTERNAL',
          statusCode: 503,
          code: 'DATABASE_UNAVAILABLE',
          details: { message: 'Database connection is not available' },
        }),
      );
    }

    return error(
      new AppError('Failed to fetch UMA disputes', {
        category: 'INTERNAL',
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        details: { message: err instanceof Error ? err.message : 'Unknown error' },
      }),
    );
  }
}
