/**
 * Diff Module - 配置差异对比模块
 *
 * 支持配置差异检测、格式化输出
 */

import type { OracleConfig } from '@/lib/types/oracleTypes';

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
