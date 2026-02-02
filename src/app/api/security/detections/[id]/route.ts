import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
      .from('manipulation_detections')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      logger.error('Failed to fetch detection', { error: error.message });
      return NextResponse.json(
        { error: 'Detection not found' },
        { status: 404 }
      );
    }

    const row = data as DetectionRow;

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
      priceImpact: row.price_impact,
      financialImpactUsd: row.financial_impact_usd,
      affectedAddresses: row.affected_addresses,
      status: row.status,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).getTime() : undefined,
      notes: row.notes,
    };

    return NextResponse.json({ detection });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error in detection detail API', { error: errorMessage });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
