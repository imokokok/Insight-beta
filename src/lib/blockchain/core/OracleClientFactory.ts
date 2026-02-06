/**
 * Oracle Client Factory - 预言机客户端工厂
 *
 * 统一管理所有预言机客户端的创建和生命周期
 */

import type { OracleProtocol, SupportedChain } from '@/lib/types/unifiedOracleTypes';

import type { BaseOracleClient } from './BaseOracleClient';
import type { IOracleClient, OracleClientConfig } from './types';

// ============================================================================
// 客户端注册表类型
// ============================================================================

type ClientConstructor = new (config: OracleClientConfig) => BaseOracleClient;

interface RegisteredClient {
  constructor: ClientConstructor;
  supportedChains: SupportedChain[];
}

// ============================================================================
// 工厂类
// ============================================================================

export class OracleClientFactory {
  private static instance: OracleClientFactory;
  private clients: Map<string, IOracleClient> = new Map();
  private registry: Map<OracleProtocol, RegisteredClient> = new Map();

  private constructor() {}

  static getInstance(): OracleClientFactory {
    if (!OracleClientFactory.instance) {
      OracleClientFactory.instance = new OracleClientFactory();
    }
    return OracleClientFactory.instance;
  }

  /**
   * 注册客户端类型
   */
  register(
    protocol: OracleProtocol,
    constructor: ClientConstructor,
    supportedChains: SupportedChain[],
  ): void {
    this.registry.set(protocol, { constructor, supportedChains });
  }

  /**
   * 创建客户端实例
   */
  create(config: OracleClientConfig): IOracleClient {
    const { protocol, chain } = config;
    const registered = this.registry.get(protocol);

    if (!registered) {
      throw new Error(
        `Protocol "${protocol}" is not registered. ` +
          `Available protocols: ${Array.from(this.registry.keys()).join(', ')}`,
      );
    }

    if (!registered.supportedChains.includes(chain)) {
      throw new Error(
        `Chain "${chain}" is not supported by protocol "${protocol}". ` +
          `Supported chains: ${registered.supportedChains.join(', ')}`,
      );
    }

    const client = new registered.constructor(config);
    const key = this.getClientKey(protocol, chain);
    this.clients.set(key, client);

    return client;
  }

  /**
   * 获取已创建的客户端
   */
  get(protocol: OracleProtocol, chain: SupportedChain): IOracleClient | undefined {
    const key = this.getClientKey(protocol, chain);
    return this.clients.get(key);
  }

  /**
   * 获取或创建客户端
   */
  getOrCreate(config: OracleClientConfig): IOracleClient {
    const { protocol, chain } = config;
    const existing = this.get(protocol, chain);

    if (existing) {
      return existing;
    }

    return this.create(config);
  }

  /**
   * 销毁客户端
   */
  async destroy(protocol: OracleProtocol, chain: SupportedChain): Promise<void> {
    const key = this.getClientKey(protocol, chain);
    const client = this.clients.get(key);

    if (client) {
      await client.destroy?.();
      this.clients.delete(key);
    }
  }

  /**
   * 销毁所有客户端
   */
  async destroyAll(): Promise<void> {
    const destroyPromises = Array.from(this.clients.values()).map((client) => client.destroy?.());
    await Promise.all(destroyPromises);
    this.clients.clear();
  }

  /**
   * 获取所有已注册的协议
   */
  getRegisteredProtocols(): OracleProtocol[] {
    return Array.from(this.registry.keys());
  }

  /**
   * 获取协议支持的链
   */
  getSupportedChains(protocol: OracleProtocol): SupportedChain[] {
    return this.registry.get(protocol)?.supportedChains ?? [];
  }

  /**
   * 检查协议是否已注册
   */
  isProtocolRegistered(protocol: OracleProtocol): boolean {
    return this.registry.has(protocol);
  }

  /**
   * 检查链是否被协议支持
   */
  isChainSupported(protocol: OracleProtocol, chain: SupportedChain): boolean {
    const registered = this.registry.get(protocol);
    return registered ? registered.supportedChains.includes(chain) : false;
  }

  /**
   * 获取所有活跃客户端
   */
  getActiveClients(): Array<{
    protocol: OracleProtocol;
    chain: SupportedChain;
    client: IOracleClient;
  }> {
    return Array.from(this.clients.entries()).map(([key, client]) => {
      const [protocol, chain] = key.split(':') as [OracleProtocol, SupportedChain];
      return { protocol, chain, client };
    });
  }

  /**
   * 对所有客户端执行健康检查
   */
  async healthCheckAll(): Promise<
    Array<{
      protocol: OracleProtocol;
      chain: SupportedChain;
      status: Awaited<ReturnType<IOracleClient['healthCheck']>>;
    }>
  > {
    const checks = await Promise.all(
      this.getActiveClients().map(async ({ protocol, chain, client }) => ({
        protocol,
        chain,
        status: await client.healthCheck(),
      })),
    );

    return checks;
  }

  private getClientKey(protocol: OracleProtocol, chain: SupportedChain): string {
    return `${protocol}:${chain}`;
  }
}

// ============================================================================
// 便捷导出
// ============================================================================

export const oracleClientFactory = OracleClientFactory.getInstance();
