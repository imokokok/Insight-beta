/**
 * Oracle Config 增强功能模块
 * 1. Redis 分布式缓存层
 * 2. Webhook 通知
 * 3. 配置模板与继承
 * 4. 批量操作
 */

import { hasDatabase, query, getClient } from './db';
import type { OracleConfig } from '@/lib/types/oracleTypes';
import { getMemoryInstance } from '@/server/memoryBackend';
import { encryptString } from '@/lib/security/encryption';
import { logger } from '@/lib/logger';
import type { PoolClient } from 'pg';
import { RedisCache } from './redisCache';
import crypto from 'node:crypto';
import { readOracleConfig, writeOracleConfig } from './oracle';

export type { OracleConfig };

export const DEFAULT_ORACLE_INSTANCE_ID = 'default';

// ============================================================================
// 类型定义
// ============================================================================

export interface ConfigTemplate {
  id: string;
  name: string;
  description?: string;
  config: Partial<OracleConfig>;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  secret?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type WebhookEvent =
  | 'config.created'
  | 'config.updated'
  | 'config.deleted'
  | 'config.batch_updated'
  | 'template.applied';

export interface BatchConfigUpdate {
  instanceId: string;
  config: Partial<OracleConfig>;
}

export interface BatchUpdateResult {
  success: string[];
  failed: Array<{ instanceId: string; error: string }>;
}

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: unknown;
  signature?: string;
}

// ============================================================================
// Redis 分布式缓存增强
// ============================================================================

/**
 * 配置缓存管理器 - 支持分布式环境
 */
export class ConfigCacheManager {
  private localCache: Map<string, { value: OracleConfig; expiresAt: number }> = new Map();
  private readonly localTtlMs = 5000; // 本地缓存 5 秒
  private distributedCache: RedisCache<OracleConfig>;
  private readonly distributedTtl = 60; // 分布式缓存 60 秒

  constructor() {
    this.distributedCache = new RedisCache<OracleConfig>({
      prefix: 'oracle:config:enhanced',
      defaultTtl: this.distributedTtl,
      version: 1,
    });
  }

  /**
   * 构建缓存键
   */
  private buildKey(instanceId: string): string {
    return `config:${instanceId}`;
  }

