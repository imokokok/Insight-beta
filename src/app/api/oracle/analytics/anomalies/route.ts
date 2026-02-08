/**
 * ML Anomaly Detection API
 *
 * ML 异常检测 API
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { ValidationError, createErrorResponse, toAppError } from '@/lib/errors/AppError';
import { logger } from '@/lib/logger';
import { hasDatabase } from '@/server/db';

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

// Mock data for demo mode
function generateMockAnomalies(hours: number, limit: number) {
  const symbols = ['BTC/USD', 'ETH/USD', 'LINK/USD', 'MATIC/USD', 'AVAX/USD', 'SOL/USD'];
  const types = ['statistical', 'seasonal', 'multi_protocol', 'trend_break'];
  const severities = ['low', 'medium', 'high', 'critical'];
  const anomalies = [];

  for (let i = 0; i < Math.min(limit, 20); i++) {
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const type = types[Math.floor(Math.random() * types.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];
    const timestamp = Date.now() - Math.random() * hours * 3600 * 1000;
    const currentPrice = Math.random() * 50000 + 100;
    const deviation = (Math.random() - 0.5) * 10;

    anomalies.push({
      id: `anomaly-${i}`,
      symbol,
      timestamp,
      currentPrice,
      expectedPrice: currentPrice * (1 - deviation / 100),
      deviation,
      confidence: Math.random() * 30 + 70,
      type,
      severity,
      details: {
        description: `${type} anomaly detected for ${symbol}`,
        affectedProtocols: ['Chainlink', 'Pyth'],
      },
    });
  }

  return anomalies.sort((a, b) => b.timestamp - a.timestamp);
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

    // Check if database is available
    if (!hasDatabase()) {
      // Return mock data in demo mode
      const anomalies = generateMockAnomalies(hours, limit);

      // Filter by symbol if specified
      let filteredAnomalies = anomalies;
      if (symbol) {
        filteredAnomalies = filteredAnomalies.filter((a) => a.symbol === symbol);
      }
      if (type) {
        filteredAnomalies = filteredAnomalies.filter((a) => a.type === type);
      }
      if (severity) {
        filteredAnomalies = filteredAnomalies.filter((a) => a.severity === severity);
      }

      // Calculate stats
      const stats = {
        total: filteredAnomalies.length,
        byType: {} as Record<string, number>,
        bySeverity: {} as Record<string, number>,
        averageConfidence: 0,
      };

      if (filteredAnomalies.length > 0) {
        filteredAnomalies.forEach((a) => {
          const typeKey = a.type as string;
          const severityKey = a.severity as string;
          stats.byType[typeKey] = (stats.byType[typeKey] || 0) + 1;
          stats.bySeverity[severityKey] = (stats.bySeverity[severityKey] || 0) + 1;
        });
        stats.averageConfidence =
          filteredAnomalies.reduce((sum, a) => sum + a.confidence, 0) / filteredAnomalies.length;
      }

      return NextResponse.json({
        anomalies: filteredAnomalies,
        stats,
        meta: {
          symbol,
          type,
          severity,
          hours,
          limit,
          demo: true,
        },
      });
    }

    // Database mode - import query dynamically
    const { query } = await import('@/server/db');

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

    // Check if database is available
    if (!hasDatabase()) {
      // Return mock detection result in demo mode
      const mockAnomalies = generateMockAnomalies(24, 5).filter((a) => a.symbol === symbol);

      return NextResponse.json({
        symbol,
        anomalies: mockAnomalies,
        detectedAt: new Date().toISOString(),
        demo: true,
      });
    }

    // Database mode - import service dynamically
    const { anomalyDetectionService } = await import('@/server/ai/anomalyDetection');
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
