/**
 * WebSocket Types - WebSocket 消息类型
 */

import type { PriceFeed } from '../domain/price';
import type { Alert } from '../domain/security';

// ============================================================================
// 客户端 -> 服务器
// ============================================================================

export type ClientMessage =
  | SubscribeMessage
  | UnsubscribeMessage
  | PingMessage
  | GetStatsMessage
  | GetSubscriptionsMessage;

export interface SubscribeMessage {
  type: 'subscribe';
  payload: {
    channel: string;
    params?: Record<string, unknown>;
  };
}

export interface UnsubscribeMessage {
  type: 'unsubscribe';
  payload: {
    channel: string;
  };
}

export interface PingMessage {
  type: 'ping';
}

export interface GetStatsMessage {
  type: 'getStats';
}

export interface GetSubscriptionsMessage {
  type: 'getSubscriptions';
}

// ============================================================================
// 服务器 -> 客户端
// ============================================================================

export type ServerMessage =
  | ConnectedMessage
  | SubscribedMessage
  | UnsubscribedMessage
  | PongMessage
  | StatsMessage
  | SubscriptionsMessage
  | PriceUpdateMessage
  | AlertMessage
  | ErrorMessage;

export interface ConnectedMessage {
  type: 'connected';
  clientId: string;
  message: string;
  serverTime: string;
  stats: WebSocketStats;
}

export interface SubscribedMessage {
  type: 'subscribed';
  channel: string;
  success: boolean;
  subscriptions: string[];
}

export interface UnsubscribedMessage {
  type: 'unsubscribed';
  channel: string;
  success: boolean;
  subscriptions: string[];
}

export interface PongMessage {
  type: 'pong';
  timestamp: number;
}

export interface StatsMessage {
  type: 'stats';
  data: WebSocketStats;
}

export interface SubscriptionsMessage {
  type: 'subscriptions';
  data: string[];
}

export interface PriceUpdateMessage {
  type: 'priceUpdate';
  channel: string;
  data: PriceFeed;
}

export interface AlertMessage {
  type: 'alert';
  channel: string;
  data: Alert;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
  code?: string;
}

// ============================================================================
// WebSocket 统计
// ============================================================================

export interface WebSocketStats {
  totalConnections: number;
  maxConnections: number;
  uptime: number;
  messagesReceived: number;
  messagesSent: number;
  subscriptions: Record<string, number>;
}

// ============================================================================
// 频道类型
// ============================================================================

export type WebSocketChannel =
  | `price:${string}`
  | `alerts:${string}`
  | 'system:health'
  | 'system:stats';

export interface ChannelParams {
  price: { symbol: string; protocols?: string[] };
  alerts: { severity?: string[]; protocols?: string[] };
  'system:health': Record<string, never>;
  'system:stats': Record<string, never>;
}
