/**
 * 指标服务 - 负责收集和管理检测指标
 *
 * 单一职责：指标数据的收集、计算和聚合
 */

import type { DetectionMetrics } from '@/lib/types/security/detection';

export interface MetricsSnapshot {
  timestamp: number;
  metrics: DetectionMetrics;
}

export class MetricsService {
  private metrics: DetectionMetrics = {
    totalDetections: 0,
    detectionsByType: {},
    detectionsBySeverity: {},
    falsePositives: 0,
    averageConfidence: 0,
    lastDetectionTime: undefined,
  };
  private confidenceScores: number[] = [];
  private maxConfidenceHistory = 100;
  private snapshots: MetricsSnapshot[] = [];
  private maxSnapshots = 1000;

  recordDetection(type: string, severity: string, confidence: number): void {
    this.metrics.totalDetections++;

    // 确保对象已初始化
    if (!this.metrics.detectionsByType) {
      this.metrics.detectionsByType = {};
    }
    if (!this.metrics.detectionsBySeverity) {
      this.metrics.detectionsBySeverity = {};
    }

    // 按类型统计
    const currentTypeCount = this.metrics.detectionsByType[type] ?? 0;
    this.metrics.detectionsByType[type] = currentTypeCount + 1;

    // 按严重程度统计
    const currentSeverityCount = this.metrics.detectionsBySeverity[severity] ?? 0;
    this.metrics.detectionsBySeverity[severity] = currentSeverityCount + 1;

    // 更新置信度
    this.confidenceScores.push(confidence);
    if (this.confidenceScores.length > this.maxConfidenceHistory) {
      this.confidenceScores.shift();
    }
    this.metrics.averageConfidence =
      this.confidenceScores.reduce((a, b) => a + b, 0) / this.confidenceScores.length;

    // 更新时间
    this.metrics.lastDetectionTime = Date.now();

    // 保存快照
    this.saveSnapshot();
  }

  recordFalsePositive(): void {
    this.metrics.falsePositives++;
    this.saveSnapshot();
  }

  getMetrics(): DetectionMetrics {
    return { ...this.metrics };
  }

  getSnapshots(since?: number): MetricsSnapshot[] {
    if (!since) return [...this.snapshots];
    return this.snapshots.filter((s) => s.timestamp >= since);
  }

  reset(): void {
    this.metrics = {
      totalDetections: 0,
      detectionsByType: {},
      detectionsBySeverity: {},
      falsePositives: 0,
      averageConfidence: 0,
      lastDetectionTime: undefined,
    };
    this.confidenceScores = [];
    this.snapshots = [];
  }

  private saveSnapshot(): void {
    this.snapshots.push({
      timestamp: Date.now(),
      metrics: { ...this.metrics },
    });

    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }
  }
}
