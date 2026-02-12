/**
 * Alerts Utilities
 *
 * 告警相关的工具函数
 */

import type { AlertSeverity, AlertStatus, OpsSloStatus } from '@/types/oracleTypes';

// ============================================================================
// 类型定义
// ============================================================================

export interface SloEntry {
  key: string;
  label: string;
  target: number;
  unit: string;
  current?: number;
}

export interface RootCauseOption {
  value: string;
  label: string;
}

// ============================================================================
// 严重级别徽章
// ============================================================================

export function severityBadge(severity: AlertSeverity): {
  variant: 'default' | 'destructive' | 'outline' | 'secondary';
  className: string;
  label: string;
} {
  switch (severity) {
    case 'critical':
      return { variant: 'destructive', className: 'bg-red-600', label: '严重' };
    case 'warning':
      return { variant: 'default', className: 'bg-yellow-500', label: '警告' };
    case 'info':
    default:
      return { variant: 'secondary', className: 'bg-blue-500', label: '信息' };
  }
}

// ============================================================================
// 状态徽章
// ============================================================================

export function statusBadge(status: AlertStatus): {
  variant: 'default' | 'destructive' | 'outline' | 'secondary';
  className: string;
  label: string;
} {
  switch (status) {
    case 'Open':
      return { variant: 'destructive', className: 'bg-red-500', label: '活跃' };
    case 'Acknowledged':
      return { variant: 'default', className: 'bg-yellow-500', label: '已确认' };
    case 'Resolved':
      return { variant: 'secondary', className: 'bg-green-500', label: '已解决' };
    default:
      return { variant: 'outline', className: '', label: '已抑制' };
  }
}

// ============================================================================
// SLO 相关
// ============================================================================

export const sloLabels: Record<string, string> = {
  availability: '可用性',
  latency: '延迟',
  accuracy: '准确性',
  freshness: '新鲜度',
};

export function sloStatusBadge(status: OpsSloStatus['status']): {
  variant: 'default' | 'destructive' | 'outline' | 'secondary';
  className: string;
  label: string;
} {
  switch (status) {
    case 'met':
      return { variant: 'secondary', className: 'bg-green-500', label: '健康' };
    case 'degraded':
      return { variant: 'default', className: 'bg-yellow-500', label: '警告' };
    case 'breached':
      return { variant: 'destructive', className: 'bg-red-500', label: '已违反' };
    default:
      return { variant: 'secondary', className: 'bg-green-500', label: '健康' };
  }
}

export function sloStatusLabel(status: OpsSloStatus['status']): string {
  const labels = {
    met: '健康',
    degraded: '警告',
    breached: '已违反',
  };
  return labels[status] ?? status;
}

export function formatSloTarget(_key: string, target: number): string {
  return `${(target * 100).toFixed(2)}%`;
}

export function formatSloValue(_key: string, value: number | undefined): string {
  if (value === undefined) return '-';
  return value.toFixed(2);
}

// ============================================================================
// 告警洞察映射
// ============================================================================

export const alertInsightMap: Record<string, { explanation: string; actions: string[] }> = {
  price_deviation: {
    explanation: '价格偏离 detected',
    actions: ['检查数据源', '验证价格计算'],
  },
  latency_spike: {
    explanation: '延迟 spike detected',
    actions: ['检查网络连接', '优化查询'],
  },
  stale_data: {
    explanation: '数据陈旧 detected',
    actions: ['重启同步服务', '检查数据源'],
  },
  low_confidence: {
    explanation: '低置信度 detected',
    actions: ['增加数据源', '检查数据质量'],
  },
  high_error_rate: {
    explanation: '高错误率 detected',
    actions: ['检查日志', '联系支持团队'],
  },
  service_down: {
    explanation: '服务宕机 detected',
    actions: ['立即重启服务', '通知运维团队'],
  },
};

// ============================================================================
// 安全 URL 处理
// ============================================================================

export function getSafeExternalUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `https://${url}`;
}

export function getSafeInternalPath(path: string): string {
  if (!path) return '/';
  if (path.startsWith('/')) {
    return path;
  }
  return `/${path}`;
}

export function getEntityHref(entityType: string, entityId: string): string {
  const paths: Record<string, string> = {
    oracle: `/oracle/${entityId}`,
    chain: `/chain/${entityId}`,
    protocol: `/protocol/${entityId}`,
    alert: `/alerts/${entityId}`,
  };
  return paths[entityType] ?? '/';
}

// ============================================================================
// 其他导出
// ============================================================================

export const rootCauseOptions: RootCauseOption[] = [
  { value: 'network_issue', label: '网络问题' },
  { value: 'data_source_error', label: '数据源错误' },
  { value: 'configuration_error', label: '配置错误' },
  { value: 'code_bug', label: '代码缺陷' },
  { value: 'infrastructure_failure', label: '基础设施故障' },
  { value: 'third_party_issue', label: '第三方服务问题' },
  { value: 'unknown', label: '未知原因' },
];

export const sloAlertTypes = [
  { value: 'latency', label: '延迟告警' },
  { value: 'availability', label: '可用性告警' },
  { value: 'accuracy', label: '准确性告警' },
  { value: 'freshness', label: '新鲜度告警' },
];

export function getInitialInstanceId(): string {
  return 'default';
}

export function getSloEntries(): SloEntry[] {
  return [
    { key: 'availability', label: '可用性', target: 0.999, unit: '%' },
    { key: 'latency', label: '延迟', target: 100, unit: 'ms' },
    { key: 'accuracy', label: '准确性', target: 0.99, unit: '%' },
    { key: 'freshness', label: '新鲜度', target: 60, unit: 's' },
  ];
}
