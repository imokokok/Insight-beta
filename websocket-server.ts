/**
 * Standalone WebSocket Server (Optimized)
 *
 * 独立的 WebSocket 服务器
 * - 运行在单独端口 (默认 3001)
 * - 支持 Next.js 应用外独立运行
 * - 生产环境建议使用
 *
 * 优化点：
 * 1. 使用 WebSocketManager 进行连接管理
 * 2. 最大连接数限制
 * 3. 心跳检测机制
 * 4. 消息限流
 * 5. 优雅关闭处理
 */

import { WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';
import { logger } from './src/lib/logger';
import { wsManager, type ExtendedWebSocket } from './src/server/websocket/WebSocketManager';
import { metrics, startMemoryMetrics } from './src/lib/monitoring/metrics';

const PORT = parseInt(process.env.WS_PORT || '3001', 10);
const HOST = process.env.WS_HOST || '0.0.0.0';

// ============================================================================
// 认证配置
// ============================================================================

const ALLOWED_ORIGINS = process.env.WS_ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'https://localhost:3000',
];

const API_KEY = process.env.WS_API_KEY;

/**
 * 验证 WebSocket 连接请求
 */
function verifyClient(info: { origin: string; secure: boolean; req: IncomingMessage }): boolean {
  const { origin, req } = info;

  // 1. 验证 Origin
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    logger.warn(`WebSocket connection rejected: invalid origin`, { origin });
    return false;
  }

  // 2. 验证 API Key（如果配置了）
  if (API_KEY) {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const providedKey = url.searchParams.get('apiKey');
    if (providedKey !== API_KEY) {
      logger.warn(`WebSocket connection rejected: invalid API key`, {
        origin,
        ip: req.socket.remoteAddress,
      });
      return false;
    }
  }

  // 3. 速率限制检查（基于 IP）
  const clientIp = req.socket.remoteAddress;
  if (clientIp && !checkConnectionRateLimit(clientIp)) {
    logger.warn(`WebSocket connection rejected: rate limit exceeded`, {
      origin,
      ip: clientIp,
    });
    return false;
  }

  logger.debug(`WebSocket connection verified`, { origin, ip: clientIp });
  return true;
}

// 简单的 IP 速率限制
const connectionAttempts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 10; // 每窗口最大连接数
const RATE_LIMIT_WINDOW = 60000; // 1 分钟窗口

function checkConnectionRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = connectionAttempts.get(ip);

  if (!record || now > record.resetTime) {
    connectionAttempts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  record.count++;
  return true;
}

// ============================================================================
// 创建 WebSocket 服务器
// ============================================================================

const wss = new WebSocketServer({
  port: PORT,
  host: HOST,
  verifyClient,
});

// ============================================================================
// 连接处理
// ============================================================================

wss.on('listening', () => {
  logger.info(`WebSocket server listening on ws://${HOST}:${PORT}`);

  // 启动内存指标收集
  const stopMemoryMetrics = startMemoryMetrics(60000);

  // 优雅关闭处理
  process.on('SIGTERM', () => gracefulShutdown(stopMemoryMetrics));
  process.on('SIGINT', () => gracefulShutdown(stopMemoryMetrics));
});

wss.on('connection', (ws, req) => {
  const clientId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const clientIp = req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'];

  // 使用 WebSocketManager 注册连接
  const extendedWs = wsManager.registerConnection(ws, clientId, clientIp, userAgent);

  if (!extendedWs) {
    // 连接被拒绝（如达到最大连接数）
    return;
  }

  // 发送欢迎消息
  wsManager.sendToClient(clientId, {
    type: 'connected',
    clientId,
    message: 'Connected to Oracle Monitor WebSocket server',
    serverTime: new Date().toISOString(),
    stats: wsManager.getStats(),
  });

  // 设置消息处理器
  setupMessageHandler(extendedWs);
});

// ============================================================================
// 消息处理
// ============================================================================

