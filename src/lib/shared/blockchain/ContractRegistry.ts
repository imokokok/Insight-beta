/**
 * ContractRegistry - 合约地址注册表
 *
 * 统一管理各链上的合约地址，支持：
 * - 按链注册/查询合约地址
 * - 获取支持的链列表
 * - 批量注册
 */

import type { SupportedChain } from '@/lib/types/unifiedOracleTypes';

import type { Address } from 'viem';

export class ContractRegistry {
  private registry: Map<SupportedChain, Address> = new Map();

  /**
   * 注册合约地址
   */
  register(chain: SupportedChain, address: Address | undefined): void {
    if (address) {
      this.registry.set(chain, address);
    }
  }

  /**
   * 批量注册
   */
  registerAll(entries: Record<SupportedChain, Address | undefined>): void {
    for (const [chain, address] of Object.entries(entries)) {
      this.register(chain as SupportedChain, address);
    }
  }

  /**
   * 获取合约地址
   */
  getAddress(chain: SupportedChain): Address | undefined {
    return this.registry.get(chain);
  }

  /**
   * 获取所有支持的链
   */
  getSupportedChains(): SupportedChain[] {
    return Array.from(this.registry.keys());
  }

  /**
   * 检查链是否支持
   */
  isSupported(chain: SupportedChain): boolean {
    return this.registry.has(chain);
  }

  /**
   * 获取注册数量
   */
  get size(): number {
    return this.registry.size;
  }
}

/**
 * 创建合约注册表的工厂函数
 */
export function createContractRegistry(
  entries?: Record<SupportedChain, Address | undefined>,
): ContractRegistry {
  const registry = new ContractRegistry();
  if (entries) {
    registry.registerAll(entries);
  }
  return registry;
}
