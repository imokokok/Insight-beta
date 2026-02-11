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

/**
 * 从 Result 中提取数据，失败时返回默认值
 */
export function unwrapOr<T>(result: Result<T>, defaultValue: T): T {
  return result.success ? result.data : defaultValue;
}

/**
 * 从 Result 中提取数据，失败时抛出错误
 */
export function unwrap<T>(result: Result<T>): T {
  if (!result.success) {
    throw result.error;
  }
  return result.data;
}

/**
 * 映射成功的值
 */
export function map<T, U>(
  result: Result<T>,
  fn: (data: T) => U
): Result<U> {
  if (!result.success) {
    return err(result.error);
  }
  return ok(fn(result.data));
}

/**
 * 映射失败的值
 */
export function mapErr<T, E>(
  result: Result<T>,
  fn: (error: Error) => E
): Result<T, E> {
  if (result.success) {
    return ok(result.data);
  }
  return err(fn(result.error));
}

/**
 * 链式处理 Result
 */
export function andThen<T, U>(
  result: Result<T>,
  fn: (data: T) => Result<U>
): Result<U> {
  if (!result.success) {
    return err(result.error);
  }
  return fn(result.data);
}

/**
 * 检查 Option 是否有值
 */
export function isSome<T>(value: Option<T>): value is T {
  return value !== null && value !== undefined;
}

/**
 * 检查 Option 是否为空
 */
export function isNone<T>(value: Option<T>): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * 从 Option 中提取值，空时返回默认值
 */
export function getOrElse<T>(value: Option<T>, defaultValue: T): T {
  return isSome(value) ? value : defaultValue;
}

/**
 * 安全地访问对象属性
 */
export function getProperty<T, K extends keyof T>(
  obj: T | null | undefined,
  key: K
): Option<T[K]> {
  if (obj === null || obj === undefined) {
    return undefined;
  }
  return obj[key];
}

/**
 * 安全地访问嵌套对象属性
 * @example
 * const price = getNestedProperty(data, 'market', 'price');
 */
export function getNestedProperty<T>(
  obj: Record<string, unknown> | null | undefined,
  ...keys: string[]
): Option<T> {
  if (obj === null || obj === undefined) {
    return undefined;
  }

  let current: unknown = obj;
  for (const key of keys) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== 'object'
    ) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current as T;
}

/**
 * 批量验证多个条件，返回所有错误
 */
export function validateAll(
  ...validators: Array<{ valid: boolean; message: string }>
): Result<true, string[]> {
  const errors = validators
    .filter((v) => !v.valid)
    .map((v) => v.message);

  if (errors.length > 0) {
    return err(errors);
  }
  return ok(true);
}

/**
 * 组合多个 Result，任一失败则返回第一个错误
 */
export function combine<T extends unknown[]>(
  ...results: { [K in keyof T]: Result<T[K]> }
): Result<T> {
  const data: unknown[] = [];

  for (const result of results) {
    if (!result.success) {
      return err(result.error);
    }
    data.push(result.data);
  }

  return ok(data as T);
}

/**
 * 组合多个 Result，收集所有错误
 */
export function combineAll<T extends unknown[]>(
  ...results: { [K in keyof T]: Result<T[K]> }
): Result<T, Error[]> {
  const data: unknown[] = [];
  const errors: Error[] = [];

  for (const result of results) {
    if (result.success) {
      data.push(result.data);
    } else {
      errors.push(result.error);
    }
  }

  if (errors.length > 0) {
    return err(errors);
  }

  return ok(data as T);
}
