/**
 * Deviation Config Service - 偏离检测配置服务
 *
 * 提供偏离阈值可配置功能，支持运行时动态调整
 */

import type { DeviationConfig, DeviationThresholds, OutlierDetectionConfig } from '@/types/analytics/deviation';
import { DEFAULT_DEVIATION_CONFIG } from '@/types/analytics/deviation';

type ConfigChangeCallback = (config: DeviationConfig) => void;

class DeviationConfigService {
  private config: DeviationConfig;
  private listeners: Set<ConfigChangeCallback> = new Set();

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): DeviationConfig {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('deviation_config');
      if (saved) {
        try {
          return { ...DEFAULT_DEVIATION_CONFIG, ...JSON.parse(saved) };
        } catch {
          return { ...DEFAULT_DEVIATION_CONFIG };
        }
      }
    }
    return { ...DEFAULT_DEVIATION_CONFIG };
  }

  private saveConfig(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('deviation_config', JSON.stringify(this.config));
    }
  }

  getConfig(): DeviationConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<DeviationConfig>): DeviationConfig {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
    this.notifyListeners();
    return this.getConfig();
  }

  getThresholds(): DeviationThresholds {
    return { ...this.config.thresholds };
  }

  updateThresholds(thresholds: Partial<DeviationThresholds>): DeviationThresholds {
    this.config.thresholds = { ...this.config.thresholds, ...thresholds };
    this.saveConfig();
    this.notifyListeners();
    return this.getThresholds();
  }

  getOutlierDetectionConfig(): OutlierDetectionConfig {
    return { ...this.config.outlierDetection };
  }

  updateOutlierDetection(config: Partial<OutlierDetectionConfig>): OutlierDetectionConfig {
    this.config.outlierDetection = { ...this.config.outlierDetection, ...config };
    this.saveConfig();
    this.notifyListeners();
    return this.getOutlierDetectionConfig();
  }

  resetToDefaults(): DeviationConfig {
    this.config = { ...DEFAULT_DEVIATION_CONFIG };
    this.saveConfig();
    this.notifyListeners();
    return this.getConfig();
  }

  subscribe(callback: ConfigChangeCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.getConfig());
    }
  }
}

export const deviationConfigService = new DeviationConfigService();
