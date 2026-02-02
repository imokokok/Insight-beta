/**
 * Import/Export Module - 配置导入导出模块
 *
 * 支持配置的导入导出、格式转换、批量导入
 */

import type { OracleConfig, ConfigTemplate } from '@/lib/types/oracleTypes';
import { hasDatabase } from '../db';
import { readOracleConfig, writeOracleConfig } from '../oracle';
import { validateOracleConfig } from './validation';
import { saveConfigVersion } from './versioning';
import { listConfigTemplates, createConfigTemplate } from './template';

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
