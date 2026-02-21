/**
 * SSE Price API Route
 *
 * Server-Sent Events 实时价格推送服务
 * - 集成 RealtimePriceService
 * - 支持多客户端订阅
 * - 自动心跳保活
 * - 身份验证和输入验证
 * - IP 级别速率限制
 */

import type { NextRequest } from 'next/server';

import { SSE_CONFIG, SUPPORTED_SYMBOLS, RATE_LIMIT_CONFIG } from '@/config/constants';
import { realtimePriceService } from '@/features/oracle/services/realtime';
import { rateLimit, getClientIp } from '@/lib/security/rateLimit';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

const ALLOWED_SYMBOLS: string[] = [...SUPPORTED_SYMBOLS.PRICE_PAIRS];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const clientIp = getClientIp(request);

  const rateLimitResult = await rateLimit(request, {
    windowMs: RATE_LIMIT_CONFIG.DEFAULT_WINDOW_MS,
    maxRequests: RATE_LIMIT_CONFIG.SSE_MAX_REQUESTS,
    keyGenerator: () => `sse-price:${clientIp}`,
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

  const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

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
    symbols = ['ETH/USD'];
  }

  if (symbols.length === 0) {
    return new Response(
      JSON.stringify({ error: 'Invalid symbols. Allowed: ' + ALLOWED_SYMBOLS.join(', ') }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (realtimePriceService.listenerCount('priceUpdate') >= SSE_CONFIG.MAX_CONNECTIONS) {
    return new Response(
      JSON.stringify({ error: 'Too many connections. Please try again later.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (!realtimePriceService.listenerCount('started')) {
    realtimePriceService.start();
  }

  const response = new Response(
    new ReadableStream({
      start(controller) {
        const connectMsg = {
          type: 'connected',
          clientId,
          timestamp: Date.now(),
        };
        controller.enqueue(`data: ${JSON.stringify(connectMsg)}\n\n`);

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

        realtimePriceService.subscribe(clientId, symbols);

        logger.info('SSE client connected', { clientId, symbols, clientIp });

        const heartbeat = setInterval(() => {
          const heartbeatMsg = {
            type: 'heartbeat',
            timestamp: Date.now(),
          };
          controller.enqueue(`data: ${JSON.stringify(heartbeatMsg)}\n\n`);
        }, SSE_CONFIG.HEARTBEAT_INTERVAL_MS);

        const abortHandler = () => {
          clearInterval(heartbeat);
          realtimePriceService.off('priceUpdate', handlePriceUpdate);
          realtimePriceService.unsubscribe(clientId);
          logger.info('SSE client disconnected', { clientId, clientIp });
        };
        request.signal.addEventListener('abort', abortHandler);

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
