/**
 * ML Anomaly Detection API
 *
 * ML 异常检测 API
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { ValidationError, createErrorResponse, toAppError } from '@/lib/errors/AppError';
import { logger } from '@/lib/logger';
import { anomalyDetectionService } from '@/server/ai/anomalyDetection';
import { query } from '@/server/db';

interface AnomalyRow {
  id: string;
  symbol: string;
  timestamp: string;
  current_price: number;
  expected_price: number;
  deviation: number;
  confidence: number;
  type: string;
  severity: string;
  details: Record<string, unknown>;
}

/**
 * GET /api/oracle/analytics/anomalies
 *
 * Query params:
 * - symbol: 交易对 (可选)
 * - type: 异常类型 (可选)
 * - severity: 严重级别 (可选)
 * - hours: 查询小时数 (默认 24)
 * - limit: 返回数量限制 (默认 100)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || undefined;
    const type = searchParams.get('type') || undefined;
    const severity = searchParams.get('severity') || undefined;
    const hoursParam = searchParams.get('hours') || '24';
    const limitParam = searchParams.get('limit') || '100';

    const hours = parseInt(hoursParam, 10);
    const limit = parseInt(limitParam, 10);

    if (isNaN(hours) || hours < 1 || hours > 168) {
      throw new ValidationError('hours must be a number between 1 and 168');
    }

    if (isNaN(limit) || limit < 1 || limit > 1000) {
      throw new ValidationError('limit must be a number between 1 and 1000');
    }

    // 查询历史异常数据
    let sql = `
      SELECT 
        id,
        symbol,
        timestamp,
        current_price,
        expected_price,
        deviation,
        confidence,
        type,
        severity,
        details
      FROM price_anomalies
      WHERE timestamp > NOW() - INTERVAL '${hours} hours'
    `;

    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (symbol) {
      sql += ` AND symbol = $${paramIndex}`;
      params.push(symbol);
      paramIndex++;
    }

    if (type) {
      sql += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (severity) {
      sql += ` AND severity = $${paramIndex}`;
      params.push(severity);
      paramIndex++;
    }

    sql += ` ORDER BY timestamp DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await query(sql, params);

    const anomalies = (result.rows as AnomalyRow[]).map((row) => ({
      id: row.id,
      symbol: row.symbol,
      timestamp: new Date(row.timestamp).getTime(),
      currentPrice: row.current_price,
      expectedPrice: row.expected_price,
      deviation: row.deviation,
      confidence: row.confidence,
      type: row.type,
      severity: row.severity,
      details: row.details,
    }));

    // 计算统计信息
    const stats = {
      total: anomalies.length,
      byType: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      averageConfidence: 0,
    };

    if (anomalies.length > 0) {
      anomalies.forEach((a) => {
        stats.byType[a.type] = (stats.byType[a.type] || 0) + 1;
        stats.bySeverity[a.severity] = (stats.bySeverity[a.severity] || 0) + 1;
      });
      stats.averageConfidence =
        anomalies.reduce((sum, a) => sum + a.confidence, 0) / anomalies.length;
    }

    return NextResponse.json({
      anomalies,
      stats,
      meta: {
        symbol,
        type,
        severity,
        hours,
        limit,
      },
    });
  } catch (error: unknown) {
    const appError = toAppError(error);
    logger.error('Error in anomalies API', {
      error: appError.message,
      code: appError.code,
      category: appError.category,
    });
    return NextResponse.json(createErrorResponse(appError), { status: appError.statusCode });
  }
}

/**
 * POST /api/oracle/analytics/anomalies
 *
 * 触发实时异常检测
 */
export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError('Invalid JSON in request body');
    }

    const { symbol } = body as { symbol?: string };

    if (!symbol || typeof symbol !== 'string') {
      throw new ValidationError('Symbol is required and must be a string');
    }

    const anomalies = await anomalyDetectionService.detectAnomalies(symbol);

    return NextResponse.json({
      symbol,
      anomalies,
      detectedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const appError = toAppError(error);
    logger.error('Error detecting anomalies', {
      error: appError.message,
      code: appError.code,
      category: appError.category,
    });
    return NextResponse.json(createErrorResponse(appError), { status: appError.statusCode });
  }
}
