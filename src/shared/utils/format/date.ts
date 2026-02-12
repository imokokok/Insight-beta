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
