import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { logger } from '@/lib/logger';

export type WebSocketEventType =
  | 'assertion:created'
  | 'assertion:updated'
  | 'assertion:disputed'
  | 'assertion:resolved'
  | 'dispute:created'
  | 'dispute:updated'
  | 'dispute:resolved'
  | 'price:proposed'
  | 'price:settled'
  | 'sync:completed'
  | 'alert:triggered'
  | 'system:status'
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'reconnect_attempt'
  | 'reconnect'
  | 'reconnect_error'
  | 'reconnect_failed';

export interface WebSocketMessage {
  type: WebSocketEventType;
  payload: Record<string, unknown>;
  timestamp: number;
  instanceId?: string;
  source?: string;
}

export interface UseWebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  userId?: string;
  metadata?: Record<string, unknown>;
  enabled?: boolean;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: Error) => void;
  onMessage?: (message: WebSocketMessage) => void;
  onReconnect?: (attempt: number) => void;
  onReconnectFailed?: () => void;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: Error | null;
  lastMessage: WebSocketMessage | null;
  messageCount: number;
  subscribe: (room: string, filters?: Record<string, unknown>) => void;
  unsubscribe: (room: string) => void;
  join: (room: string) => void;
  leave: (room: string) => void;
  publish: (room: string, event: Omit<WebSocketMessage, 'timestamp'>) => void;
  send: (type: string, payload: Record<string, unknown>) => void;
  connect: () => void;
  disconnect: () => void;
  getConnectionStats: () => Promise<{
    totalConnections: number;
    uniqueUsers: number;
    rooms: number;
    queuedMessages: number;
  } | null>;
  rooms: Set<string>;
  subscriptions: Map<string, { filters?: Record<string, unknown>; subscribedAt: number }>;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    url = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws',
    autoConnect = true,
    autoReconnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 10,
    heartbeatInterval = 30000,
    userId,
    metadata,
    enabled = true,
    onConnect,
    onDisconnect,
    onError,
    onMessage,
    onReconnect,
    onReconnectFailed,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<Error | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  const [rooms, setRooms] = useState<Set<string>>(new Set());
  const [subscriptions, setSubscriptions] = useState<Map<string, { filters?: Record<string, unknown>; subscribedAt: number }>>(new Map());
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    if (typeof window === 'undefined') return;

    setIsConnecting(true);
    setConnectionError(null);

    const socket = io(url, {
      transports: ['websocket', 'polling'],
      autoConnect: false,
      reconnection: autoReconnect,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: reconnectInterval,
      reconnectionDelayMax: reconnectInterval * 2,
      timeout: 20000,
      query: {
        userId: userId || '',
        metadata: metadata ? JSON.stringify(metadata) : '',
      },
    });

    socket.on('connect', () => {
      console.log('[WebSocket] Connected');
      setIsConnected(true);
      setIsConnecting(false);
      reconnectAttemptsRef.current = 0;
      onConnect?.();
    });

    socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
      setIsConnected(false);
      onDisconnect?.(reason);
    });

    socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error);
      setConnectionError(error);
      onError?.(error);
    });

    socket.on('reconnect_attempt', (attempt) => {
      console.log('[WebSocket] Reconnect attempt:', attempt);
      reconnectAttemptsRef.current = attempt;
      onReconnect?.(attempt);
    });

    socket.on('reconnect', () => {
      console.log('[WebSocket] Reconnected');
      setIsConnected(true);
      setIsConnecting(false);
    });

    socket.on('reconnect_failed', () => {
      console.error('[WebSocket] Reconnect failed');
      setIsConnecting(false);
      onReconnectFailed?.();
    });

    Object.values([
      'assertion:created',
      'assertion:updated',
      'assertion:disputed',
      'assertion:resolved',
      'dispute:created',
      'dispute:updated',
      'dispute:resolved',
      'price:proposed',
      'price:settled',
      'sync:completed',
      'alert:triggered',
      'system:status',
    ]).forEach((event) => {
      socket.on(event, (payload: Record<string, unknown>) => {
        const message: WebSocketMessage = {
          type: event as WebSocketEventType,
          payload,
          timestamp: Date.now(),
        };

        setLastMessage(message);
        setMessageCount((prev) => prev + 1);
        onMessage?.(message);
      });
    });

    socket.connect();
    socketRef.current = socket;
  }, [
    url,
    autoReconnect,
    reconnectInterval,
    maxReconnectAttempts,
    userId,
    metadata,
    onConnect,
    onDisconnect,
    onError,
    onMessage,
    onReconnect,
    onReconnectFailed,
  ]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    setRooms(new Set());
    setSubscriptions(new Map());
  }, []);

  const subscribe = useCallback((room: string, filters?: Record<string, unknown>) => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit('subscribe', { room, filters });

    setSubscriptions((prev) => {
      const newMap = new Map(prev);
      newMap.set(room, { filters, subscribedAt: Date.now() });
      return newMap;
    });
  }, []);

  const unsubscribe = useCallback((room: string) => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit('unsubscribe', { room });

    setSubscriptions((prev) => {
      const newMap = new Map(prev);
      newMap.delete(room);
      return newMap;
    });
  }, []);

  const join = useCallback((room: string) => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit('join', { room });

    setRooms((prev) => new Set([...prev, room]));
  }, []);

  const leave = useCallback((room: string) => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit('leave', { room });

    setRooms((prev) => {
      const newSet = new Set(prev);
      newSet.delete(room);
      return newSet;
    });
  }, []);

  const publish = useCallback((room: string, event: Omit<WebSocketMessage, 'timestamp'>) => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit('publish', {
      room,
      event: {
        ...event,
        timestamp: Date.now(),
      },
    });
  }, []);

  const send = useCallback((type: string, payload: Record<string, unknown>) => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit(type, payload);
  }, []);

  const getConnectionStats = useCallback(async () => {
    if (!socketRef.current?.connected) return null;

    return new Promise<{
      totalConnections: number;
      uniqueUsers: number;
      rooms: number;
      queuedMessages: number;
    } | null>((resolve) => {
      socketRef.current!.emit('getStats', (stats: unknown) => {
        resolve(stats as { totalConnections: number; uniqueUsers: number; rooms: number; queuedMessages: number });
      });

      setTimeout(() => resolve(null), 5000);
    });
  }, []);

  useEffect(() => {
    if (enabled && autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, autoConnect, connect, disconnect]);

  return {
    isConnected,
    isConnecting,
    connectionError,
    lastMessage,
    messageCount,
    subscribe,
    unsubscribe,
    join,
    leave,
    publish,
    send,
    connect,
    disconnect,
    getConnectionStats,
    rooms,
    subscriptions,
  };
}

