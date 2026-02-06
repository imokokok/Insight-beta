/**
 * 配置导入导出 API
 * GET  /api/oracle/config/export     - 导出配置
 * POST /api/oracle/config/import     - 导入配置
 */

import { logger } from '@/lib/logger';
import { handleApi, rateLimit, requireAdmin, getAdminActor } from '@/server/apiResponse';
import { appendAuditLog } from '@/server/observability';
import { exportConfigs, importConfigs, ensureEnhancedSchema } from '@/server/oracleConfigEnhanced';
import type { ConfigExport } from '@/server/oracleConfigEnhanced';
import { generateRequestId } from '@/server/performance';

const RATE_LIMITS = {
  GET: { key: 'oracle_config_export', limit: 30, windowMs: 60_000 },
  POST: { key: 'oracle_config_import', limit: 10, windowMs: 60_000 },
};

// GET /api/oracle/config/export
export async function GET(request: Request) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    return await handleApi(request, async () => {
      const limited = await rateLimit(request, RATE_LIMITS.GET);
      if (limited) return limited;

      const auth = await requireAdmin(request, { strict: true, scope: 'oracle_config_write' });
      if (auth) return auth;

      await ensureEnhancedSchema();

      const url = new URL(request.url);
      const instanceIdsParam = url.searchParams.get('instanceIds');
      const includeTemplates = url.searchParams.get('includeTemplates') === 'true';
      const format = (url.searchParams.get('format') as 'json' | 'yaml') || 'json';

      if (!instanceIdsParam) {
        throw Object.assign(new Error('missing_instance_ids'), {
          status: 400,
          details: { message: 'instanceIds query parameter is required (comma-separated)' },
        });
      }

      const instanceIds = instanceIdsParam
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);

      if (instanceIds.length === 0) {
        throw Object.assign(new Error('invalid_instance_ids'), {
          status: 400,
          details: { message: 'At least one instanceId is required' },
        });
      }

      if (instanceIds.length > 100) {
        throw Object.assign(new Error('too_many_instances'), {
          status: 400,
          details: { message: 'Maximum 100 instances per export', received: instanceIds.length },
        });
      }

      const exportData = await exportConfigs(instanceIds, {
        includeTemplates,
        format,
        exportedBy: getAdminActor(request),
      });

      const durationMs = Date.now() - startTime;

      await appendAuditLog({
        actor: getAdminActor(request),
        action: 'oracle_config_exported',
        entityType: 'oracle',
        entityId: null,
        details: {
          requestId,
          instanceCount: instanceIds.length,
          includeTemplates,
          format,
          durationMs,
        },
      });

      logger.info('Config export completed', {
        requestId,
        instanceCount: instanceIds.length,
        durationMs,
      });

      // 返回 JSON 或 YAML 格式
      if (format === 'yaml') {
        // 简化的 YAML 格式（实际项目中可以使用 js-yaml）
        const yamlContent = convertToYaml(exportData);
        return new Response(yamlContent, {
          headers: {
            'Content-Type': 'text/yaml',
            'Content-Disposition': `attachment; filename="oracle-config-${Date.now()}.yaml"`,
          },
        });
      }

      return {
        export: exportData,
        meta: { requestId, durationMs },
      };
    });
  } catch (error) {
    logger.error('Failed to export configs', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// POST /api/oracle/config/import
export async function POST(request: Request) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    return await handleApi(request, async () => {
      const limited = await rateLimit(request, RATE_LIMITS.POST);
      if (limited) return limited;

      const auth = await requireAdmin(request, { strict: true, scope: 'oracle_config_write' });
      if (auth) return auth;

      await ensureEnhancedSchema();

      const body = await request.json();
      const { export: exportData, options = {} } = body as {
        export: ConfigExport;
        options?: {
          overwriteExisting?: boolean;
          validateConfigs?: boolean;
        };
      };

      if (!exportData || !exportData.instances) {
        throw Object.assign(new Error('invalid_export_data'), {
          status: 400,
          details: { message: 'Invalid export data format' },
        });
      }

      const result = await importConfigs(exportData, {
        ...options,
        importedBy: getAdminActor(request),
      });

      const durationMs = Date.now() - startTime;

      await appendAuditLog({
        actor: getAdminActor(request),
        action: 'oracle_config_imported',
        entityType: 'oracle',
        entityId: null,
        details: {
          requestId,
          successCount: result.success.length,
          failedCount: result.failed.length,
          importedTemplates: result.importedTemplates,
          durationMs,
        },
      });

      logger.info('Config import completed', {
        requestId,
        successCount: result.success.length,
        failedCount: result.failed.length,
        durationMs,
      });

      return {
        success: result.failed.length === 0,
        result,
        meta: { requestId, durationMs },
      };
    });
  } catch (error) {
    logger.error('Failed to import configs', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * 简化的 JSON 到 YAML 转换
 */
function convertToYaml(data: unknown, indent = 0): string {
  const spaces = '  '.repeat(indent);

  if (data === null || data === undefined) {
    return 'null';
  }

  if (typeof data === 'string') {
    // 如果字符串包含特殊字符，使用引号
    if (/[:\n"']/.test(data)) {
      return `"${data.replace(/"/g, '\\"')}"`;
    }
    return data;
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return String(data);
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return '[]';
    return (
      '\n' +
      data.map((item) => `${spaces}- ${convertToYaml(item, indent + 1).trimStart()}`).join('\n')
    );
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data);
    if (entries.length === 0) return '{}';
    return (
      '\n' +
      entries
        .map(([key, value]) => {
          const valueStr = convertToYaml(value, indent + 1);
          if (valueStr.startsWith('\n')) {
            return `${spaces}${key}:${valueStr}`;
          }
          return `${spaces}${key}: ${valueStr}`;
        })
        .join('\n')
    );
  }

  return String(data);
}
