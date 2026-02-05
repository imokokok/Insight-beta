/**
 * API Response Module - 统一导出
 *
 * 所有 API 响应相关功能的集中导出
 */

// ============================================================================
// 基础响应功能
// ============================================================================

export { handleApi } from './handleApi';
export { ok, error } from './response';
export { cachedJson, invalidateCachedJson } from './cache';
export { rateLimit } from './rateLimit';
export { requireAdmin, getAdminActor } from './admin';

// ============================================================================
// 列表查询处理器（新增）
// ============================================================================

export {
  createListHandler,
  createStandardListHandler,
  listQuerySchema,
  type ListQueryParams,
  type ListHandlerConfig,
  type StandardListConfig,
} from './listHandler';

// ============================================================================
// 告警相关
// ============================================================================

export { runApiAlerts } from './alerts';
