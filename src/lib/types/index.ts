/**
 * Types - 统一类型导出
 *
 * 这是所有类型的统一入口，按领域组织
 */

// 领域类型（核心领域模型）
export * from './domain';

// API 类型（请求/响应）
export * from './api';

// 数据库类型（Prisma 模型扩展）
export * from './database';

// Oracle 协议类型和常量
export {
  PROTOCOL_DISPLAY_NAMES,
  PRICE_FEED_PROTOCOLS,
  OPTIMISTIC_PROTOCOLS,
  ORACLE_PROTOCOLS,
  PROTOCOL_INFO,
} from './oracle/protocol';

// 工具类型
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type NullableOptional<T> = T | null | undefined;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

// 类型守卫辅助
export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

export function isNotEmpty<T>(array: T[] | undefined | null): array is T[] {
  return isDefined(array) && array.length > 0;
}
