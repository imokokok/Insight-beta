/**
 * Price Deviation Analytics API
 *
 * 价格偏差分析 API
 * - GET /api/oracle/analytics/deviation?type=report - 获取偏差报告
 * - GET /api/oracle/analytics/deviation?type=trend&symbol=ETH/USD - 获取单个交易对趋势
 */

import type { NextRequest } from 'next/server';

import {
  priceDeviationAnalytics,
  type DeviationReport,
  type PriceDeviationPoint,
} from '@/features/oracle/services/priceDeviationAnalytics';
import { ok, error } from '@/lib/api/apiResponse';
import { query } from '@/lib/database/db';
import { logger } from '@/shared/logger';
import { generateMockData } from '@/shared/utils/mockData';

// ============================================================================
// Report 处理
// ============================================================================

async function handleReportRequest(
  symbolsParam?: string,
  windowHoursParam?: string,
  pageParam?: string,
  limitParam?: string,
): Promise<Response> {
  const requestStartTime = performance.now();

  try {
    const windowHours = parseInt(windowHoursParam || '24', 10);
    const page = parseInt(pageParam || '1', 10);
    const limit = parseInt(limitParam || '50', 10);

    // 验证输入参数
    if (!Number.isFinite(windowHours) || windowHours <= 0 || windowHours > 8760) {
      return error({ code: 'invalid_windowHours', message: 'Invalid windowHours parameter' }, 400);
    }
    if (!Number.isFinite(page) || page < 1) {
      return error({ code: 'invalid_page', message: 'Invalid page parameter' }, 400);
    }
    if (!Number.isFinite(limit) || limit < 1 || limit > 1000) {
      return error({ code: 'invalid_limit', message: 'Invalid limit parameter' }, 400);
    }

    // 解析交易对列表
    let symbols: string[] | undefined;
    if (symbolsParam) {
      symbols = symbolsParam.split(',').map((s) => s.trim().toUpperCase());
    }

    // 更新配置
    priceDeviationAnalytics.updateConfig({
      analysisWindowHours: windowHours,
    });

    // 生成报告
    const report = await priceDeviationAnalytics.generateReport(symbols);

    // 分页处理 trends
    const allTrends = report.trends;
    const total = allTrends.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTrends = allTrends.slice(startIndex, endIndex);

    // 分页处理 anomalies
    const allAnomalies = report.anomalies;
    const anomaliesStartIndex = (page - 1) * limit;
    const anomaliesEndIndex = anomaliesStartIndex + limit;
    const paginatedAnomalies = allAnomalies.slice(anomaliesStartIndex, anomaliesEndIndex);

    const paginatedReport: DeviationReport = {
      ...report,
      trends: paginatedTrends,
      anomalies: paginatedAnomalies,
    };

    const requestTime = performance.now() - requestStartTime;

    // 性能日志
    logger.info('Deviation report API request completed', {
      performance: {
        totalRequestTimeMs: Math.round(requestTime),
        apiLayerTimeMs: Math.round(
          requestTime - (report as unknown as { _generationTimeMs?: number })._generationTimeMs!,
        ),
      },
      requestParams: {
        type: 'report',
        symbols: symbols ?? 'all',
        windowHours,
        page,
        limit,
      },
      responseStats: {
        totalTrends: total,
        returnedTrends: paginatedTrends.length,
        totalAnomalies: allAnomalies.length,
        returnedAnomalies: paginatedAnomalies.length,
      },
    });

    return ok(paginatedReport, { page, pageSize: limit, total });
  } catch (err) {
    const requestTime = performance.now() - requestStartTime;
    logger.error('Failed to generate deviation report', {
      error: err,
      performance: {
        totalRequestTimeMs: Math.round(requestTime),
        failedAt: new Date().toISOString(),
      },
      requestParams: {
        type: 'report',
        symbols: symbolsParam ?? 'all',
        windowHours: windowHoursParam,
      },
    });
    return error(
      { code: 'report_generation_failed', message: err instanceof Error ? err.message : 'Failed to generate report' },
      500,
    );
  }
}

// ============================================================================
// Trend 处理
// ============================================================================

async function handleTrendRequest(
  symbol: string,
  windowHoursParam?: string,
  pageParam?: string,
  limitParam?: string,
): Promise<Response> {
  const requestStartTime = performance.now();

  try {
    const windowHours = parseInt(windowHoursParam || '24', 10);
    const page = parseInt(pageParam || '1', 10);
    const limit = parseInt(limitParam || '100', 10);

    // 更新配置
    priceDeviationAnalytics.updateConfig({
      analysisWindowHours: windowHours,
    });

    // 获取趋势分析
    const trend = await priceDeviationAnalytics.analyzeDeviationTrend(symbol);

    // 获取历史数据点（分页）
    const dataPoints = await fetchDeviationHistoryPaginated(symbol, windowHours, page, limit);

    const result = {
      trend,
      dataPoints: dataPoints.data,
      pagination: {
        page,
        limit,
        total: dataPoints.total,
        hasMore: page * limit < dataPoints.total,
      },
    };

    const requestTime = performance.now() - requestStartTime;

    // 性能日志
    logger.info('Deviation trend API request completed', {
      performance: {
        totalRequestTimeMs: Math.round(requestTime),
      },
      requestParams: {
        type: 'trend',
        symbol,
        windowHours,
        page,
        limit,
      },
      responseStats: {
        trendDirection: trend.trendDirection,
        trendStrength: trend.trendStrength,
        dataPointsReturned: dataPoints.data.length,
        totalDataPoints: dataPoints.total,
      },
    });

    return ok(result, { page, pageSize: limit, total: dataPoints.total });
  } catch (err) {
    const requestTime = performance.now() - requestStartTime;
    logger.error('Failed to fetch trend data', {
      error: err,
      symbol,
      performance: {
        totalRequestTimeMs: Math.round(requestTime),
        failedAt: new Date().toISOString(),
      },
      requestParams: {
        type: 'trend',
        symbol,
        windowHours: windowHoursParam,
      },
    });
    return error({ code: 'trend_fetch_failed', message: err instanceof Error ? err.message : 'Failed to fetch trend' }, 500);
  }
}

