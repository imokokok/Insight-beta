import type { NextRequest } from 'next/server';
import crypto from 'crypto';

export interface AuthResult {
  isAdmin: boolean;
  userId?: string;
}

/**
 * 使用 timingSafeEqual 进行安全的字符串比较
 * 防止时序攻击
 */
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  return crypto.timingSafeEqual(aBuf, bBuf);
}

/**
 * Check if request is authenticated
 * This is a simplified implementation - in production, use proper auth
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  // Get auth header
  const authHeader = request.headers.get('authorization');
  const adminToken = process.env.INSIGHT_ADMIN_TOKEN;

  // Check for admin token in header
  if (authHeader && adminToken) {
    const token = authHeader.replace('Bearer ', '');
    // In production, validate token properly

    if (secureCompare(token, adminToken)) {
      return { isAdmin: true };
    }
  }

  // 生产环境禁止从 URL 获取令牌
  if (process.env.NODE_ENV !== 'production') {
    // Check for admin token in query params (for development only)
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (token && adminToken && secureCompare(token, adminToken)) {
      return { isAdmin: true };
    }
  }

  return { isAdmin: false };
}

/**
 * Check if user has admin permission
 */
export function checkAdmin(auth: AuthResult): boolean {
  return auth.isAdmin;
}
