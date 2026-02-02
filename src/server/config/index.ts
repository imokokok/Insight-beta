/**
 * Config Module - 配置管理模块统一导出
 *
 * 包含：缓存、Webhook、模板、批量操作、验证、版本控制、导入导出、差异对比、搜索等功能
 */

// ============================================================================
// Cache Module
// ============================================================================

export { ConfigCacheManager, getConfigCacheManager } from './cache';

// ============================================================================
// Webhook Module
// ============================================================================

export {
  generateWebhookSignature,
  notifyConfigChange,
  listWebhookConfigs,
  getWebhookConfig,
  createWebhookConfig,
  updateWebhookConfig,
  deleteWebhookConfig,
} from './webhook';

// ============================================================================
// Template Module
// ============================================================================

export {
  listConfigTemplates,
  getConfigTemplate,
  getDefaultConfigTemplate,
  createConfigTemplate,
  updateConfigTemplate,
  deleteConfigTemplate,
} from './template';

// ============================================================================
// Batch Module
// ============================================================================

export { batchUpdateOracleConfigs } from './batch';

// ============================================================================
// Validation Module
// ============================================================================

export { validateOracleConfig } from './validation';

export type {
  ConfigValidationResult,
  ConfigValidationError,
  ConfigValidationWarning,
} from './validation';

// ============================================================================
// Versioning Module
// ============================================================================

export { saveConfigVersion, getConfigVersions, rollbackConfigVersion } from './versioning';

export type { ConfigVersion } from './versioning';

// ============================================================================
// Import/Export Module
// ============================================================================

export { exportConfigs, importConfigs } from './import-export';

export type { ConfigExport } from './import-export';

// ============================================================================
// Diff Module
// ============================================================================

export { diffConfigs, formatConfigDiff } from './diff';

export type { ConfigDiff } from './diff';

// ============================================================================
// Search Module
// ============================================================================

export { searchConfigs } from './search';

export type { ConfigSearchOptions, ConfigSearchResult } from './search';

// ============================================================================
// Re-export types from oracleTypes
// ============================================================================

export type {
  OracleConfig,
  ConfigTemplate,
  WebhookConfig,
  WebhookEvent,
  BatchConfigUpdate,
  BatchUpdateResult,
  WebhookPayload,
} from '@/lib/types/oracleTypes';
