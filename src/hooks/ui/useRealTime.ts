import { useEffect, useRef, useCallback, useState } from 'react';
import { logger } from '@/lib/logger';

export type RealTimeEventType =
  | 'assertion_created'
  | 'assertion_disputed'
  | 'assertion_resolved'
  | 'dispute_created'
  | 'dispute_resolved'
  | 'price_proposed'
  | 'price_settled'
  | 'sync_completed'
  | 'alert_triggered'
  | 'system_status';

export const REAL_TIME_EVENT_TYPES: RealTimeEventType[] = [
  'assertion_created',
  'assertion_disputed',
  'assertion_resolved',
  'dispute_created',
  'dispute_resolved',
  'price_proposed',
  'price_settled',
  'sync_completed',
  'alert_triggered',
  'system_status',
];

export interface RealTimeEvent {
  type: RealTimeEventType;
  timestamp: number;
  data: Record<string, unknown>;
  instanceId?: string;
  source?: string;
}

export interface ConnectionState {
  status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';
  lastConnected?: number;
  lastDisconnected?: number;
  errorCount: number;
  retryCount: number;
}

export interface UseRealTimeOptions {
  url: string;
  enabled?: boolean;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  onEvent?: (event: RealTimeEvent) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  onReconnect?: (attempt: number) => void;
  onMaxReconnectAttemptsReached?: () => void;
}

interface UseRealTimeReturn {
  connectionState: ConnectionState;
  subscribe: (eventTypes?: RealTimeEventType[]) => void;
  unsubscribe: (eventTypes?: RealTimeEventType[]) => void;
  unsubscribeAll: () => void;
  sendMessage: (message: unknown) => void;
  isSupported: boolean;
  lastEvent: RealTimeEvent | null;
  eventCount: number;
}

const DEFAULT_RECONNECT_INTERVAL = 5000;
const DEFAULT_MAX_RECONNECT_ATTEMPTS = 10;
const DEFAULT_HEARTBEAT_INTERVAL = 30000;

class RealTimeConnectionManager {
  private eventSource: EventSource | null = null;
  private options: UseRealTimeOptions;
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;
  private subscribedEvents: Set<RealTimeEventType> = new Set();
  private isManuallyClosed: boolean = false;
  private reconnectAttempts: number = 0;
  private boundEventHandlers: Map<RealTimeEventType, (e: MessageEvent) => void> = new Map();
  private boundOnMessage: ((event: MessageEvent) => void) | null = null;
  private boundOnError: ((event: Event) => void) | null = null;

  constructor(options: UseRealTimeOptions) {
    this.options = options;
  }

