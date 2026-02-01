import { logger } from '@/lib/logger';
import { query } from './db';
import { oracleStatsCache, oracleConfigCache, apiResponseCache } from './redisCache';
import { hotKeyDetector } from '@/lib/cache/CacheProtection';

/**
 * Cache warmup service for pre-loading hot data
 */
export class CacheWarmupService {
  private isRunning = false;
  private warmupInterval: NodeJS.Timeout | null = null;

  /**
   * Warm up critical cache data
   */
  async warmupCriticalCache(): Promise<void> {
    logger.info('Starting critical cache warmup');
    const startTime = Date.now();

    try {
      // 1. Warm up oracle stats
      await this.warmupOracleStats();

      // 2. Warm up oracle configurations
      await this.warmupOracleConfigs();

      // 3. Warm up popular price feeds
      await this.warmupPriceFeeds();

      const duration = Date.now() - startTime;
      logger.info('Critical cache warmup completed', { duration: `${duration}ms` });
    } catch (error) {
      logger.error('Critical cache warmup failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Warm up oracle statistics
   */
  private async warmupOracleStats(): Promise<void> {
    try {
      // Get top oracles by activity
      const result = await query(`
        SELECT 
          oi.id,
          oi.address,
          oi.chain,
          oi.protocol,
          COUNT(a.id) as assertion_count,
          COUNT(d.id) as dispute_count
        FROM oracle_instances oi
        LEFT JOIN assertions a ON oi.address = a.oracle_address 
          AND a.assertion_timestamp > NOW() - INTERVAL '24 hours'
        LEFT JOIN disputes d ON a.id = d.assertion_id
        WHERE oi.enabled = true
        GROUP BY oi.id, oi.address, oi.chain, oi.protocol
        ORDER BY assertion_count DESC
        LIMIT 50
      `);

      const stats = {
        topOracles: result.rows,
        totalOracles: result.rows.length,
        updatedAt: new Date().toISOString(),
      };

      await oracleStatsCache.set('dashboard:top', stats, 300); // 5 minutes
      logger.info('Oracle stats cache warmed up', { count: result.rows.length });
    } catch (error) {
      logger.error('Failed to warmup oracle stats', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Warm up oracle configurations
   */
  private async warmupOracleConfigs(): Promise<void> {
    try {
      const result = await query(`
        SELECT 
          id,
          address,
          chain,
          protocol,
          name,
          description,
          config
        FROM oracle_instances
        WHERE enabled = true
        ORDER BY updated_at DESC
      `);

      // Cache individual configs
      for (const oracle of result.rows) {
        const cacheKey = `instance:${oracle.id}`;
        await oracleConfigCache.set(cacheKey, oracle, 600); // 10 minutes
      }

      // Cache all configs list
      await oracleConfigCache.set('all:enabled', { rows: result.rows }, 300);

      logger.info('Oracle configs cache warmed up', { count: result.rows.length });
    } catch (error) {
      logger.error('Failed to warmup oracle configs', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Warm up popular price feeds
   */
  private async warmupPriceFeeds(): Promise<void> {
    try {
      // Get most queried price feeds
      const result = await query(`
        SELECT 
          symbol,
          oracle_address,
          price,
          timestamp,
          confidence
        FROM price_data
        WHERE timestamp > NOW() - INTERVAL '1 hour'
        ORDER BY timestamp DESC
        LIMIT 100
      `);

      // Group by symbol
      const priceFeedsBySymbol: Record<string, unknown[]> = {};
      for (const feed of result.rows) {
        const symbol = feed.symbol as string;
        if (!priceFeedsBySymbol[symbol]) {
          priceFeedsBySymbol[symbol] = [];
        }
        priceFeedsBySymbol[symbol].push(feed);
      }

      // Cache popular feeds
      for (const [symbol, feeds] of Object.entries(priceFeedsBySymbol)) {
        const cacheKey = `price:${symbol}`;
        await apiResponseCache.set(
          cacheKey,
          { symbol, feeds, lastUpdated: new Date().toISOString() },
          60,
        );
      }

      logger.info('Price feeds cache warmed up', {
        symbols: Object.keys(priceFeedsBySymbol).length,
      });
    } catch (error) {
      logger.error('Failed to warmup price feeds', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Warm up hot keys detected by the hot key detector
   */
  async warmupHotKeys(): Promise<void> {
    const hotKeys = hotKeyDetector.getHotKeys();
    if (hotKeys.length === 0) {
      logger.info('No hot keys to warmup');
      return;
    }

    logger.info('Warming up hot keys', { count: hotKeys.length });

    for (const key of hotKeys) {
      try {
        // Parse key to determine what data to fetch
        if (key.startsWith('oracle:stats:')) {
          const instanceId = key.replace('oracle:stats:', '');
          await this.warmupOracleInstanceStats(instanceId);
        } else if (key.startsWith('price:')) {
          const symbol = key.replace('price:', '');
          await this.warmupPriceFeed(symbol);
        }
      } catch (error) {
        logger.error('Failed to warmup hot key', {
          key,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Warm up specific oracle instance stats
   */
  private async warmupOracleInstanceStats(instanceId: string): Promise<void> {
    try {
      const result = await query(
        `
        SELECT 
          oi.*,
          COUNT(a.id) as total_assertions,
          COUNT(CASE WHEN a.status = 'active' THEN 1 END) as active_assertions,
          COUNT(d.id) as total_disputes
        FROM oracle_instances oi
        LEFT JOIN assertions a ON oi.address = a.oracle_address
        LEFT JOIN disputes d ON a.id = d.assertion_id
        WHERE oi.id = $1
        GROUP BY oi.id
      `,
        [instanceId],
      );

      if (result.rows.length > 0 && result.rows[0]) {
        await oracleStatsCache.set(
          `instance:${instanceId}`,
          result.rows[0] as Record<string, unknown>,
          300,
        );
      }
    } catch (error) {
      logger.error('Failed to warmup oracle instance stats', {
        instanceId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Warm up specific price feed
   */
  private async warmupPriceFeed(symbol: string): Promise<void> {
    try {
      const result = await query(
        `
        SELECT 
          symbol,
          price,
          timestamp,
          confidence,
          source
        FROM price_data
        WHERE symbol = $1
        ORDER BY timestamp DESC
        LIMIT 24
      `,
        [symbol],
      );

      if (result.rows.length > 0) {
        await apiResponseCache.set(
          `price:${symbol}`,
          {
            symbol,
            feeds: result.rows,
            lastUpdated: new Date().toISOString(),
          },
          60,
        );
      }
    } catch (error) {
      logger.error('Failed to warmup price feed', {
        symbol,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Start periodic cache warmup
   */
  startPeriodicWarmup(intervalMinutes: number = 5): void {
    if (this.isRunning) {
      logger.warn('Cache warmup service already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting periodic cache warmup', { intervalMinutes });

    // Initial warmup
    this.warmupCriticalCache();

    // Schedule periodic warmup
    this.warmupInterval = setInterval(
      async () => {
        await this.warmupCriticalCache();
        await this.warmupHotKeys();
      },
      intervalMinutes * 60 * 1000,
    );
  }

  /**
   * Stop periodic cache warmup
   */
  stopPeriodicWarmup(): void {
    if (this.warmupInterval) {
      clearInterval(this.warmupInterval);
      this.warmupInterval = null;
    }
    this.isRunning = false;
    logger.info('Cache warmup service stopped');
  }

  /**
   * Check if service is running
   */
  isServiceRunning(): boolean {
    return this.isRunning;
  }
}

// Global cache warmup service instance
export const cacheWarmupService = new CacheWarmupService();

/**
 * Initialize cache warmup on application startup
 */
export async function initializeCacheWarmup(): Promise<void> {
  // Warm up critical cache immediately on startup
  await cacheWarmupService.warmupCriticalCache();

  // Start periodic warmup every 5 minutes
  cacheWarmupService.startPeriodicWarmup(5);

  logger.info('Cache warmup initialized');
}
