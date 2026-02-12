/**
 * Rate Limiting & Billing System
 *
 * API 限流与计费系统
 * 支持多层级限流、使用量追踪和计费管理
 */

import { query } from '@/lib/database/db';
import { logger } from '@/shared/logger';

import { RATE_LIMIT_TIERS } from './developerAuth';

export interface RateLimitStatus {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  window: string;
}

export interface UsageMetrics {
  developerId: string;
  apiKeyId: string;
  period: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitedRequests: number;
  totalResponseTime: number;
  averageResponseTime: number;
  endpoints: Map<string, number>;
}

export interface BillingRecord {
  id: string;
  developerId: string;
  period: string;
  tier: string;
  baseCost: number;
  overageCost: number;
  totalCost: number;
  requestCount: number;
  overageRequests: number;
  status: 'pending' | 'paid' | 'failed' | 'waived';
  createdAt: Date;
  paidAt?: Date;
}

interface RateLimitWindow {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private windows: Map<string, Map<string, RateLimitWindow>> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
  }

  async checkRateLimit(
    apiKeyId: string,
    tier: string,
    endpoint?: string,
  ): Promise<{ allowed: boolean; status: RateLimitStatus }> {
    const config = RATE_LIMIT_TIERS[tier] || RATE_LIMIT_TIERS.free;
    if (!config) {
      throw new Error(`Invalid rate limit tier: ${tier}`);
    }
    const now = Date.now();

    const windows = ['perSecond', 'perMinute', 'perHour', 'perDay'] as const;
    const limits = [
      config.requestsPerSecond,
      config.requestsPerMinute,
      config.requestsPerHour,
      config.requestsPerDay,
    ];
    const durations = [1000, 60 * 1000, 60 * 60 * 1000, 24 * 60 * 60 * 1000];

    for (let i = 0; i < windows.length; i++) {
      const windowKey = `${apiKeyId}:${windows[i]}`;
      const limit = limits[i];
      const duration = durations[i];
      if (limit === undefined || duration === undefined) continue;

      const window = this.getWindow(windowKey);

      if (now > window.resetAt) {
        window.count = 0;
        window.resetAt = now + duration;
      }

      if (window.count >= limit) {
        const windowName = windows[i];
        if (windowName !== undefined) {
          await this.recordRateLimitEvent(apiKeyId, tier, windowName);
        }

        return {
          allowed: false,
          status: {
            allowed: false,
            limit,
            remaining: 0,
            resetAt: new Date(window.resetAt),
            window: windowName ?? 'unknown',
          },
        };
      }

      window.count++;
    }

    await this.recordAPICall(apiKeyId, tier, endpoint);

    const perMinuteWindow = this.getWindow(`${apiKeyId}:perMinute`);
    return {
      allowed: true,
      status: {
        allowed: true,
        limit: config.requestsPerMinute,
        remaining: config.requestsPerMinute - perMinuteWindow.count,
        resetAt: new Date(perMinuteWindow.resetAt),
        window: 'perMinute',
      },
    };
  }

  private getWindow(key: string): RateLimitWindow {
    let windowMap = this.windows.get(key);
    if (!windowMap) {
      windowMap = new Map();
      this.windows.set(key, windowMap);
    }

    let window = windowMap.get(key);
    if (!window) {
      window = { count: 0, resetAt: Date.now() + 60000 };
      windowMap.set(key, window);
    }

    return window;
  }

  private async recordAPICall(apiKeyId: string, tier: string, endpoint?: string): Promise<void> {
    try {
      const period = this.getCurrentPeriod();

      await query(
        `
        INSERT INTO api_usage_stats (
          api_key_id, period, tier, endpoint, request_count, last_used_at
        ) VALUES ($1, $2, $3, $4, 1, NOW())
        ON CONFLICT (api_key_id, period, endpoint)
        DO UPDATE SET
          request_count = api_usage_stats.request_count + 1,
          last_used_at = NOW()
      `,
        [apiKeyId, period, tier, endpoint || 'unknown'],
      );
    } catch (error) {
      logger.error('Failed to record API call', { error, apiKeyId });
    }
  }

  private async recordRateLimitEvent(
    apiKeyId: string,
    tier: string,
    window: string,
  ): Promise<void> {
    try {
      await query(
        `
        INSERT INTO rate_limit_events (
          api_key_id, tier, window_type, occurred_at
        ) VALUES ($1, $2, $3, NOW())
      `,
        [apiKeyId, tier, window],
      );
    } catch (error) {
      logger.error('Failed to record rate limit event', { error, apiKeyId });
    }
  }

  private getCurrentPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, windowMap] of this.windows) {
      for (const [windowKey, window] of windowMap) {
        if (now > window.resetAt) {
          windowMap.delete(windowKey);
          cleaned++;
        }
      }

      if (windowMap.size === 0) {
        this.windows.delete(key);
      }
    }

    if (cleaned > 0) {
      logger.debug(`Cleaned up ${cleaned} expired rate limit windows`);
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.windows.clear();
  }
}

