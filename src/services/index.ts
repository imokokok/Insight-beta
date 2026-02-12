/**
 * Services - 统一服务层导出
 *
 * 按领域组织所有服务
 */

// Oracle 服务
export * from './oracle/priceAggregation';
export * from './oracle/realtime';
export * from './oracle/sync';
export * from './oracle/priceFetcher';
export * from './oracle/unifiedPriceService';
export * from './oracle/crossChainAnalysisService';
export * from './oracle/priceDeviationAnalytics';
export * from './oracle/realDataService';

// 告警服务（排除重复的类型导出）
export { NotificationService } from './alert/notifications';
export { alertService } from './alert/alertService';
export { notificationConfigService } from './alert/notificationConfigService';
export { notificationManager } from './alert/notificationManager';

// 安全服务
export * from './security/anomaly';
export * from './security/apiAuth';
export * from './security/rateLimiter';
export * from './security/manipulationDetectionService';

// 监控服务
export * from './monitoring/oracleHealthMonitor';
export * from './monitoring/performanceMonitor';

// Gas 服务
export * from './gas/gasPriceService';

// 导出服务
export * from './export/dataExportService';
