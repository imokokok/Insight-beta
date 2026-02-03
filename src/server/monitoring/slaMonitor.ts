/**
 * SLA Monitor Service
 *
 * SLA 监控服务 - 服务质量监控和报告
 */

import { query } from '@/server/db';
import { logger } from '@/lib/logger';

// ============================================================================
// 类型定义
// ============================================================================

export interface SLAMetric {
  id: string;
  protocol: string;
  chain: string;
  metricType: 'uptime' | 'latency' | 'accuracy' | 'availability';
  value: number;
  target: number;
  threshold: number;
  status: 'healthy' | 'warning' | 'critical';
  timestamp: Date;
}

export interface SLAReport {
  protocol: string;
  chain: string;
  period: '1h' | '24h' | '7d' | '30d';
  uptime: number;
  avgLatency: number;
  maxLatency: number;
  accuracy: number;
  availability: number;
  totalRequests: number;
  failedRequests: number;
  slaCompliance: number;
  status: 'compliant' | 'at_risk' | 'breached';
  details: SLADetail[];
}

export interface SLADetail {
  timestamp: Date;
  metric: string;
  value: number;
  target: number;
  status: 'pass' | 'fail';
}

export interface SLAConfig {
  uptimeTarget: number; // 99.9%
  latencyTarget: number; // 500ms
  accuracyTarget: number; // 99.5%
  availabilityTarget: number; // 99.9%
  warningThreshold: number; // 95%
  criticalThreshold: number; // 90%
}

// ============================================================================
// SLA 配置
// ============================================================================

const DEFAULT_SLA_CONFIG: SLAConfig = {
  uptimeTarget: 99.9,
  latencyTarget: 500,
  accuracyTarget: 99.5,
  availabilityTarget: 99.9,
  warningThreshold: 95,
  criticalThreshold: 90,
};

// ============================================================================
// SLA 监控服务
// ============================================================================

export class SLAMonitor {
  private config: SLAConfig;
  private isMonitoring: boolean = false;
  private monitorInterval?: NodeJS.Timeout;

  constructor(config: Partial<SLAConfig> = {}) {
    this.config = { ...DEFAULT_SLA_CONFIG, ...config };
  }

  // ============================================================================
  // 监控控制
  // ============================================================================

  startMonitoring(intervalMs: number = 60000): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitorInterval = setInterval(async () => {
      await this.collectMetrics();
    }, intervalMs);

