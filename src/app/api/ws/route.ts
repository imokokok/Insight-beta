/**
 * WebSocket API Route
 *
 * WebSocket 连接端点
 * - 处理 WebSocket 升级请求
 * - 管理客户端连接
 */

import { type NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { startWebSocketServer, getWebSocketServerStats } from '@/server/websocket/server';

// 确保服务器已启动
let serverStarted = false;

function ensureServerStarted() {
  if (!serverStarted) {
    startWebSocketServer();
    serverStarted = true;
  }
}

/**
 * 生成客户端 ID
 */
function generateClientId(): string {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * WebSocket 升级处理
 */
export async function GET(request: NextRequest) {
  // 检查是否是 WebSocket 升级请求
  const upgrade = request.headers.get('upgrade');
  if (upgrade !== 'websocket') {
    // 返回服务器状态
    return Response.json({
      status: 'ok',
      websocket: getWebSocketServerStats(),
      message: 'WebSocket endpoint. Please upgrade connection.',
    });
  }

  try {
    // 确保服务器已启动
    ensureServerStarted();

    // 生成客户端 ID
    const clientId = generateClientId();

    logger.info(`WebSocket upgrade request from ${clientId}`);

    // 注意：Next.js 目前不直接支持 WebSocket 升级
    // 这里返回一个特殊的响应头，让前端知道应该连接哪个端口
    return new Response('WebSocket upgrade required', {
      status: 426,
      headers: {
        Upgrade: 'websocket',
        'X-Client-ID': clientId,
        'X-WebSocket-Port': process.env.WS_PORT || '3001',
      },
    });
  } catch (error) {
    logger.error('WebSocket upgrade failed', { error });
    return Response.json({ error: 'WebSocket upgrade failed' }, { status: 500 });
  }
}

/**
 * 获取 WebSocket 状态
 */
export async function POST() {
  ensureServerStarted();

  return Response.json({
    status: 'ok',
    websocket: getWebSocketServerStats(),
  });
}
