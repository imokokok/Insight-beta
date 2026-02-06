import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (!dsn) {
  console.warn('Sentry DSN not configured, error tracking disabled');
}

Sentry.init({
  dsn: dsn || '',

  environment: process.env.NODE_ENV ?? 'development',

  // 添加 Release 版本信息
  release: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',

  // 添加 Dist 信息（用于 source map）
  dist: process.env.NEXT_PUBLIC_APP_BUILD_ID,

  integrations: [
    Sentry.replayIntegration({
      blockAllMedia: true,
      maskAllText: true,
    }),
    // 添加用户反馈集成
    Sentry.feedbackIntegration({
      colorScheme: 'system',
      showBranding: false,
      autoInject: false, // 手动控制注入位置
    }),
    // 添加浏览器性能监控
    Sentry.browserTracingIntegration(),
  ],

  // Replay 配置
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.01, // 降低正常会话的采样率

  // 性能追踪采样率
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // 错误采样率
  sampleRate: 1.0,

  // 在发送前过滤错误
  beforeSend(event) {
    // 忽略已知的非关键错误
    const ignoreErrors = [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Network request failed',
      'Failed to fetch',
      'AbortError',
    ];

    const errorMessage = event.exception?.values?.[0]?.value;
    if (errorMessage && ignoreErrors.some((ignore) => errorMessage.includes(ignore))) {
      return null;
    }

    // 忽略特定 URL 的错误
    const ignoreUrls = [/extensions\//i, /^chrome:\/\//i, /^chrome-extension:\/\//i];

    const eventUrl = event.request?.url;
    if (eventUrl && ignoreUrls.some((pattern) => pattern.test(eventUrl))) {
      return null;
    }

    return event;
  },

  // 在发送前处理面包屑
  beforeBreadcrumb(breadcrumb) {
    // 过滤敏感信息
    if (breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch') {
      // 移除 URL 中的敏感参数
      if (breadcrumb.data?.url) {
        try {
          const url = new URL(breadcrumb.data.url);
          ['token', 'password', 'secret', 'apiKey'].forEach((param) => {
            url.searchParams.delete(param);
          });
          breadcrumb.data.url = url.toString();
        } catch {
          // URL 解析失败，保持原样
        }
      }
    }
    return breadcrumb;
  },

  // 调试配置（仅开发环境）
  debug: process.env.NODE_ENV === 'development',

  // 启用自动会话追踪
  autoSessionTracking: true,

  // 会话超时（毫秒）
  sessionTrackingIntervalMs: 30000,

  // 启用错误去重
  dedupe: true,

  // 最大面包屑数量
  maxBreadcrumbs: 100,

  // 附加标签
  initialScope: {
    tags: {
      app: 'oracle-monitor',
      platform: 'web',
    },
  },
});

// 设置全局标签
Sentry.setTag('app.version', process.env.NEXT_PUBLIC_APP_VERSION || 'unknown');
Sentry.setTag('app.environment', process.env.NODE_ENV || 'development');
