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
  'Band Protocol': {
    uptime: 99.87,
    latency: 620,
    accuracy: 98.9,
    latencyColor: 'yellow',
  },
  API3: {
    uptime: 99.92,
    latency: 380,
    accuracy: 99.3,
    latencyColor: 'green',
  },
  RedStone: {
    uptime: 99.85,
    latency: 520,
    accuracy: 99.1,
    latencyColor: 'green',
  },
  Flux: {
    uptime: 99.72,
    latency: 780,
    accuracy: 98.5,
    latencyColor: 'yellow',
  },
};

/**
 * 协议列表
 */
export const PROTOCOL_LIST = ['Chainlink', 'Pyth Network', 'Band Protocol', 'API3', 'RedStone', 'Flux'];

/**
 * 获取协议健康数据
 * @param protocol 协议名称
 * @returns 协议健康数据，如果不存在返回 null
 */
export function getProtocolHealth(protocol: string): ProtocolHealthData | null {
  return PROTOCOL_HEALTH_MOCK[protocol] ?? null;
}

/**
 * 获取所有协议的平均健康度
 */
export function getAverageHealth(): Pick<ProtocolHealthData, 'uptime' | 'latency' | 'accuracy'> {
  const protocols = Object.values(PROTOCOL_HEALTH_MOCK);
  const count = protocols.length;

  return {
    uptime: protocols.reduce((sum, p) => sum + p.uptime, 0) / count,
    latency: protocols.reduce((sum, p) => sum + p.latency, 0) / count,
    accuracy: protocols.reduce((sum, p) => sum + p.accuracy, 0) / count,
  };
}
