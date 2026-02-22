/**
 * Time/Latency Formatting Utilities
 *
 * 时间/延迟格式化工具函数
 */

export interface FormatLatencyOptions {
  placeholder?: string;
}

export function formatLatency(
  ms: number | null | undefined,
  options: FormatLatencyOptions = {},
): string {
  const { placeholder = '—' } = options;

  if (ms === null || ms === undefined || !Number.isFinite(ms)) {
    return placeholder;
  }

  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }

  return `${(ms / 1000).toFixed(2)}s`;
}

export function formatDuration(
  ms: number | null | undefined,
  options: FormatLatencyOptions = {},
): string {
  const { placeholder = '—' } = options;

  if (ms === null || ms === undefined || !Number.isFinite(ms)) {
    return placeholder;
  }

  const seconds = Math.floor(ms / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    if (remainingSeconds === 0) {
      return `${minutes}m`;
    }
    return `${minutes}m ${remainingSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

export function formatInterval(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) {
    return '—';
  }

  const seconds = ms / 1000;

  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }

  const minutes = seconds / 60;

  if (minutes < 60) {
    return `${minutes.toFixed(1)}m`;
  }

  const hours = minutes / 60;
  return `${hours.toFixed(1)}h`;
}

export function getLatencyColor(latency: number): string {
  if (latency < 100) return 'text-green-500';
  if (latency < 500) return 'text-yellow-500';
  return 'text-red-500';
}

export function getLatencyStatus(latency: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (latency < 100) return 'excellent';
  if (latency < 300) return 'good';
  if (latency < 500) return 'fair';
  return 'poor';
}
