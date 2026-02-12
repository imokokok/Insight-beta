/**
 * Developer Authentication & API Key Management
 *
 * 开发者认证与 API 密钥管理系统
 * 支持 API Key、OAuth2、JWT 等多种认证方式
 */

import { createHash, randomBytes, timingSafeEqual } from 'crypto';

import { logger } from '@/shared/logger';
import { query } from '@/infrastructure/database/db';

// ============================================================================
// Types
// ============================================================================

export interface Developer {
  id: string;
  email: string;
  name: string;
  organization?: string;
  status: 'active' | 'suspended' | 'inactive';
  tier: 'free' | 'basic' | 'pro' | 'enterprise';
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface APIKey {
  id: string;
  developerId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  scopes: string[];
  rateLimitTier: string;
  expiresAt?: Date;
  lastUsedAt?: Date;
  usageCount: number;
  status: 'active' | 'revoked' | 'expired';
  createdAt: Date;
  revokedAt?: Date;
  revokedReason?: string;
}

export interface APIKeyWithPlaintext extends APIKey {
  keyPlaintext: string; // 仅创建时返回，不存储
}

export interface AuthResult {
  success: boolean;
  developer?: Developer;
  apiKey?: APIKey;
  error?: string;
  scopes?: string[];
}

export interface RateLimitConfig {
  tier: string;
  requestsPerSecond: number;
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstLimit: number;
}

// ============================================================================
// Rate Limit Configuration
// ============================================================================

export const RATE_LIMIT_TIERS: Record<string, RateLimitConfig> = {
  free: {
    tier: 'free',
    requestsPerSecond: 1,
    requestsPerMinute: 10,
    requestsPerHour: 100,
    requestsPerDay: 1000,
    burstLimit: 5,
  },
  basic: {
    tier: 'basic',
    requestsPerSecond: 5,
    requestsPerMinute: 100,
    requestsPerHour: 1000,
    requestsPerDay: 10000,
    burstLimit: 20,
  },
  pro: {
    tier: 'pro',
    requestsPerSecond: 20,
    requestsPerMinute: 500,
    requestsPerHour: 5000,
    requestsPerDay: 100000,
    burstLimit: 100,
  },
  enterprise: {
    tier: 'enterprise',
    requestsPerSecond: 100,
    requestsPerMinute: 2000,
    requestsPerHour: 20000,
    requestsPerDay: 500000,
    burstLimit: 500,
  },
};

// ============================================================================
// API Key Management
// ============================================================================

export class APIKeyManager {
  /**
   * 生成新的 API Key
   */
  async generateAPIKey(
    developerId: string,
    name: string,
    scopes: string[] = ['read'],
    expiresInDays?: number,
  ): Promise<APIKeyWithPlaintext | null> {
    try {
      // 检查开发者是否存在且活跃
      const devResult = await query(
        `SELECT id, tier FROM developers WHERE id = $1 AND status = 'active'`,
        [developerId],
      );

      if (devResult.rows.length === 0) {
        throw new Error('Developer not found or inactive');
      }

      const devRow = devResult.rows[0];
      if (!devRow || !('tier' in devRow)) {
        throw new Error('Developer data invalid');
      }
      const developerTier = devRow.tier as string;

      // 生成 API Key
      const keyPlaintext = this.generateSecureKey();
      const keyHash = this.hashKey(keyPlaintext);
      const keyPrefix = keyPlaintext.substring(0, 8);

      const id = crypto.randomUUID();
      const now = new Date();
      const expiresAt = expiresInDays
        ? new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000)
        : null;

      const apiKey: APIKey = {
        id,
        developerId,
        name,
        keyHash,
        keyPrefix,
        scopes,
        rateLimitTier: developerTier,
        expiresAt: expiresAt || undefined,
        usageCount: 0,
        status: 'active',
        createdAt: now,
      };

      // 存储到数据库
      await query(
        `
        INSERT INTO api_keys (
          id, developer_id, name, key_hash, key_prefix, scopes, rate_limit_tier,
          expires_at, usage_count, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
        [
          apiKey.id,
          apiKey.developerId,
          apiKey.name,
          apiKey.keyHash,
          apiKey.keyPrefix,
          apiKey.scopes,
          apiKey.rateLimitTier,
          apiKey.expiresAt || null,
          apiKey.usageCount,
          apiKey.status,
          apiKey.createdAt,
        ],
      );

      logger.info(`Generated API key for developer ${developerId}`, {
        keyId: apiKey.id,
        name: apiKey.name,
        scopes: apiKey.scopes,
      });

      return {
        ...apiKey,
        keyPlaintext,
      };
    } catch (error) {
      logger.error('Failed to generate API key', { error, developerId });
      return null;
    }
  }

  /**
   * 验证 API Key
   */
  async validateAPIKey(keyPlaintext: string): Promise<AuthResult> {
    try {
      const keyHash = this.hashKey(keyPlaintext);
      // 使用 Array.from 确保正确处理多字节 UTF-8 字符（如 emoji）
      const keyPrefix = Array.from(keyPlaintext).slice(0, 8).join('');

      // 查找 API Key
      const result = await query(
        `
        SELECT ak.*, d.id as dev_id, d.email, d.name, d.status as dev_status, d.tier
        FROM api_keys ak
        JOIN developers d ON ak.developer_id = d.id
        WHERE ak.key_prefix = $1 AND ak.status = 'active'
      `,
        [keyPrefix],
      );

      if (result.rows.length === 0) {
        return { success: false, error: 'Invalid API key' };
      }

      const row = result.rows[0];
      if (!row) {
        return { success: false, error: 'Invalid API key' };
      }

      // 验证 key hash
      const storedHash = Buffer.from(row.key_hash, 'hex');
      const providedHash = Buffer.from(keyHash, 'hex');

      if (storedHash.length !== providedHash.length) {
        return { success: false, error: 'Invalid API key' };
      }

      if (!timingSafeEqual(storedHash, providedHash)) {
        return { success: false, error: 'Invalid API key' };
      }

      // 检查是否过期
      if (row.expires_at && new Date(row.expires_at) < new Date()) {
        await this.revokeAPIKey(row.id, 'expired');
        return { success: false, error: 'API key expired' };
      }

      // 检查开发者状态
      if (row.dev_status !== 'active') {
        return { success: false, error: 'Developer account inactive' };
      }

      // 更新最后使用时间和使用次数
      await query(
        `
        UPDATE api_keys 
        SET last_used_at = NOW(), usage_count = usage_count + 1
        WHERE id = $1
      `,
        [row.id],
      );

      const developer: Developer = {
        id: row.dev_id,
        email: row.email,
        name: row.name,
        status: row.dev_status,
        tier: row.tier,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      };

      const apiKey: APIKey = {
        id: row.id,
        developerId: row.developer_id,
        name: row.name,
        keyHash: row.key_hash,
        keyPrefix: row.key_prefix,
        scopes: row.scopes,
        rateLimitTier: row.rate_limit_tier,
        expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
        lastUsedAt: new Date(),
        usageCount: row.usage_count + 1,
        status: row.status,
        createdAt: new Date(row.created_at),
      };

      return {
        success: true,
        developer,
        apiKey,
        scopes: apiKey.scopes,
      };
    } catch (error) {
      logger.error('Failed to validate API key', { error });
      return { success: false, error: 'Authentication failed' };
    }
  }

  /**
   * 撤销 API Key
   */
  async revokeAPIKey(keyId: string, reason: string, revokedBy?: string): Promise<boolean> {
    try {
      const result = await query(
        `
        UPDATE api_keys 
        SET status = 'revoked', revoked_at = NOW(), revoked_reason = $2
        WHERE id = $1 AND status = 'active'
      `,
        [keyId, reason],
      );

      if (result.rowCount === 0) {
        return false;
      }

      logger.info(`Revoked API key ${keyId}`, { reason, revokedBy });
      return true;
    } catch (error) {
      logger.error('Failed to revoke API key', { error, keyId });
      return false;
    }
  }

  /**
   * 获取开发者的所有 API Keys
   */
  async getDeveloperAPIKeys(developerId: string): Promise<APIKey[]> {
    try {
      const result = await query(
        `
        SELECT * FROM api_keys 
        WHERE developer_id = $1
        ORDER BY created_at DESC
      `,
        [developerId],
      );

      return result.rows.map((row) => ({
        id: row.id,
        developerId: row.developer_id,
        name: row.name,
        keyHash: row.key_hash,
        keyPrefix: row.key_prefix,
        scopes: row.scopes,
        rateLimitTier: row.rate_limit_tier,
        expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
        lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : undefined,
        usageCount: row.usage_count,
        status: row.status,
        createdAt: new Date(row.created_at),
        revokedAt: row.revoked_at ? new Date(row.revoked_at) : undefined,
        revokedReason: row.revoked_reason,
      }));
    } catch (error) {
      logger.error('Failed to get developer API keys', { error, developerId });
      return [];
    }
  }

  /**
   * 生成安全的随机密钥
   */
  private generateSecureKey(): string {
    // 生成 32 字节随机数据，转为 base64
    const bytes = randomBytes(32);
    return `amp_${bytes.toString('base64url')}`;
  }

  /**
   * 哈希 API Key
   */
  private hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }
}

// ============================================================================
// Developer Management
// ============================================================================

export class DeveloperManager {
  /**
   * 注册新开发者
   */
  async registerDeveloper(
    email: string,
    name: string,
    organization?: string,
    tier: 'free' | 'basic' | 'pro' | 'enterprise' = 'free',
  ): Promise<Developer | null> {
    try {
      // 检查邮箱是否已存在
      const existing = await query(`SELECT id FROM developers WHERE email = $1`, [email]);

      if (existing.rows.length > 0) {
        throw new Error('Email already registered');
      }

      const id = crypto.randomUUID();
      const now = new Date();

      const developer: Developer = {
        id,
        email,
        name,
        organization,
        status: 'active',
        tier,
        createdAt: now,
        updatedAt: now,
      };

      await query(
        `
        INSERT INTO developers (
          id, email, name, organization, status, tier, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
        [
          developer.id,
          developer.email,
          developer.name,
          developer.organization || null,
          developer.status,
          developer.tier,
          developer.createdAt,
          developer.updatedAt,
        ],
      );

      logger.info(`Registered new developer: ${email}`, { developerId: id });

      return developer;
    } catch (error) {
      logger.error('Failed to register developer', { error, email });
      return null;
    }
  }

