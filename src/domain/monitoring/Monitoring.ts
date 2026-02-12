/**
 * Monitoring 领域模型
 */

export interface HealthCheck {
  id: string;
  oracleId: string;
  status: 'healthy' | 'degraded' | 'error';
  latency: number;
  lastCheck: Date;
  errorCount: number;
  metadata?: Record<string, unknown>;
}

export interface Metric {
  id: string;
  oracleId: string;
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags: Record<string, string>;
}

export interface PerformanceMetric {
  oracleId: string;
  timestamp: Date;
  metrics: {
    latency: number;
    throughput: number;
    errorRate: number;
    availability: number;
  };
}

export class MonitoringAggregate {
  private healthChecks: Map<string, HealthCheck>;
  private metrics: Map<string, Metric[]>;

  constructor() {
    this.healthChecks = new Map();
    this.metrics = new Map();
  }

  recordHealthCheck(check: HealthCheck): void {
    this.healthChecks.set(check.oracleId, check);
  }

  recordMetric(metric: Metric): void {
    if (!this.metrics.has(metric.oracleId)) {
      this.metrics.set(metric.oracleId, []);
    }
    this.metrics.get(metric.oracleId)!.push(metric);
  }

  getHealthStatus(oracleId: string): HealthCheck | undefined {
    return this.healthChecks.get(oracleId);
  }

  getMetrics(oracleId: string, name?: string): Metric[] {
    const oracleMetrics = this.metrics.get(oracleId) || [];
    if (name) {
      return oracleMetrics.filter(m => m.name === name);
    }
    return oracleMetrics;
  }

  calculateAvailability(oracleId: string, _timeframe: number): number {
    const checks = Array.from(this.healthChecks.values())
      .filter(c => c.oracleId === oracleId);
    
    if (checks.length === 0) return 0;

    const healthyCount = checks.filter(c => c.status === 'healthy').length;
    return (healthyCount / checks.length) * 100;
  }
}
