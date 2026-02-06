/**
 * Cron Authentication Module - 统一的 Cron 认证模块
 *
 * 消除多个路由文件中重复的 isCronAuthorized() 函数
 */

import { env } from '@/lib/config/env';

import { timingSafeEqualString } from './adminAuth';

/**
 * 检查请求是否通过 Cron Secret 授权
 *
 * 支持两种认证方式：
 * 1. x-oracle-monitor-cron-secret 请求头
 * 2. Authorization: Bearer <token>
 *
 * @param request - HTTP 请求对象
 * @returns 是否授权成功
 */
export function isCronAuthorized(request: Request): boolean {
  const secret = (env.INSIGHT_CRON_SECRET.trim() || env.CRON_SECRET.trim()).trim();
  if (!secret) return false;

  // 检查自定义请求头
  const gotHeader = request.headers.get('x-oracle-monitor-cron-secret')?.trim() ?? '';
  if (gotHeader && timingSafeEqualString(gotHeader, secret)) return true;

  // 检查 Authorization 请求头
  const auth = request.headers.get('authorization')?.trim() ?? '';
  if (!auth) return false;
  if (!auth.toLowerCase().startsWith('bearer ')) return false;

  const token = auth.slice(7).trim();
  if (!token) return false;

  return timingSafeEqualString(token, secret);
}

/**
 * 要求 Cron 授权
 * 如果未授权，返回 401 响应
 *
 * @param request - HTTP 请求对象
 * @returns 未授权时的响应对象，或 null 表示已授权
 */
export function requireCronAuth(request: Request): Response | null {
  if (!isCronAuthorized(request)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Unauthorized',
        message: 'Cron secret is required for this operation',
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
  return null;
}

/**
 * 检查是否为管理员或 Cron 授权
 * 用于需要管理员权限或 Cron Secret 的操作
 *
 * @param request - HTTP 请求对象
 * @returns 是否授权成功
 */
export function isAdminOrCronAuthorized(request: Request): boolean {
  // 首先检查 Cron 授权
  if (isCronAuthorized(request)) {
    return true;
  }

  // 可以在这里添加管理员权限检查
  // 例如：检查 session、JWT token 等

  return false;
}
