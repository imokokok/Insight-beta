/**
 * Price Health Check Service
 *
 * 价格健康检查服务
 * 监控价格数据的新鲜度和准确性，检测异常价格
 */

import { logger } from '@/lib/logger';
import { query } from '@/server/db';
import { notifyAlert } from '@/server/notifications';

// ============================================================================
// Types
// ============================================================================

export interface PriceHealthConfig {
  maxPriceAgeMs: number; // 价格最大年龄（毫秒）
  maxDeviationPercent: number; // 最大价格偏差百分比
  minDataPoints: number; // 最小数据点数量
  checkIntervalMs: number; // 检查间隔（毫秒）
}

export interface PriceHealthStatus {
  symbol: string;
  isHealthy: boolean;
  lastUpdate: string | null;
  ageMs: number;
  price: number | null;
  deviation: number | null;
  issues: string[];
}

export interface HealthCheckResult {
  timestamp: string;
  overallHealthy: boolean;
  symbols: PriceHealthStatus[];
  summary: {
    total: number;
    healthy: number;
    stale: number;
    deviated: number;
  };
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_CONFIG: PriceHealthConfig = {
  maxPriceAgeMs: 5 * 60 * 1000, // 5 minutes
  maxDeviationPercent: 2, // 2%
  minDataPoints: 3, // At least 3 data sources
  checkIntervalMs: 60 * 1000, // 1 minute
};

// ============================================================================
// Health Check Functions
// ============================================================================

/**
 * 检查单个交易对的价格健康状态
 */
export async function checkSymbolHealth(
  symbol: string,
  config: Partial<PriceHealthConfig> = {},
): Promise<PriceHealthStatus> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const issues: string[] = [];

  try {
    // 获取该交易对的最新价格数据
    const result = await query(
      `
      SELECT 
        p.price,
        p.timestamp,
        i.protocol,
        i.chain
      FROM unified_price_feeds p
      JOIN unified_oracle_instances i ON p.instance_id = i.id
      WHERE p.symbol = $1
        AND p.timestamp > NOW() - INTERVAL '1 hour'
      ORDER BY p.timestamp DESC
      LIMIT 50
      `,
      [symbol],
    );

    if (result.rows.length === 0) {
      return {
        symbol,
        isHealthy: false,
        lastUpdate: null,
        ageMs: Infinity,
        price: null,
        deviation: null,
        issues: ['无价格数据'],
      };
    }

    const latestPrice = result.rows[0];
    if (!latestPrice) {
      return {
        symbol,
        isHealthy: false,
        lastUpdate: null,
        ageMs: 0,
        price: null,
        deviation: null,
        issues: ['无法获取最新价格'],
      } as PriceHealthStatus;
    }
    const lastUpdate = new Date(latestPrice.timestamp as string);
    const ageMs = Date.now() - lastUpdate.getTime();
    const price = latestPrice.price as number;

    // 检查价格新鲜度
    if (ageMs > cfg.maxPriceAgeMs) {
      issues.push(`价格过期: ${Math.round(ageMs / 1000)}秒`);
    }

    // 检查数据源数量
    const uniqueSources = new Set(result.rows.map((r) => `${r.protocol}-${r.chain}`));
    if (uniqueSources.size < cfg.minDataPoints) {
      issues.push(`数据源不足: ${uniqueSources.size}/${cfg.minDataPoints}`);
    }

    // 计算价格偏差（与平均值比较）
    const prices = result.rows.map((r) => r.price as number);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const deviation = Math.abs((price - avgPrice) / avgPrice) * 100;

    if (deviation > cfg.maxDeviationPercent) {
      issues.push(`价格偏差过大: ${deviation.toFixed(2)}%`);
    }

    return {
      symbol,
      isHealthy: issues.length === 0,
      lastUpdate: lastUpdate.toISOString(),
      ageMs,
      price,
      deviation,
      issues,
    };
  } catch (error) {
    logger.error('Failed to check symbol health', { symbol, error });
    return {
      symbol,
      isHealthy: false,
      lastUpdate: null,
      ageMs: Infinity,
      price: null,
      deviation: null,
      issues: ['检查失败: ' + (error instanceof Error ? error.message : String(error))],
    };
  }
}

/**
 * 执行完整的价格健康检查
 */
export async function runHealthCheck(
  symbols?: string[],
  config: Partial<PriceHealthConfig> = {},
): Promise<HealthCheckResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  try {
    // 如果没有指定交易对，获取所有活跃的交易对
    let targetSymbols = symbols;
    if (!targetSymbols || targetSymbols.length === 0) {
      const result = await query(
        `
        SELECT DISTINCT symbol 
        FROM unified_price_feeds 
        WHERE timestamp > NOW() - INTERVAL '24 hours'
        ORDER BY symbol
        `,
      );
      targetSymbols = result.rows.map((r) => r.symbol as string);
    }

    // 检查每个交易对
    const statusPromises = targetSymbols.map((symbol) => checkSymbolHealth(symbol, cfg));
    const statuses = await Promise.all(statusPromises);

    // 计算汇总
    const summary = {
      total: statuses.length,
      healthy: statuses.filter((s) => s.isHealthy).length,
      stale: statuses.filter((s) => s.issues.some((i) => i.includes('过期'))).length,
      deviated: statuses.filter((s) => s.issues.some((i) => i.includes('偏差'))).length,
    };

    const result: HealthCheckResult = {
      timestamp: new Date().toISOString(),
      overallHealthy: summary.healthy === summary.total,
      symbols: statuses,
      summary,
    };

    // 记录检查结果
    logger.info('Price health check completed', {
      total: summary.total,
      healthy: summary.healthy,
      stale: summary.stale,
      deviated: summary.deviated,
    });

    return result;
  } catch (error) {
    logger.error('Health check failed', { error });
    throw error;
  }
}

