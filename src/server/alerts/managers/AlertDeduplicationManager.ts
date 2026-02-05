/**
 * Alert Deduplication Manager
 *
 * 告警去重管理器
 */

import type { Alert } from '../types';

interface DeduplicationEntry {
  count: number;
  firstSeen: Date;
  lastSeen: Date;
}

export class AlertDeduplicationManager {
  private recentAlerts: Map<string, DeduplicationEntry> = new Map();
  private readonly deduplicationWindowMs = 3600000; // 1小时

  /**
   * 检查是否是重复告警
   */
  checkDuplicate(alert: Partial<Alert>): {
    isDuplicate: boolean;
    duplicateOf?: string;
    count: number;
  } {
    const key = this.generateDuplicateKey(alert);
    const existing = this.recentAlerts.get(key);

    if (existing) {
      // 检查是否在去重窗口内
      if (Date.now() - existing.firstSeen.getTime() < this.deduplicationWindowMs) {
        existing.count++;
        existing.lastSeen = new Date();
        return { isDuplicate: true, duplicateOf: key, count: existing.count };
      }
    }

    // 记录新告警
    this.recentAlerts.set(key, {
      count: 1,
      firstSeen: new Date(),
      lastSeen: new Date(),
    });

    return { isDuplicate: false, count: 1 };
  }

  /**
   * 生成去重键
   */
  private generateDuplicateKey(alert: Partial<Alert>): string {
    return `${alert.source}-${alert.symbol}-${alert.severity}-${alert.title}`;
  }

  /**
   * 清理过期的去重记录
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, data] of this.recentAlerts.entries()) {
      if (now - data.lastSeen.getTime() > this.deduplicationWindowMs) {
        this.recentAlerts.delete(key);
      }
    }
  }

  /**
   * 获取去重统计
   */
  getStats(): { totalGroups: number; totalAlerts: number } {
    let totalAlerts = 0;
    for (const data of this.recentAlerts.values()) {
      totalAlerts += data.count;
    }
    return {
      totalGroups: this.recentAlerts.size,
      totalAlerts,
    };
  }
}
