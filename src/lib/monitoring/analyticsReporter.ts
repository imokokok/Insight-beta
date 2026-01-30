/**
 * 性能分析上报模块
 *
 * 将 Web Vitals 和性能指标上报到分析系统
 */

import { logger } from '@/lib/logger';

/**
 * 性能指标数据
 */
export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: string;
  url: string;
  userAgent: string;
  sessionId?: string;
}

/**
 * 上报配置
 */
interface AnalyticsConfig {
  endpoint?: string;
  apiKey?: string;
  sampleRate: number;
  batchSize: number;
  flushIntervalMs: number;
  maxRetries: number;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: AnalyticsConfig = {
  sampleRate: 0.1, // 10% 采样率
  batchSize: 10,
  flushIntervalMs: 30_000, // 30 秒
  maxRetries: 3,
};

/**
 * 分析上报器
 */
export class AnalyticsReporter {
  private config: AnalyticsConfig;
  private queue: PerformanceMetric[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private isFlushing = false;

  constructor(config?: Partial<AnalyticsConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.config.endpoint = config?.endpoint || process.env.INSIGHT_ANALYTICS_ENDPOINT;
    this.config.apiKey = config?.apiKey || process.env.INSIGHT_ANALYTICS_API_KEY;
  }

  /**
   * 上报性能指标
   */
  report(metric: PerformanceMetric): void {
    // 采样检查
    if (Math.random() > this.config.sampleRate) {
      return;
    }

    this.queue.push(metric);

    // 达到批量大小立即刷新
    if (this.queue.length >= this.config.batchSize) {
      this.flush();
    }
  }

  /**
   * 开始自动刷新
   */
  startAutoFlush(): void {
    if (this.flushTimer) {
      logger.warn('Analytics auto flush already started');
      return;
    }

    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushIntervalMs);

    logger.info('Analytics auto flush started', {
      intervalMs: this.config.flushIntervalMs,
      batchSize: this.config.batchSize,
    });
  }

  /**
   * 停止自动刷新
   */
  stopAutoFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
      logger.info('Analytics auto flush stopped');
    }

    // 刷新剩余数据
    this.flush();
  }

  /**
   * 立即刷新队列
   */
  async flush(): Promise<void> {
    if (this.isFlushing || this.queue.length === 0) {
      return;
    }

    if (!this.config.endpoint) {
      logger.debug('Analytics endpoint not configured, skipping flush');
      return;
    }

    this.isFlushing = true;
    const batch = this.queue.splice(0, this.config.batchSize);

    try {
      await this.sendBatch(batch);
      logger.debug('Analytics batch sent', { count: batch.length });
    } catch (error) {
      logger.error('Failed to send analytics batch', {
        error: error instanceof Error ? error.message : String(error),
        count: batch.length,
      });

      // 重试逻辑
      if (batch.length > 0) {
        this.queue.unshift(...batch);
      }
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * 发送批量数据
   */
  private async sendBatch(metrics: PerformanceMetric[]): Promise<void> {
    const payload = {
      metrics,
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'insight-web-vitals',
        version: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
      },
    };

    const response = await fetch(this.config.endpoint!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'X-API-Key': this.config.apiKey }),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Analytics API error: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * 获取队列统计
   */
  getStats(): { queueSize: number; isFlushing: boolean } {
    return {
      queueSize: this.queue.length,
      isFlushing: this.isFlushing,
    };
  }
}

/**
 * 全局上报器实例
 */
export const analyticsReporter = new AnalyticsReporter();

/**
 * 生成会话 ID
 */
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 获取或创建会话 ID
 */
function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';

  let sessionId = sessionStorage.getItem('insight_session_id');
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem('insight_session_id', sessionId);
  }
  return sessionId;
}

/**
 * 上报 Web Vitals 指标
 */
export function reportWebVital(
  name: string,
  value: number,
  rating: 'good' | 'needs-improvement' | 'poor',
): void {
  const metric: PerformanceMetric = {
    name,
    value,
    rating,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    sessionId: getSessionId(),
  };

  analyticsReporter.report(metric);
}

/**
 * 上报自定义性能指标
 */
export function reportCustomMetric(
  name: string,
  value: number,
  options?: {
    rating?: 'good' | 'needs-improvement' | 'poor';
    metadata?: Record<string, unknown>;
  },
): void {
  const metric: PerformanceMetric = {
    name: `custom_${name}`,
    value,
    rating: options?.rating || 'good',
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    sessionId: getSessionId(),
  };

  // 添加自定义元数据
  if (options?.metadata) {
    Object.assign(metric, options.metadata);
  }

  analyticsReporter.report(metric);
}

/**
 * 初始化分析上报
 */
export function initializeAnalyticsReporting(): void {
  if (process.env.NODE_ENV !== 'production') {
    logger.debug('Analytics reporting disabled in non-production environment');
    return;
  }

  if (!process.env.INSIGHT_ANALYTICS_ENDPOINT) {
    logger.warn('Analytics endpoint not configured');
    return;
  }

  analyticsReporter.startAutoFlush();
  logger.info('Analytics reporting initialized');
}
