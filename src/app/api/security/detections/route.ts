import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { AppError, ValidationError, createErrorResponse, toAppError } from '@/lib/errors/AppError';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase/server';

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

function validateParams(searchParams: URLSearchParams): {
  protocol?: string;
  symbol?: string;
  chain?: string;
  type?: string;
  severity?: string;
  startTime?: number;
  endTime?: number;
  limit: number;
  offset: number;
} {
  // 验证 limit 和 offset
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : 100;
  if (isNaN(limit) || limit < 1 || limit > 1000) {
    throw new ValidationError('Limit must be a number between 1 and 1000', {
      code: 'INVALID_LIMIT',
      details: { limit: limitParam },
    });
  }

  const offsetParam = searchParams.get('offset');
  const offset = offsetParam ? parseInt(offsetParam, 10) : 0;
  if (isNaN(offset) || offset < 0) {
    throw new ValidationError('Offset must be a non-negative number', {
      code: 'INVALID_OFFSET',
      details: { offset: offsetParam },
    });
  }

  // 验证时间戳
  const startTimeParam = searchParams.get('startTime');
  let startTime: number | undefined;
  if (startTimeParam) {
    startTime = parseInt(startTimeParam, 10);
    if (isNaN(startTime) || startTime < 0) {
      throw new ValidationError('Invalid start time format', {
        code: 'INVALID_START_TIME',
        details: { startTime: startTimeParam },
      });
    }
  }

  const endTimeParam = searchParams.get('endTime');
  let endTime: number | undefined;
  if (endTimeParam) {
    endTime = parseInt(endTimeParam, 10);
    if (isNaN(endTime) || endTime < 0) {
      throw new ValidationError('Invalid end time format', {
        code: 'INVALID_END_TIME',
        details: { endTime: endTimeParam },
      });
    }
  }

  // 验证时间范围
  if (startTime && endTime && startTime > endTime) {
    throw new ValidationError('Start time must be before end time', {
      code: 'INVALID_TIME_RANGE',
      details: { startTime, endTime },
    });
  }

  // 验证字符串参数长度（防止 DoS）
  const protocol = searchParams.get('protocol') || undefined;
  if (protocol && protocol.length > 50) {
    throw new ValidationError('Protocol parameter too long', {
      code: 'INVALID_PROTOCOL',
      details: { protocolLength: protocol.length },
    });
  }

  const symbol = searchParams.get('symbol') || undefined;
  if (symbol && symbol.length > 50) {
    throw new ValidationError('Symbol parameter too long', {
      code: 'INVALID_SYMBOL',
      details: { symbolLength: symbol.length },
    });
  }

  const chain = searchParams.get('chain') || undefined;
  if (chain && chain.length > 50) {
    throw new ValidationError('Chain parameter too long', {
      code: 'INVALID_CHAIN',
      details: { chainLength: chain.length },
    });
  }

  const type = searchParams.get('type') || undefined;
  if (type && type.length > 50) {
    throw new ValidationError('Type parameter too long', {
      code: 'INVALID_TYPE',
      details: { typeLength: type.length },
    });
  }

  const severity = searchParams.get('severity') || undefined;
  if (severity && severity.length > 20) {
    throw new ValidationError('Severity parameter too long', {
      code: 'INVALID_SEVERITY',
      details: { severityLength: severity.length },
    });
  }

  return {
    protocol,
    symbol,
    chain,
    type,
    severity,
    startTime,
    endTime,
    limit,
    offset,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 验证参数
    const params = validateParams(searchParams);

    const supabase = supabaseAdmin;

    let query = supabase
      .from('manipulation_detections')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(params.limit)
      .range(params.offset, params.offset + params.limit - 1);

    if (params.protocol) query = query.eq('protocol', params.protocol);
    if (params.symbol) query = query.eq('symbol', params.symbol);
    if (params.chain) query = query.eq('chain', params.chain);
    if (params.type) query = query.eq('type', params.type);
    if (params.severity) query = query.eq('severity', params.severity);
    if (params.startTime)
      query = query.gte('detected_at', new Date(params.startTime).toISOString());
    if (params.endTime) query = query.lte('detected_at', new Date(params.endTime).toISOString());

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to fetch detections', { error: error.message });
      return NextResponse.json(
        createErrorResponse(
          new AppError('Failed to fetch detections', {
            category: 'INTERNAL',
            statusCode: 500,
            code: 'DATABASE_ERROR',
            cause: error,
          }),
        ),
        { status: 500 },
      );
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
  } catch (error: unknown) {
    const appError = toAppError(error);
    logger.error('Error in detections API', {
      error: appError.message,
      code: appError.code,
      category: appError.category,
    });
    return NextResponse.json(createErrorResponse(appError), { status: appError.statusCode });
  }
}
