/**
 * API Utilities
 *
 * API 相关工具函数
 */

import { getErrorMessage } from '@/lib/errors';

import { getOracleInstanceId } from './storage';

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
    let normalizedInput: Parameters<typeof fetch>[0] = input;
    if (typeof input === 'string' && input.startsWith('/')) {
      const base = getServerBaseUrl();
      const url = new URL(input, base);
      if (
        typeof window !== 'undefined' &&
        url.pathname.startsWith('/api/oracle/') &&
        !url.searchParams.has('instanceId')
      ) {
        const instanceId = await getOracleInstanceId();
        if (instanceId && instanceId !== 'default') {
          url.searchParams.set('instanceId', instanceId);
        }
      }
      normalizedInput = url;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(normalizedInput, {
      ...init,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiClientError(
        `http_${response.status}`,
        errorData.error || response.statusText,
      );
    }

    const data = (await response.json()) as ApiResponse<T>;

    if (!data.ok) {
      throw new ApiClientError(
        'api_error',
        data.error || 'Unknown API error',
      );
    }

    return data.data as T;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new ApiClientError('timeout', 'Request timeout');
      }
      throw new ApiClientError('network_error', error.message);
    }

    throw new ApiClientError('unknown_error', error);
  }
}

/**
 * 标准化 API 列表响应
 *
 * 处理 API 可能返回的两种格式：直接数组或包含 items 属性的对象
 *
 * @template T - 列表项类型
 * @param response - API 响应数据
 * @returns 标准化的数组
 *
 * @example
 * ```typescript
 * // 处理直接返回数组的情况
 * normalizeListResponse([{ id: 1 }, { id: 2 }])
 * // => [{ id: 1 }, { id: 2 }]
 *
 * // 处理返回对象的情况
 * normalizeListResponse({ items: [{ id: 1 }], total: 1 })
 * // => [{ id: 1 }]
 * ```
 */
export function normalizeListResponse<T>(
  response: T[] | { items?: T[] } | unknown
): T[] {
  if (Array.isArray(response)) {
    return response;
  }
  if (response && typeof response === 'object' && 'items' in response) {
    const items = (response as { items?: T[] }).items;
    return Array.isArray(items) ? items : [];
  }
  return [];
}


