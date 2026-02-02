/**
 * Template Module - 配置模板管理模块
 *
 * 支持配置模板的 CRUD、默认模板设置
 */

import type { ConfigTemplate, OracleConfig } from '@/lib/types/oracleTypes';
import { hasDatabase, query } from '../db';
import crypto from 'node:crypto';

interface DbTemplateRow {
  id: string;
  name: string;
  description: string | null;
  config: string;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * 列出所有配置模板
 */
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

/**
 * 获取单个配置模板
 */
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

/**
 * 获取默认配置模板
 */
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

/**
 * 创建配置模板
 */
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

/**
 * 更新配置模板
 */
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

/**
 * 删除配置模板
 */
export async function deleteConfigTemplate(id: string): Promise<boolean> {
  if (!hasDatabase()) return false;

  const res = await query('DELETE FROM config_templates WHERE id = $1 RETURNING id', [id]);

  return res.rows.length > 0;
}
