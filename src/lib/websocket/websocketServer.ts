import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { parse } from 'url';

interface WebSocketConfig {
  port: number;
  path?: string;
  cors?: {
    origin: string | string[];
    methods?: string[];
    credentials?: boolean;
  };
  heartbeatInterval?: number;
  maxConnectionsPerUser?: number;
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
}

interface RoomSubscription {
  room: string;
  socketId: string;
  userId?: string;
  subscribedAt: number;
  filters?: Record<string, unknown>;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface WebSocketEvent {
  type: string;
  payload: Record<string, unknown>;
  timestamp: number;
  instanceId?: string;
  source?: string;
}

interface UserConnection {
  socketId: string;
  userId?: string;
  rooms: Set<string>;
  connectedAt: number;
  lastActivity: number;
  metadata?: Record<string, unknown>;
}

class WebSocketManager {
  private server: HTTPServer | null = null;
  private io: SocketIOServer | null = null;
  private connections: Map<string, UserConnection> = new Map();
  private roomSubscriptions: Map<string, Set<string>> = new Map();
  private userSockets: Map<string, Set<string>> = new Map();
  private rateLimitMap: Map<string, RateLimitEntry> = new Map();
  private config: WebSocketConfig;
  private heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;
  private messageQueue: Map<string, WebSocketEvent[]> = new Map();
  private offlineUsers: Map<string, WebSocketEvent[]> = new Map();

  constructor(config: WebSocketConfig) {
    this.config = {
      path: '/ws',
      heartbeatInterval: 30000,
      maxConnectionsPerUser: 5,
      rateLimit: {
        windowMs: 60000,
        maxRequests: 100,
      },
      ...config,
    };
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = createServer((req: IncomingMessage, res: ServerResponse) => {
        const parsedUrl = parse(req.url!, true);
        
        if (parsedUrl.pathname === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'healthy', connections: this.connections.size }));
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
      });

