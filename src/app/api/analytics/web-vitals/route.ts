import { NextResponse } from 'next/server';
import { hasDatabase, query } from '@/server/db';
import { getMemoryStore } from '@/server/memoryBackend';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const webVitalsSchema = z.object({
  lcp: z.number().min(0).optional(),
  fid: z.number().min(0).optional(),
  cls: z.number().min(0).optional(),
  fcp: z.number().min(0).optional(),
  ttfb: z.number().min(0).optional(),
  inp: z.number().min(0).optional(),
  timestamp: z.string().datetime().optional(),
  url: z.string().url().optional(),
  userAgent: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = webVitalsSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid Web Vitals data', details: result.error.format() },
        { status: 400 },
      );
    }

    const data = result.data;

    // Log poor metrics
    const poorMetrics: string[] = [];
    if (data.lcp && data.lcp > 4000) poorMetrics.push(`LCP: ${data.lcp}ms`);
    if (data.fid && data.fid > 300) poorMetrics.push(`FID: ${data.fid}ms`);
    if (data.cls && data.cls > 0.25) poorMetrics.push(`CLS: ${data.cls}`);
    if (data.fcp && data.fcp > 3000) poorMetrics.push(`FCP: ${data.fcp}ms`);
    if (data.ttfb && data.ttfb > 1800) poorMetrics.push(`TTFB: ${data.ttfb}ms`);
    if (data.inp && data.inp > 500) poorMetrics.push(`INP: ${data.inp}ms`);

    if (poorMetrics.length > 0) {
      logger.warn('Poor Web Vitals detected', {
        metrics: poorMetrics,
        url: data.url,
        userAgent: data.userAgent,
      });

      // Create alert for consistently poor performance
      if (hasDatabase()) {
        try {
          await query(
            `
            INSERT INTO alerts (
              fingerprint, type, severity, title, message, 
              entity_type, entity_id, status, occurrences, 
              first_seen_at, last_seen_at, created_at, updated_at
            )
            VALUES (
              $1, $2, $3, $4, $5,
              $6, $7, 'Open', 1,
              NOW(), NOW(), NOW(), NOW()
            )
            ON CONFLICT (fingerprint) DO UPDATE SET
              severity = EXCLUDED.severity,
              title = EXCLUDED.title,
              message = EXCLUDED.message,
              occurrences = alerts.occurrences + 1,
              last_seen_at = NOW(),
              updated_at = NOW()
            `,
            [
              `web-vitals:poor:${new URL(data.url || 'http://localhost').pathname}`,
              'poor_web_vitals',
              'warning',
              'Poor Web Vitals Detected',
              `Poor metrics: ${poorMetrics.join(', ')}`,
              'page',
              data.url,
            ],
          );
        } catch (dbError) {
          logger.error('Failed to create Web Vitals alert', { error: dbError });
        }
      }
    }

    // Store metrics in memory for quick access
    const mem = getMemoryStore();
    const pagePath = data.url ? new URL(data.url).pathname : 'unknown';
    const key = `web-vitals:${pagePath}:${Date.now()}`;

    mem.metrics.set(key, {
      ...data,
      receivedAt: new Date().toISOString(),
    });

    // Keep only last 1000 metrics in memory
    const metricKeys = Array.from(mem.metrics.keys()).filter((k) => k.startsWith('web-vitals:'));
    if (metricKeys.length > 1000) {
      const sorted = metricKeys.sort();
      for (let i = 0; i < sorted.length - 1000; i++) {
        const keyToDelete = sorted[i];
        if (keyToDelete) {
          mem.metrics.delete(keyToDelete);
        }
      }
    }

    // Store in database if available
    if (hasDatabase()) {
      try {
        await query(
          `
          INSERT INTO web_vitals_metrics (
            lcp, fid, cls, fcp, ttfb, inp,
            page_path, user_agent, timestamp, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
          `,
          [
            data.lcp ?? null,
            data.fid ?? null,
            data.cls ?? null,
            data.fcp ?? null,
            data.ttfb ?? null,
            data.inp ?? null,
            pagePath,
            data.userAgent?.slice(0, 500) ?? null,
            data.timestamp ?? new Date().toISOString(),
          ],
        );
      } catch (dbError) {
        logger.error('Failed to store Web Vitals in database', { error: dbError });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to process Web Vitals', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pagePath = searchParams.get('path') || '/';
  const hours = parseInt(searchParams.get('hours') || '24', 10);

  try {
    if (!hasDatabase()) {
      // Return from memory
      const mem = getMemoryStore();
      const metrics: unknown[] = [];

      for (const [key, value] of mem.metrics.entries()) {
        if (key.includes(pagePath) || pagePath === '/') {
          metrics.push(value);
        }
      }

      return NextResponse.json({
        metrics: metrics.slice(-100),
        source: 'memory',
      });
    }

    // Query from database
    const result = await query(
      `
      SELECT 
        AVG(lcp) as avg_lcp,
        AVG(fid) as avg_fid,
        AVG(cls) as avg_cls,
        AVG(fcp) as avg_fcp,
        AVG(ttfb) as avg_ttfb,
        AVG(inp) as avg_inp,
        COUNT(*) as total_samples,
        COUNT(lcp) as lcp_samples,
        COUNT(fid) as fid_samples,
        COUNT(cls) as cls_samples
      FROM web_vitals_metrics
      WHERE page_path = $1 
        AND created_at > NOW() - INTERVAL '${Math.min(hours, 168)} hours'
      `,
      [pagePath],
    );

    const row = result.rows[0];

    return NextResponse.json({
      summary: {
        avgLcp: row?.avg_lcp ? Math.round(Number(row.avg_lcp)) : null,
        avgFid: row?.avg_fid ? Math.round(Number(row.avg_fid)) : null,
        avgCls: row?.avg_cls ? Number(row.avg_cls).toFixed(3) : null,
        avgFcp: row?.avg_fcp ? Math.round(Number(row.avg_fcp)) : null,
        avgTtfb: row?.avg_ttfb ? Math.round(Number(row.avg_ttfb)) : null,
        avgInp: row?.avg_inp ? Math.round(Number(row.avg_inp)) : null,
        totalSamples: Number(row?.total_samples || 0),
      },
      thresholds: {
        lcp: { good: 2500, poor: 4000 },
        fid: { good: 100, poor: 300 },
        cls: { good: 0.1, poor: 0.25 },
        fcp: { good: 1800, poor: 3000 },
        ttfb: { good: 800, poor: 1800 },
        inp: { good: 200, poor: 500 },
      },
      source: 'database',
    });
  } catch (error) {
    logger.error('Failed to fetch Web Vitals', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
