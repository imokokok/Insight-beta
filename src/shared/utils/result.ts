/**
 * Result Type - 函数式错误处理
 *
 * 替代抛出异常，使用显式的错误处理方式
 * 灵感来自 Rust 的 Result<T, E> 类型
 */

export type Result<T, E = Error> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: E };

export type Option<T> = T | null | undefined;