export class UsageAnalytics {
  async getDeveloperUsage(developerId: string, period?: string): Promise<UsageMetrics | null> {
    try {
      const targetPeriod = period || this.getCurrentPeriod();

      const result = await query(
        `
        SELECT
          SUM(request_count) as total_requests,
          COUNT(DISTINCT endpoint) as endpoint_count,
          endpoint,
          request_count
        FROM api_usage_stats
        WHERE api_key_id IN (
          SELECT id FROM api_keys WHERE developer_id = $1
        ) AND period = $2
        GROUP BY endpoint, request_count
      `,
        [developerId, targetPeriod],
      );

      if (result.rows.length === 0) {
        return null;
      }

      const endpoints = new Map<string, number>();
      let totalRequests = 0;

      for (const row of result.rows) {
        totalRequests += parseInt(row.request_count);
        endpoints.set(row.endpoint, parseInt(row.request_count));
      }

      const keyResult = await query(`SELECT id FROM api_keys WHERE developer_id = $1 LIMIT 1`, [
        developerId,
      ]);

      return {
        developerId,
        apiKeyId: keyResult.rows[0]?.id || '',
        period: targetPeriod,
        totalRequests,
        successfulRequests: totalRequests,
        failedRequests: 0,
        rateLimitedRequests: 0,
        totalResponseTime: 0,
        averageResponseTime: 0,
        endpoints,
      };
    } catch (error) {
      logger.error('Failed to get developer usage', { error, developerId });
      return null;
    }
  }

  async getAPIKeyUsage(apiKeyId: string, period?: string): Promise<Partial<UsageMetrics> | null> {
    try {
      const targetPeriod = period || this.getCurrentPeriod();

      const result = await query(
        `
        SELECT
          endpoint,
          request_count,
          last_used_at
        FROM api_usage_stats
        WHERE api_key_id = $1 AND period = $2
        ORDER BY request_count DESC
      `,
        [apiKeyId, targetPeriod],
      );

      if (result.rows.length === 0) {
        return null;
      }

      const endpoints = new Map<string, number>();
      let totalRequests = 0;

      for (const row of result.rows) {
        totalRequests += parseInt(row.request_count);
        endpoints.set(row.endpoint, parseInt(row.request_count));
      }

      return {
        apiKeyId,
        period: targetPeriod,
        totalRequests,
        endpoints,
      };
    } catch (error) {
      logger.error('Failed to get API key usage', { error, apiKeyId });
      return null;
    }
  }

  async getTopEndpoints(
    limit: number = 10,
    period?: string,
  ): Promise<Array<{ endpoint: string; count: number }>> {
    try {
      const targetPeriod = period || this.getCurrentPeriod();

      const result = await query(
        `
        SELECT endpoint, SUM(request_count) as count
        FROM api_usage_stats
        WHERE period = $1
        GROUP BY endpoint
        ORDER BY count DESC
        LIMIT $2
      `,
        [targetPeriod, limit],
      );

      return result.rows.map((row) => ({
        endpoint: row.endpoint,
        count: parseInt(row.count),
      }));
    } catch (error) {
      logger.error('Failed to get top endpoints', { error });
      return [];
    }
  }

  private getCurrentPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}

export class BillingSystem {
  private tierPricing: Record<
    string,
    { basePrice: number; includedRequests: number; overagePrice: number }
  > = {
    free: { basePrice: 0, includedRequests: 1000, overagePrice: 0 },
    basic: { basePrice: 29, includedRequests: 10000, overagePrice: 0.001 },
    pro: { basePrice: 99, includedRequests: 100000, overagePrice: 0.0005 },
    enterprise: { basePrice: 499, includedRequests: 1000000, overagePrice: 0.0001 },
  };

