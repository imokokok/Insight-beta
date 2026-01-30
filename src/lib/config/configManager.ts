/**
 * 配置管理器 - 支持热更新
 *
 * 提供配置的热更新、监听和版本管理功能
 */

import { logger } from '@/lib/logger';

/**
 * 配置变更监听器类型
 */
type ConfigChangeListener = (key: string, newValue: string, oldValue: string) => void;

/**
 * 配置项定义
 */
interface ConfigItem {
  value: string;
  defaultValue: string;
  description: string;
  hotReloadable: boolean;
  validator?: (value: string) => boolean;
}

/**
 * 配置管理器类
 *
 * 支持：
 * - 热更新配置
 * - 配置变更监听
 * - 配置验证
 * - 配置版本管理
 */
export class ConfigManager {
  private configs: Map<string, ConfigItem> = new Map();
  private listeners: Set<ConfigChangeListener> = new Set();
  private reloadTimer: NodeJS.Timeout | null = null;
  private readonly reloadIntervalMs: number;

  constructor(options?: { reloadIntervalMs?: number }) {
    this.reloadIntervalMs = options?.reloadIntervalMs ?? 60_000; // 默认 60 秒检查一次
  }

  /**
   * 注册配置项
   */
  register(
    key: string,
    defaultValue: string,
    options?: {
      description?: string;
      hotReloadable?: boolean;
      validator?: (value: string) => boolean;
    },
  ): void {
    const envValue = process.env[key];
    const value = envValue !== undefined ? envValue : defaultValue;

    this.configs.set(key, {
      value,
      defaultValue,
      description: options?.description ?? '',
      hotReloadable: options?.hotReloadable ?? false,
      validator: options?.validator,
    });

    logger.debug('Config registered', {
      key,
      value: this.maskSensitiveValue(key, value),
      hotReloadable: options?.hotReloadable ?? false,
    });
  }

  /**
   * 获取配置值
   */
  get(key: string): string | undefined {
    const config = this.configs.get(key);
    return config?.value;
  }

  /**
   * 获取配置值（带默认值）
   */
  getOrDefault(key: string, defaultValue: string): string {
    return this.get(key) ?? defaultValue;
  }

  /**
   * 获取数值类型的配置
   */
  getNumber(key: string, defaultValue: number): number {
    const value = this.get(key);
    if (value === undefined) return defaultValue;
    const num = Number(value);
    return Number.isFinite(num) ? num : defaultValue;
  }

  /**
   * 获取布尔类型的配置
   */
  getBoolean(key: string, defaultValue: boolean): boolean {
    const value = this.get(key);
    if (value === undefined) return defaultValue;
    return ['true', '1', 'yes'].includes(value.toLowerCase());
  }

  /**
   * 设置配置值（支持热更新）
   */
  set(key: string, value: string): boolean {
    const config = this.configs.get(key);
    if (!config) {
      logger.warn('Attempted to set unregistered config', { key });
      return false;
    }

    if (!config.hotReloadable) {
      logger.warn('Attempted to set non-hot-reloadable config', { key });
      return false;
    }

    // 验证新值
    if (config.validator && !config.validator(value)) {
      logger.error('Config validation failed', { key, value });
      return false;
    }

    const oldValue = config.value;
    config.value = value;

    logger.info('Config updated', {
      key,
      oldValue: this.maskSensitiveValue(key, oldValue),
      newValue: this.maskSensitiveValue(key, value),
    });

    // 通知监听器
    this.notifyListeners(key, value, oldValue);

    return true;
  }