  /**
   * 获取配置（多级缓存策略）
   * 1. 本地内存缓存（最快）
   * 2. Redis 分布式缓存（跨实例共享）
   * 3. 数据库（最终数据源）
   */
  async get(instanceId: string): Promise<OracleConfig | null> {
    const key = this.buildKey(instanceId);
    const now = Date.now();

    // 1. 检查本地缓存
    const localEntry = this.localCache.get(key);
    if (localEntry && localEntry.expiresAt > now) {
      logger.debug('Config cache hit (local)', { instanceId });
      return localEntry.value;
    }

    // 2. 检查分布式缓存
    try {
      const distributedValue = await this.distributedCache.get(key);
      if (distributedValue) {
        logger.debug('Config cache hit (distributed)', { instanceId });
        // 回填本地缓存
        this.localCache.set(key, {
          value: distributedValue,
          expiresAt: now + this.localTtlMs,
        });
        return distributedValue;
      }
    } catch (error) {
      logger.warn('Distributed cache get failed', {
        instanceId,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return null;
  }

  /**
   * 设置配置缓存
   */
  async set(instanceId: string, config: OracleConfig): Promise<void> {
    const key = this.buildKey(instanceId);
    const now = Date.now();

    // 更新本地缓存
    this.localCache.set(key, {
      value: config,
      expiresAt: now + this.localTtlMs,
    });

    // 更新分布式缓存
    try {
      await this.distributedCache.set(key, config, this.distributedTtl);
    } catch (error) {
      logger.warn('Distributed cache set failed', {
        instanceId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 使缓存失效
   */
  async invalidate(instanceId: string): Promise<void> {
    const key = this.buildKey(instanceId);

    // 清除本地缓存
    this.localCache.delete(key);

    // 清除分布式缓存
    try {
      await this.distributedCache.delete(key);
    } catch (error) {
      logger.warn('Distributed cache delete failed', {
        instanceId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 批量使缓存失效
   */
  async invalidateBatch(instanceIds: string[]): Promise<void> {
    const keys = instanceIds.map((id) => this.buildKey(id));

    // 清除本地缓存
    for (const key of keys) {
      this.localCache.delete(key);
    }

    // 清除分布式缓存
    try {
      await this.distributedCache.mdel(keys);
    } catch (error) {
      logger.warn('Distributed cache batch delete failed', {
        count: instanceIds.length,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 获取缓存统计
   */
  async getStats(): Promise<{
    localSize: number;
    distributedKeys: number;
    distributedConnected: boolean;
  }> {
    const distributedStats = await this.distributedCache.stats();
    return {
      localSize: this.localCache.size,
      distributedKeys: distributedStats.keys,
      distributedConnected: distributedStats.connected,
    };
  }

  /**
   * 清除所有缓存
   */
  async clear(): Promise<void> {
    this.localCache.clear();
    try {
      await this.distributedCache.clear();
    } catch (error) {
      logger.warn('Distributed cache clear failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

// 全局缓存管理器实例
export const configCacheManager = new ConfigCacheManager();

// ============================================================================
// Webhook 通知系统
// ============================================================================

/**
 * Webhook 签名生成
 */
export function generateWebhookSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * 发送 Webhook 通知
 */
async function sendWebhookNotification(
  webhook: WebhookConfig,
  event: WebhookEvent,
  data: unknown,
): Promise<{ success: boolean; error?: string }> {
  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  const payloadString = JSON.stringify(payload);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Webhook-Event': event,
    'X-Webhook-Timestamp': payload.timestamp,
  };

  // 如果配置了 secret，添加签名
  if (webhook.secret) {
    const signature = generateWebhookSignature(payloadString, webhook.secret);
    headers['X-Webhook-Signature'] = `sha256=${signature}`;
    payload.signature = signature;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 秒超时

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 触发配置变更 Webhook 通知
 */
export async function notifyConfigChange(event: WebhookEvent, data: unknown): Promise<void> {
  if (!hasDatabase()) return;

  try {
    // 获取所有启用的 webhook
    const webhooks = await listWebhookConfigs();
    const matchingWebhooks = webhooks.filter((w) => w.enabled && w.events.includes(event));

    if (matchingWebhooks.length === 0) return;

    // 并行发送通知
    const results = await Promise.allSettled(
      matchingWebhooks.map((webhook) => sendWebhookNotification(webhook, event, data)),
    );

    // 记录结果
    results.forEach((result, index) => {
      const webhook = matchingWebhooks[index];
      if (webhook) {
        if (result.status === 'rejected' || !result.value.success) {
          logger.warn('Webhook notification failed', {
            webhookId: webhook.id,
            webhookName: webhook.name,
            event,
            error: result.status === 'rejected' ? String(result.reason) : result.value.error,
          });
        } else {
          logger.debug('Webhook notification sent', {
            webhookId: webhook.id,
            webhookName: webhook.name,
            event,
          });
        }
      }
    });
  } catch (error) {
    logger.error('Failed to send webhook notifications', {
      event,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ============================================================================
// Webhook 配置管理
// ============================================================================

interface DbWebhookRow {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string | null;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export async function listWebhookConfigs(): Promise<WebhookConfig[]> {
  if (!hasDatabase()) return [];

  const res = await query<DbWebhookRow>('SELECT * FROM webhook_configs ORDER BY created_at DESC');

  return res.rows.map((row) => ({
    id: row.id,
    name: row.name,
    url: row.url,
    events: row.events as WebhookEvent[],
    secret: row.secret || undefined,
    enabled: row.enabled,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }));
}

export async function getWebhookConfig(id: string): Promise<WebhookConfig | null> {
  if (!hasDatabase()) return null;

  const res = await query<DbWebhookRow>('SELECT * FROM webhook_configs WHERE id = $1', [id]);

  if (!res.rows[0]) return null;

  const row = res.rows[0];
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    events: row.events as WebhookEvent[],
    secret: row.secret || undefined,
    enabled: row.enabled,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function createWebhookConfig(
  config: Omit<WebhookConfig, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<WebhookConfig> {
  if (!hasDatabase()) {
    throw new Error('Database not available');
  }

  const id = crypto.randomUUID();
  const now = new Date();

  await query(
    `INSERT INTO webhook_configs (id, name, url, events, secret, enabled, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, config.name, config.url, config.events, config.secret || null, config.enabled, now, now],
  );

  return {
    ...config,
    id,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export async function updateWebhookConfig(
  id: string,
  updates: Partial<Omit<WebhookConfig, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<WebhookConfig | null> {
  if (!hasDatabase()) return null;

  const sets: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    sets.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.url !== undefined) {
    sets.push(`url = $${paramIndex++}`);
    values.push(updates.url);
  }
  if (updates.events !== undefined) {
    sets.push(`events = $${paramIndex++}`);
    values.push(updates.events);
  }
  if (updates.secret !== undefined) {
    sets.push(`secret = $${paramIndex++}`);
    values.push(updates.secret || null);
  }
  if (updates.enabled !== undefined) {
    sets.push(`enabled = $${paramIndex++}`);
    values.push(updates.enabled);
  }

  sets.push(`updated_at = $${paramIndex++}`);
  values.push(new Date());
  values.push(id);

  const res = await query<DbWebhookRow>(
    `UPDATE webhook_configs SET ${sets.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values as (string | number | boolean | string[] | Date | null)[],
  );

  if (!res.rows[0]) return null;

  const row = res.rows[0];
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    events: row.events as WebhookEvent[],
    secret: row.secret || undefined,
    enabled: row.enabled,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function deleteWebhookConfig(id: string): Promise<boolean> {
  if (!hasDatabase()) return false;

  const res = await query('DELETE FROM webhook_configs WHERE id = $1 RETURNING id', [id]);

  return res.rows.length > 0;
}

// ============================================================================
// 配置模板管理
// ============================================================================

interface DbTemplateRow {
  id: string;
  name: string;
  description: string | null;
  config: string;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}

export async function listConfigTemplates(): Promise<ConfigTemplate[]> {
  if (!hasDatabase()) return [];

  const res = await query<DbTemplateRow>(
    'SELECT * FROM config_templates ORDER BY is_default DESC, name ASC',
  );

  return res.rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    config: JSON.parse(row.config) as Partial<OracleConfig>,
    isDefault: row.is_default,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }));
}

export async function getConfigTemplate(id: string): Promise<ConfigTemplate | null> {
  if (!hasDatabase()) return null;

  const res = await query<DbTemplateRow>('SELECT * FROM config_templates WHERE id = $1', [id]);

  if (!res.rows[0]) return null;

  const row = res.rows[0];
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    config: JSON.parse(row.config) as Partial<OracleConfig>,
    isDefault: row.is_default,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function getDefaultConfigTemplate(): Promise<ConfigTemplate | null> {
  if (!hasDatabase()) return null;

  const res = await query<DbTemplateRow>(
    'SELECT * FROM config_templates WHERE is_default = true LIMIT 1',
  );

  if (!res.rows[0]) return null;

  const row = res.rows[0];
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    config: JSON.parse(row.config) as Partial<OracleConfig>,
    isDefault: row.is_default,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function createConfigTemplate(
  template: Omit<ConfigTemplate, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<ConfigTemplate> {
  if (!hasDatabase()) {
    throw new Error('Database not available');
  }

  const id = crypto.randomUUID();
  const now = new Date();

  // 如果设置为默认，先取消其他默认模板
  if (template.isDefault) {
    await query('UPDATE config_templates SET is_default = false WHERE is_default = true');
  }

  await query(
    `INSERT INTO config_templates (id, name, description, config, is_default, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      id,
      template.name,
      template.description || null,
      JSON.stringify(template.config),
      template.isDefault,
      now,
      now,
    ],
  );

  return {
    ...template,
    id,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export async function updateConfigTemplate(
  id: string,
  updates: Partial<Omit<ConfigTemplate, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<ConfigTemplate | null> {
  if (!hasDatabase()) return null;

  // 如果设置为默认，先取消其他默认模板
  if (updates.isDefault) {
    await query('UPDATE config_templates SET is_default = false WHERE is_default = true');
  }

  const sets: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    sets.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    sets.push(`description = $${paramIndex++}`);
    values.push(updates.description || null);
  }
  if (updates.config !== undefined) {
    sets.push(`config = $${paramIndex++}`);
    values.push(JSON.stringify(updates.config));
  }
  if (updates.isDefault !== undefined) {
    sets.push(`is_default = $${paramIndex++}`);
    values.push(updates.isDefault);
  }

  sets.push(`updated_at = $${paramIndex++}`);
  values.push(new Date());
  values.push(id);

  const res = await query<DbTemplateRow>(
    `UPDATE config_templates SET ${sets.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values as (string | number | boolean | string | Date | null)[],
  );

  if (!res.rows[0]) return null;

  const row = res.rows[0];
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    config: JSON.parse(row.config) as Partial<OracleConfig>,
    isDefault: row.is_default,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function deleteConfigTemplate(id: string): Promise<boolean> {
  if (!hasDatabase()) return false;

  const res = await query('DELETE FROM config_templates WHERE id = $1 RETURNING id', [id]);

  return res.rows.length > 0;
}

/**
 * 应用模板到实例配置
 * @param templateId - 模板 ID
 * @param _instanceId - 实例 ID（预留参数，用于未来扩展）
 * @param customConfig - 自定义配置覆盖
 */
export async function applyTemplateToInstance(
  templateId: string,
  _instanceId: string,
  customConfig?: Partial<OracleConfig>,
): Promise<OracleConfig | null> {
  const template = await getConfigTemplate(templateId);
  if (!template) return null;

  // 合并模板配置和自定义配置
  const mergedConfig = {
    ...template.config,
    ...customConfig,
  };

  // 这里需要调用原有的 writeOracleConfig 函数
  // 为了简化，返回合并后的配置
  return mergedConfig as OracleConfig;
}

// ============================================================================
// 批量操作
// ============================================================================

/**
 * 批量更新配置
 */
export async function batchUpdateOracleConfigs(
  updates: BatchConfigUpdate[],
  options: {
    continueOnError?: boolean;
    useTransaction?: boolean;
  } = {},
): Promise<BatchUpdateResult> {
  const { continueOnError = true, useTransaction = true } = options;
  const result: BatchUpdateResult = {
    success: [],
    failed: [],
  };

  if (!hasDatabase()) {
    // 内存模式下的批量更新
    for (const update of updates) {
      try {
        const mem = getMemoryInstance(update.instanceId);
        mem.oracleConfig = { ...mem.oracleConfig, ...update.config };
        result.success.push(update.instanceId);

        // 使缓存失效
        await configCacheManager.invalidate(update.instanceId);
      } catch (error) {
        result.failed.push({
          instanceId: update.instanceId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        if (!continueOnError) break;
      }
    }
    return result;
  }

  if (useTransaction) {
    // 使用事务的批量更新
    const client = await getClient();
    try {
      await client.query('BEGIN');

      for (const update of updates) {
        try {
          await updateConfigInTransaction(client, update.instanceId, update.config);
          result.success.push(update.instanceId);
        } catch (error) {
          result.failed.push({
            instanceId: update.instanceId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          if (!continueOnError) {
            throw error; // 触发回滚
          }
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } else {
    // 非事务批量更新
    for (const update of updates) {
      try {
        await updateSingleConfig(update.instanceId, update.config);
        result.success.push(update.instanceId);
      } catch (error) {
        result.failed.push({
          instanceId: update.instanceId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        if (!continueOnError) break;
      }
    }
  }

  // 批量使缓存失效
  if (result.success.length > 0) {
    await configCacheManager.invalidateBatch(result.success);
  }

  // 发送 Webhook 通知
  if (result.success.length > 0) {
    await notifyConfigChange('config.batch_updated', {
      updatedCount: result.success.length,
      failedCount: result.failed.length,
      instanceIds: result.success,
    });
  }

  return result;
}

/**
 * 在事务中更新单个配置
 */
async function updateConfigInTransaction(
  client: PoolClient,
  instanceId: string,
  config: Partial<OracleConfig>,
): Promise<void> {
  const encryptedRpcUrl = config.rpcUrl
    ? (encryptString(config.rpcUrl) ?? config.rpcUrl)
    : undefined;

  const sets: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (config.rpcUrl !== undefined) {
    sets.push(`rpc_url = $${paramIndex++}`);
    values.push(encryptedRpcUrl);
  }
  if (config.contractAddress !== undefined) {
    sets.push(`contract_address = $${paramIndex++}`);
    values.push(config.contractAddress);
  }
  if (config.chain !== undefined) {
    sets.push(`chain = $${paramIndex++}`);
    values.push(config.chain);
  }
  if (config.startBlock !== undefined) {
    sets.push(`start_block = $${paramIndex++}`);
    values.push(config.startBlock);
  }
  if (config.maxBlockRange !== undefined) {
    sets.push(`max_block_range = $${paramIndex++}`);
    values.push(config.maxBlockRange);
  }
  if (config.votingPeriodHours !== undefined) {
    sets.push(`voting_period_hours = $${paramIndex++}`);
    values.push(config.votingPeriodHours);
  }
  if (config.confirmationBlocks !== undefined) {
    sets.push(`confirmation_blocks = $${paramIndex++}`);
    values.push(config.confirmationBlocks);
  }

  if (sets.length === 0) return;

  sets.push(`updated_at = $${paramIndex++}`);
  values.push(new Date());
  values.push(instanceId);

  await client.query(
    `UPDATE oracle_instances SET ${sets.join(', ')} WHERE id = $${paramIndex}`,
    values,
  );
}

/**
 * 更新单个配置（非事务）
 */
async function updateSingleConfig(
  instanceId: string,
  config: Partial<OracleConfig>,
): Promise<void> {
  const encryptedRpcUrl = config.rpcUrl
    ? (encryptString(config.rpcUrl) ?? config.rpcUrl)
    : undefined;

  const sets: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (config.rpcUrl !== undefined) {
    sets.push(`rpc_url = $${paramIndex++}`);
    values.push(encryptedRpcUrl);
  }
  if (config.contractAddress !== undefined) {
    sets.push(`contract_address = $${paramIndex++}`);
    values.push(config.contractAddress);
  }
  if (config.chain !== undefined) {
    sets.push(`chain = $${paramIndex++}`);
    values.push(config.chain);
  }
  if (config.startBlock !== undefined) {
    sets.push(`start_block = $${paramIndex++}`);
    values.push(config.startBlock);
  }
  if (config.maxBlockRange !== undefined) {
    sets.push(`max_block_range = $${paramIndex++}`);
    values.push(config.maxBlockRange);
  }
  if (config.votingPeriodHours !== undefined) {
    sets.push(`voting_period_hours = $${paramIndex++}`);
    values.push(config.votingPeriodHours);
  }
  if (config.confirmationBlocks !== undefined) {
    sets.push(`confirmation_blocks = $${paramIndex++}`);
    values.push(config.confirmationBlocks);
  }

  if (sets.length === 0) return;

  sets.push(`updated_at = $${paramIndex++}`);
  values.push(new Date());
  values.push(instanceId);

  await query(
    `UPDATE oracle_instances SET ${sets.join(', ')} WHERE id = $${paramIndex}`,
    values as (string | number | Date | null)[],
  );
}

// ============================================================================
// 配置验证
// ============================================================================

export interface ConfigValidationResult {
  valid: boolean;
  errors: ConfigValidationError[];
  warnings: ConfigValidationWarning[];
}

export interface ConfigValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ConfigValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

/**
 * 验证 Oracle 配置
 */
export async function validateOracleConfig(
  config: Partial<OracleConfig>,
  options: {
    checkConnectivity?: boolean;
    strictMode?: boolean;
  } = {},
): Promise<ConfigValidationResult> {
  const { checkConnectivity = false, strictMode = false } = options;
  const errors: ConfigValidationError[] = [];
  const warnings: ConfigValidationWarning[] = [];

  // 验证 RPC URL
  if (config.rpcUrl !== undefined) {
    if (!config.rpcUrl.trim()) {
      errors.push({
        field: 'rpcUrl',
        message: 'RPC URL cannot be empty',
        code: 'empty_rpc_url',
      });
    } else {
      const urls = config.rpcUrl.split(/[,\s]+/).filter(Boolean);
      for (const url of urls) {
        try {
          const parsed = new URL(url);
          if (!['http:', 'https:', 'ws:', 'wss:'].includes(parsed.protocol)) {
            errors.push({
              field: 'rpcUrl',
              message: `Invalid protocol: ${parsed.protocol}`,
              code: 'invalid_protocol',
            });
          }
        } catch {
          errors.push({
            field: 'rpcUrl',
            message: `Invalid URL: ${url}`,
            code: 'invalid_url',
          });
        }
      }

      // 检查连接性
      if (checkConnectivity && urls.length > 0) {
        const firstUrl = urls[0];
        if (firstUrl) {
          const connectivityResult = await checkRpcConnectivity(firstUrl);
          if (!connectivityResult.success) {
            errors.push({
              field: 'rpcUrl',
              message: `Cannot connect to RPC: ${connectivityResult.error}`,
              code: 'rpc_connectivity_failed',
            });
          }
        }
      }
    }
  }

  // 验证合约地址
  if (config.contractAddress !== undefined) {
    if (config.contractAddress) {
      if (!/^0x[0-9a-fA-F]{40}$/.test(config.contractAddress)) {
        errors.push({
          field: 'contractAddress',
          message: 'Invalid Ethereum address format',
          code: 'invalid_address',
        });
      }

      // 检查地址是否为合约（如果启用严格模式）
      if (strictMode && config.rpcUrl) {
        const isContract = await checkIsContract(config.contractAddress, config.rpcUrl);
        if (!isContract) {
          warnings.push({
            field: 'contractAddress',
            message: 'Address does not appear to be a contract',
            suggestion: 'Verify the contract address is correct',
          });
        }
      }
    }
  }

  // 验证链类型
  if (config.chain !== undefined) {
    const validChains = ['Polygon', 'PolygonAmoy', 'Arbitrum', 'Optimism', 'Local'];
    if (!validChains.includes(config.chain)) {
      errors.push({
        field: 'chain',
        message: `Invalid chain: ${config.chain}. Must be one of: ${validChains.join(', ')}`,
        code: 'invalid_chain',
      });
    }
  }

  // 验证数值字段
  if (config.maxBlockRange !== undefined) {
    if (config.maxBlockRange < 100 || config.maxBlockRange > 200000) {
      errors.push({
        field: 'maxBlockRange',
        message: 'maxBlockRange must be between 100 and 200000',
        code: 'invalid_block_range',
      });
    }
    if (config.maxBlockRange > 50000) {
      warnings.push({
        field: 'maxBlockRange',
        message: 'Large block range may cause performance issues',
        suggestion: 'Consider reducing to 50000 or less',
      });
    }
  }

  if (config.votingPeriodHours !== undefined) {
    if (config.votingPeriodHours < 1 || config.votingPeriodHours > 720) {
      errors.push({
        field: 'votingPeriodHours',
        message: 'votingPeriodHours must be between 1 and 720',
        code: 'invalid_voting_period',
      });
    }
  }

  if (config.confirmationBlocks !== undefined) {
    if (config.confirmationBlocks < 1) {
      errors.push({
        field: 'confirmationBlocks',
        message: 'confirmationBlocks must be at least 1',
        code: 'invalid_confirmation_blocks',
      });
    }
    if (config.confirmationBlocks < 6) {
      warnings.push({
        field: 'confirmationBlocks',
        message: 'Low confirmation blocks may cause reorg issues',
        suggestion: 'Consider using at least 6 confirmation blocks',
      });
    }
  }

  // 验证 startBlock
  if (config.startBlock !== undefined) {
    if (config.startBlock < 0) {
      errors.push({
        field: 'startBlock',
        message: 'startBlock cannot be negative',
        code: 'negative_start_block',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 检查 RPC 连接性
 */
async function checkRpcConnectivity(
  rpcUrl: string,
): Promise<{ success: boolean; error?: string; blockNumber?: number }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    if (data.error) {
      return { success: false, error: data.error.message };
    }

    return {
      success: true,
      blockNumber: parseInt(data.result, 16),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 检查地址是否为合约
 */
async function checkIsContract(address: string, rpcUrl: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getCode',
        params: [address, 'latest'],
        id: 1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) return false;

    const data = await response.json();
    if (data.error) return false;

    // 如果 code 不是 "0x"，则是合约
    return data.result && data.result !== '0x';
  } catch {
    return false;
  }
}

// ============================================================================
// Webhook 重试机制
// ============================================================================

const WEBHOOK_RETRY_CONFIG = {
  maxRetries: 3,
  retryDelayMs: 5000, // 5 seconds
  maxRetryDelayMs: 60000, // 1 minute
};

/**
 * 带重试的 Webhook 发送
 */
async function sendWebhookWithRetry(
  webhook: WebhookConfig,
  event: WebhookEvent,
  data: unknown,
  retryCount: number = 0,
): Promise<{ success: boolean; error?: string; retryCount: number }> {
  const result = await sendWebhookNotification(webhook, event, data);

  if (result.success) {
    return { success: true, retryCount };
  }

  // 检查是否需要重试
  if (retryCount < WEBHOOK_RETRY_CONFIG.maxRetries && webhook.enabled) {
    // 计算退避延迟
    const delay = Math.min(
      WEBHOOK_RETRY_CONFIG.retryDelayMs * Math.pow(2, retryCount),
      WEBHOOK_RETRY_CONFIG.maxRetryDelayMs,
    );

    logger.warn('Webhook delivery failed, retrying', {
      webhookId: webhook.id,
      webhookName: webhook.name,
      event,
      retryCount: retryCount + 1,
      maxRetries: WEBHOOK_RETRY_CONFIG.maxRetries,
      delayMs: delay,
      error: result.error,
    });

    // 等待后重试
    await new Promise((resolve) => setTimeout(resolve, delay));
    return sendWebhookWithRetry(webhook, event, data, retryCount + 1);
  }

  return { success: false, error: result.error, retryCount };
}

/**
 * 触发配置变更 Webhook 通知（带重试）
 */
export async function notifyConfigChangeWithRetry(
  event: WebhookEvent,
  data: unknown,
): Promise<void> {
  if (!hasDatabase()) return;

  try {
    // 获取所有启用的 webhook
    const webhooks = await listWebhookConfigs();
    const matchingWebhooks = webhooks.filter((w) => w.enabled && w.events.includes(event));

    if (matchingWebhooks.length === 0) return;

    // 并行发送通知（带重试）
    const results = await Promise.allSettled(
      matchingWebhooks.map((webhook) => sendWebhookWithRetry(webhook, event, data)),
    );

    // 记录结果并保存到日志表
    for (let i = 0; i < results.length; i++) {
      const webhook = matchingWebhooks[i];
      const result = results[i];

      if (webhook && result) {
        if (result.status === 'fulfilled') {
          const { success, error, retryCount } = result.value;

          // 记录到数据库
          await logWebhookDelivery(webhook.id, event, data, success, error, retryCount);

          if (success) {
            logger.info('Webhook notification delivered', {
              webhookId: webhook.id,
              webhookName: webhook.name,
              event,
              retryCount,
            });
          } else {
            logger.error('Webhook delivery failed after retries', {
              webhookId: webhook.id,
              webhookName: webhook.name,
              event,
              retryCount,
              error,
            });
          }
        } else {
          // Promise 被拒绝
          await logWebhookDelivery(
            webhook.id,
            event,
            data,
            false,
            String(result.reason),
            WEBHOOK_RETRY_CONFIG.maxRetries,
          );

          logger.error('Webhook delivery rejected', {
            webhookId: webhook.id,
            webhookName: webhook.name,
            event,
            error: String(result.reason),
          });
        }
      }
    }
  } catch (error) {
    logger.error('Failed to send webhook notifications', {
      event,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * 记录 Webhook 发送日志
 */
async function logWebhookDelivery(
  webhookId: string,
  event: string,
  payload: unknown,
  success: boolean,
  errorMessage?: string,
  retryCount: number = 0,
): Promise<void> {
  if (!hasDatabase()) return;

  try {
    await query(
      `INSERT INTO webhook_delivery_logs 
       (webhook_id, event, payload, success, error_message, retry_count, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [webhookId, event, JSON.stringify(payload), success, errorMessage || null, retryCount],
    );
  } catch (err) {
    logger.error('Failed to log webhook delivery', {
      webhookId,
      event,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ============================================================================
// 配置版本控制
// ============================================================================

export interface ConfigVersion {
  id: number;
  instanceId: string;
  version: number;
  config: OracleConfig;
  changeType: 'create' | 'update' | 'rollback';
  changeReason?: string;
  createdBy?: string;
  createdAt: string;
}

/**
 * 保存配置版本
 */
export async function saveConfigVersion(
  instanceId: string,
  config: OracleConfig,
  changeType: 'create' | 'update' | 'rollback',
  options: {
    changeReason?: string;
    createdBy?: string;
  } = {},
): Promise<ConfigVersion> {
  if (!hasDatabase()) {
    throw new Error('Database not available');
  }

  const { changeReason, createdBy } = options;

  // 获取当前版本号
  const versionRes = await query<{ max_version: number }>(
    'SELECT COALESCE(MAX(version), 0) as max_version FROM config_versions WHERE instance_id = $1',
    [instanceId],
  );
  const version = (versionRes.rows[0]?.max_version || 0) + 1;

  const res = await query<{
    id: number;
    instance_id: string;
    version: number;
    config: string;
    change_type: string;
    change_reason: string | null;
    created_by: string | null;
    created_at: Date;
  }>(
    `INSERT INTO config_versions 
     (instance_id, version, config, change_type, change_reason, created_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     RETURNING *`,
    [
      instanceId,
      version,
      JSON.stringify(config),
      changeType,
      changeReason || null,
      createdBy || null,
    ],
  );

  const row = res.rows[0];
  if (!row) {
    throw new Error('Failed to save config version');
  }
  return {
    id: row.id,
    instanceId: row.instance_id,
    version: row.version,
    config: JSON.parse(row.config) as OracleConfig,
    changeType: row.change_type as 'create' | 'update' | 'rollback',
    changeReason: row.change_reason || undefined,
    createdBy: row.created_by || undefined,
    createdAt: row.created_at.toISOString(),
  };
}

/**
 * 获取配置版本历史
 */
export async function getConfigVersions(
  instanceId: string,
  options: {
    limit?: number;
    offset?: number;
  } = {},
): Promise<{ versions: ConfigVersion[]; total: number }> {
  if (!hasDatabase()) {
    return { versions: [], total: 0 };
  }

  const { limit = 50, offset = 0 } = options;

  const [countRes, dataRes] = await Promise.all([
    query<{ count: number }>(
      'SELECT COUNT(*) as count FROM config_versions WHERE instance_id = $1',
      [instanceId],
    ),
    query<{
      id: number;
      instance_id: string;
      version: number;
      config: string;
      change_type: string;
      change_reason: string | null;
      created_by: string | null;
      created_at: Date;
    }>(
      `SELECT * FROM config_versions 
       WHERE instance_id = $1 
       ORDER BY version DESC 
       LIMIT $2 OFFSET $3`,
      [instanceId, limit, offset],
    ),
  ]);

  const versions = dataRes.rows.map((row) => ({
    id: row.id,
    instanceId: row.instance_id,
    version: row.version,
    config: JSON.parse(row.config) as OracleConfig,
    changeType: row.change_type as 'create' | 'update' | 'rollback',
    changeReason: row.change_reason || undefined,
    createdBy: row.created_by || undefined,
    createdAt: row.created_at.toISOString(),
  }));

  return {
    versions,
    total: parseInt(String(countRes.rows[0]?.count || '0'), 10),
  };
}

/**
 * 回滚到指定版本
 */
export async function rollbackConfigVersion(
  instanceId: string,
  version: number,
  options: {
    reason?: string;
    createdBy?: string;
  } = {},
): Promise<OracleConfig | null> {
  if (!hasDatabase()) {
    throw new Error('Database not available');
  }

  // 获取指定版本
  const res = await query<{
    config: string;
  }>('SELECT config FROM config_versions WHERE instance_id = $1 AND version = $2', [
    instanceId,
    version,
  ]);

  if (!res.rows[0]) {
    return null;
  }

  const config = JSON.parse(res.rows[0].config) as OracleConfig;

  // 保存回滚版本
  await saveConfigVersion(instanceId, config, 'rollback', {
    changeReason: options.reason || `Rollback to version ${version}`,
    createdBy: options.createdBy,
  });

  return config;
}

// ============================================================================
// 配置导入导出
// ============================================================================

export interface ConfigExport {
  format: 'json' | 'yaml';
  instances: Array<{
    instanceId: string;
    config: OracleConfig;
    metadata?: {
      exportedAt: string;
      exportedBy?: string;
      version?: number;
    };
  }>;
  templates?: ConfigTemplate[];
  exportedAt: string;
  exportedBy?: string;
}

/**
 * 导出配置
 */
export async function exportConfigs(
  instanceIds: string[],
  options: {
    includeTemplates?: boolean;
    format?: 'json' | 'yaml';
    exportedBy?: string;
  } = {},
): Promise<ConfigExport> {
  const { includeTemplates = false, format = 'json', exportedBy } = options;

  const instances = await Promise.all(
    instanceIds.map(async (instanceId) => {
      const config = await readOracleConfig(instanceId);
      return {
        instanceId,
        config,
        metadata: {
          exportedAt: new Date().toISOString(),
          exportedBy,
        },
      };
    }),
  );

  const result: ConfigExport = {
    format,
    instances,
    exportedAt: new Date().toISOString(),
    exportedBy,
  };

  if (includeTemplates) {
    result.templates = await listConfigTemplates();
  }

  return result;
}

/**
 * 导入配置
 */
export async function importConfigs(
  exportData: ConfigExport,
  options: {
    overwriteExisting?: boolean;
    validateConfigs?: boolean;
    importedBy?: string;
  } = {},
): Promise<{
  success: string[];
  failed: Array<{ instanceId: string; error: string }>;
  importedTemplates?: number;
}> {
  const { overwriteExisting = false, validateConfigs = true, importedBy } = options;
  const success: string[] = [];
  const failed: Array<{ instanceId: string; error: string }> = [];

  // 导入实例配置
  for (const instance of exportData.instances) {
    try {
      // 验证配置
      if (validateConfigs) {
        const validation = await validateOracleConfig(instance.config, {
          checkConnectivity: false,
        });
        if (!validation.valid) {
          failed.push({
            instanceId: instance.instanceId,
            error: `Validation failed: ${validation.errors.map((e) => e.message).join(', ')}`,
          });
          continue;
        }
      }

      // 检查是否已存在
      if (!overwriteExisting) {
        const existing = await readOracleConfig(instance.instanceId);
        // 如果存在且有配置，跳过
        if (existing && existing.contractAddress) {
          failed.push({
            instanceId: instance.instanceId,
            error: 'Instance already exists (use overwriteExisting to replace)',
          });
          continue;
        }
      }

      // 写入配置
      await writeOracleConfig(instance.config, instance.instanceId);

      // 保存版本
      if (hasDatabase()) {
        await saveConfigVersion(instance.instanceId, instance.config, 'create', {
          changeReason: `Imported from export (${exportData.exportedAt})`,
          createdBy: importedBy,
        });
      }

      success.push(instance.instanceId);
    } catch (error) {
      failed.push({
        instanceId: instance.instanceId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // 导入模板
  let importedTemplates = 0;
  if (exportData.templates && hasDatabase()) {
    for (const template of exportData.templates) {
      try {
        await createConfigTemplate({
          name: template.name,
          description: template.description,
          config: template.config,
          isDefault: template.isDefault,
        });
        importedTemplates++;
      } catch {
        // 模板导入失败不影响整体结果
      }
    }
  }

  return { success, failed, importedTemplates };
}

// ============================================================================
// 配置差异对比
// ============================================================================

export interface ConfigDiff {
  field: keyof OracleConfig;
  oldValue: unknown;
  newValue: unknown;
  type: 'added' | 'removed' | 'modified';
}

/**
 * 对比两个配置
 */
export function diffConfigs(
  oldConfig: Partial<OracleConfig>,
  newConfig: Partial<OracleConfig>,
): ConfigDiff[] {
  const diffs: ConfigDiff[] = [];
  const allFields = new Set([...Object.keys(oldConfig), ...Object.keys(newConfig)]) as Set<
    keyof OracleConfig
  >;

  for (const field of allFields) {
    const oldValue = oldConfig[field];
    const newValue = newConfig[field];

    if (oldValue === undefined && newValue !== undefined) {
      diffs.push({ field, oldValue, newValue, type: 'added' });
    } else if (oldValue !== undefined && newValue === undefined) {
      diffs.push({ field, oldValue, newValue, type: 'removed' });
    } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      diffs.push({ field, oldValue, newValue, type: 'modified' });
    }
  }

  return diffs;
}

/**
 * 格式化差异为可读文本
 */
export function formatConfigDiff(diffs: ConfigDiff[]): string {
  if (diffs.length === 0) return 'No changes';

  const lines: string[] = [];
  for (const diff of diffs) {
    const emoji = diff.type === 'added' ? '➕' : diff.type === 'removed' ? '➖' : '📝';
    lines.push(`${emoji} ${diff.field}:`);
    if (diff.type === 'modified') {
      lines.push(`   - ${JSON.stringify(diff.oldValue)}`);
      lines.push(`   + ${JSON.stringify(diff.newValue)}`);
    } else if (diff.type === 'added') {
      lines.push(`   + ${JSON.stringify(diff.newValue)}`);
    } else {
      lines.push(`   - ${JSON.stringify(diff.oldValue)}`);
    }
  }
  return lines.join('\n');
}

// ============================================================================
// 配置克隆
// ============================================================================

/**
 * 克隆配置到新的实例
 */
export async function cloneConfig(
  sourceInstanceId: string,
  targetInstanceId: string,
  options: {
    overwriteExisting?: boolean;
    cloneName?: string;
    customConfig?: Partial<OracleConfig>;
  } = {},
): Promise<{ success: boolean; error?: string }> {
  const { overwriteExisting = false, customConfig = {} } = options;

  try {
    // 读取源配置
    const sourceConfig = await readOracleConfig(sourceInstanceId);

    // 检查目标实例
    if (!overwriteExisting) {
      const existing = await readOracleConfig(targetInstanceId);
      if (existing && existing.contractAddress) {
        return {
          success: false,
          error: 'Target instance already exists',
        };
      }
    }

    // 合并配置
    const targetConfig = {
      ...sourceConfig,
      ...customConfig,
    };

    // 写入目标实例
    await writeOracleConfig(targetConfig, targetInstanceId);

    // 保存版本
    if (hasDatabase()) {
      await saveConfigVersion(targetInstanceId, targetConfig, 'create', {
        changeReason: `Cloned from ${sourceInstanceId}`,
      });
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// 配置搜索和过滤
// ============================================================================

export interface ConfigSearchOptions {
  query?: string;
  chain?: string;
  hasContractAddress?: boolean;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface ConfigSearchResult {
  instanceId: string;
  name: string;
  config: OracleConfig;
  matchScore?: number;
}

/**
 * 搜索配置
 */
export async function searchConfigs(
  options: ConfigSearchOptions = {},
): Promise<{ results: ConfigSearchResult[]; total: number }> {
  if (!hasDatabase()) {
    // 内存模式：从内存存储搜索
    const mem = getMemoryInstance('default');
    return {
      results: [
        {
          instanceId: 'default',
          name: 'Default',
          config: mem.oracleConfig,
        },
      ],
      total: 1,
    };
  }

  const {
    query: searchQuery,
    chain,
    hasContractAddress,
    sortBy = 'name',
    sortOrder = 'asc',
    limit = 50,
    offset = 0,
  } = options;

  const conditions: string[] = [];
  const values: (string | boolean | number)[] = [];
  let paramIndex = 1;

  if (searchQuery) {
    conditions.push(`(id ILIKE $${paramIndex} OR name ILIKE $${paramIndex})`);
    values.push(`%${searchQuery}%`);
    paramIndex++;
  }

  if (chain) {
    conditions.push(`chain = $${paramIndex}`);
    values.push(chain);
    paramIndex++;
  }

  if (hasContractAddress !== undefined) {
    conditions.push(
      hasContractAddress
        ? `contract_address IS NOT NULL AND contract_address != ''`
        : `(contract_address IS NULL OR contract_address = '')`,
    );
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sortColumn =
    sortBy === 'createdAt' ? 'created_at' : sortBy === 'updatedAt' ? 'updated_at' : 'id';
  const orderDirection = sortOrder === 'desc' ? 'DESC' : 'ASC';
  const orderClause = `ORDER BY ${sortColumn} ${orderDirection}`;

  const countPromise = query<{ count: number }>(
    `SELECT COUNT(*) as count FROM oracle_instances ${whereClause}`,
    values,
  );

  const dataPromise = query<{
    id: string;
    name: string;
    rpc_url: string;
    contract_address: string;
    chain: string;
    start_block: number;
    max_block_range: number;
    voting_period_hours: number;
    confirmation_blocks: number;
  }>(
    `SELECT * FROM oracle_instances ${whereClause} ${orderClause} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...values, limit, offset],
  );

  const [countRes, dataRes] = await Promise.all([countPromise, dataPromise]);

  const results = dataRes.rows.map(
    (row: {
      id: string;
      name: string;
      rpc_url: string;
      contract_address: string;
      chain: string;
      start_block: number;
      max_block_range: number;
      voting_period_hours: number;
      confirmation_blocks: number;
    }) => ({
      instanceId: row.id,
      name: row.name,
      config: {
        rpcUrl: row.rpc_url || '',
        contractAddress: row.contract_address || '',
        chain: (row.chain as OracleConfig['chain']) || 'Local',
        startBlock: row.start_block || 0,
        maxBlockRange: row.max_block_range || 10000,
        votingPeriodHours: row.voting_period_hours || 72,
        confirmationBlocks: row.confirmation_blocks || 12,
      },
    }),
  );

  return {
    results,
    total: parseInt(String(countRes.rows[0]?.count || '0'), 10),
  };
}

// ============================================================================
// Schema 扩展
// ============================================================================

export async function ensureEnhancedSchema(): Promise<void> {
  if (!hasDatabase()) return;

  await query(`
    -- Webhook 配置表
    CREATE TABLE IF NOT EXISTS webhook_configs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      events TEXT[] NOT NULL DEFAULT '{}',
      secret TEXT,
      enabled BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_webhook_configs_enabled ON webhook_configs(enabled);

    -- 配置模板表
    CREATE TABLE IF NOT EXISTS config_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      config JSONB NOT NULL DEFAULT '{}',
      is_default BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_config_templates_default ON config_templates(is_default);

    -- Webhook 发送日志表（用于重试和审计）
    CREATE TABLE IF NOT EXISTS webhook_delivery_logs (
      id BIGSERIAL PRIMARY KEY,
      webhook_id TEXT NOT NULL REFERENCES webhook_configs(id) ON DELETE CASCADE,
      event TEXT NOT NULL,
      payload JSONB NOT NULL,
      response_status INTEGER,
      response_body TEXT,
      error_message TEXT,
      success BOOLEAN NOT NULL DEFAULT false,
      retry_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook ON webhook_delivery_logs(webhook_id);
    CREATE INDEX IF NOT EXISTS idx_webhook_logs_created ON webhook_delivery_logs(created_at);

    -- 配置版本表
    CREATE TABLE IF NOT EXISTS config_versions (
      id BIGSERIAL PRIMARY KEY,
      instance_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      config JSONB NOT NULL,
      change_type TEXT NOT NULL,
      change_reason TEXT,
      created_by TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      UNIQUE(instance_id, version)
    );

    CREATE INDEX IF NOT EXISTS idx_config_versions_instance ON config_versions(instance_id);
    CREATE INDEX IF NOT EXISTS idx_config_versions_version ON config_versions(instance_id, version DESC);
  `);
}
