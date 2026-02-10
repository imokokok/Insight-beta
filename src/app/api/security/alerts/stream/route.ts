import { NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/supabase/server';

interface PostgresChangePayload {
  new: {
    id: string;
    protocol: string;
    symbol: string;
    chain: string;
    feed_key: string;
    type: string;
    severity: string;
    confidence_score: number;
    detected_at: string;
    evidence: unknown;
    suspicious_transactions: unknown;
    related_blocks: number[];
    price_impact: number | null;
    financial_impact_usd: number | null;
    affected_addresses: string[];
    status: string;
  };
}

interface StreamController {
  enqueue(chunk: Uint8Array): void;
  close(): void;
  error(error: Error): void;
  _cleanup?: () => void;
}

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller: StreamController) {
      const sendEvent = (data: unknown) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      sendEvent({ type: 'connected', timestamp: Date.now() });

      const supabase = supabaseAdmin;

      const subscription = supabase
        .channel('manipulation_detections')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'manipulation_detections',
          },
          (payload: PostgresChangePayload) => {
            const detection = {
              id: payload.new.id,
              protocol: payload.new.protocol,
              symbol: payload.new.symbol,
              chain: payload.new.chain,
              feedKey: payload.new.feed_key,
              type: payload.new.type,
              severity: payload.new.severity,
              confidenceScore: payload.new.confidence_score,
              detectedAt: new Date(payload.new.detected_at).getTime(),
              evidence: payload.new.evidence,
              suspiciousTransactions: payload.new.suspicious_transactions,
              relatedBlocks: payload.new.related_blocks,
              priceImpact: payload.new.price_impact,
              financialImpactUsd: payload.new.financial_impact_usd,
              affectedAddresses: payload.new.affected_addresses,
              status: payload.new.status,
            };

            sendEvent({ type: 'detection', detection });
          },
        )
        .subscribe();

      const heartbeat = setInterval(() => {
        sendEvent({ type: 'heartbeat', timestamp: Date.now() });
      }, 30000);

      const cleanup = () => {
        clearInterval(heartbeat);
        subscription.unsubscribe();
        controller.close();
      };

      controller._cleanup = cleanup;
    },
    cancel(controller: StreamController) {
      if (controller._cleanup) {
        controller._cleanup();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