  /**
   * 监听配置变更
   */
  watch(listener: ConfigChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 开始自动重载
   */
  startAutoReload(): void {
    if (this.reloadTimer) {
      logger.warn('Auto reload already started');
      return;
    }

    this.reloadTimer = setInterval(() => {
      this.reload();
    }, this.reloadIntervalMs);

    logger.info('Config auto reload started', { intervalMs: this.reloadIntervalMs });
  }

  /**
   * 停止自动重载
   */
  stopAutoReload(): void {
    if (this.reloadTimer) {
      clearInterval(this.reloadTimer);
      this.reloadTimer = null;
      logger.info('Config auto reload stopped');
    }
  }

  /**
   * 手动重载配置
   */
  reload(): void {
    let changedCount = 0;

    for (const [key, config] of this.configs.entries()) {
      if (!config.hotReloadable) continue;

      const envValue = process.env[key];
      if (envValue === undefined) continue;

      if (envValue !== config.value) {
        // 验证新值
        if (config.validator && !config.validator(envValue)) {
          logger.error('Config validation failed during reload', { key, value: envValue });
          continue;
        }

        const oldValue = config.value;
        config.value = envValue;
        changedCount++;

        logger.info('Config reloaded from environment', {
          key,
          oldValue: this.maskSensitiveValue(key, oldValue),
          newValue: this.maskSensitiveValue(key, envValue),
        });

        this.notifyListeners(key, envValue, oldValue);
      }
    }

    if (changedCount > 0) {
      logger.info('Config reload completed', { changedCount });
    }
  }

  /**
   * 获取所有配置信息
   */
  getAllConfigs(): Array<{
    key: string;
    value: string;
    defaultValue: string;
    description: string;
    hotReloadable: boolean;
  }> {
    return Array.from(this.configs.entries()).map(([key, config]) => ({
      key,
      value: this.maskSensitiveValue(key, config.value),
      defaultValue: config.defaultValue,
      description: config.description,
      hotReloadable: config.hotReloadable,
    }));
  }

  /**
   * 获取配置统计
   */
  getStats(): {
    total: number;
    hotReloadable: number;
    changed: number;
  } {
    let hotReloadable = 0;
    let changed = 0;

    for (const [, config] of this.configs.entries()) {
      if (config.hotReloadable) hotReloadable++;
      if (config.value !== config.defaultValue) changed++;
    }

    return {
      total: this.configs.size,
      hotReloadable,
      changed,
    };
  }

  private notifyListeners(key: string, newValue: string, oldValue: string): void {
    for (const listener of this.listeners) {
      try {
        listener(key, newValue, oldValue);
      } catch (error) {
        logger.error('Config change listener failed', {
          key,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  private maskSensitiveValue(key: string, value: string): string {
    const sensitiveKeys = ['TOKEN', 'SECRET', 'KEY', 'PASS', 'PASSWORD', 'PRIVATE'];
    const isSensitive = sensitiveKeys.some((sk) => key.toUpperCase().includes(sk));

    if (!isSensitive) return value;
    if (value.length <= 8) return '***';
    return value.slice(0, 4) + '****' + value.slice(-4);
  }
}

/**
 * 全局配置管理器实例
 */
export const configManager = new ConfigManager({
  reloadIntervalMs: Number(process.env.INSIGHT_CONFIG_RELOAD_INTERVAL_MS) || 60_000,
});

/**
 * 初始化配置管理器
 * 注册所有应用配置
 */
export function initializeConfigManager(): void {
  // 性能相关配置（支持热更新）
  configManager.register('INSIGHT_SLOW_REQUEST_MS', '1000', {
    description: '慢请求阈值（毫秒）',
    hotReloadable: true,
    validator: (v) => Number(v) > 0,
  });

  configManager.register('INSIGHT_RPC_TIMEOUT_MS', '30000', {
    description: 'RPC 超时时间（毫秒）',
    hotReloadable: true,
    validator: (v) => Number(v) > 0,
  });

  configManager.register('INSIGHT_WEBHOOK_TIMEOUT_MS', '10000', {
    description: 'Webhook 超时时间（毫秒）',
    hotReloadable: true,
    validator: (v) => Number(v) > 0,
  });

  // SLO 相关配置（支持热更新）
  configManager.register('INSIGHT_SLO_MAX_LAG_BLOCKS', '200', {
    description: '最大滞后区块数',
    hotReloadable: true,
    validator: (v) => Number(v) >= 0,
  });

  configManager.register('INSIGHT_SLO_MAX_SYNC_STALENESS_MINUTES', '30', {
    description: '最大同步陈旧时间（分钟）',
    hotReloadable: true,
    validator: (v) => Number(v) > 0,
  });

  // 功能开关（支持热更新）
  configManager.register('INSIGHT_DEMO_MODE', 'false', {
    description: '演示模式开关',
    hotReloadable: true,
    validator: (v) => ['true', 'false', '1', '0'].includes(v.toLowerCase()),
  });

  configManager.register('INSIGHT_DISABLE_EMBEDDED_WORKER', 'false', {
    description: '禁用嵌入式 Worker',
    hotReloadable: true,
    validator: (v) => ['true', 'false', '1', '0'].includes(v.toLowerCase()),
  });

  // 日志相关配置（支持热更新）
  configManager.register('INSIGHT_API_LOG_SAMPLE_RATE', '1.0', {
    description: 'API 日志采样率',
    hotReloadable: true,
    validator: (v) => {
      const num = Number(v);
      return num >= 0 && num <= 1;
    },
  });

  // 内存限制配置（支持热更新）
  configManager.register('INSIGHT_MEMORY_MAX_VOTE_KEYS', '10000', {
    description: '最大投票键数量',
    hotReloadable: true,
    validator: (v) => Number(v) > 0,
  });

  configManager.register('INSIGHT_MEMORY_MAX_ASSERTIONS', '1000', {
    description: '最大断言数量',
    hotReloadable: true,
    validator: (v) => Number(v) > 0,
  });

  // 敏感配置（不支持热更新）
  configManager.register('INSIGHT_ADMIN_TOKEN', '', {
    description: '管理员令牌',
    hotReloadable: false,
  });

  configManager.register('INSIGHT_CRON_SECRET', '', {
    description: 'Cron 密钥',
    hotReloadable: false,
  });

  logger.info('Config manager initialized', configManager.getStats());
}

/**
 * 获取热更新后的环境变量值
 */
export function getEnv(key: string, defaultValue?: string): string | undefined {
  if (defaultValue !== undefined) {
    return configManager.getOrDefault(key, defaultValue);
  }
  return configManager.get(key);
}
