/**
 * Protocol Health Mock Data
 *
 * 固定协议健康数据 - 基于真实场景合理设定
 * 用于开发和演示环境
 */

export interface ProtocolHealthData {
  uptime: number;
  latency: number;
  accuracy: number;
  latencyColor: 'green' | 'yellow' | 'red';
}

/**
 * 协议健康度模拟数据
 * 数据基于各协议的真实性能特征设定
 */
export const PROTOCOL_HEALTH_MOCK: Record<string, ProtocolHealthData> = {
  Chainlink: {
    uptime: 99.98,
    latency: 450,
    accuracy: 99.7,
    latencyColor: 'green',
  },
  'Pyth Network': {
    uptime: 99.95,
    latency: 280,
    accuracy: 99.5,
    latencyColor: 'green',
  },
  RedStone: {
    uptime: 99.85,
    latency: 520,
    accuracy: 99.1,
    latencyColor: 'green',
  },
  UMA: {
    uptime: 99.9,
    latency: 600,
    accuracy: 99.2,
    latencyColor: 'green',
  },
};

/**
 * 协议列表
 */
export const PROTOCOL_LIST = ['Chainlink', 'Pyth Network', 'RedStone', 'UMA'];

/**
 * 获取协议健康数据
 * @param protocol 协议名称
 * @returns 协议健康数据，如果不存在返回 null
 */
export function getProtocolHealth(protocol: string): ProtocolHealthData | null {
  return PROTOCOL_HEALTH_MOCK[protocol] ?? null;
}
