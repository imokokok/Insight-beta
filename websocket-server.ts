/**
 * Standalone WebSocket Server
 *
 * 独立的 WebSocket 服务器
 * - 运行在单独端口 (默认 3001)
 * - 支持 Next.js 应用外独立运行
 * - 生产环境建议使用
 */

import { WebSocketServer } from 'ws';
import { logger } from './src/lib/logger';
import {
  startWebSocketServer,
  stopWebSocketServer,
  handleWebSocketConnection,
} from './src/server/websocket/server';

const PORT = parseInt(process.env.WS_PORT || '3001', 10);
const HOST = process.env.WS_HOST || '0.0.0.0';

// 创建 WebSocket 服务器
const wss = new WebSocketServer({
  port: PORT,
  host: HOST,
  // 允许跨域
  verifyClient: (info) => {
    // 可以在这里添加认证逻辑
    logger.debug(`WebSocket connection attempt from ${info.origin}`);
    return true;
  },
});

// 启动服务器
wss.on('listening', () => {
  logger.info(`WebSocket server listening on ws://${HOST}:${PORT}`);
  startWebSocketServer();
});

// 处理连接
wss.on('connection', (ws, req) => {
  const clientId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const clientIp = req.socket.remoteAddress || 'unknown';

  logger.info(`WebSocket client connected: ${clientId} from ${clientIp}`);

  // 处理连接
  handleWebSocketConnection(
    ws as unknown as import('./src/server/websocket/priceStream').ExtendedWebSocket,
    clientId,
  );

  // 发送欢迎消息
  ws.send(
    JSON.stringify({
      type: 'connected',
      clientId,
      message: 'Connected to Oracle Monitor WebSocket server',
    }),
  );
});

// 错误处理
wss.on('error', (error) => {
  logger.error('WebSocket server error', { error });
});

// 关闭处理
wss.on('close', () => {
  logger.info('WebSocket server closed');
  stopWebSocketServer();
});

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, closing WebSocket server');
  wss.close(() => {
    stopWebSocketServer();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, closing WebSocket server');
  wss.close(() => {
    stopWebSocketServer();
    process.exit(0);
  });
});

logger.info('Starting standalone WebSocket server...');
