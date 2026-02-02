import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { logger } from '@/lib/logger';

/**
 * 解析 RPC URL 字符串，提取有效的 HTTP/HTTPS/WebSocket URL
 *
 * @param value - 包含 RPC URL 的字符串，可以用逗号、空格或换行分隔
 * @returns 有效的 URL 数组，去重并按发现顺序排列
 *
 * @example
 * ```typescript
 * const urls = parseRpcUrls('https://rpc1.com, https://rpc2.com ws://localhost:8545');
 * // Returns: ['https://rpc1.com', 'https://rpc2.com', 'ws://localhost:8545']
 * ```
 */
export function parseRpcUrls(value: string): string[] {
  const parts = value
    .split(/[,\s]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const p of parts) {
    try {
      const u = new URL(p);
      if (!['http:', 'https:', 'ws:', 'wss:'].includes(u.protocol)) continue;
      if (!out.includes(p)) out.push(p);
    } catch {
      continue;
    }
  }
  return out;
}

/**
 * 合并 Tailwind CSS 类名，自动处理冲突
 *
 * 使用 clsx 处理条件类名，使用 tailwind-merge 解决类名冲突
 *
 * @param inputs - 类名数组，支持字符串、对象、数组等多种格式
 * @returns 合并后的类名字符串
 *
 * @example
 * ```typescript
 * cn('px-2 py-1', 'bg-red-500', { 'text-white': true });
 * // Returns: 'px-2 py-1 bg-red-500 text-white'
 *
 * cn('px-2', 'px-4'); // 后面的会覆盖前面的
 * // Returns: 'px-4'
 * ```
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * 检查值是否为 32 字节的零值（0x0000...0000）
 *
 * @param value - 要检查的十六进制字符串
 * @returns 如果是零值或 undefined 返回 true，否则返回 false
 *
 * @example
 * ```typescript
 * isZeroBytes32('0x0000000000000000000000000000000000000000000000000000000000000000');
 * // Returns: true
 *
 * isZeroBytes32('0x1234...'); // Returns: false
 * isZeroBytes32(undefined);    // Returns: true
 * ```
 */
export function isZeroBytes32(value: `0x${string}` | undefined): boolean {
  if (!value) return true;
  return /^0x0{64}$/i.test(value);
}

/**
 * 将 Unix 时间戳（秒）转换为 ISO 8601 格式字符串
 *
 * @param seconds - Unix 时间戳，单位为秒
 * @returns ISO 8601 格式的日期字符串
 *
 * @example
 * ```typescript
 * toIsoFromSeconds(1609459200n);
 * // Returns: '2021-01-01T00:00:00.000Z'
 * ```
 */
export function toIsoFromSeconds(seconds: bigint): string {
  const ms = Number(seconds) * 1000;
  return new Date(ms).toISOString();
}

/**
 * 将数字格式化为紧凑的美元货币格式
 *
 * 使用 Intl.NumberFormat 进行本地化格式化，适用于大数字的简洁显示
 *
 * @param amount - 要格式化的金额
 * @param locale - 区域设置，如 'en-US', 'zh-CN'
 * @returns 格式化后的货币字符串
 *
 * @example
 * ```typescript
 * formatUsdCompact(1234567, 'en-US'); // Returns: '$1.2M'
 * formatUsdCompact(1500, 'en-US');    // Returns: '$1.5K'
 * ```
 */
export function formatUsdCompact(amount: number, locale: string): string {
  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);
  return formatted;
}

/**
 * 将数字格式化为美元货币格式（完整显示）
 *
 * @param amount - 要格式化的金额
 * @param locale - 区域设置
 * @returns 格式化后的货币字符串，不带小数
 *
 * @example
 * ```typescript
 * formatUsd(1234567, 'en-US'); // Returns: '$1,234,567'
 * ```
 */
export function formatUsd(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * 将数字格式化为紧凑格式（不带货币符号）
 *
 * @param amount - 要格式化的数字
 * @param locale - 区域设置
 * @returns 格式化后的数字字符串
 *
 * @example
 * ```typescript
 * formatNumberCompact(1234567, 'en-US'); // Returns: '1.2M'
 * formatNumberCompact(1500, 'en-US');    // Returns: '1.5K'
 * ```
 */
export function formatNumberCompact(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);
}

/**
 * 将 ISO 日期字符串格式化为本地化的日期时间格式
 *
 * @param iso - ISO 8601 格式的日期字符串
 * @param locale - 区域设置
 * @returns 格式化后的日期时间字符串，如果输入无效返回 '—'
 *
 * @example
 * ```typescript
 * formatTime('2021-01-01T12:30:00Z', 'en-US');
 * // Returns: 'Jan 1, 12:30 PM'
 * ```
 */
