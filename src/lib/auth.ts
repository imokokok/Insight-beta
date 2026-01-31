import type { NextRequest } from 'next/server';

export interface AuthResult {
  isAdmin: boolean;
  userId?: string;
}

/**
 * Check if request is authenticated
 * This is a simplified implementation - in production, use proper auth
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  // Get auth header
  const authHeader = request.headers.get('authorization');

  // Check for admin token in header
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    const adminToken = process.env.INSIGHT_ADMIN_TOKEN;
    // In production, validate token properly

    if (adminToken && token.length === adminToken.length && token === adminToken) {
      return { isAdmin: true };
    }
  }

  // Check for admin token in query params (for development)
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const adminToken = process.env.INSIGHT_ADMIN_TOKEN;

  if (adminToken && token && token.length === adminToken.length && token === adminToken) {
    return { isAdmin: true };
  }

  return { isAdmin: false };
}

/**
 * Check if user has admin permission
 */
export function checkAdmin(auth: AuthResult): boolean {
  return auth.isAdmin;
}
