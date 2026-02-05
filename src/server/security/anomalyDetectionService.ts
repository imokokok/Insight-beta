/**
 * Anomaly Detection Service - Re-export for backward compatibility
 * 异常检测服务 - 向后兼容的重新导出
 *
 * @deprecated 请从 '@/server/security/anomaly' 导入
 */

export {
  AnomalyDetectionService,
  StatisticalDetector,
  TimeSeriesDetector,
  MLDetector,
  BehaviorPatternDetector,
  DEFAULT_DETECTION_CONFIG,
  type AnomalyDetection,
  type AnomalyType,
  type AnomalySeverity,
  type AnomalyMetrics,
  type AnomalyEvidence,
  type DetectionConfig,
  type TimeSeriesPoint,
} from './anomaly';
