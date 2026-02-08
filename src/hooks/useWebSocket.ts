import { useState, useEffect, useRef, useCallback } from 'react';

import { WS_CONFIG } from '@/lib/config/constants';
import { logger } from '@/lib/logger';

export interface WebSocketOptions {
  reconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (data: unknown) => void;
}

export interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  lastMessage: unknown | null;
}

export function useWebSocket(url: string, options: WebSocketOptions = {}) {
  const {
    reconnectAttempts = WS_CONFIG.MAX_RECONNECT_ATTEMPTS,
    reconnectDelay = WS_CONFIG.BASE_RECONNECT_DELAY_MS,
    heartbeatInterval = WS_CONFIG.HEARTBEAT_INTERVAL,
    autoConnect = true,
    onConnect,
    onDisconnect,
    onError,
    onMessage,
  } = options;

  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastMessage: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isManualCloseRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      wsRef.current.send(message);
      return true;
    }
    logger.warn('WebSocket is not connected, message not sent');
    return false;
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      logger.debug('WebSocket is already connected');
      return;
    }

    setState((prev) => ({ ...prev, isConnecting: true, error: null }));
    isManualCloseRef.current = false;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        logger.info('WebSocket connected', { url });
        setState((prev) => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null,
        }));
        reconnectCountRef.current = 0;
        onConnect?.();

        if (heartbeatInterval > 0) {
          heartbeatTimerRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping' }));
            }
          }, heartbeatInterval);
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setState((prev) => ({ ...prev, lastMessage: data }));
          onMessage?.(data);
        } catch {
          setState((prev) => ({ ...prev, lastMessage: event.data }));
          onMessage?.(event.data);
        }
      };

      ws.onerror = (error) => {
        logger.error('WebSocket error', { url, error });
        setState((prev) => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error: new Error('WebSocket connection error'),
        }));
        onError?.(error);
      };

      ws.onclose = (event) => {
        logger.info('WebSocket closed', { url, code: event.code, reason: event.reason });
        clearTimers();
        setState((prev) => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
        }));
        onDisconnect?.();

        if (!isManualCloseRef.current && reconnectCountRef.current < reconnectAttempts) {
          const delay = Math.min(
            reconnectDelay * Math.pow(WS_CONFIG.BACKOFF_MULTIPLIER, reconnectCountRef.current),
            WS_CONFIG.MAX_RECONNECT_DELAY_MS,
          );

          logger.info(`WebSocket reconnecting in ${delay}ms`, {
            attempt: reconnectCountRef.current + 1,
            maxAttempts: reconnectAttempts,
          });

          reconnectTimerRef.current = setTimeout(() => {
            reconnectCountRef.current += 1;
            connect();
          }, delay);
        }
      };
    } catch (error) {
      logger.error('WebSocket connection failed', { url, error });
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      }));
    }
  }, [
    url,
    reconnectAttempts,
    reconnectDelay,
    heartbeatInterval,
    onConnect,
    onDisconnect,
    onError,
    onMessage,
    clearTimers,
  ]);

  const disconnect = useCallback(() => {
    isManualCloseRef.current = true;
    clearTimers();

    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
    }));
  }, [clearTimers]);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectCountRef.current = 0;
    setTimeout(connect, 100);
  }, [disconnect, connect]);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    ...state,
    sendMessage,
    connect,
    disconnect,
    reconnect,
  };
}

export function useWebSocketChannel(
  url: string,
  options: WebSocketOptions & {
    onMessage?: (channel: string, data: unknown) => void;
  } = {},
) {
  const { onMessage, ...wsOptions } = options;
  const [subscribedChannels, setSubscribedChannels] = useState<Set<string>>(new Set());
  const onMessageRef = useRef(onMessage);

  onMessageRef.current = onMessage;

  const handleMessage = useCallback((data: unknown) => {
    if (typeof data === 'object' && data !== null) {
      const msg = data as { channel?: string; [key: string]: unknown };
      if (msg.channel && onMessageRef.current) {
        onMessageRef.current(msg.channel, data);
      }
    }
  }, []);

  const ws = useWebSocket(url, {
    ...wsOptions,
    onMessage: handleMessage,
  });

  const subscribe = useCallback(
    (channel: string) => {
      ws.sendMessage({ action: 'subscribe', channel });
      setSubscribedChannels((prev) => new Set(prev).add(channel));
    },
    [ws],
  );

  const unsubscribe = useCallback(
    (channel: string) => {
      ws.sendMessage({ action: 'unsubscribe', channel });
      setSubscribedChannels((prev) => {
        const next = new Set(prev);
        next.delete(channel);
        return next;
      });
    },
    [ws],
  );

  return {
    ...ws,
    subscribedChannels,
    subscribe,
    unsubscribe,
  };
}
