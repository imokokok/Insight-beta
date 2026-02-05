/**
 * Price History Service
 *
 * 价格历史数据存储服务
 * - 存储价格历史数据
 * - 支持时间序列查询
 * - 数据压缩和归档
 * - 批量写入和缓存优化
 */

import { logger } from '@/lib/logger';
import { query as dbQuery } from '@/server/db';
import type { OracleProtocol, SupportedChain } from '@/lib/types/unifiedOracleTypes';

// ============================================================================
// 类型定义
// ============================================================================

export interface PriceHistoryRecord {
  id?: string;
  symbol: string;
  protocol: OracleProtocol;
  chain: SupportedChain;
  price: number;
  priceRaw: string;
  decimals: number;
  timestamp: Date;
  blockNumber?: number;
  confidence?: number;
  volume24h?: number;
  change24h?: number;
}

export interface PriceHistoryQuery {
  symbol?: string;
  protocol?: OracleProtocol;
  chain?: SupportedChain;
  startTime: Date;
  endTime: Date;
  interval?: '1m' | '5m' | '1h' | '1d';
  limit?: number;
  offset?: number;
}

export interface AggregatedPriceData {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  count: number;
}

export interface PriceStats {
  symbol: string;
  min: number;
  max: number;
  avg: number;
  first: number;
  last: number;
  change: number;
  changePercent: number;
  volatility: number;
}

// ============================================================================
// 缓存管理器
// ============================================================================

class PriceCache {
  private cache = new Map<string, { data: PriceHistoryRecord[]; expiresAt: number }>();
  private readonly DEFAULT_TTL = 30000; // 30 seconds

  getKey(query: PriceHistoryQuery): string {
    return `${query.symbol}:${query.protocol}:${query.chain}:${query.startTime.toISOString()}:${query.endTime.toISOString()}:${query.interval}`;
  }