      this.io = new SocketIOServer(this.server, {
        path: this.config.path,
        cors: {
          origin: this.config.cors?.origin || '*',
          methods: this.config.cors?.methods || ['GET', 'POST'],
          credentials: this.config.cors?.credentials || false,
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000,
      });

      this.io.on('connection', (socket: Socket) => this.handleConnection(socket));

      this.server.listen(this.config.port, () => {
        console.log(`WebSocket server started on port ${this.config.port}`);
        this.startHeartbeat();
        resolve();
      });

      this.server.on('error', (error) => {
        console.error('WebSocket server error:', error);
        reject(error);
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      this.stopHeartbeat();

      if (this.io) {
        this.io.close();
        this.io = null;
      }

      if (this.server) {
        this.server.close(() => {
          console.log('WebSocket server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  private handleConnection(socket: Socket): void {
    const socketId = socket.id;
    const userId = socket.handshake.query.userId as string | undefined;
    const metadata = socket.handshake.query.metadata as string | undefined;

    console.log(`New WebSocket connection: ${socketId}, userId: ${userId}`);

    const userConnections = userId ? this.userSockets.get(userId) : null;
    if (userId && userConnections && userConnections.size >= this.config.maxConnectionsPerUser!) {
      socket.emit('error', { message: 'Too many connections' });
      socket.disconnect();
      return;
    }

    const connection: UserConnection = {
      socketId,
      userId,
      rooms: new Set(),
      connectedAt: Date.now(),
      lastActivity: Date.now(),
      metadata: metadata ? JSON.parse(metadata) : undefined,
    };

    this.connections.set(socketId, connection);

    if (userId) {
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socketId);
    }

    this.setupSocketListeners(socket);

    socket.emit('connected', {
      socketId,
      serverTime: Date.now(),
      heartbeatInterval: this.config.heartbeatInterval,
    });

    this.sendQueuedMessages(userId, socketId);
  }

  private setupSocketListeners(socket: Socket): void {
    socket.on('subscribe', (data: { room: string; filters?: Record<string, unknown> }) => {
      const { room, filters } = data;
      this.subscribeToRoom(socket, room, filters);
    });

    socket.on('unsubscribe', (data: { room: string }) => {
      this.unsubscribeFromRoom(socket, data.room);
    });

    socket.on('join', (data: { room: string }) => {
      this.joinRoom(socket, data.room);
    });

    socket.on('leave', (data: { room: string }) => {
      this.leaveRoom(socket, data.room);
    });

    socket.on('publish', (data: { room: string; event: WebSocketEvent }) => {
      this.publishToRoom(data.room, data.event);
    });

    socket.on('ping', () => {
      socket.emit('pong', { serverTime: Date.now() });
    });

    socket.on('setMetadata', (metadata: Record<string, unknown>) => {
      const connection = this.connections.get(socket.id);
      if (connection) {
        connection.metadata = metadata;
        connection.lastActivity = Date.now();
      }
    });

    socket.on('disconnect', (reason) => {
      this.handleDisconnect(socket, reason);
    });

    socket.on('error', (error) => {
      console.error(`Socket ${socket.id} error:`, error);
    });
  }

  private subscribeToRoom(socket: Socket, room: string, filters?: Record<string, unknown>): void {
    const connection = this.connections.get(socket.id);
    if (!connection) return;

    connection.rooms.add(`subs:${room}`);

    if (!this.roomSubscriptions.has(room)) {
      this.roomSubscriptions.set(room, new Set());
    }
    this.roomSubscriptions.get(room)!.add(socket.id);

    if (filters) {
      const subscription: RoomSubscription = {
        room,
        socketId: socket.id,
        userId: connection.userId,
        subscribedAt: Date.now(),
        filters,
      };
    }

    socket.emit('subscribed', { room, filters });
    console.log(`Socket ${socket.id} subscribed to ${room}`);
  }

  private unsubscribeFromRoom(socket: Socket, room: string): void {
    const connection = this.connections.get(socket.id);
    if (!connection) return;

    connection.rooms.delete(`subs:${room}`);

    const subscribers = this.roomSubscriptions.get(room);
    if (subscribers) {
      subscribers.delete(socket.id);
      if (subscribers.size === 0) {
        this.roomSubscriptions.delete(room);
      }
    }

    socket.emit('unsubscribed', { room });
  }

  private joinRoom(socket: Socket, room: string): void {
    const connection = this.connections.get(socket.id);
    if (!connection) return;

    socket.join(`room:${room}`);
    connection.rooms.add(`room:${room}`);

    if (!this.roomSubscriptions.has(room)) {
      this.roomSubscriptions.set(room, new Set());
    }
    this.roomSubscriptions.get(room)!.add(socket.id);

    socket.emit('joined', { room });
    console.log(`Socket ${socket.id} joined room ${room}`);
  }

  private leaveRoom(socket: Socket, room: string): void {
    const connection = this.connections.get(socket.id);
    if (!connection) return;

    socket.leave(`room:${room}`);
    connection.rooms.delete(`room:${room}`);

    const subscribers = this.roomSubscriptions.get(room);
    if (subscribers) {
      subscribers.delete(socket.id);
      if (subscribers.size === 0) {
        this.roomSubscriptions.delete(room);
      }
    }

    socket.emit('left', { room });
  }

  private publishToRoom(room: string, event: WebSocketEvent): void {
    if (!this.io) return;

    const subscribers = this.roomSubscriptions.get(room);
    if (!subscribers || subscribers.size === 0) return;

    event.timestamp = event.timestamp || Date.now();

    this.io.to(`room:${room}`).emit(room, event);

    const broadcastEvent = {
      ...event,
      instanceId: event.instanceId || 'default',
      source: event.source || 'websocket-server',
    };

    subscribers.forEach((socketId) => {
      const socket = this.io?.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit(room, broadcastEvent);
      }
    });
  }

  private handleDisconnect(socket: Socket, reason: string): void {
    const connection = this.connections.get(socket.id);
    if (!connection) return;

    console.log(`Socket ${socket.id} disconnected: ${reason}`);

    connection.rooms.forEach((roomKey) => {
      const room = roomKey.replace(/^(subs:|room:)/, '');
      const subscribers = this.roomSubscriptions.get(room);
      if (subscribers) {
        subscribers.delete(socket.id);
        if (subscribers.size === 0) {
          this.roomSubscriptions.delete(room);
        }
      }
    });

    if (connection.userId) {
      const userSockets = this.userSockets.get(connection.userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          this.userSockets.delete(connection.userId);
        }
      }
    }

    this.connections.delete(socket.id);
  }

  private startHeartbeat(): void {
    this.heartbeatIntervalId = setInterval(() => {
      if (!this.io) return;

      this.io.sockets.sockets.forEach((socket) => {
        const connection = this.connections.get(socket.id);
        if (connection) {
          const timeSinceLastActivity = Date.now() - connection.lastActivity;
          if (timeSinceLastActivity > this.config.heartbeatInterval! * 2) {
            console.log(`Socket ${socket.id} timed out`);
            socket.disconnect();
          } else {
            socket.emit('heartbeat', { serverTime: Date.now() });
          }
        }
      });
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }

  private sendQueuedMessages(userId: string | undefined, socketId: string): void {
    if (!userId) return;

    const queue = this.messageQueue.get(userId);
    if (!queue || queue.length === 0) return;

    const socket = this.io?.sockets.sockets.get(socketId);
    if (!socket) return;

    queue.forEach((event) => {
      socket.emit(event.type, event);
    });

    this.messageQueue.delete(userId);
  }

  broadcast(event: WebSocketEvent, rooms?: string[]): void {
    if (!this.io) return;

    event.timestamp = event.timestamp || Date.now();

    if (rooms && rooms.length > 0) {
      rooms.forEach((room) => {
        this.io!.to(`room:${room}`).emit(event.type, event);
      });
    } else {
      this.io.emit(event.type, event);
    }
  }

  sendToUser(userId: string, event: WebSocketEvent): void {
    const userSockets = this.userSockets.get(userId);
    if (!userSockets || userSockets.size === 0) {
      if (!this.messageQueue.has(userId)) {
        this.messageQueue.set(userId, []);
      }
      this.messageQueue.get(userId)!.push(event);
      return;
    }

    event.timestamp = event.timestamp || Date.now();

    userSockets.forEach((socketId) => {
      const socket = this.io?.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit(event.type, event);
      }
    });
  }

  sendToSocket(socketId: string, event: WebSocketEvent): void {
    const socket = this.io?.sockets.sockets.get(socketId);
    if (socket) {
      event.timestamp = event.timestamp || Date.now();
      socket.emit(event.type, event);
    }
  }

  getConnectionStats(): {
    totalConnections: number;
    uniqueUsers: number;
    rooms: number;
    queuedMessages: number;
  } {
    return {
      totalConnections: this.connections.size,
      uniqueUsers: this.userSockets.size,
      rooms: this.roomSubscriptions.size,
      queuedMessages: Array.from(this.messageQueue.values()).reduce((sum, queue) => sum + queue.length, 0),
    };
  }

  getRoomSubscribers(room: string): string[] {
    const subscribers = this.roomSubscriptions.get(room);
    return subscribers ? Array.from(subscribers) : [];
  }

  getUserConnections(userId: string): string[] {
    const sockets = this.userSockets.get(userId);
    return sockets ? Array.from(sockets) : [];
  }
}

export function createWebSocketServer(config: Partial<WebSocketConfig> = {}): WebSocketManager {
  const defaultConfig: WebSocketConfig = {
    port: parseInt(process.env.WS_PORT || '3001'),
    path: '/ws',
    cors: {
      origin: process.env.WS_CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    heartbeatInterval: 30000,
    maxConnectionsPerUser: 5,
    rateLimit: {
      windowMs: 60000,
      maxRequests: 100,
    },
  };

  return new WebSocketManager({ ...defaultConfig, ...config });
}

export const WEBSOCKET_EVENTS = {
  ASSERTION_CREATED: 'assertion:created',
  ASSERTION_UPDATED: 'assertion:updated',
  ASSERTION_DISPUTED: 'assertion:disputed',
  ASSERTION_RESOLVED: 'assertion:resolved',
  DISPUTE_CREATED: 'dispute:created',
  DISPUTE_UPDATED: 'dispute:updated',
  DISPUTE_RESOLVED: 'dispute:resolved',
  PRICE_PROPOSED: 'price:proposed',
  PRICE_SETTLED: 'price:settled',
  SYNC_COMPLETED: 'sync:completed',
  ALERT_TRIGGERED: 'alert:triggered',
  SYSTEM_STATUS: 'system:status',
  HEARTBEAT: 'heartbeat',
  PING: 'ping',
  PONG: 'pong',
} as const;

export type WebSocketEventType = typeof WEBSOCKET_EVENTS[keyof typeof WEBSOCKET_EVENTS];
