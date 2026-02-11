/**
 * URL Utilities
 *
 * URL 构建和查询参数处理工具函数
 */

/**
 * 构建 API URL 的查询参数
 *
 * @param params - 参数对象，值为 string | number | boolean | undefined | null
 * @returns URLSearchParams 对象
 *
 * @example
 * ```typescript
 * const params = buildQueryParams({
 *   chain: 'ethereum',
 *   provider: 'etherscan',
 *   limit: 100,
 *   active: true,
 *   empty: null,
 *   undefinedParam: undefined,
 * });
 * // params.toString() => 'chain=ethereum&provider=etherscan&limit=100&active=true'
 * ```
 */
export function buildQueryParams(
  params: Record<string, string | number | boolean | undefined | null>
): URLSearchParams {
  const queryParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.set(key, String(value));
    }
  });

  return queryParams;
}

/**
 * 构建完整的 API URL
 *
 * @param basePath - API 基础路径（如 '/api/gas/price'）
 * @param params - 查询参数对象
 * @returns 完整的 URL 字符串，如果没有参数则返回基础路径
 *
 * @example
 * ```typescript
 * const url = buildApiUrl('/api/gas/price', {
 *   chain: 'ethereum',
 *   provider: 'etherscan',
 * });
 * // url => '/api/gas/price?chain=ethereum&provider=etherscan'
 *
 * const url2 = buildApiUrl('/api/gas/price', {});
 * // url2 => '/api/gas/price'
 * ```
 */
export function buildApiUrl(
  basePath: string,
  params: Record<string, string | number | boolean | undefined | null>
): string {
  const queryParams = buildQueryParams(params);
  const queryString = queryParams.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}
