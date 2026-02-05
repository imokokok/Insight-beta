/**
 * Security Middleware
 *
 * Combines rate limiting and authentication for API endpoints
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { rateLimiter, rateLimitConfigs } from '@/server/security/rateLimiter';
import { apiAuthService, extractAuthHeader, getClientIdentifier } from '@/server/security/apiAuth';
import { logger } from '@/lib/logger';

export interface SecurityConfig {
  requireAuth?: boolean;
  rateLimit?: keyof typeof rateLimitConfigs;
  permissions?: Array<{ resource: string; action: 'read' | 'write' | 'delete' | 'admin' }>;
}

/**
 * Apply security middleware to a request
 */
export async function applySecurity(
  request: NextRequest,
  config: SecurityConfig = {},
): Promise<{ success: true } | { success: false; response: NextResponse }> {
  const { requireAuth = false, rateLimit = 'standard', permissions = [] } = config;

  // 1. Rate Limiting
  const clientId = getClientIdentifier(request);
  const rateLimitResult = rateLimiter.checkLimit(clientId, rateLimitConfigs[rateLimit]);

  if (!rateLimitResult.allowed) {
    logger.warn('Rate limit exceeded', {
      clientId,
      path: request.nextUrl.pathname,
    });

    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter),
            'X-RateLimit-Limit': String(rateLimitResult.info.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.info.remaining),
            'X-RateLimit-Reset': String(rateLimitResult.info.resetTime),
          },
        },
      ),
    };
  }

  // 2. Authentication (if required)
  if (requireAuth) {
    const authHeader = extractAuthHeader(request.headers);
    const authResult = apiAuthService.authenticate(authHeader);

    if (!authResult.authenticated) {
      logger.warn('Authentication failed', {
        clientId,
        path: request.nextUrl.pathname,
        error: authResult.error,
      });

      return {
        success: false,
        response: NextResponse.json(
          {
            success: false,
            error: authResult.error || 'Authentication required',
          },
          { status: 401 },
        ),
      };
    }

    // 3. Authorization
    for (const permission of permissions) {
      const hasPermission = apiAuthService.checkPermission(authResult.apiKey!, permission);

      if (!hasPermission) {
        logger.warn('Authorization failed', {
          clientId,
          path: request.nextUrl.pathname,
          permission: `${permission.resource}:${permission.action}`,
          apiKeyId: authResult.apiKey!.id,
        });

        return {
          success: false,
          response: NextResponse.json(
            {
              success: false,
              error: `Insufficient permissions: ${permission.resource}:${permission.action}`,
            },
            { status: 403 },
          ),
        };
      }
    }
  }

  return { success: true };
}

/**
 * Create a secured API handler
 */
export function withSecurity(
  handler: (request: NextRequest) => Promise<NextResponse>,
  config: SecurityConfig = {},
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const securityResult = await applySecurity(request, config);

    if (!securityResult.success) {
      return securityResult.response;
    }

    return handler(request);
  };
}
