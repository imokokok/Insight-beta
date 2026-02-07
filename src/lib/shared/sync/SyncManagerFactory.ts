/**
 * SyncManagerFactory - 同步管理器工厂
 *
 * 提供统一的同步管理器创建方式，消除重复代码：
 * - 自动生成便捷函数（start/stop/cleanup）
 * - 统一的配置管理
 * - 单例模式支持
 */

import type { SupportedChain, OracleProtocol } from '@/lib/types/unifiedOracleTypes';
import { BaseSyncManager, type IOracleClient, type SyncConfig } from '@/server/oracle/sync/BaseSyncManager';

/**
 * 同步管理器配置
 */
export interface SyncManagerFactoryConfig {
  /** 协议标识 */
  protocol: OracleProtocol;
  /** 同步配置 */
  syncConfig?: Partial<SyncConfig>;
}

/**
 * 客户端工厂函数类型
 */
export type ClientFactory = (
  chain: SupportedChain,
  rpcUrl: string,
  protocolConfig?: Record<string, unknown>
) => IOracleClient;

/**
 * 价格符号提供者类型
 */
export type SymbolProvider = (chain: SupportedChain) => string[];

/**
 * 同步管理器便捷函数集合
 */
export interface SyncManagerExports {
  /** 启动同步 */
  startSync: (instanceId: string) => Promise<void>;
  /** 停止单个实例同步 */
  stopSync: (instanceId: string) => void;
  /** 停止所有同步 */
  stopAllSync: () => void;
  /** 清理旧数据 */
  cleanupData: () => Promise<void>;
  /** 管理器实例 */
  manager: BaseSyncManager;
}

/**
 * 同步管理器工厂
 */
export class SyncManagerFactory {
  /**
   * 创建同步管理器类
   */
  static createManagerClass(
    config: SyncManagerFactoryConfig,
    clientFactory: ClientFactory,
    symbolProvider: SymbolProvider
  ): new () => BaseSyncManager {
    const { protocol, syncConfig } = config;

    return class extends BaseSyncManager {
      protected readonly protocol = protocol;
      protected syncConfig = {
        defaultIntervalMs: 60000,
        batchSize: 100,
        maxConcurrency: 5,
        priceChangeThreshold: 0.001,
        dataRetentionDays: 90,
        ...syncConfig,
      };

      protected createClient(
        chain: SupportedChain,
        rpcUrl: string,
        protocolConfig?: Record<string, unknown>
      ): IOracleClient {
        return clientFactory(chain, rpcUrl, protocolConfig);
      }

      protected getAvailableSymbols(chain: SupportedChain): string[] {
        return symbolProvider(chain);
      }
    };
  }

  /**
   * 创建同步管理器并生成便捷函数
   */
  static create(
    config: SyncManagerFactoryConfig,
    clientFactory: ClientFactory,
    symbolProvider: SymbolProvider
  ): SyncManagerExports {
    const ManagerClass = this.createManagerClass(config, clientFactory, symbolProvider);
    const manager = new ManagerClass();

    return {
      startSync: (instanceId: string) => manager.startSync(instanceId),
      stopSync: (instanceId: string) => manager.stopSync(instanceId),
      stopAllSync: () => manager.stopAllSync(),
      cleanupData: () => manager.cleanupOldData(),
      manager,
    };
  }

  /**
   * 创建带单例的同步管理器
   */
  static createSingleton(
    config: SyncManagerFactoryConfig,
    clientFactory: ClientFactory,
    symbolProvider: SymbolProvider
  ): SyncManagerExports {
    const ManagerClass = this.createManagerClass(config, clientFactory, symbolProvider);
    
    // 单例模式
    let instance: BaseSyncManager | null = null;
    
    const getInstance = (): BaseSyncManager => {
      if (!instance) {
        instance = new ManagerClass();
      }
      return instance;
    };

    return {
      startSync: (instanceId: string) => getInstance().startSync(instanceId),
      stopSync: (instanceId: string) => getInstance().stopSync(instanceId),
      stopAllSync: () => getInstance().stopAllSync(),
      cleanupData: () => getInstance().cleanupOldData(),
      manager: getInstance(),
    };
  }
}

/**
 * 创建同步管理器的便捷函数
 */
export function createSyncManager(
  config: SyncManagerFactoryConfig,
  clientFactory: ClientFactory,
  symbolProvider: SymbolProvider
): SyncManagerExports {
  return SyncManagerFactory.create(config, clientFactory, symbolProvider);
}

/**
 * 创建单例同步管理器的便捷函数
 */
export function createSingletonSyncManager(
  config: SyncManagerFactoryConfig,
  clientFactory: ClientFactory,
  symbolProvider: SymbolProvider
): SyncManagerExports {
  return SyncManagerFactory.createSingleton(config, clientFactory, symbolProvider);
}