/**
 * 检测价格异常并发送告警
 */
export async function detectAnomalies(config: Partial<PriceHealthConfig> = {}): Promise<void> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  try {
    const healthCheck = await runHealthCheck(undefined, cfg);

    // 检查不健康的交易对
    const unhealthySymbols = healthCheck.symbols.filter((s) => !s.isHealthy);

    for (const symbol of unhealthySymbols) {
      // 检查是否已经发送过告警（避免重复告警）
      const recentAlert = await query(
        `
        SELECT 1 FROM unified_price_alerts
        WHERE symbol = $1
          AND created_at > NOW() - INTERVAL '15 minutes'
          AND resolved = false
        LIMIT 1
        `,
        [symbol.symbol],
      );

      if (recentAlert.rows.length > 0) {
        continue; // 已有未解决的告警，跳过
      }

      // 创建告警记录
      await query(
        `
        INSERT INTO unified_price_alerts (
          symbol, issue_type, details, severity, created_at, resolved
        ) VALUES ($1, $2, $3, $4, NOW(), false)
        `,
        [
          symbol.symbol,
          symbol.issues[0]?.split(':')[0] || 'UNKNOWN',
          JSON.stringify({
            issues: symbol.issues,
            price: symbol.price,
            ageMs: symbol.ageMs,
            deviation: symbol.deviation,
          }),
          symbol.issues.some((i) => i.includes('偏差')) ? 'high' : 'medium',
        ],
      );

      // 发送通知
      await notifyAlert({
        title: `价格异常: ${symbol.symbol}`,
        message: symbol.issues.join(', '),
        severity: symbol.issues.some((i) => i.includes('偏差')) ? 'critical' : 'warning',
        fingerprint: `price-anomaly-${symbol.symbol}-${Date.now()}`,
      });

      logger.warn('Price anomaly detected', {
        symbol: symbol.symbol,
        issues: symbol.issues,
      });
    }

    // 标记已恢复的交易对
    const healthySymbols = healthCheck.symbols.filter((s) => s.isHealthy).map((s) => s.symbol);

    if (healthySymbols.length > 0) {
      await query(
        `
        UPDATE unified_price_alerts
        SET resolved = true, resolved_at = NOW()
        WHERE symbol = ANY($1)
          AND resolved = false
        `,
        [healthySymbols],
      );
    }
  } catch (error) {
    logger.error('Anomaly detection failed', { error });
    throw error;
  }
}

/**
 * 获取价格健康历史
 */
export async function getHealthHistory(
  symbol: string,
  hours: number = 24,
): Promise<Array<{ timestamp: string; isHealthy: boolean; issues: string[] }>> {
  try {
    const result = await query(
      `
      SELECT 
        DATE_TRUNC('hour', timestamp) as hour,
        BOOL_AND(CASE 
          WHEN timestamp > NOW() - INTERVAL '5 minutes' 
          THEN true 
          ELSE false 
        END) as is_healthy
      FROM unified_price_feeds
      WHERE symbol = $1
        AND timestamp > NOW() - INTERVAL '${hours} hours'
      GROUP BY DATE_TRUNC('hour', timestamp)
      ORDER BY hour DESC
      `,
      [symbol],
    );

    return result.rows.map((row) => ({
      timestamp: row.hour as string,
      isHealthy: row.is_healthy as boolean,
      issues: row.is_healthy ? [] : ['历史数据不健康'],
    }));
  } catch (error) {
    logger.error('Failed to get health history', { symbol, error });
    return [];
  }
}

/**
 * 启动健康检查定时任务
 */
export function startHealthCheckScheduler(config: Partial<PriceHealthConfig> = {}): () => void {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  logger.info('Starting price health check scheduler', {
    intervalMs: cfg.checkIntervalMs,
  });

  // 立即执行一次
  detectAnomalies(cfg).catch((error) => {
    logger.error('Initial health check failed', { error });
  });

  // 设置定时任务
  const intervalId = setInterval(() => {
    detectAnomalies(cfg).catch((error) => {
      logger.error('Scheduled health check failed', { error });
    });
  }, cfg.checkIntervalMs);

  // 返回停止函数
  return () => {
    clearInterval(intervalId);
    logger.info('Price health check scheduler stopped');
  };
}

// ============================================================================
// Health Check API
// ============================================================================

/**
 * 获取健康检查配置
 */
export function getHealthCheckConfig(): PriceHealthConfig {
  return { ...DEFAULT_CONFIG };
}

/**
 * 更新健康检查配置
 */
export function updateHealthCheckConfig(config: Partial<PriceHealthConfig>): PriceHealthConfig {
  Object.assign(DEFAULT_CONFIG, config);
  logger.info('Health check config updated', { config });
  return { ...DEFAULT_CONFIG };
}