function setupMessageHandler(ws: ExtendedWebSocket): void {
  ws.on('message', (data) => {
    // 检查速率限制
    if (!wsManager.checkRateLimit(ws.clientId)) {
      wsManager.sendToClient(ws.clientId, {
        type: 'error',
        message: 'Rate limit exceeded. Please slow down.',
      });
      return;
    }

    try {
      const message = JSON.parse(data.toString());
      handleMessage(ws, message);
    } catch (error) {
      logger.error('Failed to parse WebSocket message', {
        clientId: ws.clientId,
        error: error instanceof Error ? error.message : String(error),
      });

      wsManager.sendToClient(ws.clientId, {
        type: 'error',
        message: 'Invalid JSON message',
      });
    }
  });
}

function handleMessage(ws: ExtendedWebSocket, message: unknown): void {
  if (typeof message !== 'object' || message === null) {
    wsManager.sendToClient(ws.clientId, {
      type: 'error',
      message: 'Message must be an object',
    });
    return;
  }

  const { type, payload } = message as { type: string; payload?: Record<string, unknown> };

  logger.debug('WebSocket message received', {
    clientId: ws.clientId,
    type,
    payload,
  });

  switch (type) {
    case 'subscribe':
      handleSubscribe(ws, payload);
      break;

    case 'unsubscribe':
      handleUnsubscribe(ws, payload);
      break;

    case 'ping':
      wsManager.sendToClient(ws.clientId, {
        type: 'pong',
        timestamp: Date.now(),
      });
      break;

    case 'getStats':
      wsManager.sendToClient(ws.clientId, {
        type: 'stats',
        data: wsManager.getStats(),
      });
      break;

    case 'getSubscriptions':
      wsManager.sendToClient(ws.clientId, {
        type: 'subscriptions',
        data: wsManager.getSubscriptions(ws.clientId),
      });
      break;

    default:
      wsManager.sendToClient(ws.clientId, {
        type: 'error',
        message: `Unknown message type: ${type}`,
      });
  }
}

function handleSubscribe(ws: ExtendedWebSocket, payload?: Record<string, unknown>): void {
  const channel = payload?.channel as string;

  if (!channel) {
    wsManager.sendToClient(ws.clientId, {
      type: 'error',
      message: 'Channel is required for subscription',
    });
    return;
  }

  const success = wsManager.subscribe(ws.clientId, channel);

  wsManager.sendToClient(ws.clientId, {
    type: 'subscribed',
    channel,
    success,
    subscriptions: wsManager.getSubscriptions(ws.clientId),
  });

  logger.info('Client subscribed to channel', {
    clientId: ws.clientId,
    channel,
  });
}

function handleUnsubscribe(ws: ExtendedWebSocket, payload?: Record<string, unknown>): void {
  const channel = payload?.channel as string;

  if (!channel) {
    wsManager.sendToClient(ws.clientId, {
      type: 'error',
      message: 'Channel is required for unsubscription',
    });
    return;
  }

  const success = wsManager.unsubscribe(ws.clientId, channel);

  wsManager.sendToClient(ws.clientId, {
    type: 'unsubscribed',
    channel,
    success,
    subscriptions: wsManager.getSubscriptions(ws.clientId),
  });
}

// ============================================================================
// 错误处理
// ============================================================================

wss.on('error', (error) => {
  logger.error('WebSocket server error', { error });
  metrics.recordWebSocketConnection('error');
});

wss.on('close', () => {
  logger.info('WebSocket server closed');
  wsManager.destroy();
});

// ============================================================================
// 优雅关闭
// ============================================================================

function gracefulShutdown(stopMemoryMetrics?: () => void): void {
  logger.info('Shutdown signal received, closing WebSocket server gracefully');

  // 停止内存指标收集
  stopMemoryMetrics?.();

  // 销毁 WebSocket 管理器（会关闭所有连接）
  wsManager.destroy();

  // 关闭服务器
  wss.close(() => {
    logger.info('WebSocket server closed gracefully');
    process.exit(0);
  });

  // 强制关闭超时
  setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 30000);
}

// ============================================================================
// 启动日志
// ============================================================================

logger.info('Starting optimized WebSocket server...', {
  port: PORT,
  host: HOST,
  maxConnections: 1000,
  heartbeatInterval: 30000,
});
