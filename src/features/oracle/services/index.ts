/**
 * Oracle Services - Oracle 相关服务
 */

export * from './priceAggregation';
export * from './realtime';
export * from './priceFetcher';
export * from './unifiedPriceService';
export * from './crossChainAnalysisService';
export * from './priceDeviationAnalytics';
export * from './realDataService';

export { syncManager, writePriceFeeds, createPriceFeedRecord } from './syncFramework';
export { DEFAULT_SYNC_CONFIG, type SyncConfig, type SyncState } from './syncFramework';
