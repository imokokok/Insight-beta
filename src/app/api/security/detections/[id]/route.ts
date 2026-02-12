import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { logger } from '@/shared/logger';
import { query } from '@/infrastructure/database/db';
import { requireAdminWithToken } from '@/infrastructure/api/apiResponse';

interface DetectionRow {
  id: string;
  protocol: string;
  symbol: string;
  chain: string;
  feed_key: string;
  type: string;
  severity: string;
  confidence_score: number;
  detected_at: string;
  evidence: unknown;
  suspicious_transactions: unknown;
  related_blocks: number[];
  price_impact: number | null;
  financial_impact_usd: number | null;
  affected_addresses: string[];
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminWithToken(request as NextRequest, { strict: false });
    if (auth) return auth;

    const { id } = await params;

    const result = await query<DetectionRow>(
      `SELECT * FROM manipulation_detections WHERE id = $1 LIMIT 1`,
      [id],
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Detection not found' }, { status: 404 });
    }

    const row = result.rows[0]!;

    const detection = {
      id: row.id,
      protocol: row.protocol,
      symbol: row.symbol,
      chain: row.chain,
      feedKey: row.feed_key,
      type: row.type,
      severity: row.severity,
      confidenceScore: row.confidence_score,
      detectedAt: new Date(row.detected_at).getTime(),
      evidence: row.evidence,
      suspiciousTransactions: row.suspicious_transactions,
      relatedBlocks: row.related_blocks,
      priceImpact: row.price_impact ?? undefined,
      financialImpactUsd: row.financial_impact_usd ?? undefined,
      affectedAddresses: row.affected_addresses,
      status: row.status,
      reviewedBy: row.reviewed_by ?? undefined,
      reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).getTime() : undefined,
      notes: row.notes ?? undefined,
    };

    return NextResponse.json({ detection });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error in detection detail API', { error: errorMessage });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
