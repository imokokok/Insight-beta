import type { NextRequest } from 'next/server';
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const protocol = searchParams.get('protocol') || undefined;
    const symbol = searchParams.get('symbol') || undefined;
    const chain = searchParams.get('chain') || undefined;
    const type = searchParams.get('type') || undefined;
    const severity = searchParams.get('severity') || undefined;
    const startTime = searchParams.get('startTime')
      ? parseInt(searchParams.get('startTime')!)
      : undefined;
    const endTime = searchParams.get('endTime')
      ? parseInt(searchParams.get('endTime')!)
      : undefined;
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = createSupabaseClient();

    let query = supabase
      .from('manipulation_detections')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1);

    if (protocol) query = query.eq('protocol', protocol);
    if (symbol) query = query.eq('symbol', symbol);
    if (chain) query = query.eq('chain', chain);
    if (type) query = query.eq('type', type);
    if (severity) query = query.eq('severity', severity);
    if (startTime) query = query.gte('detected_at', new Date(startTime).toISOString());
    if (endTime) query = query.lte('detected_at', new Date(endTime).toISOString());

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to fetch detections', { error: error.message });
      return NextResponse.json({ error: 'Failed to fetch detections' }, { status: 500 });
    }

    const detections = ((data as DetectionRow[]) || []).map((row) => ({
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
    }));

    return NextResponse.json({ detections });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error in detections API', { error: errorMessage });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
