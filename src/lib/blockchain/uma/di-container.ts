/**
 * UMA Optimistic Oracle - 依赖注入容器
 *
 * 提供默认的服务实现和依赖注入容器
 */

import { createPublicClient, http, type Chain, type PublicClient } from 'viem';
import { logger as appLogger } from '@/lib/logger';
import type { UMAOracleConfig } from './types';
import type {
  ILogger,
  IChainFactory,
  IPublicClientFactory,
  IIdentifierFormatter,
  IAncillaryDataFormatter,
  IOracleAddressResolver,
  IServiceContainer,
} from './interfaces';

// ============================================================================
// 默认实现
// ============================================================================

export class DefaultLogger implements ILogger {
  info(message: string, meta?: Record<string, unknown>): void {
    appLogger.info(message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    appLogger.warn(message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    appLogger.error(message, meta);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    appLogger.debug(message, meta);
  }
}

export class DefaultChainFactory implements IChainFactory {
  createChain(config: UMAOracleConfig): Chain {
    return {
      id: config.chainId,
      name: config.chainName,
      rpcUrls: {
        default: { http: [config.rpcUrl] },
      },
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
      },
      blockExplorers: {
        default: {
          name: 'Etherscan',
          url: 'https://etherscan.io',
        },
      },
    };
  }
}

export class DefaultPublicClientFactory implements IPublicClientFactory {
  createClient(chain: Chain, rpcUrl: string): PublicClient {
    return createPublicClient({
      chain,
      transport: http(rpcUrl, { timeout: 30_000 }),
    });
  }
}

export class DefaultIdentifierFormatter implements IIdentifierFormatter {
  format(identifier: string): `0x${string}` {
    // 简单的 UTF-8 编码
    const encoded = new TextEncoder().encode(identifier);
    const hex = Array.from(encoded)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return `0x${hex}` as `0x${string}`;
  }
}

export class DefaultAncillaryDataFormatter implements IAncillaryDataFormatter {
  format(data: string): `0x${string}` {
    if (data.startsWith('0x')) {
      return data as `0x${string}`;
    }
    const encoded = new TextEncoder().encode(data);
    const hex = Array.from(encoded)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return `0x${hex}` as `0x${string}`;
  }
}

export class DefaultAddressResolver implements IOracleAddressResolver {
  constructor(private config: UMAOracleConfig) {}

  getOOAddress(): `0x${string}` | null {
    return this.config.optimisticOracleV3Address || this.config.optimisticOracleV2Address || null;
  }

  getOOV3Address(): `0x${string}` | null {
    return this.config.optimisticOracleV3Address || null;
  }
}

// ============================================================================
// 依赖容器
// ============================================================================

export class ServiceContainer implements IServiceContainer {
  logger: ILogger;
  chainFactory: IChainFactory;
  publicClientFactory: IPublicClientFactory;
  identifierFormatter: IIdentifierFormatter;
  ancillaryDataFormatter: IAncillaryDataFormatter;
  addressResolver: IOracleAddressResolver;

  constructor(config: UMAOracleConfig, overrides?: Partial<IServiceContainer>) {
    this.logger = overrides?.logger ?? new DefaultLogger();
    this.chainFactory = overrides?.chainFactory ?? new DefaultChainFactory();
    this.publicClientFactory = overrides?.publicClientFactory ?? new DefaultPublicClientFactory();
    this.identifierFormatter = overrides?.identifierFormatter ?? new DefaultIdentifierFormatter();
    this.ancillaryDataFormatter =
      overrides?.ancillaryDataFormatter ?? new DefaultAncillaryDataFormatter();
    this.addressResolver = overrides?.addressResolver ?? new DefaultAddressResolver(config);
  }
}

// ============================================================================
// 容器工厂
// ============================================================================

export function createServiceContainer(
  config: UMAOracleConfig,
  overrides?: Partial<IServiceContainer>,
): IServiceContainer {
  return new ServiceContainer(config, overrides);
}
