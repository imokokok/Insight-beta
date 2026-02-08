/**
 * ContractRegistry 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ContractRegistry, createContractRegistry } from './ContractRegistry';
import type { SupportedChain } from '@/lib/types/unifiedOracleTypes';
import type { Address } from 'viem';

describe('ContractRegistry', () => {
  let registry: ContractRegistry;

  beforeEach(() => {
    registry = new ContractRegistry();
  });

  describe('register', () => {
    it('should register contract address', () => {
      const address: Address = '0x1234567890123456789012345678901234567890';
      registry.register('ethereum', address);

      expect(registry.getAddress('ethereum')).toBe(address);
    });

    it('should not register undefined address', () => {
      registry.register('ethereum', undefined);

      expect(registry.getAddress('ethereum')).toBeUndefined();
      expect(registry.size).toBe(0);
    });
  });

  describe('registerAll', () => {
    it('should register multiple addresses', () => {
      const addresses: Record<SupportedChain, Address | undefined> = {
        ethereum: '0x1234567890123456789012345678901234567890',
        polygon: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        arbitrum: undefined,
        optimism: undefined,
        base: undefined,
        avalanche: undefined,
        bsc: undefined,
        fantom: undefined,
        celo: undefined,
        gnosis: undefined,
        linea: undefined,
        scroll: undefined,
        mantle: undefined,
        mode: undefined,
        blast: undefined,
        solana: undefined,
        near: undefined,
        aptos: undefined,
        sui: undefined,
        polygonAmoy: undefined,
        sepolia: undefined,
        goerli: undefined,
        mumbai: undefined,
        local: undefined,
      };

      registry.registerAll(addresses);

      expect(registry.size).toBe(2);
      expect(registry.getAddress('ethereum')).toBe(addresses.ethereum);
      expect(registry.getAddress('polygon')).toBe(addresses.polygon);
    });
  });

  describe('getSupportedChains', () => {
    it('should return only chains with addresses', () => {
      registry.register('ethereum', '0x1234567890123456789012345678901234567890');
      registry.register('polygon', '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd');
      registry.register('arbitrum', undefined);

      const chains = registry.getSupportedChains();

      expect(chains).toContain('ethereum');
      expect(chains).toContain('polygon');
      expect(chains).not.toContain('arbitrum');
    });
  });

  describe('isSupported', () => {
    it('should return true for registered chain', () => {
      registry.register('ethereum', '0x1234567890123456789012345678901234567890');

      expect(registry.isSupported('ethereum')).toBe(true);
    });

    it('should return false for unregistered chain', () => {
      expect(registry.isSupported('ethereum')).toBe(false);
    });
  });

  describe('size', () => {
    it('should return correct size', () => {
      expect(registry.size).toBe(0);

      registry.register('ethereum', '0x1234567890123456789012345678901234567890');
      expect(registry.size).toBe(1);

      registry.register('polygon', '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd');
      expect(registry.size).toBe(2);
    });
  });
});

describe('createContractRegistry', () => {
  it('should create registry with initial entries', () => {
    const entries: Record<SupportedChain, Address | undefined> = {
      ethereum: '0x1234567890123456789012345678901234567890',
      polygon: undefined,
      arbitrum: undefined,
      optimism: undefined,
      base: undefined,
      avalanche: undefined,
      bsc: undefined,
      fantom: undefined,
      celo: undefined,
      gnosis: undefined,
      linea: undefined,
      scroll: undefined,
      mantle: undefined,
      mode: undefined,
      blast: undefined,
      solana: undefined,
      near: undefined,
      aptos: undefined,
      sui: undefined,
      polygonAmoy: undefined,
      sepolia: undefined,
      goerli: undefined,
      mumbai: undefined,
      local: undefined,
    };

    const registry = createContractRegistry(entries);

    expect(registry.size).toBe(1);
    expect(registry.getAddress('ethereum')).toBe(entries.ethereum);
  });

  it('should create empty registry when no entries provided', () => {
    const registry = createContractRegistry();

    expect(registry.size).toBe(0);
  });
});
