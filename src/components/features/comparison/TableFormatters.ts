/**
 * 表格数据格式化函数
 */

export interface TableFormatters {
  price: (price: number) => string;
  deviation: (value: number) => string;
  latency: (ms: number) => string;
}

export function createFormatters(): TableFormatters {
  return {
    price: (price: number) => {
      if (price >= 1000) return `$${price.toLocaleString()}`;
      if (price >= 1) return `$${price.toFixed(2)}`;
      return `$${price.toFixed(4)}`;
    },
    deviation: (value: number) => {
      const absValue = Math.abs(value);
      if (absValue < 0.01) return '<0.01%';
      return `${absValue.toFixed(2)}%`;
    },
    latency: (ms: number) => {
      if (ms < 1000) return `${ms.toFixed(0)}ms`;
      return `${(ms / 1000).toFixed(1)}s`;
    },
  };
}

export function getDeviationColor(deviation: number): string {
  const abs = Math.abs(deviation);
  if (abs > 2) return 'text-red-600 bg-red-50';
  if (abs > 1) return 'text-orange-600 bg-orange-50';
  if (abs > 0.5) return 'text-yellow-600 bg-yellow-50';
  return 'text-emerald-600 bg-emerald-50';
}

export function getLatencyColor(latency: number): string {
  if (latency > 5000) return 'text-red-600';
  if (latency > 1000) return 'text-yellow-600';
  return 'text-emerald-600';
}

export function getSpreadVariant(spreadPercent: number): 'default' | 'secondary' | 'destructive' {
  if (spreadPercent > 1) return 'destructive';
  if (spreadPercent > 0.5) return 'secondary';
  return 'default';
}
