/**
 * Metrics API Route
 *
 * P1 优化：性能监控指标 API
 * - 聚合性能指标
 * - 缓存命中率
 * - 熔断器状态
 * - 告警统计
 */

import { NextResponse } from 'next/server';

import { priceMetrics } from '@/lib/monitoring/priceMetrics';
import { circuitBreakerManager } from '@/shared/utils/resilience';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 动态导入以避免构建时执行
    const { alertRuleEngine } = await import('@/server/oracle/realtime');
    const { priceAggregationEngine } = await import('@/server/oracle/priceAggregation');

    const metrics = {
      // 价格聚合指标
      price: priceMetrics.getSystemMetrics(),

      // 熔断器状态
      circuitBreakers: circuitBreakerManager.getAllStats(),

      // 告警统计
      alerts: alertRuleEngine.getStats(),

      // 引擎统计
      engine: {
        cache: await priceAggregationEngine.getCacheStats(),
      },

      timestamp: Date.now(),
    };

    return NextResponse.json({
      ok: true,
      data: metrics,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to fetch metrics',
      },
      { status: 500 },
    );
  }
}
