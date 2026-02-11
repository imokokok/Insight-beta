/**
 * API Utilities
 *
 * API 相关工具函数
 */

import { getErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';

export { getErrorMessage };

/**
 * API 响应的标准格式接口
 *
 * @template T - 响应数据的类型
 */
interface ApiResponse<T> {
  /** 请求是否成功 */
  ok: boolean;
  /** 响应数据，仅在 ok 为 true 时存在 */
  data?: T;
  /** 错误信息，仅在 ok 为 false 时存在 */
  error?: string | { code?: unknown; details?: unknown };
}

/**
 * API 客户端错误类
 *
 * 用于封装 API 请求中的错误，包含错误代码和详细信息
 *
 * @example
 * ```typescript
 * throw new ApiClientError('network_error', 'Connection timeout');
 * throw new ApiClientError('invalid_input');
 * ```
 */
export class ApiClientError extends Error {
  /** 错误代码 */
  code: string;
  /** 错误详细信息 */
  details?: unknown;

  constructor(code: string, details?: unknown) {
    super(code);
    this.code = code;
    this.details = details;
  }
}

/**
 * 从错误对象中提取错误代码
 *
 * @param error - 错误对象
 * @returns 错误代码字符串
 *
 * @example
 * ```typescript
 * try {
 *   await fetchData();
 * } catch (e) {
 *   const code = getErrorCode(e);
 *   // code: 'network_error' | 'api_error' | 'unknown_error'
 * }
 * ```
 */
export function getErrorCode(error: unknown): string {
  if (error instanceof ApiClientError) return error.code;
  if (error instanceof Error) return error.message;
  return 'unknown_error';
}

/**
 * 获取服务器基础 URL
 *
 * 优先级：window.location > INSIGHT_BASE_URL 环境变量 > 默认值
 *
 * @returns 服务器基础 URL
 */
function getServerBaseUrl(): string {
  if (
    typeof window !== 'undefined' &&
    typeof window.location?.origin === 'string' &&
    window.location.origin !== 'null'
  ) {
    return window.location.origin;
  }
  if (process.env.INSIGHT_BASE_URL) {
    return process.env.INSIGHT_BASE_URL;
  }
  if (process.env.NODE_ENV !== 'production') {
    return 'http://localhost:3000';
  }
  return 'http://localhost:3000';
}

/**
 * 通用的 API 数据获取函数
 *
 * 封装了 fetch 的常用功能：
 * - 自动处理相对路径 URL
 * - 自动添加 instanceId 查询参数
 * - 请求超时控制（默认 30 秒）
 * - 统一的错误处理
 * - 响应数据验证
 *
 * @template T - 期望的响应数据类型
 * @param input - 请求 URL 或 Request 对象
 * @param init - fetch 配置选项
 * @param timeout - 超时时间（毫秒），默认 30000
 * @returns 解析后的响应数据
 * @throws {ApiClientError} 当请求失败或响应格式错误时抛出
 *
 * @example
 * ```typescript
 * try {
 *   const data = await fetchApiData<UserData>('/api/user/123');
 *   console.log(data.name);
 * } catch (error) {
 *   if (error instanceof ApiClientError) {
 *     console.error('Error code:', error.code);
 *   }
 * }
 *
 * // 带超时和自定义配置
 * const data = await fetchApiData<Stats>(
 *   '/api/stats',
 *   { method: 'POST', body: JSON.stringify({ period: '7d' }) },
 *   10000 // 10秒超时
 * );
 * ```
 */
export async function fetchApiData<T>(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
  timeout: number = 30000,
): Promise<T> {
  try {
    const normalizedInput = (() => {
      if (typeof input === 'string' && input.startsWith('/')) {
        const base = getServerBaseUrl();
        const url = new URL(input, base);
        if (
          typeof window !== 'undefined' &&
          url.pathname.startsWith('/api/oracle/') &&
          !url.searchParams.has('instanceId')
        ) {
          try {
            const saved = window.localStorage.getItem('oracleFilters');
            if (saved) {
              const parsed = JSON.parse(saved) as {
                instanceId?: unknown;
              } | null;
              const instanceId = parsed && typeof parsed === 'object' ? parsed.instanceId : null;
              if (typeof instanceId === 'string' && instanceId.trim()) {
                url.searchParams.set('instanceId', instanceId.trim());
              }
            }
          } catch (error) {
            logger.warn('Failed to parse saved oracle filters from localStorage', {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
        return url;
      }
      return input;
    })();

    // 添加超时机制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let res: Response;
    try {
      res = await fetch(normalizedInput, {
        ...init,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      // If parsing fails, throw http status or generic error
      if (!res.ok) throw new ApiClientError(`http_${res.status}`);
      throw new ApiClientError('invalid_json');
    }

    if (!res.ok) {
      if (json && typeof json === 'object') {
        const record = json as Record<string, unknown>;
        if (record.ok === false) {
          const err = record.error;
          if (typeof err === 'string') throw new ApiClientError(err);
          if (err && typeof err === 'object') {
            const obj = err as Record<string, unknown>;
            const code = typeof obj.code === 'string' ? obj.code : 'api_error';
            throw new ApiClientError(code, obj.details);
          }
          throw new ApiClientError('api_error');
        }
      }
      throw new ApiClientError(`http_${res.status}`);
    }

    if (!json || typeof json !== 'object') {
      throw new ApiClientError('invalid_api_response');
    }

    const record = json as ApiResponse<T>;
    if (record.ok && record.data !== undefined) {
      return record.data;
    }

    if (record.error) {
      if (typeof record.error === 'string') {
        throw new ApiClientError(record.error);
      }
      if (record.error && typeof record.error === 'object') {
        const err = record.error as { code?: unknown; details?: unknown };
        const code = typeof err.code === 'string' ? err.code : 'api_error';
        throw new ApiClientError(code, err.details);
      }
      throw new ApiClientError('api_error');
    }

    throw new ApiClientError('unknown_error');
  } catch (error) {
    const name =
      error && typeof error === 'object' && 'name' in error
        ? String((error as { name?: unknown }).name)
        : '';
    if (name !== 'AbortError' && !(error instanceof ApiClientError)) {
      logger.error('Fetch error:', { error });
      // 如果是网络错误，包装成更友好的错误
      if (
        error instanceof Error &&
        (error.name === 'TypeError' || error.message.includes('Network'))
      ) {
        throw new ApiClientError('network_error', error.message);
      }
    }
    throw error;
  }
}
