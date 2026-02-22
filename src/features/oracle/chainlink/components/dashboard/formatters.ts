export function formatNumber(value: number, decimals: number = 2): string {
  if (!Number.isFinite(value)) return '—';

  const absValue = Math.abs(value);

  if (absValue >= 1e9) {
    return (value / 1e9).toFixed(decimals) + 'B';
  }
  if (absValue >= 1e6) {
    return (value / 1e6).toFixed(decimals) + 'M';
  }
  if (absValue >= 1e3) {
    return (value / 1e3).toFixed(decimals) + 'K';
  }

  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercent(value: number, decimals: number = 2): string {
  if (!Number.isFinite(value)) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

export function formatPrice(price: number): string {
  if (!Number.isFinite(price)) return '—';
  if (price === 0) return '$0.00';
  if (Math.abs(price) < 0.0001) return `$${price.toExponential(2)}`;
  if (Math.abs(price) < 0.01) return `$${price.toFixed(6)}`;
  if (Math.abs(price) < 1) return `$${price.toFixed(4)}`;
  if (Math.abs(price) < 1000) return `$${price.toFixed(2)}`;
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatAddress(address: string, start: number = 6, end: number = 4): string {
  if (!address || address.length < start + end) return address || '';
  return `${address.slice(0, start)}...${address.slice(-end)}`;
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
  if (!Number.isFinite(ms)) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function formatGas(gwei: number): string {
  if (!Number.isFinite(gwei)) return '—';
  return `${gwei.toFixed(2)} Gwei`;
}
