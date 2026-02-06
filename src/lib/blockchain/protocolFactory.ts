/**
 * Protocol Factory - 协议工厂模式
 *
 * 统一接口创建和管理各种预言机协议客户端
 */

import type { OracleProtocol, PriceFeed } from '@/lib/types';
import { PROTOCOL_DISPLAY_NAMES, PROTOCOL_DESCRIPTIONS } from '@/lib/types/oracle/protocol';

// ============================================================================
// 统一客户端接口
// ============================================================================

export interface IOracleProtocolClient {
  // 通用方法
  getPrice(symbol: string): Promise<PriceFeed>;
  getMultiplePrices(symbols: string[]): Promise<PriceFeed[]>;
  healthCheck(): Promise<{ healthy: boolean; latency: number }>;
  getCapabilities(): ProtocolCapabilities;

  // 可选方法（根据协议能力）
  createAssertion?(params: CreateAssertionParams): Promise<string>;
  disputeAssertion?(params: DisputeParams): Promise<string>;
  settleAssertion?(assertionId: string): Promise<boolean>;
}

export interface ProtocolCapabilities {
  priceFeeds: boolean;
  assertions: boolean;
  disputes: boolean;
  vrf: boolean;
  customData: boolean;
  staking?: boolean;
  governance?: boolean;
}

export interface CreateAssertionParams {
  identifier: string;
  description?: string;
  proposedValue?: string;
  bondAmount?: bigint;
  reward?: bigint;
}

export interface DisputeParams {
  assertionId: string;
  reason?: string;
  disputeBond?: bigint;
}

// ============================================================================
// 协议能力查询
// ============================================================================

export function getProtocolCapabilities(protocol: OracleProtocol): ProtocolCapabilities {
  switch (protocol) {
    case 'chainlink':
      return { priceFeeds: true, assertions: false, disputes: false, vrf: true, customData: true };
    case 'pyth':
      return {
        priceFeeds: true,
        assertions: false,
        disputes: false,
        vrf: false,
        customData: false,
      };
    case 'band':
      return { priceFeeds: true, assertions: false, disputes: false, vrf: false, customData: true };
    case 'api3':
      return { priceFeeds: true, assertions: false, disputes: false, vrf: false, customData: true };
    case 'redstone':
      return {
        priceFeeds: true,
        assertions: false,
        disputes: false,
        vrf: false,
        customData: false,
      };
    case 'switchboard':
      return { priceFeeds: true, assertions: false, disputes: false, vrf: true, customData: true };
    case 'flux':
      return {
        priceFeeds: true,
        assertions: false,
        disputes: false,
        vrf: false,
        customData: false,
      };
    case 'dia':
      return {
        priceFeeds: true,
        assertions: false,
        disputes: false,
        vrf: false,
        customData: false,
      };
    case 'uma':
      return {
        priceFeeds: true,
        assertions: true,
        disputes: true,
        vrf: false,
        customData: false,
        governance: true,
      };
    default:
      return {
        priceFeeds: false,
        assertions: false,
        disputes: false,
        vrf: false,
        customData: false,
      };
  }
}

export function supportsPriceFeeds(protocol: OracleProtocol): boolean {
  return getProtocolCapabilities(protocol).priceFeeds;
}

export function supportsAssertions(protocol: OracleProtocol): boolean {
  return getProtocolCapabilities(protocol).assertions;
}

export function supportsDisputes(protocol: OracleProtocol): boolean {
  return getProtocolCapabilities(protocol).disputes;
}

export function supportsVRF(protocol: OracleProtocol): boolean {
  return getProtocolCapabilities(protocol).vrf;
}

// ============================================================================
// 工厂类
// ============================================================================

export class OracleProtocolClientFactory {
  static getSupportedProtocols(): OracleProtocol[] {
    return ['chainlink', 'pyth', 'band', 'api3', 'redstone', 'switchboard', 'flux', 'dia'];
  }

  static isProtocolSupported(protocol: OracleProtocol): boolean {
    return this.getSupportedProtocols().includes(protocol);
  }
}

// ============================================================================
// 便捷函数
// ============================================================================

const PROTOCOL_ICONS: Record<OracleProtocol, string> = {
  uma: '⚖️',
  chainlink: '🔗',
  pyth: '🐍',
  band: '🎸',
  api3: '📡',
  redstone: '💎',
  switchboard: '🎛️',
  flux: '⚡',
  dia: '📊',
};

export function getProtocolDisplayInfo(protocol: OracleProtocol) {
  return {
    name: PROTOCOL_DISPLAY_NAMES[protocol],
    description: PROTOCOL_DESCRIPTIONS[protocol],
    icon: PROTOCOL_ICONS[protocol],
    capabilities: getProtocolCapabilities(protocol),
  };
}
