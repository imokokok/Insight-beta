import type { NextRequest } from 'next/server';
import { handleApi } from '@/server/apiResponse';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return handleApi(request, async () => {
    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get('instanceId') || undefined;

    logger.info('SSE connection initiated', { instanceId });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: unknown) => {
          const event = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(event));
        };

        const sendHeartbeat = () => {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        };

        let heartbeatInterval: NodeJS.Timeout | null = null;

        try {
          sendEvent({
            type: 'connected',
            data: { message: 'Realtime connection established' },
            timestamp: new Date().toISOString(),
            instanceId,
          });

          heartbeatInterval = setInterval(sendHeartbeat, 30000);

          const eventBus = getEventBus();
          const unsubscribe = eventBus.subscribe((event: unknown) => {
            const typedEvent = event as { instanceId?: string };
            if (!instanceId || typedEvent.instanceId === instanceId) {
              sendEvent(event);
            }
          });

          request.signal.addEventListener('abort', () => {
            if (heartbeatInterval) clearInterval(heartbeatInterval);
            unsubscribe();
            controller.close();
            logger.info('SSE connection closed', { instanceId });
          });
        } catch (error) {
          logger.error('SSE stream error', { error });
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  });
}

type RealtimeEventHandler = (event: unknown) => void;

class EventBus {
  private subscribers: Set<RealtimeEventHandler> = new Set();

  subscribe(handler: RealtimeEventHandler): () => void {
    this.subscribers.add(handler);
    return () => {
      this.subscribers.delete(handler);
    };
  }

  publish(event: unknown): void {
    this.subscribers.forEach((handler) => {
      try {
        handler(event);
      } catch (error) {
        logger.error('Error in event handler', { error });
      }
    });
  }
}

let eventBus: EventBus | null = null;

function getEventBus(): EventBus {
  if (!eventBus) {
    eventBus = new EventBus();
  }
  return eventBus;
}

// publishRealtimeEvent reserved for future use
// function publishRealtimeEvent(event: unknown): void {
//   const bus = getEventBus();
//   bus.publish(event);
// }