export function useWebSocketSubscription(
  room: string,
  filters?: Record<string, unknown>,
  options: Partial<UseWebSocketOptions> = {}
) {
  const { isConnected, subscribe, unsubscribe, lastMessage, messageCount } = useWebSocket({
    ...options,
    autoConnect: true,
  });

  useEffect(() => {
    if (isConnected) {
      subscribe(room, filters);
    }

    return () => {
      if (isConnected) {
        unsubscribe(room);
      }
    };
  }, [isConnected, room, filters, subscribe, unsubscribe]);

  return {
    message: lastMessage,
    messageCount,
    isConnected,
  };
}

export function useWebSocketRoom(room: string, options: Partial<UseWebSocketOptions> = {}) {
  const { isConnected, join, leave, lastMessage, messageCount } = useWebSocket({
    ...options,
    autoConnect: true,
  });

  useEffect(() => {
    if (isConnected) {
      join(room);
    }

    return () => {
      if (isConnected) {
        leave(room);
      }
    };
  }, [isConnected, room, join, leave]);

  return {
    message: lastMessage,
    messageCount,
    isConnected,
  };
}

export function useAssertionUpdates(options: Partial<UseWebSocketOptions> = {}) {
  const { isConnected, lastMessage, messageCount, subscribe } = useWebSocket(options);

  useEffect(() => {
    if (isConnected) {
      subscribe('assertions');
    }
  }, [isConnected, subscribe]);

  return {
    assertion: lastMessage?.type === 'assertion:created' || lastMessage?.type === 'assertion:updated' 
      ? lastMessage.payload 
      : null,
    disputed: lastMessage?.type === 'assertion:disputed' ? lastMessage.payload : null,
    resolved: lastMessage?.type === 'assertion:resolved' ? lastMessage.payload : null,
    lastUpdate: lastMessage,
    updateCount: messageCount,
    isConnected,
  };
}

export function useDisputeUpdates(options: Partial<UseWebSocketOptions> = {}) {
  const { isConnected, lastMessage, messageCount, subscribe } = useWebSocket(options);

  useEffect(() => {
    if (isConnected) {
      subscribe('disputes');
    }
  }, [isConnected, subscribe]);

  return {
    newDispute: lastMessage?.type === 'dispute:created' ? lastMessage.payload : null,
    updatedDispute: lastMessage?.type === 'dispute:updated' ? lastMessage.payload : null,
    resolvedDispute: lastMessage?.type === 'dispute:resolved' ? lastMessage.payload : null,
    lastUpdate: lastMessage,
    updateCount: messageCount,
    isConnected,
  };
}

export function usePriceUpdates(options: Partial<UseWebSocketOptions> = {}) {
  const { isConnected, lastMessage, messageCount, subscribe } = useWebSocket(options);

  useEffect(() => {
    if (isConnected) {
      subscribe('prices');
    }
  }, [isConnected, subscribe]);

  return {
    proposed: lastMessage?.type === 'price:proposed' ? lastMessage.payload : null,
    settled: lastMessage?.type === 'price:settled' ? lastMessage.payload : null,
    lastUpdate: lastMessage,
    updateCount: messageCount,
    isConnected,
  };
}