/**
 * 分页获取偏差历史数据
 */
async function fetchDeviationHistoryPaginated(
  symbol: string,
  windowHours: number,
  page: number,
  limit: number,
): Promise<{ data: PriceDeviationPoint[]; total: number }> {
  try {
    // 验证 windowHours 范围
    if (!Number.isFinite(windowHours) || windowHours <= 0 || windowHours > 8760) {
      throw new Error('Invalid windowHours parameter');
    }

    // 先获取总数 - 使用参数化查询防止 SQL 注入
    // 使用 INTERVAL '1 hours' * $2 的方式避免字符串拼接
    const countResult = await query(
      `
      SELECT COUNT(*) as total
      FROM cross_oracle_comparisons
      WHERE symbol = $1
        AND timestamp > NOW() - INTERVAL '1 hours' * $2
      `,
      [symbol, windowHours],
    );

    const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

    if (total === 0) {
      // 返回模拟数据
      const mockData = generateMockData(symbol, windowHours);
      return { data: mockData, total: mockData.length };
    }

    // 分页查询数据 - 使用参数化查询防止 SQL 注入
    const offset = (page - 1) * limit;
    const result = await query(
      `
      SELECT 
        timestamp,
        symbol,
        avg_price,
        median_price,
        max_deviation,
        max_deviation_percent,
        outlier_protocols,
        participating_protocols,
        min_price,
        max_price
      FROM cross_oracle_comparisons
      WHERE symbol = $1
        AND timestamp > NOW() - INTERVAL '1 hours' * $4
      ORDER BY timestamp DESC
      LIMIT $2 OFFSET $3
      `,
      [symbol, limit, offset, windowHours],
    );

    const data: PriceDeviationPoint[] = result.rows.map((row) => ({
      timestamp: row.timestamp,
      symbol: row.symbol,
      protocols: row.participating_protocols || [],
      prices: {}, // cross_oracle_comparisons 表不存储单个协议价格，需要从其他表获取
      avgPrice: parseFloat(row.avg_price),
      medianPrice: parseFloat(row.median_price),
      maxDeviation: parseFloat(row.max_deviation),
      maxDeviationPercent: parseFloat(row.max_deviation_percent),
      outlierProtocols: row.outlier_protocols || [],
    }));

    return { data, total };
  } catch (error) {
    logger.warn('Database query failed in fetchDeviationHistoryPaginated, returning mock data', {
      error,
      symbol,
    });
    // 返回模拟数据
    const mockData = generateMockData(symbol, windowHours);
    return { data: mockData, total: mockData.length };
  }
}

// ============================================================================
// 主处理函数
// ============================================================================

/**
 * @swagger
 * /api/oracle/analytics/deviation:
 *   get:
 *     summary: 价格偏差分析 API
 *     description: |
 *       获取价格偏差分析报告或单个交易对趋势数据。
 *       支持分页和时间窗口参数。
 *     tags:
 *       - Oracle
 *       - Analytics
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [report, trend]
 *         description: 查询类型 - report(报告) 或 trend(趋势)
 *       - in: query
 *         name: symbol
 *         schema:
 *           type: string
 *         description: 交易对（如 ETH/USD），type=trend 时必需
 *       - in: query
 *         name: symbols
 *         schema:
 *           type: string
 *         description: 逗号分隔的交易对列表，type=report 时使用
 *       - in: query
 *         name: windowHours
 *         schema:
 *           type: integer
 *           default: 24
 *         description: 时间窗口（小时）
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: 每页数量
 *     responses:
 *       200:
 *         description: 成功获取偏差分析数据
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     pageSize:
 *                       type: integer
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器错误
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);

    const type = searchParams.get('type');

    if (!type || (type !== 'report' && type !== 'trend')) {
      return error({ code: 'invalid_type', message: 'Invalid or missing type parameter. Use "report" or "trend"' }, 400);
    }

    if (type === 'report') {
      const symbols = searchParams.get('symbols') || undefined;
      const windowHours = searchParams.get('windowHours') || undefined;
      const page = searchParams.get('page') || undefined;
      const limit = searchParams.get('limit') || undefined;

      return handleReportRequest(symbols, windowHours, page, limit);
    }

    if (type === 'trend') {
      const symbol = searchParams.get('symbol');

      if (!symbol) {
        return error({ code: 'missing_symbol', message: 'Missing required parameter: symbol' }, 400);
      }

      const windowHours = searchParams.get('windowHours') || undefined;
      const page = searchParams.get('page') || undefined;
      const limit = searchParams.get('limit') || undefined;

      return handleTrendRequest(symbol, windowHours, page, limit);
    }

    return error({ code: 'invalid_request', message: 'Invalid request' }, 400);
  } catch (err) {
    logger.error('Deviation API error', { error: err });
    return error({ code: 'internal_error', message: err instanceof Error ? err.message : 'Internal server error' }, 500);
  }
}