  private setupEventSource(url: string): void {
    this.eventSource = new EventSource(url);

    this.boundOnMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as RealTimeEvent;
        logger.debug('Real-time event received', { type: data.type });
        this.options.onEvent?.(data);
      } catch (error) {
        logger.error('Failed to parse real-time event', { error, data: event.data });
      }
    };

    this.boundOnError = (event: Event) => {
      logger.error('Real-time connection error', { event });
      this.options.onError?.(event);
      this.handleReconnect();
    };

    this.eventSource.onopen = () => {
      this.reconnectAttempts = 0;
      logger.info('Real-time connection established');
    };

    this.eventSource.onmessage = this.boundOnMessage;
    this.eventSource.onerror = this.boundOnError;

    this.boundEventHandlers.clear();
    REAL_TIME_EVENT_TYPES.forEach((eventType) => {
      const handler = (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data) as RealTimeEvent;
          logger.debug(`Real-time event ${eventType} received`);
          this.options.onEvent?.(data);
        } catch (error) {
          logger.error(`Failed to parse ${eventType} event`, { error });
        }
      };
      this.boundEventHandlers.set(eventType, handler);
      this.eventSource?.addEventListener(eventType, handler);
    });
  }

  connect(): void {
    if (this.eventSource) {
      this.disconnect();
    }

    this.isManuallyClosed = false;
    this.options.onConnect?.();

    try {
      const url = new URL(this.options.url, window.location.origin);

      if (this.subscribedEvents.size > 0) {
        url.searchParams.set('events', Array.from(this.subscribedEvents).join(','));
      }

      this.setupEventSource(url.toString());

      this.startHeartbeat();
    } catch (error) {
      logger.error('Failed to establish real-time connection', { error });
      this.handleReconnect();
    }
  }

  private handleReconnect(): void {
    if (this.isManuallyClosed) return;
    if (!this.options.autoReconnect) return;
    if (
      this.reconnectAttempts >=
      (this.options.maxReconnectAttempts || DEFAULT_MAX_RECONNECT_ATTEMPTS)
    ) {
      logger.warn('Max reconnect attempts reached');
      this.options.onMaxReconnectAttemptsReached?.();
      return;
    }

    this.reconnectAttempts++;
    this.options.onReconnect?.(this.reconnectAttempts);

    this.reconnectTimeoutId = setTimeout(() => {
      logger.info(`Attempting to reconnect (attempt ${this.reconnectAttempts})`);
      this.connect();
    }, this.options.reconnectInterval || DEFAULT_RECONNECT_INTERVAL);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    // EventSource is read-only, no need for explicit ping
    // Heartbeat is handled by server sending periodic messages
  }

  private stopHeartbeat(): void {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }

  disconnect(): void {
    this.isManuallyClosed = true;
    this.stopHeartbeat();

    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    if (this.eventSource) {
      if (this.boundOnMessage) {
        this.eventSource.onmessage = null;
        this.boundOnMessage = null;
      }
      if (this.boundOnError) {
        this.eventSource.onerror = null;
        this.boundOnError = null;
      }
      this.boundEventHandlers.forEach((handler, eventType) => {
        this.eventSource?.removeEventListener(eventType, handler);
      });
      this.boundEventHandlers.clear();
      this.eventSource.close();
      this.eventSource = null;
      this.options.onDisconnect?.();
    }
  }

  subscribe(eventTypes: RealTimeEventType[] = []): void {
    eventTypes.forEach((type) => this.subscribedEvents.add(type));

    if (this.eventSource && this.subscribedEvents.size > 0) {
      const url = new URL(this.options.url, window.location.origin);
      url.searchParams.set('events', Array.from(this.subscribedEvents).join(','));
      this.eventSource.close();
      this.setupEventSource(url.toString());
    }
  }

  unsubscribe(eventTypes?: RealTimeEventType[]): void {
    if (eventTypes) {
      eventTypes.forEach((type) => this.subscribedEvents.delete(type));
    } else {
      this.subscribedEvents.clear();
    }
  }

  getReadyState(): number | null {
    return this.eventSource?.readyState ?? null;
  }
}

export function useRealTime(options: UseRealTimeOptions): UseRealTimeReturn {
  const {
    url,
    enabled = true,
    autoReconnect = true,
    reconnectInterval = DEFAULT_RECONNECT_INTERVAL,
    maxReconnectAttempts = DEFAULT_MAX_RECONNECT_ATTEMPTS,
    heartbeatInterval = DEFAULT_HEARTBEAT_INTERVAL,
    onEvent,
    onConnect,
    onDisconnect,
    onError,
    onReconnect,
    onMaxReconnectAttemptsReached,
  } = options;

  const managerRef = useRef<RealTimeConnectionManager | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'disconnected',
    errorCount: 0,
    retryCount: 0,
  });
  const [lastEvent, setLastEvent] = useState<RealTimeEvent | null>(null);
  const [eventCount, setEventCount] = useState(0);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    if (typeof EventSource === 'undefined') {
      setIsSupported(false);
      return;
    }

    const manager = new RealTimeConnectionManager({
      url,
      enabled,
      autoReconnect,
      reconnectInterval,
      maxReconnectAttempts,
      heartbeatInterval,
      onEvent: (event) => {
        setLastEvent(event);
        setEventCount((prev) => prev + 1);
        setConnectionState((prev) => ({
          ...prev,
          status: 'connected',
          lastConnected: Date.now(),
        }));
        onEvent?.(event);
      },
      onConnect: () => {
        setConnectionState((prev) => ({
          ...prev,
          status: 'connected',
          lastConnected: Date.now(),
          retryCount: 0,
        }));
        onConnect?.();
      },
      onDisconnect: () => {
        setConnectionState((prev) => ({
          ...prev,
          status: 'disconnected',
          lastDisconnected: Date.now(),
        }));
        onDisconnect?.();
      },
      onError: () => {
        setConnectionState((prev) => ({
          ...prev,
          status: 'error',
          errorCount: prev.errorCount + 1,
        }));
        onError?.(new Event('error'));
      },
      onReconnect: (attempt) => {
        setConnectionState((prev) => ({
          ...prev,
          status: 'reconnecting',
          retryCount: attempt,
        }));
        onReconnect?.(attempt);
      },
      onMaxReconnectAttemptsReached: () => {
        setConnectionState((prev) => ({
          ...prev,
          status: 'disconnected',
        }));
        onMaxReconnectAttemptsReached?.();
      },
    });

    managerRef.current = manager;

    if (enabled) {
      manager.connect();
    }

    return () => {
      manager.disconnect();
    };
  }, [
    url,
    enabled,
    autoReconnect,
    reconnectInterval,
    maxReconnectAttempts,
    heartbeatInterval,
    onEvent,
    onConnect,
    onDisconnect,
    onError,
    onReconnect,
    onMaxReconnectAttemptsReached,
  ]);

  const subscribe = useCallback((eventTypes?: RealTimeEventType[]) => {
    managerRef.current?.subscribe(eventTypes || REAL_TIME_EVENT_TYPES);
  }, []);

  const unsubscribe = useCallback((eventTypes?: RealTimeEventType[]) => {
    managerRef.current?.unsubscribe(eventTypes);
  }, []);

  const unsubscribeAll = useCallback(() => {
    managerRef.current?.unsubscribe();
  }, []);

  const sendMessage = useCallback((_message: unknown) => {
    // EventSource is read-only, cannot send messages to server
    // This method is kept for API compatibility
    logger.warn('EventSource does not support sending messages to server');
  }, []);

  return {
    connectionState,
    subscribe,
    unsubscribe,
    unsubscribeAll,
    sendMessage,
    isSupported,
    lastEvent,
    eventCount,
  };
}

