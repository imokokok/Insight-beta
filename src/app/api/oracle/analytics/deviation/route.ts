/**
 * Price Deviation Analytics API
 *
 * 价格偏差分析 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { priceDeviationAnalytics } from '@/server/oracle/priceDeviationAnalytics';
import { logger } from '@/lib/logger';

/**
 * GET /api/oracle/analytics/deviation
 *
 * Query params:
 * - symbol: 交易对 (可选)
 * - type: 'trend' | 'report' | 'anomalies' | 'compare'
 * - symbols: 多个交易对，逗号分隔 (用于 compare)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const type = searchParams.get('type') || 'trend';
    const symbolsParam = searchParams.get('symbols');

    switch (type) {
      case 'trend': {
        if (!symbol) {
          return NextResponse.json(
            { error: 'Symbol is required for trend analysis' },
            { status: 400 }
          );
        }
        const trend = await priceDeviationAnalytics.analyzeDeviationTrend(symbol);
        return NextResponse.json({ success: true, data: trend });
      }

      case 'report': {
        const symbols = symbolsParam ? symbolsParam.split(',') : undefined;
        const report = await priceDeviationAnalytics.generateReport(symbols);
        return NextResponse.json({ success: true, data: report });
      }

      case 'anomalies': {
        if (!symbol) {
          return NextResponse.json(
            { error: 'Symbol is required for anomaly detection' },
            { status: 400 }
          );
        }
        const anomalies = await priceDeviationAnalytics.detectAnomalies(symbol);
        return NextResponse.json({ success: true, data: anomalies });
      }

      case 'compare': {
        if (!symbolsParam) {
          return NextResponse.json(
            { error: 'Symbols are required for comparison' },
            { status: 400 }
          );
        }
        const symbols = symbolsParam.split(',');
        const comparison = await priceDeviationAnalytics.compareSymbols(symbols);
        return NextResponse.json({ success: true, data: comparison });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid type. Use: trend, report, anomalies, compare' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('Deviation analytics API error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
