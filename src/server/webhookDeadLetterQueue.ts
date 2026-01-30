/**
 * Webhook 死信队列系统
 *
 * 处理最终失败的 Webhook 通知，支持重试和持久化存储
 */

import { logger } from '@/lib/logger';
import { query } from './db';

/**
 * 死信队列项
 */
export interface DeadLetterItem {
  id: string;
  webhookId: string;
  event: string;
  data: unknown;
  error: string;
  failedAt: string;
  retryCount: number;
  lastRetryAt?: string;
  status: 'pending' | 'processing' | 'failed' | 'resolved';
}

/**
 * 死信队列配置
 */
interface DeadLetterQueueConfig {
  /** 最大重试次数 */
  maxRetries: number;
  /** 重试间隔（毫秒） */
  retryIntervalMs: number;
  /** 最大保留时间（天） */
  maxRetentionDays: number;
  /** 批量处理大小 */
  batchSize: number;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: DeadLetterQueueConfig = {
  maxRetries: 5,
  retryIntervalMs: 5 * 60 * 1000, // 5 分钟
  maxRetentionDays: 7,
  batchSize: 10,
};

/**
 * Webhook 死信队列管理器
 */
export class WebhookDeadLetterQueue {
  private config: DeadLetterQueueConfig;
  private processingTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<DeadLetterQueueConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 初始化死信队列表
   */
  async initialize(): Promise<void> {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS webhook_dead_letter_queue (
          id SERIAL PRIMARY KEY,
          webhook_id VARCHAR(255) NOT NULL,
          event VARCHAR(100) NOT NULL,
          data JSONB NOT NULL,
          error TEXT NOT NULL,
          failed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          retry_count INTEGER DEFAULT 0,
          last_retry_at TIMESTAMP WITH TIME ZONE,
          status VARCHAR(20) DEFAULT 'pending',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // 创建索引
      await query(`
        CREATE INDEX IF NOT EXISTS idx_webhook_dlq_status 
        ON webhook_dead_letter_queue(status)
      `);

      await query(`
        CREATE INDEX IF NOT EXISTS idx_webhook_dlq_webhook_id 
        ON webhook_dead_letter_queue(webhook_id)
      `);

      await query(`
        CREATE INDEX IF NOT EXISTS idx_webhook_dlq_failed_at 
        ON webhook_dead_letter_queue(failed_at)
      `);

      logger.info('Webhook dead letter queue initialized');
    } catch (error) {
      logger.error('Failed to initialize webhook dead letter queue', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 添加项目到死信队列
   */
  async enqueue(webhookId: string, event: string, data: unknown, error: string): Promise<void> {
    try {
      await query(
        `
        INSERT INTO webhook_dead_letter_queue 
        (webhook_id, event, data, error, failed_at, status)
        VALUES ($1, $2, $3, $4, NOW(), 'pending')
      `,
        [webhookId, event, JSON.stringify(data), error],
      );

      logger.warn('Webhook notification added to dead letter queue', {
        webhookId,
        event,
        error: error.substring(0, 200),
      });
    } catch (dbError) {
      logger.error('Failed to add to dead letter queue', {
        webhookId,
        event,
        error: dbError instanceof Error ? dbError.message : String(dbError),
      });
      throw dbError;
    }
  }

  /**
   * 获取待处理的项目
   */
  async getPendingItems(limit: number = this.config.batchSize): Promise<DeadLetterItem[]> {
    const result = await query(
      `
      SELECT 
        id,
        webhook_id as "webhookId",
        event,
        data,
        error,
        failed_at as "failedAt",
        retry_count as "retryCount",
        last_retry_at as "lastRetryAt",
        status
      FROM webhook_dead_letter_queue
      WHERE status = 'pending'
        AND retry_count < $1
        AND (last_retry_at IS NULL OR last_retry_at < NOW() - INTERVAL '5 minutes')
      ORDER BY failed_at ASC
      LIMIT $2
    `,
      [this.config.maxRetries, limit],
    );

    const items: DeadLetterItem[] = result.rows.map((row) => ({
      id: String(row.id),
      webhookId: String(row.webhookId),
      event: String(row.event),
      data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
      error: String(row.error),
      failedAt: String(row.failedAt),
      retryCount: parseInt(row.retryCount ?? '0', 10),
      lastRetryAt: row.lastRetryAt ? String(row.lastRetryAt) : undefined,
      status: String(row.status) as DeadLetterItem['status'],
    }));

    return items;
  }

  /**
   * 更新重试状态
   */
  async updateRetryStatus(id: number, success: boolean, error?: string): Promise<void> {
    if (success) {
      await query(
        `
        UPDATE webhook_dead_letter_queue
        SET status = 'resolved', updated_at = NOW()
        WHERE id = $1
      `,
        [id],
      );

      logger.info('Dead letter item resolved', { id });
    } else {
      await query(
        `
        UPDATE webhook_dead_letter_queue
        SET 
          retry_count = retry_count + 1,
          last_retry_at = NOW(),
          error = COALESCE($2, error),
          status = CASE 
            WHEN retry_count + 1 >= $3 THEN 'failed'
            ELSE 'pending'
          END,
          updated_at = NOW()
        WHERE id = $1
      `,
        [id, error, this.config.maxRetries],
      );

      logger.warn('Dead letter item retry failed', {
        id,
        error: error?.substring(0, 200),
      });
    }
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<{
    pending: number;
    processing: number;
    failed: number;
    resolved: number;
    total: number;
  }> {
    const result = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'processing') as processing,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
        COUNT(*) as total
      FROM webhook_dead_letter_queue
    `);

    const row = result.rows[0];
    return {
      pending: parseInt(row?.pending ?? '0', 10),
      processing: parseInt(row?.processing ?? '0', 10),
      failed: parseInt(row?.failed ?? '0', 10),
      resolved: parseInt(row?.resolved ?? '0', 10),
      total: parseInt(row?.total ?? '0', 10),
    };
  }

  /**
   * 清理过期项目
   */
  async cleanup(): Promise<number> {
    const result = await query(
      `
      DELETE FROM webhook_dead_letter_queue
      WHERE failed_at < NOW() - INTERVAL '${this.config.maxRetentionDays} days'
        AND status IN ('failed', 'resolved')
      RETURNING id
    `,
    );

    const deletedCount = result.rowCount ?? 0;

    if (deletedCount > 0) {
      logger.info('Dead letter queue cleanup completed', {
        deletedCount,
        retentionDays: this.config.maxRetentionDays,
      });
    }

    return deletedCount;
  }

  /**
   * 手动重试项目
   */
  async retryItem(id: number): Promise<boolean> {
    const result = await query(
      `
      UPDATE webhook_dead_letter_queue
      SET 
        status = 'pending',
        retry_count = 0,
        last_retry_at = NULL,
        updated_at = NOW()
      WHERE id = $1 AND status = 'failed'
      RETURNING id
    `,
      [id],
    );

    const success = (result.rowCount ?? 0) > 0;

    if (success) {
      logger.info('Dead letter item marked for retry', { id });
    }

    return success;
  }

  /**
   * 获取项目详情
   */
  async getItem(id: number): Promise<DeadLetterItem | null> {
    const result = await query(
      `
      SELECT 
        id,
        webhook_id as "webhookId",
        event,
        data,
        error,
        failed_at as "failedAt",
        retry_count as "retryCount",
        last_retry_at as "lastRetryAt",
        status
      FROM webhook_dead_letter_queue
      WHERE id = $1
    `,
      [id],
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    if (!row) return null;

    return {
      id: String(row.id),
      webhookId: String(row.webhookId),
      event: String(row.event),
      data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
      error: String(row.error),
      failedAt: String(row.failedAt),
      retryCount: parseInt(row.retryCount ?? '0', 10),
      lastRetryAt: row.lastRetryAt ? String(row.lastRetryAt) : undefined,
      status: String(row.status) as DeadLetterItem['status'],
    };
  }

  /**
   * 列出项目
   */
  async listItems(options?: {
    status?: DeadLetterItem['status'];
    webhookId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: DeadLetterItem[]; total: number }> {
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (options?.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(options.status);
    }

    if (options?.webhookId) {
      conditions.push(`webhook_id = $${paramIndex++}`);
      params.push(options.webhookId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 获取总数
    const countResult = await query(
      `SELECT COUNT(*) as total FROM webhook_dead_letter_queue ${whereClause}`,
      params,
    );
    const totalRow = countResult.rows[0];
    const total = totalRow?.total ? parseInt(String(totalRow.total), 10) : 0;

    // 获取列表
    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;

    const result = await query(
      `
      SELECT 
        id,
        webhook_id as "webhookId",
        event,
        data,
        error,
        failed_at as "failedAt",
        retry_count as "retryCount",
        last_retry_at as "lastRetryAt",
        status
      FROM webhook_dead_letter_queue
      ${whereClause}
      ORDER BY failed_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `,
      [...params, limit, offset],
    );

    const items: DeadLetterItem[] = result.rows.map((row) => ({
      id: String(row.id),
      webhookId: String(row.webhookId),
      event: String(row.event),
      data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
      error: String(row.error),
      failedAt: String(row.failedAt),
      retryCount: parseInt(row.retryCount ?? '0', 10),
      lastRetryAt: row.lastRetryAt ? String(row.lastRetryAt) : undefined,
      status: String(row.status) as DeadLetterItem['status'],
    }));

    return { items, total };
  }

  /**
   * 开始自动处理
   */
  startAutoProcessing(processFn: (item: DeadLetterItem) => Promise<boolean>): void {
    if (this.processingTimer) {
      logger.warn('Auto processing already started');
      return;
    }

    const processLoop = async () => {
      try {
        const items = await this.getPendingItems();

        for (const item of items) {
          try {
            // 标记为处理中
            await query(
              `UPDATE webhook_dead_letter_queue SET status = 'processing' WHERE id = $1`,
              [item.id],
            );

            // 执行处理
            const success = await processFn(item);

            // 更新状态
            await this.updateRetryStatus(Number(item.id), success);
          } catch (error) {
            logger.error('Failed to process dead letter item', {
              id: item.id,
              error: error instanceof Error ? error.message : String(error),
            });
            await this.updateRetryStatus(
              Number(item.id),
              false,
              error instanceof Error ? error.message : String(error),
            );
          }
        }
      } catch (error) {
        logger.error('Dead letter queue processing loop error', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    // 立即执行一次
    processLoop();

    // 定期执行
    this.processingTimer = setInterval(processLoop, this.config.retryIntervalMs);

    logger.info('Dead letter queue auto processing started', {
      intervalMs: this.config.retryIntervalMs,
    });
  }

  /**
   * 停止自动处理
   */
  stopAutoProcessing(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
      logger.info('Dead letter queue auto processing stopped');
    }
  }

  /**
   * 开始自动清理
   */
  startAutoCleanup(): void {
    if (this.cleanupTimer) {
      logger.warn('Auto cleanup already started');
      return;
    }

    // 每天清理一次
    this.cleanupTimer = setInterval(() => this.cleanup(), 24 * 60 * 60 * 1000);

    logger.info('Dead letter queue auto cleanup started');
  }

  /**
   * 停止自动清理
   */
  stopAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      logger.info('Dead letter queue auto cleanup stopped');
    }
  }
}

/**
 * 全局死信队列实例
 */
export const webhookDeadLetterQueue = new WebhookDeadLetterQueue();