export function formatTime(iso: string | null | undefined, locale: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * 计算百分比
 *
 * @param part - 部分值
 * @param total - 总值
 * @returns 百分比整数（0-100），如果 total 为 0 返回 0
 *
 * @example
 * ```typescript
 * calculatePercentage(25, 100); // Returns: 25
 * calculatePercentage(1, 3);    // Returns: 33
 * calculatePercentage(0, 0);    // Returns: 0
 * ```
 */
export function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

/**
 * 将分钟数格式化为人类可读的持续时间字符串
 *
 * @param totalMinutes - 总分钟数
 * @returns 格式化后的持续时间，如 '2h 30m' 或 '—' 如果无效
 *
 * @example
 * ```typescript
 * formatDurationMinutes(150);  // Returns: '2h 30m'
 * formatDurationMinutes(45);   // Returns: '45m'
 * formatDurationMinutes(120);  // Returns: '2h'
 * formatDurationMinutes(-1);   // Returns: '—'
 * ```
 */
export function formatDurationMinutes(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return '—';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);
  if (hours <= 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/**
 * 获取区块链浏览器的 URL
 *
 * 支持多链：Ethereum、Polygon、Arbitrum、Optimism、Base 及其测试网
 *
 * @param chain - 链名称或链 ID
 * @param value - 交易哈希、地址或区块号
 * @param type - URL 类型：'tx' | 'address' | 'block'，默认为 'tx'
 * @returns 完整的浏览器 URL，如果链不支持返回 null
 *
 * @example
 * ```typescript
 * getExplorerUrl('ethereum', '0x123...', 'address');
 * // Returns: 'https://etherscan.io/address/0x123...'
 *
 * getExplorerUrl('137', '0xabc...', 'tx');
 * // Returns: 'https://polygonscan.com/tx/0xabc...'
 * ```
 */
export function getExplorerUrl(
  chain: string | undefined | null,
  value: string,
  type: 'tx' | 'address' | 'block' = 'tx',
): string | null {
  if (!value) return null;
  const c = chain?.toLowerCase() || '';

  let baseUrl = '';
  if (c.includes('amoy') || c === '80002') baseUrl = 'https://amoy.polygonscan.com';
  else if (c.includes('polygon') || c === '137') baseUrl = 'https://polygonscan.com';
  else if (c.includes('arbitrum') || c === '42161') baseUrl = 'https://arbiscan.io';
  else if (c.includes('optimism') || c === '10') baseUrl = 'https://optimistic.etherscan.io';
  else if (c.includes('mainnet') || c === '1') baseUrl = 'https://etherscan.io';
  else if (c.includes('base') || c === '8453') baseUrl = 'https://basescan.org';
  else return null;

  return `${baseUrl}/${type}/${value}`;
}

/**
 * 将文本复制到剪贴板
 *
 * 优先使用现代 Clipboard API，如果不支持则回退到 document.execCommand
 *
 * @param text - 要复制的文本
 * @returns 复制成功返回 true，失败返回 false
 *
 * @example
 * ```typescript
 * const success = await copyToClipboard('Hello World');
 * if (success) {
 *   console.log('复制成功');
 * }
 * ```
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    logger.warn('Failed to copy to clipboard using navigator.clipboard', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    el.style.top = '-9999px';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

/**
 * 根据断言状态获取对应的 Tailwind CSS 颜色类
 *
 * @param status - 断言状态：'Pending' | 'Disputed' | 'Resolved'
 * @returns Tailwind CSS 类名字符串
 *
 * @example
 * ```typescript
 * getAssertionStatusColor('Pending');   // Returns: 'bg-blue-500/10 text-blue-700...'
 * getAssertionStatusColor('Disputed');  // Returns: 'bg-rose-500/10 text-rose-700...'
 * getAssertionStatusColor('Resolved');  // Returns: 'bg-emerald-500/10 text-emerald-700...'
 * ```
 */
export function getAssertionStatusColor(status: string): string {
  switch (status) {
    case 'Pending':
      return 'bg-blue-500/10 text-blue-700 ring-1 ring-blue-500/20';
    case 'Disputed':
      return 'bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/20';
    case 'Resolved':
      return 'bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20';
    default:
      return 'bg-gray-500/10 text-gray-700 ring-1 ring-gray-500/20';
  }
}

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
 * 从错误对象中提取错误详情
 *
 * @param error - 错误对象
 * @returns 错误详情，如果不存在返回 undefined
 *
 * @example
 * ```typescript
 * try {
 *   await fetchData();
 * } catch (e) {
 *   const details = getErrorDetails(e);
 *   console.log(details);
 * }
 * ```
 */
export function getErrorDetails(error: unknown): unknown | undefined {
  if (error instanceof ApiClientError) return error.details;
  return undefined;
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
  input: RequestInfo | URL,
  init?: RequestInit,
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

    const res = await fetch(normalizedInput, {
      ...init,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

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
