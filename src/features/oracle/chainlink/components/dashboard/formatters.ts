import {
  formatPercentValue,
  formatAddress as formatAddressShared,
  formatLatency as formatLatencyShared,
  formatGas as formatGasShared,
  getLatencyColor,
  formatNumber,
  formatPrice,
} from '@/shared/utils/format';

export { formatNumber, formatPrice };

export function formatPercent(value: number, decimals: number = 2): string {
  if (!Number.isFinite(value)) return '—';
  return formatPercentValue(value, decimals, { showSign: true });
}

export function formatAddress(address: string, start: number = 6, end: number = 4): string {
  return formatAddressShared(address, { start, end });
}

export function formatRelativeTime(
  date: string | Date | number,
  locale: 'en' | 'zh' = 'en',
): string {
  const now = new Date();
  const then =
    typeof date === 'number' ? new Date(date) : typeof date === 'string' ? new Date(date) : date;
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  const labels = {
    en: {
      justNow: 'just now',
      minuteAgo: '1 min ago',
      minutesAgo: '{n} min ago',
      hourAgo: '1 hour ago',
      hoursAgo: '{n} hours ago',
      yesterday: 'yesterday',
      daysAgo: '{n} days ago',
    },
    zh: {
      justNow: '刚刚',
      minuteAgo: '1分钟前',
      minutesAgo: '{n}分钟前',
      hourAgo: '1小时前',
      hoursAgo: '{n}小时前',
      yesterday: '昨天',
      daysAgo: '{n}天前',
    },
  };

  const l = labels[locale];

  if (seconds < 60) return l.justNow;
  if (seconds < 120) return l.minuteAgo;
  if (seconds < 3600) return l.minutesAgo.replace('{n}', String(Math.floor(seconds / 60)));
  if (seconds < 7200) return l.hourAgo;
  if (seconds < 86400) return l.hoursAgo.replace('{n}', String(Math.floor(seconds / 3600)));
  if (seconds < 172800) return l.yesterday;
  return l.daysAgo.replace('{n}', String(Math.floor(seconds / 86400)));
}

export function formatLatency(ms: number): string {
  return formatLatencyShared(ms);
}

export function formatGas(gwei: number): string {
  return formatGasShared(gwei);
}

export function getDeviationColor(deviation: number): string {
  const absDeviation = Math.abs(deviation);
  if (absDeviation < 0.5) return 'text-green-500';
  if (absDeviation < 1) return 'text-yellow-500';
  if (absDeviation < 2) return 'text-orange-500';
  return 'text-red-500';
}

export function getDeviationBadgeVariant(deviation: number): 'success' | 'warning' | 'error' {
  const absDeviation = Math.abs(deviation);
  if (absDeviation < 0.5) return 'success';
  if (absDeviation < 2) return 'warning';
  return 'error';
}

export { getLatencyColor };
