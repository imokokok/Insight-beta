/**
 * API 版本控制系统
 *
 * 提供 API 版本管理、路由处理和版本兼容性检查
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/** 支持的 API 版本 */
export type ApiVersion = 'v1' | 'v2';

/** 当前默认版本 */
export const DEFAULT_API_VERSION: ApiVersion = 'v1';

/** 支持的版本列表 */
export const SUPPORTED_VERSIONS: ApiVersion[] = ['v1', 'v2'];

/** 版本弃用信息 */
export const VERSION_DEPRECATION: Record<ApiVersion, { deprecated: boolean; sunsetDate?: string }> =
  {
    v1: { deprecated: false },
    v2: { deprecated: false },
  };

/** API 版本配置 */
export interface ApiVersionConfig {
  version: ApiVersion;
  basePath: string;
  deprecated: boolean;
  sunsetDate?: string;
  features: string[];
}

/** 版本配置映射 */
export const API_VERSION_CONFIG: Record<ApiVersion, ApiVersionConfig> = {
  v1: {
    version: 'v1',
    basePath: '/api/v1',
    deprecated: false,
    features: [
      'oracle-config',
      'assertions',
      'disputes',
      'sync',
      'health',
      'cache',
      'notifications',
    ],
  },
  v2: {
    version: 'v2',
    basePath: '/api/v2',
    deprecated: false,
    features: [
      'oracle-config',
      'assertions',
      'disputes',
      'sync',
      'health',
      'cache',
      'notifications',
      'batch-operations',
      'advanced-filters',
    ],
  },
};

/**
 * 从请求中提取 API 版本
 * 优先级：URL 路径 > Header > Query 参数 > 默认版本
 */
export function extractApiVersion(request: NextRequest): ApiVersion {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // 1. 从 URL 路径提取版本
  const pathMatch = pathname.match(/^\/api\/(v\d+)\//);
  if (pathMatch) {
    const version = pathMatch[1] as ApiVersion;
    if (SUPPORTED_VERSIONS.includes(version)) {
      return version;
    }
  }

  // 2. 从 Header 提取版本
  const headerVersion = request.headers.get('X-API-Version');
  if (headerVersion && SUPPORTED_VERSIONS.includes(headerVersion as ApiVersion)) {
    return headerVersion as ApiVersion;
  }

  // 3. 从 Query 参数提取版本
  const queryVersion = url.searchParams.get('api-version');
  if (queryVersion && SUPPORTED_VERSIONS.includes(queryVersion as ApiVersion)) {
    return queryVersion as ApiVersion;
  }

  // 4. 返回默认版本
  return DEFAULT_API_VERSION;
}

/**
 * 检查版本是否有效
 */
export function isValidVersion(version: string): version is ApiVersion {
  return SUPPORTED_VERSIONS.includes(version as ApiVersion);
}

/**
 * 检查版本是否已弃用
 */
export function isDeprecated(version: ApiVersion): boolean {
  return VERSION_DEPRECATION[version]?.deprecated ?? false;
}

/**
 * 获取版本弃用信息
 */
export function getDeprecationInfo(version: ApiVersion): {
  deprecated: boolean;
  sunsetDate?: string;
  message?: string;
} {
  const info = VERSION_DEPRECATION[version];
  if (!info?.deprecated) {
    return { deprecated: false };
  }

  return {
    deprecated: true,
    sunsetDate: info.sunsetDate,
    message: info.sunsetDate
      ? `This API version is deprecated and will be sunset on ${info.sunsetDate}. Please migrate to the latest version.`
      : 'This API version is deprecated. Please migrate to the latest version.',
  };
}

/**
 * 创建版本化的响应头
 */
export function createVersionHeaders(version: ApiVersion): Record<string, string> {
  const headers: Record<string, string> = {
    'X-API-Version': version,
    'X-API-Supported-Versions': SUPPORTED_VERSIONS.join(', '),
  };

  const deprecationInfo = getDeprecationInfo(version);
  if (deprecationInfo.deprecated) {
    headers['Deprecation'] = 'true';
    if (deprecationInfo.sunsetDate) {
      headers['Sunset'] = deprecationInfo.sunsetDate;
    }
  }

  return headers;
}

/**
 * API 版本中间件
 * 自动处理版本路由和响应头
 */
export function withApiVersion(
  handler: (request: NextRequest, version: ApiVersion) => Promise<NextResponse>,
  options?: {
    minVersion?: ApiVersion;
    maxVersion?: ApiVersion;
  },
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const version = extractApiVersion(request);

    // 检查版本支持
    if (!isValidVersion(version)) {
      return NextResponse.json(
        {
          error: {
            code: 'UNSUPPORTED_API_VERSION',
            message: `API version '${version}' is not supported. Supported versions: ${SUPPORTED_VERSIONS.join(', ')}`,
          },
        },
        { status: 400 },
      );
    }

    // 检查最低版本要求
    if (options?.minVersion) {
      const versionNum = parseInt(version.replace('v', ''));
      const minVersionNum = parseInt(options.minVersion.replace('v', ''));
      if (versionNum < minVersionNum) {
        return NextResponse.json(
          {
            error: {
              code: 'API_VERSION_TOO_OLD',
              message: `This endpoint requires API version ${options.minVersion} or higher. Current version: ${version}`,
            },
          },
          { status: 400 },
        );
      }
    }

    // 检查最高版本限制
    if (options?.maxVersion) {
      const versionNum = parseInt(version.replace('v', ''));
      const maxVersionNum = parseInt(options.maxVersion.replace('v', ''));
      if (versionNum > maxVersionNum) {
        return NextResponse.json(
          {
            error: {
              code: 'API_VERSION_TOO_NEW',
              message: `This endpoint only supports up to API version ${options.maxVersion}. Current version: ${version}`,
            },
          },
          { status: 400 },
        );
      }
    }

    // 记录版本使用情况
    logger.debug('API version extracted', {
      version,
      path: request.url,
      deprecated: isDeprecated(version),
    });

    // 执行处理器
    const response = await handler(request, version);

    // 添加版本相关的响应头
    const versionHeaders = createVersionHeaders(version);
    Object.entries(versionHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  };
}

/**
 * 获取 API 版本信息
 */
export function getApiVersionInfo(): {
  versions: ApiVersionConfig[];
  defaultVersion: ApiVersion;
  latestVersion: ApiVersion;
} {
  const latestVersion = SUPPORTED_VERSIONS[SUPPORTED_VERSIONS.length - 1];
  if (!latestVersion) {
    throw new Error('No API versions configured');
  }
  return {
    versions: Object.values(API_VERSION_CONFIG),
    defaultVersion: DEFAULT_API_VERSION,
    latestVersion,
  };
}

/**
 * 生成版本化的 API 路径
 */
export function generateApiPath(version: ApiVersion, path: string): string {
  const config = API_VERSION_CONFIG[version];
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${config.basePath}${cleanPath}`;
}

/**
 * 版本特性检查
 * 检查指定版本是否支持某个特性
 */
export function supportsFeature(version: ApiVersion, feature: string): boolean {
  const config = API_VERSION_CONFIG[version];
  return config.features.includes(feature);
}
