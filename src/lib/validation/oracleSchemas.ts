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