  get(query: PriceHistoryQuery): PriceHistoryRecord[] | null {
    const key = this.getKey(query);
    const entry = this.cache.get(key);

    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(query: PriceHistoryQuery, data: PriceHistoryRecord[], ttl = this.DEFAULT_TTL): void {
    const key = this.getKey(query);
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
    });
  }

  invalidate(symbol?: string): void {
    if (symbol) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${symbol}:`)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// ============================================================================
// 批量写入管理器
// ============================================================================

class BatchWriter {
  private buffer: PriceHistoryRecord[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds
  private readonly BATCH_SIZE = 100;
  private isProcessing = false;

  constructor(private readonly flushCallback: (records: PriceHistoryRecord[]) => Promise<void>) {
    this.startFlushTimer();
  }

  add(record: PriceHistoryRecord): void {
    this.buffer.push(record);

    if (this.buffer.length >= this.BATCH_SIZE) {
      this.flush();
    }
  }

  addMany(records: PriceHistoryRecord[]): void {
    this.buffer.push(...records);

    if (this.buffer.length >= this.BATCH_SIZE) {
      this.flush();
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      if (this.buffer.length > 0) {
        this.flush();
      }
    }, this.FLUSH_INTERVAL);
  }

  async flush(): Promise<void> {
    if (this.isProcessing || this.buffer.length === 0) return;

    this.isProcessing = true;
    const batch = this.buffer.splice(0, this.BATCH_SIZE);

    try {
      await this.flushCallback(batch);
      logger.debug(`Flushed ${batch.length} price records`);
    } catch (error) {
      logger.error('Failed to flush price records', { error });
      // Put records back in buffer for retry
      this.buffer.unshift(...batch);
    } finally {
      this.isProcessing = false;
    }
  }

  async stop(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }

  getBufferSize(): number {
    return this.buffer.length;
  }
}

// ============================================================================
// 价格历史服务
// ============================================================================

export class PriceHistoryService {
  private cache = new PriceCache();
  private batchWriter: BatchWriter;
  private isRunning = false;
  private aggregationTimer: NodeJS.Timeout | null = null;

  // 配置
  private readonly AGGREGATION_INTERVAL = 60000; // 1 minute
  private readonly RAW_DATA_RETENTION = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly MIN1_RETENTION = 30 * 24 * 60 * 60 * 1000; // 30 days
  private readonly MIN5_RETENTION = 90 * 24 * 60 * 60 * 1000; // 90 days
  private readonly HOUR1_RETENTION = 365 * 24 * 60 * 60 * 1000; // 365 days

  constructor() {
    this.batchWriter = new BatchWriter(this.saveBatchToDatabase.bind(this));
  }

  /**
   * 启动服务
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.startAggregation();
    logger.info('Price history service started');
  }

  /**
   * 停止服务
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
      this.aggregationTimer = null;
    }

    await this.batchWriter.stop();
    logger.info('Price history service stopped');
  }

  /**
   * 保存单个价格记录（使用批量写入）
   */
  async savePrice(record: PriceHistoryRecord): Promise<void> {
    this.batchWriter.add(record);
  }

  /**
   * 批量保存价格记录
   */
  async savePricesBatch(records: PriceHistoryRecord[]): Promise<void> {
    if (records.length === 0) return;
    this.batchWriter.addMany(records);
  }

  /**
   * 批量写入数据库
   */
  private async saveBatchToDatabase(records: PriceHistoryRecord[]): Promise<void> {
    const values = records.map((r) => [
      r.symbol,
      r.protocol,
      r.chain,
      r.price,
      r.priceRaw,
      r.decimals,
      r.timestamp,
      r.blockNumber || null,
      r.confidence || null,
      r.volume24h || null,
      r.change24h || null,
    ]);

    const placeholders = values
      .map(
        (_, i) =>
          `($${i * 11 + 1}, $${i * 11 + 2}, $${i * 11 + 3}, $${i * 11 + 4}, $${i * 11 + 5}, $${i * 11 + 6}, $${i * 11 + 7}, $${i * 11 + 8}, $${i * 11 + 9}, $${i * 11 + 10}, $${i * 11 + 11})`,
      )
      .join(',');

    const flatValues = values.flat();

    await dbQuery(
      `INSERT INTO price_history_raw (symbol, protocol, chain, price, price_raw, decimals, timestamp, block_number, confidence, volume_24h, change_24h) VALUES ${placeholders}`,
      flatValues,
    );

    // Invalidate cache for affected symbols
    const symbols = new Set(records.map((r) => r.symbol));
    symbols.forEach((symbol) => this.cache.invalidate(symbol));
  }

  /**
   * 查询价格历史（带缓存）
   */
  async queryPriceHistory(query: PriceHistoryQuery): Promise<PriceHistoryRecord[]> {
    // Check cache first
    const cached = this.cache.get(query);
    if (cached) {
      logger.debug('Price history cache hit', { symbol: query.symbol });
      return cached;
    }

    const { symbol, protocol, chain, startTime, endTime, limit = 1000, offset = 0 } = query;

    // Determine which table to query based on time range
    const duration = endTime.getTime() - startTime.getTime();
    let tableName: string;

    if (duration <= 24 * 60 * 60 * 1000) {
      // <= 1 day: use raw data
      tableName = 'price_history_raw';
    } else if (duration <= 7 * 24 * 60 * 60 * 1000) {
      // <= 7 days: use 1min aggregates
      tableName = 'price_history_min1';
    } else if (duration <= 30 * 24 * 60 * 60 * 1000) {
      // <= 30 days: use 5min aggregates
      tableName = 'price_history_min5';
    } else if (duration <= 365 * 24 * 60 * 60 * 1000) {
      // <= 1 year: use 1hour aggregates
      tableName = 'price_history_hour1';
    } else {
      // > 1 year: use 1day aggregates
      tableName = 'price_history_day1';
    }

    let sql = `SELECT * FROM ${tableName} WHERE timestamp >= $1 AND timestamp <= $2`;
    const params: (Date | string | number)[] = [startTime, endTime];
    let paramIndex = 3;

    if (symbol) {
      sql += ` AND symbol = $${paramIndex++}`;
      params.push(symbol);
    }

    if (protocol) {
      sql += ` AND protocol = $${paramIndex++}`;
      params.push(protocol);
    }

    if (chain) {
      sql += ` AND chain = $${paramIndex++}`;
      params.push(chain);
    }

    sql += ` ORDER BY timestamp ASC`;

    if (limit) {
      sql += ` LIMIT $${paramIndex++}`;
      params.push(limit);
    }

    if (offset) {
      sql += ` OFFSET $${paramIndex++}`;
      params.push(offset);
    }

    const result = await dbQuery(sql, params);

    const records = result.rows.map((row) => ({
      id: String(row.id),
      symbol: row.symbol,
      protocol: row.protocol as OracleProtocol,
      chain: row.chain as SupportedChain,
      price: parseFloat(row.price),
      priceRaw: row.price_raw,
      decimals: row.decimals,
      timestamp: new Date(row.timestamp),
      blockNumber: row.block_number ? parseInt(row.block_number) : undefined,
      confidence: row.confidence ? parseFloat(row.confidence) : undefined,
      volume24h: row.volume_24h ? parseFloat(row.volume_24h) : undefined,
      change24h: row.change_24h ? parseFloat(row.change_24h) : undefined,
    }));

    // Cache the result
    this.cache.set(query, records);

    return records;
  }

  /**
   * 获取价格统计
   */
  async getPriceStats(query: Omit<PriceHistoryQuery, 'interval'>): Promise<PriceStats | null> {
    const { symbol, startTime, endTime } = query;

    if (!symbol) {
      throw new Error('Symbol is required for price stats');
    }

    const result = await dbQuery(
      `SELECT 
        MIN(price) as min_price,
        MAX(price) as max_price,
        AVG(price) as avg_price,
        (ARRAY_AGG(price ORDER BY timestamp ASC))[1] as first_price,
        (ARRAY_AGG(price ORDER BY timestamp DESC))[1] as last_price,
        STDDEV(price) as volatility
      FROM price_history_raw 
      WHERE symbol = $1 AND timestamp >= $2 AND timestamp <= $3`,
      [symbol, startTime, endTime],
    );

    const row = result.rows[0];
    if (!row || !row.min_price) return null;

    const first = parseFloat(row.first_price);
    const last = parseFloat(row.last_price);
    const change = last - first;
    const changePercent = first !== 0 ? (change / first) * 100 : 0;

    return {
      symbol,
      min: parseFloat(row.min_price),
      max: parseFloat(row.max_price),
      avg: parseFloat(row.avg_price),
      first,
      last,
      change,
      changePercent,
      volatility: parseFloat(row.volatility) || 0,
    };
  }

  /**
   * 获取最新价格
   */
  async getLatestPrice(symbol: string, chain?: SupportedChain): Promise<PriceHistoryRecord | null> {
    const chainFilter = chain ? 'AND chain = $2' : '';
    const params = chain ? [symbol, chain] : [symbol];

    const result = await dbQuery(
      `SELECT * FROM price_history_raw 
       WHERE symbol = $1 ${chainFilter}
       ORDER BY timestamp DESC 
       LIMIT 1`,
      params,
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    if (!row) return null;

    return {
      id: String(row.id),
      symbol: row.symbol,
      protocol: row.protocol as OracleProtocol,
      chain: row.chain as SupportedChain,
      price: parseFloat(row.price),
      priceRaw: row.price_raw,
      decimals: row.decimals,
      timestamp: new Date(row.timestamp),
      blockNumber: row.block_number ? parseInt(row.block_number) : undefined,
      confidence: row.confidence ? parseFloat(row.confidence) : undefined,
      volume24h: row.volume_24h ? parseFloat(row.volume_24h) : undefined,
      change24h: row.change_24h ? parseFloat(row.change_24h) : undefined,
    };
  }

  /**
   * 启动数据聚合
   */
  private startAggregation(): void {
    this.aggregationTimer = setInterval(async () => {
      try {
        await this.aggregateData();
      } catch (error) {
        logger.error('Data aggregation failed', { error });
      }
    }, this.AGGREGATION_INTERVAL);
  }

  /**
   * 聚合数据
   */
  private async aggregateData(): Promise<void> {
    const now = new Date();

    // Aggregate to 1min
    await this.aggregateToMinute(now);

    // Aggregate to 5min
    if (now.getMinutes() % 5 === 0) {
      await this.aggregateTo5Minutes(now);
    }

    // Aggregate to 1hour
    if (now.getMinutes() === 0) {
      await this.aggregateToHour(now);
    }

    // Aggregate to 1day
    if (now.getHours() === 0 && now.getMinutes() === 0) {
      await this.aggregateToDay(now);
    }

    // Cleanup old data
    await this.cleanupOldData();
  }

  /**
   * 聚合到1分钟
   */
  private async aggregateToMinute(now: Date): Promise<void> {
    const startTime = new Date(now.getTime() - 60000); // 1 minute ago

    await dbQuery(
      `INSERT INTO price_history_min1 (symbol, protocol, chain, price_open, price_high, price_low, price_close, volume, timestamp, sample_count)
       SELECT 
         symbol,
         protocol,
         chain,
         (ARRAY_AGG(price ORDER BY timestamp ASC))[1] as open,
         MAX(price) as high,
         MIN(price) as low,
         (ARRAY_AGG(price ORDER BY timestamp DESC))[1] as close,
         COUNT(*) as volume,
         DATE_TRUNC('minute', timestamp) as ts,
         COUNT(*) as samples
       FROM price_history_raw
       WHERE timestamp >= $1 AND timestamp < $2
       GROUP BY symbol, protocol, chain, DATE_TRUNC('minute', timestamp)
       ON CONFLICT (symbol, protocol, chain, timestamp) DO UPDATE SET
         price_high = GREATEST(price_history_min1.price_high, EXCLUDED.price_high),
         price_low = LEAST(price_history_min1.price_low, EXCLUDED.price_low),
         price_close = EXCLUDED.price_close,
         volume = price_history_min1.volume + EXCLUDED.volume,
         sample_count = price_history_min1.sample_count + EXCLUDED.sample_count`,
      [startTime, now],
    );
  }

  /**
   * 聚合到5分钟
   */
  private async aggregateTo5Minutes(now: Date): Promise<void> {
    const startTime = new Date(now.getTime() - 5 * 60000);

    await dbQuery(
      `INSERT INTO price_history_min5 (symbol, protocol, chain, price_open, price_high, price_low, price_close, volume, timestamp, sample_count)
       SELECT 
         symbol,
         protocol,
         chain,
         (ARRAY_AGG(price_open ORDER BY timestamp ASC))[1] as open,
         MAX(price_high) as high,
         MIN(price_low) as low,
         (ARRAY_AGG(price_close ORDER BY timestamp DESC))[1] as close,
         SUM(volume) as volume,
         DATE_TRUNC('hour', timestamp) + INTERVAL '5 min' * (EXTRACT(MINUTE FROM timestamp)::int / 5) as ts,
         SUM(sample_count) as samples
       FROM price_history_min1
       WHERE timestamp >= $1 AND timestamp < $2
       GROUP BY symbol, protocol, chain, DATE_TRUNC('hour', timestamp) + INTERVAL '5 min' * (EXTRACT(MINUTE FROM timestamp)::int / 5)
       ON CONFLICT (symbol, protocol, chain, timestamp) DO UPDATE SET
         price_high = GREATEST(price_history_min5.price_high, EXCLUDED.price_high),
         price_low = LEAST(price_history_min5.price_low, EXCLUDED.price_low),
         price_close = EXCLUDED.price_close,
         volume = price_history_min5.volume + EXCLUDED.volume,
         sample_count = price_history_min5.sample_count + EXCLUDED.sample_count`,
      [startTime, now],
    );
  }

  /**
   * 聚合到1小时
   */
  private async aggregateToHour(now: Date): Promise<void> {
    const startTime = new Date(now.getTime() - 60 * 60000);

    await dbQuery(
      `INSERT INTO price_history_hour1 (symbol, protocol, chain, price_open, price_high, price_low, price_close, volume, timestamp, sample_count)
       SELECT 
         symbol,
         protocol,
         chain,
         (ARRAY_AGG(price_open ORDER BY timestamp ASC))[1] as open,
         MAX(price_high) as high,
         MIN(price_low) as low,
         (ARRAY_AGG(price_close ORDER BY timestamp DESC))[1] as close,
         SUM(volume) as volume,
         DATE_TRUNC('hour', timestamp) as ts,
         SUM(sample_count) as samples
       FROM price_history_min5
       WHERE timestamp >= $1 AND timestamp < $2
       GROUP BY symbol, protocol, chain, DATE_TRUNC('hour', timestamp)
       ON CONFLICT (symbol, protocol, chain, timestamp) DO UPDATE SET
         price_high = GREATEST(price_history_hour1.price_high, EXCLUDED.price_high),
         price_low = LEAST(price_history_hour1.price_low, EXCLUDED.price_low),
         price_close = EXCLUDED.price_close,
         volume = price_history_hour1.volume + EXCLUDED.volume,
         sample_count = price_history_hour1.sample_count + EXCLUDED.sample_count`,
      [startTime, now],
    );
  }

  /**
   * 聚合到1天
   */
  private async aggregateToDay(now: Date): Promise<void> {
    const startTime = new Date(now.getTime() - 24 * 60 * 60000);

    await dbQuery(
      `INSERT INTO price_history_day1 (symbol, protocol, chain, price_open, price_high, price_low, price_close, volume, timestamp, sample_count)
       SELECT 
         symbol,
         protocol,
         chain,
         (ARRAY_AGG(price_open ORDER BY timestamp ASC))[1] as open,
         MAX(price_high) as high,
         MIN(price_low) as low,
         (ARRAY_AGG(price_close ORDER BY timestamp DESC))[1] as close,
         SUM(volume) as volume,
         DATE_TRUNC('day', timestamp) as ts,
         SUM(sample_count) as samples
       FROM price_history_hour1
       WHERE timestamp >= $1 AND timestamp < $2
       GROUP BY symbol, protocol, chain, DATE_TRUNC('day', timestamp)
       ON CONFLICT (symbol, protocol, chain, timestamp) DO UPDATE SET
         price_high = GREATEST(price_history_day1.price_high, EXCLUDED.price_high),
         price_low = LEAST(price_history_day1.price_low, EXCLUDED.price_low),
         price_close = EXCLUDED.price_close,
         volume = price_history_day1.volume + EXCLUDED.volume,
         sample_count = price_history_day1.sample_count + EXCLUDED.sample_count`,
      [startTime, now],
    );
  }

  /**
   * 清理旧数据
   */
  private async cleanupOldData(): Promise<void> {
    const now = new Date();

    // Cleanup raw data (keep 7 days)
    await dbQuery(`DELETE FROM price_history_raw WHERE timestamp < $1`, [
      new Date(now.getTime() - this.RAW_DATA_RETENTION),
    ]);

    // Cleanup 1min data (keep 30 days)
    await dbQuery(`DELETE FROM price_history_min1 WHERE timestamp < $1`, [
      new Date(now.getTime() - this.MIN1_RETENTION),
    ]);

    // Cleanup 5min data (keep 90 days)
    await dbQuery(`DELETE FROM price_history_min5 WHERE timestamp < $1`, [
      new Date(now.getTime() - this.MIN5_RETENTION),
    ]);

    // Cleanup 1hour data (keep 365 days)
    await dbQuery(`DELETE FROM price_history_hour1 WHERE timestamp < $1`, [
      new Date(now.getTime() - this.HOUR1_RETENTION),
    ]);
  }

  /**
   * 获取服务统计
   */
  getStats(): {
    isRunning: boolean;
    cacheSize: number;
    bufferSize: number;
  } {
    return {
      isRunning: this.isRunning,
      cacheSize: this.cache.getStats().size,
      bufferSize: this.batchWriter.getBufferSize(),
    };
  }

  /**
   * 手动触发缓存清理
   */
  clearCache(symbol?: string): void {
    this.cache.invalidate(symbol);
    logger.info('Price history cache cleared', { symbol });
  }
}

// ============================================================================
// 单例导出
// ============================================================================

export const priceHistoryService = new PriceHistoryService();
