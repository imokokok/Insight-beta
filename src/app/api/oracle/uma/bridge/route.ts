/**
 * UMA Bridge Monitoring API Route
 *
 * UMA 跨链桥监控 API
 * 监控跨链桥的交易、余额、状态等信息
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { query } from '@/server/db';

// ============================================================================
// Types
// ============================================================================

interface BridgeTransaction {
  id: string;
  txHash: string;
  fromChain: string;
  toChain: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  token: string;
  status: 'pending' | 'confirmed' | 'completed' | 'failed';
  blockNumber: number;
  timestamp: string;
  confirmations: number;
}

interface BridgeStats {
  totalTransactions: number;
  pendingTransactions: number;
  completedTransactions: number;
  failedTransactions: number;
  totalVolume: string;
  averageConfirmationTime: number;
  activeChains: string[];
}

interface BridgeBalance {
  chain: string;
  token: string;
  balance: string;
  locked: string;
  available: string;
  lastUpdated: string;
}

// ============================================================================
// Query Schema
// ============================================================================

const querySchema = z.object({
  chain: z.string().optional().default('ethereum'),
  fromBlock: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined)),
  toBlock: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined)),
  status: z.enum(['pending', 'confirmed', 'completed', 'failed']).optional(),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 20)),
  offset: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 0)),
});

// ============================================================================
// GET /api/oracle/uma/bridge
// ============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const params = querySchema.parse(Object.fromEntries(searchParams));

    const [transactions, stats, balances] = await Promise.all([
      fetchBridgeTransactions(params),
      fetchBridgeStats(params.chain),
      fetchBridgeBalances(params.chain),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        stats,
        balances,
      },
      meta: {
        chain: params.chain,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to get bridge data', { error });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get bridge data',
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 获取跨链桥交易
 */
async function fetchBridgeTransactions(params: {
  chain: string;
  fromBlock?: number;
  toBlock?: number;
  status?: 'pending' | 'confirmed' | 'completed' | 'failed';
  limit: number;
  offset: number;
}): Promise<BridgeTransaction[]> {
  try {
    let sql = `
      SELECT 
        id,
        tx_hash as "txHash",
        from_chain as "fromChain",
        to_chain as "toChain",
        from_address as "fromAddress",
        to_address as "toAddress",
        amount,
        token,
        status,
        block_number as "blockNumber",
        timestamp,
        confirmations
      FROM uma_bridge_transactions
      WHERE (from_chain = $1 OR to_chain = $1)
    `;
    const queryParams: (string | number)[] = [params.chain];
    let paramIndex = 2;

    if (params.status) {
      sql += ` AND status = $${paramIndex++}`;
      queryParams.push(params.status);
    }

    if (params.fromBlock) {
      sql += ` AND block_number >= $${paramIndex++}`;
      queryParams.push(params.fromBlock);
    }

    if (params.toBlock) {
      sql += ` AND block_number <= $${paramIndex++}`;
      queryParams.push(params.toBlock);
    }

    sql += ` ORDER BY timestamp DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(params.limit, params.offset);

    const result = await query(sql, queryParams);

    if (result.rows.length > 0) {
      return result.rows.map((row) => ({
        id: row.id as string,
        txHash: row.txHash as string,
        fromChain: row.fromChain as string,
        toChain: row.toChain as string,
        fromAddress: row.fromAddress as string,
        toAddress: row.toAddress as string,
        amount: row.amount as string,
        token: row.token as string,
        status: row.status as 'pending' | 'confirmed' | 'completed' | 'failed',
        blockNumber: row.blockNumber as number,
        timestamp: row.timestamp as string,
        confirmations: row.confirmations as number,
      }));
    }

    // 如果数据库没有数据，返回空数组
    return [];
  } catch (error) {
    logger.error('Failed to fetch bridge transactions', { error, params });
    return [];
  }
}

/**
 * 获取跨链桥统计
 */
async function fetchBridgeStats(chain: string): Promise<BridgeStats> {
  try {
    const result = await query(
      `
      SELECT 
        COUNT(*) as "totalTransactions",
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as "pendingTransactions",
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as "completedTransactions",
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as "failedTransactions",
        COALESCE(SUM(CAST(amount AS NUMERIC)), 0)::text as "totalVolume",
        AVG(CASE 
          WHEN status = 'completed' AND completed_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (completed_at - timestamp)) 
          ELSE NULL 
        END) as "averageConfirmationTime"
      FROM uma_bridge_transactions
      WHERE from_chain = $1 OR to_chain = $1
    `,
      [chain],
    );

    if (result.rows.length > 0) {
      const row = result.rows[0]!;
      return {
        totalTransactions: parseInt(row.totalTransactions as string),
        pendingTransactions: parseInt(row.pendingTransactions as string),
        completedTransactions: parseInt(row.completedTransactions as string),
        failedTransactions: parseInt(row.failedTransactions as string),
        totalVolume: (row.totalVolume as string) || '0',
        averageConfirmationTime: parseFloat(row.averageConfirmationTime as string) || 0,
        activeChains: ['ethereum', 'polygon', 'arbitrum'],
      };
    }

    return getDefaultBridgeStats();
  } catch (error) {
    logger.error('Failed to fetch bridge stats', { error, chain });
    return getDefaultBridgeStats();
  }
}

/**
 * 获取跨链桥余额
 */
async function fetchBridgeBalances(chain: string): Promise<BridgeBalance[]> {
  try {
    const result = await query(
      `
      SELECT 
        chain,
        token,
        balance,
        locked,
        available,
        last_updated as "lastUpdated"
      FROM uma_bridge_balances
      WHERE chain = $1
      ORDER BY token
    `,
      [chain],
    );

    if (result.rows.length > 0) {
      return result.rows.map((row) => ({
        chain: row.chain as string,
        token: row.token as string,
        balance: row.balance as string,
        locked: row.locked as string,
        available: row.available as string,
        lastUpdated: row.lastUpdated as string,
      }));
    }

    return [];
  } catch (error) {
    logger.error('Failed to fetch bridge balances', { error, chain });
    return [];
  }
}

/**
 * 获取默认跨链桥统计
 */
function getDefaultBridgeStats(): BridgeStats {
  return {
    totalTransactions: 0,
    pendingTransactions: 0,
    completedTransactions: 0,
    failedTransactions: 0,
    totalVolume: '0',
    averageConfirmationTime: 0,
    activeChains: ['ethereum', 'polygon', 'arbitrum'],
  };
}
