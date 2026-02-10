/**
 * WebSocket Price API Route
 *
 * P0 优化：WebSocket 实时价格推送服务
 * - 集成 RealtimePriceService
 * - 支持多客户端订阅
 * - 自动心跳保活
 */

import type { NextRequest } from 'next/server';

import { logger } from '@/lib/logger';
import { realtimePriceService } from '@/server/oracle/realtime';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId') || `client-${Date.now()}`;
  const symbolsParam = searchParams.get('symbols');
  const symbols = symbolsParam ? symbolsParam.split(',') : ['ETH/USD', 'BTC/USD'];

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

        logger.info('WebSocket client connected', { clientId, symbols });

        // 心跳定时器
        const heartbeat = setInterval(() => {
          const heartbeatMsg = {
            type: 'heartbeat',
            timestamp: Date.now(),
          };
          controller.enqueue(`data: ${JSON.stringify(heartbeatMsg)}\n\n`);
        }, 30000);

        // 清理函数
        request.signal.addEventListener('abort', () => {
          clearInterval(heartbeat);
          realtimePriceService.off('priceUpdate', handlePriceUpdate);
          realtimePriceService.unsubscribe(clientId);
          logger.info('WebSocket client disconnected', { clientId });
        });
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
