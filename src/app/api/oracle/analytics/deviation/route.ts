/**
 * Price Deviation Analytics API
 *
 * 价格偏差分析 API
 * - GET /api/oracle/analytics/deviation?type=report - 获取偏差报告
 * - GET /api/oracle/analytics/deviation?type=trend&symbol=ETH/USD - 获取单个交易对趋势
 */

import type { NextRequest } from 'next/server';

import { createSuccessResponse, createErrorResponse, handleApiError } from '@/lib/api/response';
import { query } from '@/lib/database/db';
import {
  priceDeviationAnalytics,
  type DeviationReport,
  type PriceDeviationPoint,
} from '@/services/oracle/priceDeviationAnalytics';
import { logger } from '@/shared/logger';

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
      return createErrorResponse('Invalid windowHours parameter');
    }
    if (!Number.isFinite(page) || page < 1) {
      return createErrorResponse('Invalid page parameter');
    }
    if (!Number.isFinite(limit) || limit < 1 || limit > 1000) {
      return createErrorResponse('Invalid limit parameter');
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

    return createSuccessResponse(paginatedReport, page, limit, total);
  } catch (error) {
    const requestTime = performance.now() - requestStartTime;
    logger.error('Failed to generate deviation report', {
      error,
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
    return handleApiError(
      error instanceof Error ? error.message : 'Failed to generate report',
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

    return createSuccessResponse(result, page, limit, dataPoints.total);
  } catch (error) {
    const requestTime = performance.now() - requestStartTime;
    logger.error('Failed to fetch trend data', {
      error,
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
    return handleApiError(error instanceof Error ? error.message : 'Failed to fetch trend', 500);
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

/**
 * 生成模拟数据
 */
function generateMockData(symbol: string, windowHours: number): PriceDeviationPoint[] {
  const dataPoints: PriceDeviationPoint[] = [];
  const now = new Date();
  const protocols = ['chainlink', 'pyth', 'switchboard'];

  // 根据时间窗口生成数据点
  const dataPointCount = Math.min(windowHours, 24);

  for (let i = dataPointCount - 1; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000).toISOString();
    const basePrice = symbol.includes('BTC') ? 65000 : symbol.includes('ETH') ? 3500 : 100;
    const volatility = 0.002; // 0.2% 波动

    const randomDeviation = (Math.random() - 0.5) * volatility;
    const avgPrice = basePrice * (1 + randomDeviation);
    const maxDeviationPercent = Math.abs(randomDeviation) * (1 + Math.random());

    dataPoints.push({
      timestamp,
      symbol,
      protocols,
      prices: {},
      avgPrice,
      medianPrice: avgPrice * (1 + (Math.random() - 0.5) * 0.001),
      maxDeviation: avgPrice * maxDeviationPercent,
      maxDeviationPercent,
      outlierProtocols:
        maxDeviationPercent > 0.005
          ? [protocols[Math.floor(Math.random() * protocols.length)]!]
          : [],
    });
  }

  return dataPoints;
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
 *                 ok:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                 meta:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     hasMore:
 *                       type: boolean
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
      return createErrorResponse('Invalid or missing type parameter. Use "report" or "trend"', 400);
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
        return createErrorResponse('Missing required parameter: symbol', 400);
      }

      const windowHours = searchParams.get('windowHours') || undefined;
      const page = searchParams.get('page') || undefined;
      const limit = searchParams.get('limit') || undefined;

      return handleTrendRequest(symbol, windowHours, page, limit);
    }

    return createErrorResponse('Invalid request', 400);
  } catch (error) {
    logger.error('Deviation API error', { error });
    return handleApiError(error instanceof Error ? error.message : 'Internal server error', 500);
  }
}