    logger.info('SLA monitoring started', { intervalMs });
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = undefined;
    }

    logger.info('SLA monitoring stopped');
  }

  // ============================================================================
  // 指标收集
  // ============================================================================

  private async collectMetrics(): Promise<void> {
    try {
      // 获取所有活跃的实例
      const instances = await query(
        `SELECT DISTINCT protocol, chain FROM unified_oracle_instances WHERE enabled = true`,
      );

      for (const instance of instances.rows) {
        await this.collectProtocolMetrics(instance.protocol, instance.chain);
      }
    } catch (error) {
      logger.error('Failed to collect SLA metrics', { error });
    }
  }

  private async collectProtocolMetrics(protocol: string, chain: string): Promise<void> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // 计算可用性
    const availability = await this.calculateAvailability(protocol, chain, oneHourAgo, now);

    // 计算延迟
    const latency = await this.calculateLatency(protocol, chain, oneHourAgo, now);

    // 计算准确性
    const accuracy = await this.calculateAccuracy(protocol, chain, oneHourAgo, now);

    // 计算正常运行时间
    const uptime = await this.calculateUptime(protocol, chain);

    // 保存指标
    await this.saveMetrics(protocol, chain, {
      availability,
      latency,
      accuracy,
      uptime,
    });
  }

  private async calculateAvailability(
    protocol: string,
    chain: string,
    from: Date,
    to: Date,
  ): Promise<number> {
    const result = await query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_stale = false THEN 1 END) as available
      FROM unified_price_feeds
      WHERE protocol = $1 AND chain = $2
      AND timestamp >= $3 AND timestamp <= $4`,
      [protocol, chain, from, to],
    );

    const total = parseInt(result.rows[0]?.total || 0);
    const available = parseInt(result.rows[0]?.available || 0);

    return total > 0 ? (available / total) * 100 : 100;
  }

  private async calculateLatency(
    protocol: string,
    chain: string,
    from: Date,
    to: Date,
  ): Promise<{ avg: number; max: number }> {
    const result = await query(
      `SELECT 
        AVG(EXTRACT(EPOCH FROM (NOW() - timestamp))) as avg_latency,
        MAX(EXTRACT(EPOCH FROM (NOW() - timestamp))) as max_latency
      FROM unified_price_feeds
      WHERE protocol = $1 AND chain = $2
      AND timestamp >= $3 AND timestamp <= $4`,
      [protocol, chain, from, to],
    );

    return {
      avg: parseFloat(result.rows[0]?.avg_latency || 0) * 1000, // 转换为毫秒
      max: parseFloat(result.rows[0]?.max_latency || 0) * 1000,
    };
  }

  private async calculateAccuracy(
    protocol: string,
    chain: string,
    from: Date,
    to: Date,
  ): Promise<number> {
    // 获取该协议的价格数据
    const protocolPrices = await query(
      `SELECT symbol, price, timestamp
      FROM unified_price_feeds
      WHERE protocol = $1 AND chain = $2
      AND timestamp >= $3 AND timestamp <= $4
      ORDER BY timestamp DESC`,
      [protocol, chain, from, to],
    );

    if (protocolPrices.rows.length === 0) return 100;

    // 获取其他协议的价格数据进行对比
    const allPrices = await query(
      `SELECT protocol, symbol, price, timestamp
      FROM unified_price_feeds
      WHERE chain = $1 AND timestamp >= $2 AND timestamp <= $3
      ORDER BY timestamp DESC`,
      [chain, from, to],
    );

    // 计算准确性（价格偏差在 1% 以内的比例）
    let accurateCount = 0;
    let totalCount = 0;

    for (const price of protocolPrices.rows) {
      const otherPrices = allPrices.rows.filter(
        (p) => p.symbol === price.symbol && p.protocol !== protocol,
      );

      if (otherPrices.length === 0) continue;

      const avgPrice =
        otherPrices.reduce((sum, p) => sum + parseFloat(p.price), 0) / otherPrices.length;
      const deviation = Math.abs((parseFloat(price.price) - avgPrice) / avgPrice);

      if (deviation <= 0.01) accurateCount++;
      totalCount++;
    }

    return totalCount > 0 ? (accurateCount / totalCount) * 100 : 100;
  }

  private async calculateUptime(protocol: string, chain: string): Promise<number> {
    const result = await query(
      `SELECT 
        COUNT(*) as total_checks,
        COUNT(CASE WHEN status = 'healthy' THEN 1 END) as healthy_checks
      FROM unified_sync_state
      WHERE protocol = $1 AND chain = $2
      AND updated_at >= NOW() - INTERVAL '24 hours'`,
      [protocol, chain],
    );

    const total = parseInt(result.rows[0]?.total_checks || 0);
    const healthy = parseInt(result.rows[0]?.healthy_checks || 0);

    return total > 0 ? (healthy / total) * 100 : 100;
  }

  private async saveMetrics(
    protocol: string,
    chain: string,
    metrics: {
      availability: number;
      latency: { avg: number; max: number };
      accuracy: number;
      uptime: number;
    },
  ): Promise<void> {
    const timestamp = new Date();

    await query(
      `INSERT INTO sla_metrics 
      (protocol, chain, metric_type, value, target, threshold, status, timestamp)
      VALUES 
      ($1, $2, 'uptime', $3, $4, $5, $6, $7),
      ($1, $2, 'latency', $8, $9, $10, $11, $7),
      ($1, $2, 'accuracy', $12, $13, $14, $15, $7),
      ($1, $2, 'availability', $16, $17, $18, $19, $7)`,
      [
        protocol,
        chain,
        metrics.uptime,
        this.config.uptimeTarget,
        this.config.criticalThreshold,
        this.getMetricStatus(metrics.uptime, this.config.uptimeTarget),
        timestamp,
        metrics.latency.avg,
        this.config.latencyTarget,
        this.config.latencyTarget * 2,
        this.getLatencyStatus(metrics.latency.avg),
        metrics.accuracy,
        this.config.accuracyTarget,
        this.config.criticalThreshold,
        this.getMetricStatus(metrics.accuracy, this.config.accuracyTarget),
        metrics.availability,
        this.config.availabilityTarget,
        this.config.criticalThreshold,
        this.getMetricStatus(metrics.availability, this.config.availabilityTarget),
      ],
    );
  }

  private getMetricStatus(value: number, target: number): 'healthy' | 'warning' | 'critical' {
    if (value >= target) return 'healthy';
    if (value >= this.config.warningThreshold) return 'warning';
    return 'critical';
  }

  private getLatencyStatus(latency: number): 'healthy' | 'warning' | 'critical' {
    if (latency <= this.config.latencyTarget) return 'healthy';
    if (latency <= this.config.latencyTarget * 2) return 'warning';
    return 'critical';
  }

  // ============================================================================
  // 报告生成
  // ============================================================================

  async generateReport(
    protocol: string,
    chain: string,
    period: '1h' | '24h' | '7d' | '30d' = '24h',
  ): Promise<SLAReport> {
    const now = new Date();
    const periodMap = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };
    const from = new Date(now.getTime() - periodMap[period]);

    // 获取指标数据
    const metrics = await query(
      `SELECT metric_type, AVG(value) as avg_value, MAX(value) as max_value
      FROM sla_metrics
      WHERE protocol = $1 AND chain = $2
      AND timestamp >= $3 AND timestamp <= $4
      GROUP BY metric_type`,
      [protocol, chain, from, now],
    );

    const metricMap = new Map(metrics.rows.map((row) => [row.metric_type, row]));

    const uptime = parseFloat(metricMap.get('uptime')?.avg_value || 99.9);
    const avgLatency = parseFloat(metricMap.get('latency')?.avg_value || 0);
    const maxLatency = parseFloat(metricMap.get('latency')?.max_value || 0);
    const accuracy = parseFloat(metricMap.get('accuracy')?.avg_value || 99.9);
    const availability = parseFloat(metricMap.get('availability')?.avg_value || 99.9);

    // 计算 SLA 合规性
    const slaCompliance = this.calculateSLACompliance({
      uptime,
      latency: avgLatency,
      accuracy,
      availability,
    });

    // 获取请求统计
    const requestStats = await query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_stale = true THEN 1 END) as failed
      FROM unified_price_feeds
      WHERE protocol = $1 AND chain = $2
      AND timestamp >= $3`,
      [protocol, chain, from],
    );

    const totalRequests = parseInt(requestStats.rows[0]?.total || 0);
    const failedRequests = parseInt(requestStats.rows[0]?.failed || 0);

    // 生成详细记录
    const details = await this.generateDetails(protocol, chain, from, now);

    return {
      protocol,
      chain,
      period,
      uptime,
      avgLatency,
      maxLatency,
      accuracy,
      availability,
      totalRequests,
      failedRequests,
      slaCompliance,
      status: this.getSLAStatus(slaCompliance),
      details,
    };
  }

  private calculateSLACompliance(metrics: {
    uptime: number;
    latency: number;
    accuracy: number;
    availability: number;
  }): number {
    const uptimeScore = Math.min(metrics.uptime / this.config.uptimeTarget, 1) * 25;
    const latencyScore = Math.min(this.config.latencyTarget / metrics.latency, 1) * 25;
    const accuracyScore = Math.min(metrics.accuracy / this.config.accuracyTarget, 1) * 25;
    const availabilityScore =
      Math.min(metrics.availability / this.config.availabilityTarget, 1) * 25;

    return uptimeScore + latencyScore + accuracyScore + availabilityScore;
  }

  private getSLAStatus(compliance: number): 'compliant' | 'at_risk' | 'breached' {
    if (compliance >= 95) return 'compliant';
    if (compliance >= 80) return 'at_risk';
    return 'breached';
  }

  private async generateDetails(
    protocol: string,
    chain: string,
    from: Date,
    to: Date,
  ): Promise<SLADetail[]> {
    const result = await query(
      `SELECT timestamp, metric_type, value, target
      FROM sla_metrics
      WHERE protocol = $1 AND chain = $2
      AND timestamp >= $3 AND timestamp <= $4
      ORDER BY timestamp DESC
      LIMIT 100`,
      [protocol, chain, from, to],
    );

    return result.rows.map((row) => ({
      timestamp: new Date(row.timestamp),
      metric: row.metric_type,
      value: parseFloat(row.value),
      target: parseFloat(row.target),
      status: parseFloat(row.value) >= parseFloat(row.target) ? 'pass' : 'fail',
    }));
  }

  // ============================================================================
  // 全局统计
  // ============================================================================

  async getGlobalSLAStats(): Promise<{
    overallCompliance: number;
    totalProtocols: number;
    compliantProtocols: number;
    atRiskProtocols: number;
    breachedProtocols: number;
  }> {
    const result = await query(
      `SELECT 
        protocol,
        chain,
        AVG(CASE WHEN metric_type = 'uptime' THEN value END) as uptime,
        AVG(CASE WHEN metric_type = 'latency' THEN value END) as latency,
        AVG(CASE WHEN metric_type = 'accuracy' THEN value END) as accuracy,
        AVG(CASE WHEN metric_type = 'availability' THEN value END) as availability
      FROM sla_metrics
      WHERE timestamp >= NOW() - INTERVAL '24 hours'
      GROUP BY protocol, chain`,
    );

    let totalCompliance = 0;
    let compliantCount = 0;
    let atRiskCount = 0;
    let breachedCount = 0;

    for (const row of result.rows) {
      const compliance = this.calculateSLACompliance({
        uptime: parseFloat(row.uptime || 99.9),
        latency: parseFloat(row.latency || 0),
        accuracy: parseFloat(row.accuracy || 99.9),
        availability: parseFloat(row.availability || 99.9),
      });

      totalCompliance += compliance;

      const status = this.getSLAStatus(compliance);
      if (status === 'compliant') compliantCount++;
      else if (status === 'at_risk') atRiskCount++;
      else breachedCount++;
    }

    const totalProtocols = result.rows.length;

    return {
      overallCompliance: totalProtocols > 0 ? totalCompliance / totalProtocols : 100,
      totalProtocols,
      compliantProtocols: compliantCount,
      atRiskProtocols: atRiskCount,
      breachedProtocols: breachedCount,
    };
  }

  // ============================================================================
  // 告警检查
  // ============================================================================

  async checkSLAViolations(): Promise<
    Array<{
      protocol: string;
      chain: string;
      metric: string;
      value: number;
      target: number;
      severity: 'warning' | 'critical';
    }>
  > {
    const violations: Array<{
      protocol: string;
      chain: string;
      metric: string;
      value: number;
      target: number;
      severity: 'warning' | 'critical';
    }> = [];

    const result = await query(
      `SELECT protocol, chain, metric_type, value, target
      FROM sla_metrics
      WHERE timestamp >= NOW() - INTERVAL '1 hour'
      AND value < target
      ORDER BY timestamp DESC`,
    );

    for (const row of result.rows) {
      const value = parseFloat(row.value);
      const target = parseFloat(row.target);
      const deviation = ((target - value) / target) * 100;

      violations.push({
        protocol: row.protocol,
        chain: row.chain,
        metric: row.metric_type,
        value,
        target,
        severity: deviation > 10 ? 'critical' : 'warning',
      });
    }

    return violations;
  }
}

