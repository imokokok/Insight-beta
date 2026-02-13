/**
 * Manipulation Detection Service
 *
 * 价格操纵检测服务
 */

export interface DetectionMetrics {
  totalDetections: number;
  detectionsByType: Record<string, number>;
  detectionsBySeverity: Record<string, number>;
  falsePositives: number;
  averageConfidence: number;
  lastDetectionTime: string | null;
}

class ManipulationDetectionService {
  private isMonitoringActive = false;
  private activeMonitors: string[] = [];

  async initialize(): Promise<void> {
    this.isMonitoringActive = true;
  }

  isMonitoring(): boolean {
    return this.isMonitoringActive;
  }

  getActiveMonitors(): string[] {
    return this.activeMonitors;
  }

  async startMonitoring(protocol: string, symbol: string): Promise<void> {
    const monitorId = `${protocol}-${symbol}`;
    if (!this.activeMonitors.includes(monitorId)) {
      this.activeMonitors.push(monitorId);
    }
  }

  stopMonitoring(protocol: string, symbol: string): void {
    const monitorId = `${protocol}-${symbol}`;
    const index = this.activeMonitors.indexOf(monitorId);
    if (index > -1) {
      this.activeMonitors.splice(index, 1);
    }
  }

  stopAllMonitoring(): void {
    this.activeMonitors = [];
    this.isMonitoringActive = false;
  }

  getMetrics(): DetectionMetrics {
    return {
      totalDetections: 0,
      detectionsByType: {},
      detectionsBySeverity: {},
      falsePositives: 0,
      averageConfidence: 0,
      lastDetectionTime: null,
    };
  }
}

export const manipulationDetectionService = new ManipulationDetectionService();