  /**
   * 获取开发者信息
   */
  async getDeveloper(developerId: string): Promise<Developer | null> {
    try {
      const result = await query(`SELECT * FROM developers WHERE id = $1`, [developerId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      if (!row) return null;
      return {
        id: row.id as string,
        email: row.email as string,
        name: row.name as string,
        organization: row.organization as string | undefined,
        status: (row.status as 'active' | 'suspended' | 'inactive') || 'active',
        tier: (row.tier as 'free' | 'basic' | 'pro' | 'enterprise') || 'free',
        createdAt: new Date(row.created_at as string),
        updatedAt: new Date(row.updated_at as string),
        lastLoginAt: row.last_login_at ? new Date(row.last_login_at as string) : undefined,
        metadata: row.metadata as Record<string, unknown> | undefined,
      };
    } catch (error) {
      logger.error('Failed to get developer', { error, developerId });
      return null;
    }
  }

  /**
   * 更新开发者信息
   */
  async updateDeveloper(
    developerId: string,
    updates: Partial<Developer>,
  ): Promise<Developer | null> {
    try {
      const allowedFields = ['name', 'organization', 'status', 'tier'];
      const fields: string[] = [];
      const values: (string | number | boolean | Date | null | undefined | string[] | number[])[] =
        [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key) && value !== undefined) {
          fields.push(`${key} = $${paramIndex++}`);
          values.push(
            value as string | number | boolean | Date | null | undefined | string[] | number[],
          );
        }
      }

      if (fields.length === 0) {
        return this.getDeveloper(developerId);
      }

      fields.push(`updated_at = $${paramIndex++}`);
      values.push(new Date());
      values.push(developerId);

      const result = await query(
        `UPDATE developers SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values,
      );

      if (result.rows.length === 0) {
        return null;
      }

      logger.info(`Updated developer ${developerId}`, { updates });

      return this.getDeveloper(developerId);
    } catch (error) {
      logger.error('Failed to update developer', { error, developerId });
      return null;
    }
  }

  /**
   * 记录开发者登录
   */
  async recordLogin(developerId: string): Promise<void> {
    try {
      await query(`UPDATE developers SET last_login_at = NOW() WHERE id = $1`, [developerId]);
    } catch (error) {
      logger.error('Failed to record login', { error, developerId });
    }
  }

  /**
   * 获取所有开发者（管理员功能）
   */
  async getAllDevelopers(
    filters?: {
      status?: string;
      tier?: string;
    },
    pagination?: {
      limit: number;
      offset: number;
    },
  ): Promise<{ developers: Developer[]; total: number }> {
    try {
      let whereClause = '';
      const values: (string | number | boolean | Date | null | undefined | string[] | number[])[] =
        [];
      let paramIndex = 1;

      if (filters?.status) {
        whereClause += `WHERE status = $${paramIndex++}`;
        values.push(filters.status);
      }

      if (filters?.tier) {
        whereClause += whereClause
          ? ` AND tier = $${paramIndex++}`
          : `WHERE tier = $${paramIndex++}`;
        values.push(filters.tier);
      }

      // 获取总数
      const countResult = await query(
        `SELECT COUNT(*) as total FROM developers ${whereClause}`,
        values,
      );
      const total = parseInt(countResult.rows[0]?.total || '0');

      // 获取分页数据
      let querySql = `SELECT * FROM developers ${whereClause} ORDER BY created_at DESC`;
      if (pagination) {
        querySql += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        values.push(pagination.limit, pagination.offset);
      }

      const result = await query(querySql, values);

      const developers = result.rows.map((row) => ({
        id: row.id,
        email: row.email,
        name: row.name,
        organization: row.organization,
        status: row.status,
        tier: row.tier,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : undefined,
        metadata: row.metadata,
      }));

      return { developers, total };
    } catch (error) {
      logger.error('Failed to get all developers', { error });
      return { developers: [], total: 0 };
    }
  }
}

// ============================================================================
// Permission & Scope Management
// ============================================================================

export const API_SCOPES = {
  // 读取权限
  'read:prices': 'Read price feeds',
  'read:protocols': 'Read protocol information',
  'read:stats': 'Read statistics and analytics',
  'read:alerts': 'Read alerts',

  // 写入权限
  'write:instances': 'Create and manage oracle instances',
  'write:alerts': 'Create and manage alert rules',
  'write:webhooks': 'Configure webhook endpoints',

  // 管理权限
  'admin:developers': 'Manage developers (admin only)',
  'admin:system': 'System administration (admin only)',
} as const;

export type APIScope = keyof typeof API_SCOPES;

// ============================================================================
// Export singleton instances
// ============================================================================

export const apiKeyManager = new APIKeyManager();
export const developerManager = new DeveloperManager();
