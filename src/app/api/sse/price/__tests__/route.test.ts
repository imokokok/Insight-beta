import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

import { GET } from '../route';

vi.mock('@/features/oracle/services/realtime', () => ({
  realtimePriceService: {
    listenerCount: vi.fn(() => 0),
    start: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  },
}));

vi.mock('@/shared/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('/api/sse/price', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET', () => {
    it('should return 400 for invalid symbols', async () => {
      const request = new NextRequest(
        new URL('http://localhost/api/sse/price?symbols=INVALID'),
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid symbols');
    });

    it('should return 400 when too many symbols requested', async () => {
      const symbols = Array(15)
        .fill('ETH/USD')
        .join(',');
      const request = new NextRequest(
        new URL(`http://localhost/api/sse/price?symbols=${symbols}`),
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Too many symbols');
    });

    it('should use default symbol when no symbols provided', async () => {
      const request = new NextRequest(
        new URL('http://localhost/api/sse/price'),
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    });

    it('should return correct headers for SSE', async () => {
      const request = new NextRequest(
        new URL('http://localhost/api/sse/price?symbols=ETH/USD'),
      );

      const response = await GET(request);

      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
      expect(response.headers.get('Cache-Control')).toBe('no-cache');
      expect(response.headers.get('Connection')).toBe('keep-alive');
    });

    it('should return rate limit headers', async () => {
      const request = new NextRequest(
        new URL('http://localhost/api/sse/price?symbols=ETH/USD'),
        {
          headers: {
            'x-forwarded-for': '192.168.1.1',
          },
        },
      );

      const response = await GET(request);

      expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
    });
  });
});
