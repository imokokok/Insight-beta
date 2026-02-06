/**
 * Oracle API Validation Schemas
 *
 * 使用 Zod 进行 API 参数验证
 */

import { z } from 'zod';

// ============================================================================
// 基础验证规则
// ============================================================================

/**
 * 价格对格式验证 (e.g., ETH/USD)
 */
export const pricePairSchema = z
  .string()
  .min(3)
  .max(20)
  .regex(/^[A-Z]+\/[A-Z]+$/, 'Price pair must be in format BASE/QUOTE (e.g., ETH/USD)')
  .transform((val) => val.toUpperCase());

/**
 * 区块链地址验证
 */
export const addressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format');

/**
 * 协议类型验证
 */
export const protocolSchema = z.enum([
  'chainlink',
  'pyth',
  'uma',
  'api3',
  'band',
  'redstone',
  'switchboard',
  'flux',
  'dia',
]);

/**
 * 链类型验证
 */
export const chainSchema = z.enum([
  'ethereum',
  'polygon',
  'arbitrum',
  'optimism',
  'base',
  'avalanche',
  'bsc',
  'solana',
  'local',
]);

// ============================================================================
// 统一预言机 API 验证模式
// ============================================================================

/**
 * GET /api/oracle/unified 查询参数验证
 */
export const unifiedOracleGetSchema = z.object({
  pair: pricePairSchema,
  protocols: z
    .union([z.string(), z.array(protocolSchema)])
    .optional()
    .transform((val) => {
      if (!val || val === 'all') return undefined;
      return typeof val === 'string' ? val.split(',') : val;
    }),
  includeStats: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((val) => val === true || val === 'true'),
  chain: chainSchema.optional(),
});

export type UnifiedOracleGetInput = z.infer<typeof unifiedOracleGetSchema>;

/**
 * POST /api/oracle/unified 请求体验证
 */
export const unifiedOraclePostSchema = z.object({
  pair: pricePairSchema,
  protocols: z.array(protocolSchema).optional(),
  threshold: z
    .union([z.number(), z.string()])
    .optional()
    .transform((val) => {
      if (typeof val === 'string') return parseFloat(val);
      return val ?? 1.0;
    })
    .pipe(z.number().min(0).max(100)),
  includeHistory: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((val) => val === true || val === 'true'),
  timeframe: z.enum(['1m', '5m', '15m', '1h', '4h', '1d', '1w', '1M']).optional(),
});

export type UnifiedOraclePostInput = z.infer<typeof unifiedOraclePostSchema>;

// ============================================================================
// 价格查询验证模式
// ============================================================================

/**
 * 价格查询参数
 */
export const priceQuerySchema = z.object({
  symbol: pricePairSchema,
  protocol: protocolSchema.optional(),
  chain: chainSchema.optional(),
  includeMetadata: z.boolean().default(false),
});

export type PriceQueryInput = z.infer<typeof priceQuerySchema>;

/**
 * 批量价格查询参数
 */
export const batchPriceQuerySchema = z.object({
  symbols: z.array(pricePairSchema).min(1).max(100),
  protocols: z.array(protocolSchema).optional(),
  chains: z.array(chainSchema).optional(),
});

export type BatchPriceQueryInput = z.infer<typeof batchPriceQuerySchema>;

// ============================================================================
// 断言验证模式
// ============================================================================

/**
 * 断言查询参数
 */
export const assertionQuerySchema = z.object({
  assertionId: z.string().min(1).max(100).optional(),
  asserter: addressSchema.optional(),
  status: z.enum(['Pending', 'Disputed', 'Resolved', 'Expired']).optional(),
  protocol: protocolSchema.optional(),
  chain: chainSchema.optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type AssertionQueryInput = z.infer<typeof assertionQuerySchema>;

// ============================================================================
// 争议验证模式
// ============================================================================

/**
 * 争议查询参数
 */
export const disputeQuerySchema = z.object({
  disputeId: z.string().min(1).max(100).optional(),
  assertionId: z.string().min(1).max(100).optional(),
  disputer: addressSchema.optional(),
  status: z.enum(['Voting', 'Pending Execution', 'Executed']).optional(),
  protocol: protocolSchema.optional(),
  chain: chainSchema.optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type DisputeQueryInput = z.infer<typeof disputeQuerySchema>;

// ============================================================================
// 告警验证模式
// ============================================================================

/**
 * 告警规则创建/更新
 */
export const alertRuleSchema = z.object({
  name: z.string().min(1).max(100),
  enabled: z.boolean().default(true),
  event: z.string().min(1).max(100),
  severity: z.enum(['info', 'warning', 'critical']),
  protocols: z.array(protocolSchema).optional(),
  chains: z.array(chainSchema).optional(),
  symbols: z.array(pricePairSchema).optional(),
  params: z.record(z.unknown()).optional(),
  channels: z.array(z.enum(['email', 'webhook', 'telegram', 'slack', 'pagerduty'])).optional(),
  cooldownMinutes: z.number().int().min(0).max(1440).optional(),
  maxNotificationsPerHour: z.number().int().min(1).max(1000).optional(),
});

export type AlertRuleInput = z.infer<typeof alertRuleSchema>;

// ============================================================================
// 分页和时间范围验证模式
// ============================================================================

/**
 * 分页参数
 */
export const paginationSchema = z.object({
  page: z
    .union([z.number(), z.string()])
    .optional()
    .transform((val) => {
      if (typeof val === 'string') return parseInt(val, 10);
      return val ?? 1;
    })
    .pipe(z.number().int().min(1)),
  limit: z
    .union([z.number(), z.string()])
    .optional()
    .transform((val) => {
      if (typeof val === 'string') return parseInt(val, 10);
      return val ?? 20;
    })
    .pipe(z.number().int().min(1).max(100)),
  cursor: z.string().optional(),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

/**
 * 时间范围参数
 */
export const timeRangeSchema = z.object({
  startTime: z
    .union([z.number(), z.string()])
    .optional()
    .transform((val) => {
      if (typeof val === 'string') return parseInt(val, 10);
      return val;
    }),
  endTime: z
    .union([z.number(), z.string()])
    .optional()
    .transform((val) => {
      if (typeof val === 'string') return parseInt(val, 10);
      return val;
    }),
  timeframe: z.enum(['1m', '5m', '15m', '1h', '4h', '1d', '1w', '1M']).optional(),
});

export type TimeRangeInput = z.infer<typeof timeRangeSchema>;

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 验证并转换查询参数
 */
export function validateQueryParams<T>(
  schema: z.ZodSchema<T>,
  params: unknown,
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(params);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * 格式化 Zod 错误为可读字符串
 */
export function formatZodError(error: z.ZodError): string {
  return error.errors.map((err) => `${err.path.join('.')}: ${err.message}`).join('; ');
}
