/**
 * Database Types - 数据库模型类型扩展
 *
 * 使用 Supabase 类型，替代 Prisma
 */

// 导出 Supabase 数据库类型
export * from './supabase';

// 导出 Alert 相关类型
export { type AlertRuleRow, rowToAlertRule } from './alert';

// 重新导出 Supabase 特定类型
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
} from './supabase';