  async generateBill(developerId: string, period: string): Promise<BillingRecord | null> {
    try {
      const devResult = await query(`SELECT tier FROM developers WHERE id = $1`, [developerId]);

      if (devResult.rows.length === 0) {
        return null;
      }

      const tierRow = devResult.rows[0];
      if (!tierRow || !('tier' in tierRow)) {
        return null;
      }
      const tier = tierRow.tier as string;
      const pricing = this.tierPricing[tier];
      if (!pricing) {
        throw new Error(`Invalid pricing tier: ${tier}`);
      }

      const usageResult = await query(
        `
        SELECT SUM(request_count) as total
        FROM api_usage_stats
        WHERE api_key_id IN (
          SELECT id FROM api_keys WHERE developer_id = $1
        ) AND period = $2
      `,
        [developerId, period],
      );

      const totalRequests = parseInt(usageResult.rows[0]?.total || 0);
      const overageRequests = Math.max(0, totalRequests - pricing.includedRequests);
      const overageCost = overageRequests * pricing.overagePrice;
      const totalCost = pricing.basePrice + overageCost;

      const bill: BillingRecord = {
        id: crypto.randomUUID(),
        developerId,
        period,
        tier,
        baseCost: pricing.basePrice,
        overageCost,
        totalCost,
        requestCount: totalRequests,
        overageRequests,
        status: totalCost === 0 ? 'waived' : 'pending',
        createdAt: new Date(),
      };

      await query(
        `
        INSERT INTO billing_records (
          id, developer_id, period, tier, base_cost, overage_cost, total_cost,
          request_count, overage_requests, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (developer_id, period)
        DO UPDATE SET
          tier = EXCLUDED.tier,
          base_cost = EXCLUDED.base_cost,
          overage_cost = EXCLUDED.overage_cost,
          total_cost = EXCLUDED.total_cost,
          request_count = EXCLUDED.request_count,
          overage_requests = EXCLUDED.overage_requests,
          status = EXCLUDED.status
      `,
        [
          bill.id,
          bill.developerId,
          bill.period,
          bill.tier,
          bill.baseCost,
          bill.overageCost,
          bill.totalCost,
          bill.requestCount,
          bill.overageRequests,
          bill.status,
          bill.createdAt,
        ],
      );

      logger.info(`Generated bill for developer ${developerId}`, {
        period,
        totalCost,
        totalRequests,
      });

      return bill;
    } catch (error) {
      logger.error('Failed to generate bill', { error, developerId, period });
      return null;
    }
  }

  async getBill(developerId: string, period: string): Promise<BillingRecord | null> {
    try {
      const result = await query(
        `
        SELECT * FROM billing_records
        WHERE developer_id = $1 AND period = $2
      `,
        [developerId, period],
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      if (!row) return null;
      return {
        id: row.id as string,
        developerId: row.developer_id as string,
        period: row.period as string,
        tier: row.tier as string,
        baseCost: parseFloat(row.base_cost as string),
        overageCost: parseFloat(row.overage_cost as string),
        totalCost: parseFloat(row.total_cost as string),
        requestCount: row.request_count as number,
        overageRequests: row.overage_requests as number,
        status: (row.status as 'pending' | 'paid' | 'failed' | 'waived') ?? 'pending',
        createdAt: new Date(row.created_at as string),
        paidAt: row.paid_at ? new Date(row.paid_at as string) : undefined,
      };
    } catch (error) {
      logger.error('Failed to get bill', { error, developerId, period });
      return null;
    }
  }

  async getDeveloperBills(developerId: string): Promise<BillingRecord[]> {
    try {
      const result = await query(
        `
        SELECT * FROM billing_records
        WHERE developer_id = $1
        ORDER BY period DESC
      `,
        [developerId],
      );

      return result.rows.map((row) => ({
        id: row.id,
        developerId: row.developer_id,
        period: row.period,
        tier: row.tier,
        baseCost: parseFloat(row.base_cost),
        overageCost: parseFloat(row.overage_cost),
        totalCost: parseFloat(row.total_cost),
        requestCount: row.request_count,
        overageRequests: row.overage_requests,
        status: row.status,
        createdAt: new Date(row.created_at),
        paidAt: row.paid_at ? new Date(row.paid_at) : undefined,
      }));
    } catch (error) {
      logger.error('Failed to get developer bills', { error, developerId });
      return [];
    }
  }

  async markBillAsPaid(billId: string): Promise<boolean> {
    try {
      const result = await query(
        `
        UPDATE billing_records
        SET status = 'paid', paid_at = NOW()
        WHERE id = $1 AND status = 'pending'
      `,
        [billId],
      );

      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      logger.error('Failed to mark bill as paid', { error, billId });
      return false;
    }
  }

  getPricingInfo(): Record<
    string,
    { basePrice: number; includedRequests: number; overagePrice: number }
  > {
    return { ...this.tierPricing };
  }
}

export const rateLimiter = new RateLimiter();
export const usageAnalytics = new UsageAnalytics();
export const billingSystem = new BillingSystem();
