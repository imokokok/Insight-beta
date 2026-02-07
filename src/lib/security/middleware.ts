/**
 * Security Middleware - 安全中间件
 *
 * API 安全加固：速率限制、输入验证、CORS 等
 */

import {
  rateLimit,
  cleanupMemoryStore,
  getRateLimitStoreStatus,
  getClientIp,
  type RateLimitConfig,
  type RateLimitResult,
} from './rateLimit';

// ============================================================================
// 速率限制 - 从独立模块导出
// ============================================================================

export {
  rateLimit,
  cleanupMemoryStore,
  getRateLimitStoreStatus,
  getClientIp,
  type RateLimitConfig,
  type RateLimitResult,
};