interface UseWebSocketOptions {
  url: string;
  enabled?: boolean;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onOpen?: () => void;
  onMessage?: (data: unknown) => void;
  onClose?: (code: number, reason: string) => void;
  onError?: (error: Event) => void;
}

export function useWebSocket(options: UseWebSocketOptions) {
  const {
    url,
    enabled = true,
    autoReconnect = true,
    reconnectInterval = DEFAULT_RECONNECT_INTERVAL,
    maxReconnectAttempts = DEFAULT_MAX_RECONNECT_ATTEMPTS,
    onOpen,
    onMessage,
    onClose,
    onError,
  } = options;

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<unknown>(null);
  const [error, setError] = useState<Event | null>(null);

  const connect = useCallback(() => {
    if (typeof WebSocket === 'undefined') {
      logger.warn('WebSocket is not supported');
      return;
    }

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl =
        url.startsWith('ws://') || url.startsWith('wss://') ? url : `${protocol}//${url}`;

      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onopen = () => {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        onOpen?.();
      };

      socketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          onMessage?.(data);
        } catch (parseError) {
          logger.error('Failed to parse WebSocket message', {
            error: parseError instanceof Error ? parseError.message : 'Unknown error',
          });
        }
      };

      socketRef.current.onclose = (event) => {
        setIsConnected(false);
        onClose?.(event.code, event.reason);

        if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      socketRef.current.onerror = (event) => {
        setError(event);
        onError?.(event);
      };
    } catch (err) {
      logger.error('Failed to create WebSocket connection', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      setError(err as Event);
    }
  }, [
    url,
    autoReconnect,
    reconnectInterval,
    maxReconnectAttempts,
    onOpen,
    onMessage,
    onClose,
    onError,
  ]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
  }, []);

  const send = useCallback((data: unknown) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(data));
    } else {
      logger.warn('WebSocket is not connected');
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    error,
    connect,
    disconnect,
    send,
  };
}

interface LiveUpdateOptions {
  interval?: number;
  onUpdate: () => void | Promise<void>;
}

export function useLiveUpdate(options: LiveUpdateOptions): () => void {
  const { interval = 5000, onUpdate } = options;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(async () => {
      await onUpdate();
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [interval, onUpdate]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  return stop;
}

export function useConnectionHealth() {
  const [health, setHealth] = useState({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    lastCheck: Date.now(),
    latency: 0,
  });

  useEffect(() => {
    const checkOnline = () => {
      setHealth((prev) => ({ ...prev, isOnline: navigator.onLine, lastCheck: Date.now() }));
    };

    const checkLatency = async () => {
      const start = performance.now();
      try {
        await fetch('/api/health', { method: 'HEAD', cache: 'no-store' });
        const latency = Math.round(performance.now() - start);
        setHealth((prev) => ({ ...prev, latency, lastCheck: Date.now() }));
      } catch {
        setHealth((prev) => ({ ...prev, latency: 0, lastCheck: Date.now() }));
      }
    };

    window.addEventListener('online', checkOnline);
    window.addEventListener('offline', checkOnline);
    const interval = setInterval(checkLatency, 30000);

    checkLatency();

    return () => {
      window.removeEventListener('online', checkOnline);
      window.removeEventListener('offline', checkOnline);
      clearInterval(interval);
    };
  }, []);

  return health;
}
