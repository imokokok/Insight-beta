/**
 * Config Manager - Supports hot reload
 *
 * Provides hot reload, monitoring, and version management for configurations
 */

import { logger } from '@/lib/logger';

/**
 * Config change listener type
 */
type ConfigChangeListener = (key: string, newValue: string, oldValue: string) => void;

/**
 * Config item definition
 */
interface ConfigItem {
  value: string;
  defaultValue: string;
  description: string;
  hotReloadable: boolean;
  validator?: (value: string) => boolean;
}

/**
 * Config Manager class
 *
 * Supports:
 * - Hot reload configurations
 * - Config change monitoring
 * - Config validation
 * - Config version management
 */
export class ConfigManager {
  private configs: Map<string, ConfigItem> = new Map();
  private listeners: Set<ConfigChangeListener> = new Set();
  private reloadTimer: NodeJS.Timeout | null = null;
  private readonly reloadIntervalMs: number;

  constructor(options?: { reloadIntervalMs?: number }) {
    this.reloadIntervalMs = options?.reloadIntervalMs ?? 60_000; // Default: check every 60 seconds
  }

  /**
   * Register a config item
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
   * Get config value
   */
  get(key: string): string | undefined {
    const config = this.configs.get(key);
    return config?.value;
  }

  /**
   * Get config value (with default)
   */
  getOrDefault(key: string, defaultValue: string): string {
    return this.get(key) ?? defaultValue;
  }

  /**
   * Get number type config
   */
  getNumber(key: string, defaultValue: number): number {
    const value = this.get(key);
    if (value === undefined) return defaultValue;
    const num = Number(value);
    return Number.isFinite(num) ? num : defaultValue;
  }

  /**
   * Get boolean type config
   */
  getBoolean(key: string, defaultValue: boolean): boolean {
    const value = this.get(key);
    if (value === undefined) return defaultValue;
    return ['true', '1', 'yes'].includes(value.toLowerCase());
  }

  /**
   * Set config value (supports hot reload)
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

    // Validate new value
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

    // Notify listeners
    this.notifyListeners(key, value, oldValue);

    return true;
  }

  /**
   * Watch config changes
   */
  watch(listener: ConfigChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Start auto reload
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
   * Stop auto reload
   */
  stopAutoReload(): void {
    if (this.reloadTimer) {
      clearInterval(this.reloadTimer);
      this.reloadTimer = null;
      logger.info('Config auto reload stopped');
    }
  }

  /**
   * Manually reload configs
   */
  reload(): void {
    let changedCount = 0;

    for (const [key, config] of this.configs.entries()) {
      if (!config.hotReloadable) continue;

      const envValue = process.env[key];
      if (envValue === undefined) continue;

      if (envValue !== config.value) {
        // Validate new value
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
   * Get all config info
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
   * Get config statistics
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
 * Global config manager instance
 */
export const configManager = new ConfigManager({
  reloadIntervalMs: Number(process.env.INSIGHT_CONFIG_RELOAD_INTERVAL_MS) || 60_000,
});

/**
 * Initialize config manager
 * Register all application configurations
 */
export function initializeConfigManager(): void {
  // Performance related configs (hot-reloadable)
  configManager.register('INSIGHT_SLOW_REQUEST_MS', '1000', {
    description: 'Slow request threshold (milliseconds)',
    hotReloadable: true,
    validator: (v) => Number(v) > 0,
  });

  configManager.register('INSIGHT_RPC_TIMEOUT_MS', '30000', {
    description: 'RPC timeout (milliseconds)',
    hotReloadable: true,
    validator: (v) => Number(v) > 0,
  });

  configManager.register('INSIGHT_WEBHOOK_TIMEOUT_MS', '10000', {
    description: 'Webhook timeout (milliseconds)',
    hotReloadable: true,
    validator: (v) => Number(v) > 0,
  });

  // SLO related configs (hot-reloadable)
  configManager.register('INSIGHT_SLO_MAX_LAG_BLOCKS', '200', {
    description: 'Maximum lag blocks',
    hotReloadable: true,
    validator: (v) => Number(v) >= 0,
  });

  configManager.register('INSIGHT_SLO_MAX_SYNC_STALENESS_MINUTES', '30', {
    description: 'Maximum sync staleness (minutes)',
    hotReloadable: true,
    validator: (v) => Number(v) > 0,
  });

  // Feature toggles (hot-reloadable)
  configManager.register('INSIGHT_DEMO_MODE', 'false', {
    description: 'Demo mode toggle',
    hotReloadable: true,
    validator: (v) => ['true', 'false', '1', '0'].includes(v.toLowerCase()),
  });

  configManager.register('INSIGHT_DISABLE_EMBEDDED_WORKER', 'false', {
    description: 'Disable embedded worker',
    hotReloadable: true,
    validator: (v) => ['true', 'false', '1', '0'].includes(v.toLowerCase()),
  });

  // Logging related configs (hot-reloadable)
  configManager.register('INSIGHT_API_LOG_SAMPLE_RATE', '1.0', {
    description: 'API log sample rate',
    hotReloadable: true,
    validator: (v) => {
      const num = Number(v);
      return num >= 0 && num <= 1;
    },
  });

  // Memory limit configs (hot-reloadable)
  configManager.register('INSIGHT_MEMORY_MAX_VOTE_KEYS', '10000', {
    description: 'Maximum vote keys',
    hotReloadable: true,
    validator: (v) => Number(v) > 0,
  });

  configManager.register('INSIGHT_MEMORY_MAX_ASSERTIONS', '1000', {
    description: 'Maximum assertions',
    hotReloadable: true,
    validator: (v) => Number(v) > 0,
  });

  // Sensitive configs (not hot-reloadable)
  configManager.register('INSIGHT_ADMIN_TOKEN', '', {
    description: 'Admin token',
    hotReloadable: false,
  });

  configManager.register('INSIGHT_CRON_SECRET', '', {
    description: 'Cron secret',
    hotReloadable: false,
  });

  logger.info('Config manager initialized', configManager.getStats());
}

/**
 * Get hot-reloaded environment variable value
 */
export function getEnv(key: string, defaultValue?: string): string | undefined {
  if (defaultValue !== undefined) {
    return configManager.getOrDefault(key, defaultValue);
  }
  return configManager.get(key);
}
