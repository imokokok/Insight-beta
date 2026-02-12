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

/**
 * 创建成功的 Result
 */
export function ok<T>(data: T): Result<T, never> {
  return { success: true, data, error: null };
}

/**
 * 创建失败的 Result
 */
export function err<E = Error>(error: E): Result<never, E> {
  return { success: false, data: null, error };
}

/**
 * 尝试执行函数，捕获异常并返回 Result
 */
export function tryCatch<T>(fn: () => T): Result<T, Error> {
  try {
    return ok(fn());
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * 尝试执行异步函数，捕获异常并返回 Result
 */
export async function tryCatchAsync<T>(
  fn: () => Promise<T>
): Promise<Result<T, Error>> {
  try {
    const data = await fn();
    return ok(data);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}


