import { WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';
import { logger } from './src/lib/logger';

const PORT = parseInt(process.env.WS_PORT || '3001', 10);
const HOST = process.env.WS_HOST || '0.0.0.0';

const ALLOWED_ORIGINS = process.env.WS_ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];

const API_KEY = process.env.WS_API_KEY;

const connectionAttempts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW = 60000;

const clients = new Map<
  string,
  {
    ws: unknown;
    subscriptions: Set<string>;
    lastMessageTime: number;
  }
>();

function checkConnectionRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = connectionAttempts.get(ip);

  if (!record || now > record.resetTime) {
    connectionAttempts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  record.count++;
  return true;
}

function verifyClient(info: { origin: string; secure: boolean; req: IncomingMessage }): boolean {
  const { origin, req } = info;

  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    logger.warn('WebSocket connection rejected: invalid origin', { origin });
    return false;
  }

  if (API_KEY) {
    const host = req.headers.host ?? 'localhost';
    const baseUrl = `http://${host}`;
    const urlPath = req.url ?? '/';
    const url = new URL(urlPath, baseUrl);
    const providedKey = url.searchParams.get('apiKey');
    if (providedKey !== API_KEY) {
      logger.warn('WebSocket connection rejected: invalid API key', { origin });
      return false;
    }
  }

  const clientIp = req.socket.remoteAddress;
  if (clientIp && !checkConnectionRateLimit(clientIp)) {
    logger.warn('WebSocket connection rejected: rate limit exceeded', { origin, ip: clientIp });
    return false;
  }

  logger.info('WebSocket connection verified', { origin, ip: clientIp });
  return true;
}

const wss = new WebSocketServer({
  port: PORT,
  host: HOST,
  verifyClient,
});

logger.info(`WebSocket server listening on ws://${HOST}:${PORT}`);

wss.on('connection', (ws, req) => {
  const clientId = `ws_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  const clientIp = req.socket.remoteAddress || 'unknown';

  clients.set(clientId, {
    ws,
    subscriptions: new Set(),
    lastMessageTime: Date.now(),
  });

  logger.info(`Client connected: ${clientId} from ${clientIp}`);

  sendToClient(ws, {
    type: 'connected',
    clientId,
    message: 'Connected to WebSocket server',
    serverTime: new Date().toISOString(),
  });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      handleMessage(clientId, ws, message);
    } catch {
      sendToClient(ws, {
        type: 'error',
        message: 'Invalid JSON message',
      });
    }
  });

  ws.on('close', () => {
    logger.info(`Client disconnected: ${clientId}`);
    clients.delete(clientId);
  });

  ws.on('error', (error) => {
    logger.error(`Client error: ${clientId}`, { error });
    clients.delete(clientId);
  });
});

function handleMessage(clientId: string, ws: unknown, message: unknown): void {
  const client = clients.get(clientId);
  if (!client) return;

  client.lastMessageTime = Date.now();

  if (typeof message !== 'object' || message === null) {
    sendToClient(ws, {
      type: 'error',
      message: 'Message must be an object',
    });
    return;
  }

  const { type, payload } = message as { type: string; payload?: Record<string, unknown> };

  logger.debug('Message received', { clientId, type, payload });

  switch (type) {
    case 'subscribe':
      handleSubscribe(clientId, payload);
      break;

    case 'unsubscribe':
      handleUnsubscribe(clientId, payload);
      break;

    case 'ping':
      sendToClient(ws, {
        type: 'pong',
        timestamp: Date.now(),
      });
      break;

    case 'getStats':
      sendToClient(ws, {
        type: 'stats',
        data: getStats(),
      });
      break;

    case 'getSubscriptions':
      sendToClient(ws, {
        type: 'subscriptions',
        data: Array.from(client.subscriptions),
      });
      break;

    default:
      sendToClient(ws, {
        type: 'error',
        message: `Unknown message type: ${type}`,
      });
  }
}

function handleSubscribe(clientId: string, payload?: Record<string, unknown>): void {
  const client = clients.get(clientId);
  if (!client) return;

  const channel = payload?.channel as string;

  if (!channel) {
    sendToClient(client.ws as unknown, {
      type: 'error',
      message: 'Channel is required for subscription',
    });
    return;
  }

  client.subscriptions.add(channel);

  sendToClient(client.ws as unknown, {
    type: 'subscribed',
    channel,
    subscriptions: Array.from(client.subscriptions),
  });

  logger.debug('Client subscribed to channel', { clientId, channel });
}

function handleUnsubscribe(clientId: string, payload?: Record<string, unknown>): void {
  const client = clients.get(clientId);
  if (!client) return;

  const channel = payload?.channel as string;

  if (!channel) {
    sendToClient(client.ws as unknown, {
      type: 'error',
      message: 'Channel is required for unsubscription',
    });
    return;
  }

  client.subscriptions.delete(channel);

  sendToClient(client.ws as unknown, {
    type: 'unsubscribed',
    channel,
    subscriptions: Array.from(client.subscriptions),
  });
}

function sendToClient(ws: unknown, message: Record<string, unknown>): void {
  try {
    (ws as { send: (data: string) => void }).send(JSON.stringify(message));
  } catch (error) {
    logger.error('Failed to send message', { error });
  }
}

function getStats(): Record<string, unknown> {
  return {
    totalClients: clients.size,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    timestamp: Date.now(),
  };
}

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  wss.close(() => {
    logger.info('WebSocket server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  wss.close(() => {
    logger.info('WebSocket server closed');
    process.exit(0);
  });
});

logger.info('Starting WebSocket server...', {
  port: PORT,
  host: HOST,
});
