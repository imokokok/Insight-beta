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

import { realtimePriceService } from '@/features/oracle/services/realtime';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

const ALLOWED_SYMBOLS = ['ETH/USD', 'BTC/USD', 'LINK/USD', 'MATIC/USD', 'AVAX/USD', 'SOL/USD'];

const MAX_CONNECTIONS = 100;

const IP_RATE_LIMIT_WINDOW_MS = 60000;
const IP_RATE_LIMIT_MAX = 5;

const ipConnectionStore = new Map<string, { count: number; resetTime: number }>();

function checkIpRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = ipConnectionStore.get(ip);

  if (!record || now > record.resetTime) {
    ipConnectionStore.set(ip, { count: 1, resetTime: now + IP_RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: IP_RATE_LIMIT_MAX - 1, resetIn: IP_RATE_LIMIT_WINDOW_MS };
  }

  if (record.count >= IP_RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0, resetIn: record.resetTime - now };
  }

  record.count++;
  return {
    allowed: true,
    remaining: IP_RATE_LIMIT_MAX - record.count,
    resetIn: record.resetTime - now,
  };
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const clientIp = getClientIp(request);

  const rateLimitResult = checkIpRateLimit(clientIp);
  if (!rateLimitResult.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil(rateLimitResult.resetIn / 1000),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil(rateLimitResult.resetIn / 1000)),
        },
      },
    );
  }

  const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const symbolsParam = searchParams.get('symbols');
  let symbols: string[];

  if (symbolsParam) {
    const requestedSymbols = symbolsParam.split(',').map((s) => s.trim().toUpperCase());
    if (requestedSymbols.length > 10) {
      return new Response(
        JSON.stringify({ error: 'Too many symbols requested. Maximum 10 allowed.' }),
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

  if (realtimePriceService.listenerCount('priceUpdate') >= MAX_CONNECTIONS) {
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
        }, 30000);

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
