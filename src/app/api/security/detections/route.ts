import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { ValidationError, createErrorResponse, toAppError } from '@/shared/errors/AppError';
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

  if (startTime && endTime && startTime > endTime) {
    throw new ValidationError('Start time must be before end time', {
      code: 'INVALID_TIME_RANGE',
      details: { startTime, endTime },
    });
  }

  const VALID_PARAM_REGEX = /^[a-zA-Z0-9_/-]+$/;

  const protocol = searchParams.get('protocol') || undefined;
  if (protocol) {
    if (protocol.length > 50) {
      throw new ValidationError('Protocol parameter too long', {
        code: 'INVALID_PROTOCOL',
        details: { protocolLength: protocol.length },
      });
    }
    if (!VALID_PARAM_REGEX.test(protocol)) {
      throw new ValidationError('Invalid protocol format', {
        code: 'INVALID_PROTOCOL_FORMAT',
        details: { protocol },
      });
    }
  }

  const symbol = searchParams.get('symbol') || undefined;
  if (symbol) {
    if (symbol.length > 50) {
      throw new ValidationError('Symbol parameter too long', {
        code: 'INVALID_SYMBOL',
        details: { symbolLength: symbol.length },
      });
    }
    if (!VALID_PARAM_REGEX.test(symbol)) {
      throw new ValidationError('Invalid symbol format', {
        code: 'INVALID_SYMBOL_FORMAT',
        details: { symbol },
      });
    }
  }

  const chain = searchParams.get('chain') || undefined;
  if (chain) {
    if (chain.length > 50) {
      throw new ValidationError('Chain parameter too long', {
        code: 'INVALID_CHAIN',
        details: { chainLength: chain.length },
      });
    }
    if (!VALID_PARAM_REGEX.test(chain)) {
      throw new ValidationError('Invalid chain format', {
        code: 'INVALID_CHAIN_FORMAT',
        details: { chain },
      });
    }
  }

  const type = searchParams.get('type') || undefined;
  if (type) {
    if (type.length > 50) {
      throw new ValidationError('Type parameter too long', {
        code: 'INVALID_TYPE',
        details: { typeLength: type.length },
      });
    }
    if (!VALID_PARAM_REGEX.test(type)) {
      throw new ValidationError('Invalid type format', {
        code: 'INVALID_TYPE_FORMAT',
        details: { type },
      });
    }
  }

  const severity = searchParams.get('severity') || undefined;
  if (severity) {
    if (severity.length > 20) {
      throw new ValidationError('Severity parameter too long', {
        code: 'INVALID_SEVERITY',
        details: { severityLength: severity.length },
      });
    }
    if (!VALID_PARAM_REGEX.test(severity)) {
      throw new ValidationError('Invalid severity format', {
        code: 'INVALID_SEVERITY_FORMAT',
        details: { severity },
      });
    }
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

function buildWhereClause(params: ReturnType<typeof validateParams>): {
  whereClause: string;
  values: (string | number | Date)[];
} {
  const conditions: string[] = [];
  const values: (string | number | Date)[] = [];
  let paramIndex = 1;

  if (params.protocol) {
    conditions.push(`protocol = $${paramIndex++}`);
    values.push(params.protocol);
  }
  if (params.symbol) {
    conditions.push(`symbol = $${paramIndex++}`);
    values.push(params.symbol);
  }
  if (params.chain) {
    conditions.push(`chain = $${paramIndex++}`);
    values.push(params.chain);
  }
  if (params.type) {
    conditions.push(`type = $${paramIndex++}`);
    values.push(params.type);
  }
  if (params.severity) {
    conditions.push(`severity = $${paramIndex++}`);
    values.push(params.severity);
  }
  if (params.startTime) {
    conditions.push(`detected_at >= $${paramIndex++}`);
    values.push(new Date(params.startTime));
  }
  if (params.endTime) {
    conditions.push(`detected_at <= $${paramIndex++}`);
    values.push(new Date(params.endTime));
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  return { whereClause, values };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminWithToken(request, { strict: false });
    if (auth) return auth;

    const { searchParams } = new URL(request.url);
    const params = validateParams(searchParams);
    const { whereClause, values } = buildWhereClause(params);

    const sql = `
      SELECT * FROM manipulation_detections
      ${whereClause}
      ORDER BY detected_at DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;

    const result = await query<DetectionRow>(sql, [...values, params.limit, params.offset]);

    const detections = result.rows.map((row) => ({
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
