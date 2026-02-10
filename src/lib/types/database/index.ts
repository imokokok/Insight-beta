/**
 * Database Types - 数据库模型类型扩展
 *
 * 使用 Supabase 类型，替代 Prisma
 */

// 重新导出 Supabase 类型
export type {
  PriceHistoryRaw,
  PriceHistoryMin1,
  PriceHistoryMin5,
  PriceHistoryHour1,
  PriceHistoryDay1,
  SolanaPriceFeed,
  SolanaPriceHistory,
  SolanaOracleInstance,
  SolanaSyncStatus,
  SolanaAlert,
} from '@/types/supabase';
