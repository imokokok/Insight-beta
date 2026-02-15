/**
 * Security Services - 安全相关服务
 * @deprecated 请使用 @/features/security/services 导入
 */

// 异常检测服务
export * from '@/features/security/services/anomaly';

// API 认证
export * from './apiAuth';

// 速率限制 - 使用 lib/security/rateLimit.ts
export { rateLimit, getRateLimitStoreStatus, cleanupRateLimitStore } from '@/lib/security/rateLimit';
