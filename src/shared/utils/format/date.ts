/**
 * Date/Time Formatting Utilities
 *
 * 日期时间格式化工具函数
 */

type TimeAgoLocale = 'en' | 'zh';

interface TimeAgoLabels {
  justNow: string;
  minuteAgo: string;
  minutesAgo: string;
  hourAgo: string;
  hoursAgo: string;
  yesterday: string;
  daysAgo: string;
  weeksAgo: string;
  monthsAgo: string;
  yearsAgo: string;
}

const TIME_AGO_LABELS: Record<TimeAgoLocale, TimeAgoLabels> = {
  en: {
    justNow: 'just now',
    minuteAgo: '1 minute ago',
    minutesAgo: '{n} minutes ago',
    hourAgo: '1 hour ago',
    hoursAgo: '{n} hours ago',
    yesterday: 'yesterday',
    daysAgo: '{n} days ago',
    weeksAgo: '{n} weeks ago',
    monthsAgo: '{n} months ago',
    yearsAgo: '{n} years ago',
  },
  zh: {
    justNow: '刚刚',
    minuteAgo: '1 分钟前',
    minutesAgo: '{n} 分钟前',
    hourAgo: '1 小时前',
    hoursAgo: '{n} 小时前',
    yesterday: '昨天',
    daysAgo: '{n} 天前',
    weeksAgo: '{n} 周前',
    monthsAgo: '{n} 个月前',
    yearsAgo: '{n} 年前',
  },
};

function getTimeAgoLabels(locale: TimeAgoLocale): TimeAgoLabels {
  return TIME_AGO_LABELS[locale] || TIME_AGO_LABELS.en;
}

export function formatTimeAgo(date: string | Date, locale: TimeAgoLocale = 'en'): string {
  const now = new Date();
  const then = typeof date === 'string' ? new Date(date) : date;
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  const labels = getTimeAgoLabels(locale);

  if (seconds < 60) return labels.justNow;
  if (seconds < 120) return labels.minuteAgo;
  if (seconds < 3600) return labels.minutesAgo.replace('{n}', String(Math.floor(seconds / 60)));
  if (seconds < 7200) return labels.hourAgo;
  if (seconds < 86400) return labels.hoursAgo.replace('{n}', String(Math.floor(seconds / 3600)));
  if (seconds < 172800) return labels.yesterday;
  if (seconds < 604800) return labels.daysAgo.replace('{n}', String(Math.floor(seconds / 86400)));
  if (seconds < 2592000)
    return labels.weeksAgo.replace('{n}', String(Math.floor(seconds / 604800)));
  if (seconds < 31536000)
    return labels.monthsAgo.replace('{n}', String(Math.floor(seconds / 2592000)));
  return labels.yearsAgo.replace('{n}', String(Math.floor(seconds / 31536000)));
}

export function formatTime(
  input: string | number | Date | null | undefined,
  locale: string = 'en-US',
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!input) return '—';

  let date: Date;
  if (typeof input === 'number') {
    date = new Date(input);
  } else if (typeof input === 'string') {
    date = new Date(input);
  } else {
    date = input;
  }

  if (!Number.isFinite(date.getTime())) return '—';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };

  return new Intl.DateTimeFormat(locale, options ?? defaultOptions).format(date);
}

export function formatDurationMinutes(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return '—';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);
  if (hours <= 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function formatDateIntl(
  value: Date | number | string,
  locale: string = 'en-US',
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, options).format(date);
}

export function formatRelativeTimeIntl(
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  locale: string = 'en-US',
  options?: Intl.RelativeTimeFormatOptions,
): string {
  return new Intl.RelativeTimeFormat(locale, options).format(value, unit);
}

export function formatRelativeTime(seconds: number): string {
  if (seconds < 60) return `${seconds}秒前`;
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}分钟前`;
  }
  const hours = Math.floor(seconds / 3600);
  const remainingMinutes = Math.floor((seconds % 3600) / 60);
  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours}小时${remainingMinutes}分钟前` : `${hours}小时前`;
  }
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

export function formatTimeAgoShort(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) {
    const hours = Math.floor(diffMins / 60);
    return `${hours}h ago`;
  }
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

export function formatFullTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatFullDate(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    year: '2-digit',
  });
}

export function formatFreshness(
  lastUpdate: string | Date,
  locale: 'zh' | 'en' = 'zh',
): {
  label: string;
  color: 'success' | 'warning' | 'error';
  seconds: number;
} {
  const now = new Date();
  const then = typeof lastUpdate === 'string' ? new Date(lastUpdate) : lastUpdate;
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  const labels = {
    zh: {
      fresh: '刚刚',
      minutes: '分钟前',
      hours: '小时前',
    },
    en: {
      fresh: 'just now',
      minutes: 'm ago',
      hours: 'h ago',
    },
  }[locale];

  if (seconds < 60) {
    return { label: labels.fresh, color: 'success' as const, seconds };
  }
  if (seconds < 300) {
    const minutes = Math.floor(seconds / 60);
    return {
      label: locale === 'zh' ? `${minutes}分钟前` : `${minutes}${labels.minutes}`,
      color: 'success' as const,
      seconds,
    };
  }
  if (seconds < 900) {
    const minutes = Math.floor(seconds / 60);
    return {
      label: locale === 'zh' ? `${minutes}分钟前` : `${minutes}${labels.minutes}`,
      color: 'warning' as const,
      seconds,
    };
  }
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return {
      label: locale === 'zh' ? `${minutes}分钟前` : `${minutes}${labels.minutes}`,
      color: 'error' as const,
      seconds,
    };
  }
  const hours = Math.floor(seconds / 3600);
  return {
    label: locale === 'zh' ? `${hours}小时前` : `${hours}${labels.hours}`,
    color: 'error' as const,
    seconds,
  };
}