// ============================================================================
// 单例实例
// ============================================================================

let slaMonitor: SLAMonitor | null = null;

export function getSLAMonitor(config?: Partial<SLAConfig>): SLAMonitor {
  if (!slaMonitor) {
    slaMonitor = new SLAMonitor(config);
  }
  return slaMonitor;
}

export function resetSLAMonitor(): void {
  if (slaMonitor) {
    slaMonitor.stopMonitoring();
    slaMonitor = null;
  }
}

// ============================================================================
// 便捷函数
// ============================================================================

export async function generateSLAReport(
  protocol: string,
  chain: string,
  period: '1h' | '24h' | '7d' | '30d' = '24h',
): Promise<SLAReport> {
  return getSLAMonitor().generateReport(protocol, chain, period);
}

export async function getGlobalSLAStats(): Promise<{
  overallCompliance: number;
  totalProtocols: number;
  compliantProtocols: number;
  atRiskProtocols: number;
  breachedProtocols: number;
}> {
  return getSLAMonitor().getGlobalSLAStats();
}

export async function checkSLAViolations(): Promise<
  Array<{
    protocol: string;
    chain: string;
    metric: string;
    value: number;
    target: number;
    severity: 'warning' | 'critical';
  }>
> {
  return getSLAMonitor().checkSLAViolations();
}
