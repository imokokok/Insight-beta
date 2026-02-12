/**
 * Price Types - 价格数据类型定义
 */

import type { OracleProtocol, SupportedChain } from './unifiedOracleTypes';

/**
 * 价格数据
 */
export interface PriceData {
  symbol: string;
  price: number;
  timestamp: string;
  protocol?: OracleProtocol;
  chain?: SupportedChain;
  confidence?: number;
  source?: string;
}

/**
 * 价格更新消息
 */
export interface PriceUpdateMessage {
  type: 'price_update';
  data: PriceData;
}
