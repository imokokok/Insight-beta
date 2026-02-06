/**
 * WebSocket Server
 *
 * WebSocket 服务器入口
 * - 集成 PriceStreamManager
 * - 支持多房间订阅
 * - 心跳检测
 */

import { logger } from '@/lib/logger';

import { priceStreamManager, type ExtendedWebSocket } from './priceStream';

// WebSocket 服务器状态
let isRunning = false;

/**
 * 启动 WebSocket 服务器
 */
export function startWebSocketServer(): void {
  if (isRunning) {
    logger.warn('WebSocket server already running');
    return;
  }

  logger.info('Starting WebSocket server');

  // 启动价格流管理器
  priceStreamManager.start();

  isRunning = true;
  logger.info('WebSocket server started');
}

/**
 * 停止 WebSocket 服务器
 */
export function stopWebSocketServer(): void {
  if (!isRunning) return;

  logger.info('Stopping WebSocket server');

  // 停止价格流管理器
  priceStreamManager.stop();

  isRunning = false;
  logger.info('WebSocket server stopped');
}

/**
 * 处理新的 WebSocket 连接
 */
export function handleWebSocketConnection(ws: ExtendedWebSocket, clientId: string): void {
  if (!isRunning) {
    logger.warn('WebSocket server not running, rejecting connection');
    ws.close(1013, 'Server not ready');
    return;
  }

  logger.debug(`New WebSocket connection: ${clientId}`);
  priceStreamManager.addClient(clientId, ws);
}

/**
 * 获取服务器状态
 */
export function getWebSocketServerStats() {
  const streamStats = priceStreamManager.getStats();
  return {
    isRunning,
    totalClients: streamStats.totalClients,
    totalSubscriptions: streamStats.totalSubscriptions,
    messagesPerSecond: streamStats.messagesPerSecond,
    averageLatency: streamStats.averageLatency,
    uptime: streamStats.uptime,
  };
}
