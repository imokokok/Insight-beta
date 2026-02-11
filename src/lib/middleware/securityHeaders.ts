/**
 * Security Headers Middleware
 *
 * 为 API 响应添加安全相关的 HTTP 头
 */

export const SECURITY_HEADERS = {
  // 防止 MIME 类型嗅探
  'X-Content-Type-Options': 'nosniff',
  // 防止点击劫持
  'X-Frame-Options': 'DENY',
  // XSS 保护
  'X-XSS-Protection': '1; mode=block',
  // 引用策略
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // 权限策略
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  // 内容安全策略（API 路由可放宽）
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';",
} as const;

/**
 * 创建带安全头的响应
 */
export function createSecureResponse(
  body: unknown,
  init?: ResponseInit,
): Response {
  const headers = new Headers(init?.headers);

  // 添加安全头
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    if (!headers.has(key)) {
      headers.set(key, value);
    }
  });

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  });
}

/**
 * 为 NextResponse 添加安全头
 */
export function addSecurityHeaders(headers: Headers): Headers {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    if (!headers.has(key)) {
      headers.set(key, value);
    }
  });
  return headers;
}
