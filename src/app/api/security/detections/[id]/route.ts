import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
      .from('manipulation_detections')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      logger.error('Failed to fetch detection:', error);
      return NextResponse.json(
        { error: 'Detection not found' },
        { status: 404 }
      );
    }

    const detection = {
      id: data.id,
      protocol: data.protocol,
      symbol: data.symbol,
      chain: data.chain,
      feedKey: data.feed_key,
      type: data.type,
      severity: data.severity,
      confidenceScore: data.confidence_score,
      detectedAt: new Date(data.detected_at).getTime(),
      evidence: data.evidence,
      suspiciousTransactions: data.suspicious_transactions,
      relatedBlocks: data.related_blocks,
      priceImpact: data.price_impact,
      financialImpactUsd: data.financial_impact_usd,
      affectedAddresses: data.affected_addresses,
      status: data.status,
      reviewedBy: data.reviewed_by,
      reviewedAt: data.reviewed_at ? new Date(data.reviewed_at).getTime() : undefined,
      notes: data.notes,
    };

    return NextResponse.json({ detection });
  } catch (error) {
    logger.error('Error in detection detail API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
