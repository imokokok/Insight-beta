/**
 * API Authentication Middleware
 *
 * Provides API key authentication and authorization
 * for Oracle Monitor platform
 */

import { logger } from '@/lib/logger';

function generateSecureRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const values = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(values, (v) => chars[v % chars.length]).join('');
  }
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ============================================================================
// Types
// ============================================================================

export interface ApiKey {
  id: string;
  key: string;
  name: string;
  permissions: string[];
  createdAt: Date;
  expiresAt?: Date;
  lastUsedAt?: Date;
  isActive: boolean;
  rateLimitTier: 'standard' | 'strict' | 'relaxed' | 'burst';
}

export interface AuthResult {
  authenticated: boolean;
  apiKey?: ApiKey;
  error?: string;
}

export interface PermissionCheck {
  resource: string;
  action: 'read' | 'write' | 'delete' | 'admin';
}

// ============================================================================
// API Auth Service
// ============================================================================

export class ApiAuthService {
  private static instance: ApiAuthService;
  private apiKeys: Map<string, ApiKey> = new Map();

  private constructor() {
    this.initializeDefaultKeys();
  }

  static getInstance(): ApiAuthService {
    if (!ApiAuthService.instance) {
      ApiAuthService.instance = new ApiAuthService();
    }
    return ApiAuthService.instance;
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  private initializeDefaultKeys(): void {
    for (const apiKey of [
      {
        id: 'key-1',
        key: 'om_dev_' + generateSecureRandomString(22),
        name: 'Development Key',
        permissions: ['oracle:read', 'monitoring:read', 'export:read'],
        createdAt: new Date(),
        isActive: true,
        rateLimitTier: 'relaxed' as const,
      },
      {
        id: 'key-2',
        key: 'om_admin_' + generateSecureRandomString(22),
        name: 'Admin Key',
        permissions: ['*'],
        createdAt: new Date(),
        isActive: true,
        rateLimitTier: 'standard' as const,
      },
    ]) {
      this.apiKeys.set(apiKey.key, apiKey);
    }
  }

  // ============================================================================
  // Authentication
  // ============================================================================

  authenticate(authHeader: string | null): AuthResult {
    if (!authHeader) {
      return {
        authenticated: false,
        error: 'Missing authorization header',
      };
    }

    // Support Bearer token format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return {
        authenticated: false,
        error: 'Invalid authorization format. Use: Bearer <api-key>',
      };
    }

    const apiKey = parts[1] ?? '';
    const keyData = this.apiKeys.get(apiKey);

    if (!keyData) {
      logger.warn('Invalid API key attempted', { key: apiKey.substring(0, 10) + '...' });
      return {
        authenticated: false,
        error: 'Invalid API key',
      };
    }

    if (!keyData.isActive) {
      return {
        authenticated: false,
        error: 'API key is deactivated',
      };
    }

    if (keyData.expiresAt && keyData.expiresAt < new Date()) {
      return {
        authenticated: false,
        error: 'API key has expired',
      };
    }

    // Update last used
    keyData.lastUsedAt = new Date();

    logger.info('API key authenticated', {
      keyId: keyData.id,
      name: keyData.name,
    });

    return {
      authenticated: true,
      apiKey: keyData,
    };
  }

  // ============================================================================
  // Authorization
  // ============================================================================

  checkPermission(apiKey: ApiKey, check: PermissionCheck): boolean {
    // Admin permission allows everything
    if (apiKey.permissions.includes('*')) {
      return true;
    }

    // Check specific permission
    const requiredPermission = `${check.resource}:${check.action}`;

    // Check for wildcard resource permissions
    const wildcardPermission = `${check.resource}:*`;

    return (
      apiKey.permissions.includes(requiredPermission) ||
      apiKey.permissions.includes(wildcardPermission)
    );
  }

  // ============================================================================
  // API Key Management
  // ============================================================================

  createApiKey(
    name: string,
    permissions: string[],
    rateLimitTier: ApiKey['rateLimitTier'] = 'standard',
    expiresAt?: Date,
  ): ApiKey {
    const key: ApiKey = {
      id: `key-${Date.now()}`,
      key: `om_${generateSecureRandomString(24)}_${generateSecureRandomString(16)}`,
      name,
      permissions,
      createdAt: new Date(),
      expiresAt,
      isActive: true,
      rateLimitTier,
    };

    this.apiKeys.set(key.key, key);
    logger.info('API key created', { keyId: key.id, name });

    return key;
  }

  revokeApiKey(keyId: string): boolean {
    for (const [, data] of this.apiKeys.entries()) {
      if (data.id === keyId) {
        data.isActive = false;
        logger.info('API key revoked', { keyId });
        return true;
      }
    }
    return false;
  }

  deleteApiKey(keyId: string): boolean {
    for (const [key, data] of this.apiKeys.entries()) {
      if (data.id === keyId) {
        this.apiKeys.delete(key);
        logger.info('API key deleted', { keyId });
        return true;
      }
    }
    return false;
  }

  getApiKeys(): ApiKey[] {
    return Array.from(this.apiKeys.values()).map((key) => ({
      ...key,
      key: key.key.substring(0, 10) + '...', // Mask the actual key
    }));
  }

  // ============================================================================
  // Permission Definitions
  // ============================================================================

  getAvailablePermissions(): Array<{
    resource: string;
    actions: string[];
    description: string;
  }> {
    return [
      {
        resource: 'oracle',
        actions: ['read', 'write'],
        description: 'Access oracle price feeds and data',
      },
      {
        resource: 'monitoring',
        actions: ['read', 'write'],
        description: 'Access system monitoring data',
      },
      {
        resource: 'export',
        actions: ['read', 'write'],
        description: 'Export data in various formats',
      },
      {
        resource: 'alerts',
        actions: ['read', 'write', 'delete'],
        description: 'Manage alerts and notifications',
      },
      {
        resource: 'admin',
        actions: ['read', 'write', 'delete'],
        description: 'Administrative functions',
      },
    ];
  }
}

// Export singleton instance
export const apiAuthService = ApiAuthService.getInstance();

// ============================================================================
// Middleware Helpers
// ============================================================================

export function extractAuthHeader(headers: Headers): string | null {
  return headers.get('authorization') ?? headers.get('Authorization');
}

export function getClientIdentifier(request: Request): string {
  // Use IP address or API key as identifier
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown';
  return ip;
}
