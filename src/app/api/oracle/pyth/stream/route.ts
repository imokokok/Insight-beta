/**
 * SSE Pyth Price Stream API Route
 *
 * Server-Sent Events 实时 Pyth 价格推送服务
 * - 提供 Pyth 价格喂价的实时更新
 * - 支持多客户端订阅
 * - 自动心跳保活
 * - 速率限制和连接管理
 */

import type { NextRequest } from 'next/server';

import { SSE_CONFIG, RATE_LIMIT_CONFIG } from '@/config/constants';
import { getAvailablePythSymbols } from '@/config/pythPriceFeeds';
import { rateLimit, getClientIp } from '@/lib/security/rateLimit';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

const ALLOWED_SYMBOLS: string[] = getAvailablePythSymbols();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clientIp = getClientIp(request);

  // 速率限制检查
  const rateLimitResult = await rateLimit(request, {
    windowMs: RATE_LIMIT_CONFIG.DEFAULT_WINDOW_MS,
    maxRequests: RATE_LIMIT_CONFIG.SSE_MAX_REQUESTS,
    keyGenerator: () => `sse-pyth:${clientIp}`,
  });

  if (!rateLimitResult.allowed) {
    const retryAfter = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded',
          details: { retryAfter },
        },
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
        },
      },
    );
  }

  const clientId = `pyth-client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  // 解析请求的符号列表
  const symbolsParam = searchParams.get('symbols');
  let symbols: string[];

  if (symbolsParam) {
    const requestedSymbols = symbolsParam.split(',').map((s) => s.trim().toUpperCase());
    if (requestedSymbols.length > SSE_CONFIG.MAX_SYMBOLS_PER_REQUEST) {
      return new Response(
        JSON.stringify({
          error: `Too many symbols requested. Maximum ${SSE_CONFIG.MAX_SYMBOLS_PER_REQUEST} allowed.`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }
    symbols = requestedSymbols.filter((s) => ALLOWED_SYMBOLS.includes(s));
  } else {
    // 默认返回主流加密货币
    symbols = ['BTC', 'ETH', 'SOL'];
  }

  if (symbols.length === 0) {
    return new Response(
      JSON.stringify({ error: 'Invalid symbols. Allowed: ' + ALLOWED_SYMBOLS.slice(0, 20).join(', ') + '...' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // 创建 SSE 响应流
  const response = new Response(
    new ReadableStream({
      async start(controller) {
        // 发送连接成功消息
        const connectMsg = {
          type: 'connected',
          clientId,
          timestamp: Date.now(),
          symbols,
        };
        controller.enqueue(`data: ${JSON.stringify(connectMsg)}\n\n`);

        // 模拟价格更新（实际应该从 Pyth 获取）
        let updateCount = 0;
        const maxUpdates = 100; // 限制更新次数用于测试

        const sendPriceUpdate = async () => {
          if (updateCount >= maxUpdates) {
            controller.close();
            return;
          }

          try {
            // 模拟价格数据（实际应该调用 Pyth API）
            const priceUpdates = symbols.map((symbol) => {
              const basePrice = symbol === 'BTC' ? 67000 : symbol === 'ETH' ? 3500 : symbol.startsWith('XAU') ? 2000 : symbol.includes('/') ? 1.1 : 100;
              const volatility = 0.001; // 0.1% 波动
              const priceChange = basePrice * volatility * (Math.random() - 0.5);
              const newPrice = basePrice + priceChange;
              
              return {
                symbol,
                price: parseFloat(newPrice.toFixed(symbol.includes('/') && !symbol.startsWith('XAU') ? 6 : 2)),
                change: parseFloat(priceChange.toFixed(4)),
                changePercent: parseFloat(((priceChange / basePrice) * 100).toFixed(4)),
                timestamp: Date.now(),
                confidence: parseFloat((Math.random() * 0.5 + 0.5).toFixed(4)), // 0.5-1.0
              };
            });

            const message = {
              type: 'price_update',
              data: priceUpdates,
              timestamp: Date.now(),
              updateCount: ++updateCount,
            };
            
            controller.enqueue(`data: ${JSON.stringify(message)}\n\n`);
          } catch (error) {
            logger.error('Error sending Pyth price update', { error, clientId });
          }

          // 继续下一次更新
          setTimeout(sendPriceUpdate, 5000); // 5 秒更新一次
        };

        // 开始发送更新
        sendPriceUpdate();

        // 心跳机制
        const heartbeat = setInterval(() => {
          const heartbeatMsg = {
            type: 'heartbeat',
            timestamp: Date.now(),
          };
          controller.enqueue(`data: ${JSON.stringify(heartbeatMsg)}\n\n`);
        }, SSE_CONFIG.HEARTBEAT_INTERVAL_MS);

        // 清理函数
        const abortHandler = () => {
          clearInterval(heartbeat);
          logger.info('Pyth SSE client disconnected', { clientId, clientIp, updateCount });
        };
        
        request.signal.addEventListener('abort', abortHandler);

        logger.info('Pyth SSE client connected', { clientId, symbols, clientIp });

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
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
      },
    },
  );

  return response;
}
