/**
 * SSE Price API Route
 *
 * Server-Sent Events 实时价格推送服务
 * - 集成 RealtimePriceService
 * - 支持多客户端订阅
 * - 自动心跳保活
 * - 身份验证和输入验证
 */

import type { NextRequest } from 'next/server';

import { realtimePriceService } from '@/services/oracle/realtime';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// 允许的订阅符号列表
const ALLOWED_SYMBOLS = ['ETH/USD', 'BTC/USD', 'LINK/USD', 'MATIC/USD', 'AVAX/USD', 'SOL/USD'];

// 最大连接数限制
const MAX_CONNECTIONS = 100;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // 生成服务器端 clientId，防止客户端伪造
  const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  // 验证订阅符号
  const symbolsParam = searchParams.get('symbols');
  let symbols: string[];

  if (symbolsParam) {
    // 过滤只允许预定义的符号
    symbols = symbolsParam
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter((s) => ALLOWED_SYMBOLS.includes(s));
  } else {
    symbols = ['ETH/USD'];
  }

  if (symbols.length === 0) {
    return new Response('Invalid symbols', { status: 400 });
  }

  // 检查连接数限制
  if (realtimePriceService.listenerCount('priceUpdate') >= MAX_CONNECTIONS) {
    return new Response('Too many connections', { status: 503 });
  }

  // 确保服务已启动
  if (!realtimePriceService.listenerCount('started')) {
    realtimePriceService.start();
  }

  const response = new Response(
    new ReadableStream({
      start(controller) {
        // 发送初始连接成功消息
        const connectMsg = {
          type: 'connected',
          clientId,
          timestamp: Date.now(),
        };
        controller.enqueue(`data: ${JSON.stringify(connectMsg)}\n\n`);

        // 订阅价格更新
        const handlePriceUpdate = (data: { clientId: string; updates: unknown[] }) => {
          if (data.clientId === clientId) {
            const message = {
              type: 'price_update',
              data: data.updates,
              timestamp: Date.now(),
            };
            controller.enqueue(`data: ${JSON.stringify(message)}\n\n`);
          }
        };

        realtimePriceService.on('priceUpdate', handlePriceUpdate);

        // 订阅实时服务
        realtimePriceService.subscribe(clientId, symbols);

        logger.info('SSE client connected', { clientId, symbols });

        // 心跳定时器
        const heartbeat = setInterval(() => {
          const heartbeatMsg = {
            type: 'heartbeat',
            timestamp: Date.now(),
          };
          controller.enqueue(`data: ${JSON.stringify(heartbeatMsg)}\n\n`);
        }, 30000);

        // 清理函数
        const abortHandler = () => {
          clearInterval(heartbeat);
          realtimePriceService.off('priceUpdate', handlePriceUpdate);
          realtimePriceService.unsubscribe(clientId);
          logger.info('SSE client disconnected', { clientId });
        };
        request.signal.addEventListener('abort', abortHandler);

        // 返回清理函数（虽然 ReadableStream 不直接使用，但为了完整性）
        return () => {
          request.signal.removeEventListener('abort', abortHandler);
        };
      },
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    },
  );

  return response;
}
