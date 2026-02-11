import { useState, useEffect, useRef, useCallback } from 'react';

import { WS_CONFIG } from '@/lib/config/constants';
import { logger } from '@/lib/logger';

export interface EventSourceOptions {
  reconnectAttempts?: number;
  reconnectDelay?: number;
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (data: unknown) => void;
}

export interface EventSourceState {
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  lastMessage: unknown | null;
}

/**
 * Server-Sent Events (SSE) 自定义 Hook
 * 用于替代 WebSocket，配合 /api/sse/price 路由使用
 * 
 * @example
 * const { isConnected, lastMessage, connect, disconnect } = useEventSource('/api/sse/price?symbols=ETH/USD,BTC/USD');
 */
export function useEventSource(url: string, options: EventSourceOptions = {}) {
  const {
    reconnectAttempts = WS_CONFIG.MAX_RECONNECT_ATTEMPTS,
    reconnectDelay = WS_CONFIG.BASE_RECONNECT_DELAY_MS,
    autoConnect = true,
    onConnect,
    onDisconnect,
    onError,
    onMessage,
  } = options;

  const [state, setState] = useState<EventSourceState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastMessage: null,
  });

  const esRef = useRef<EventSource | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isManualCloseRef = useRef(false);

  // Use refs for callbacks to avoid dependency changes
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  const onErrorRef = useRef(onError);
  const onMessageRef = useRef(onMessage);

  // Update refs when callbacks change
  onConnectRef.current = onConnect;
  onDisconnectRef.current = onDisconnect;
  onErrorRef.current = onError;
  onMessageRef.current = onMessage;

  const clearTimers = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (isManualCloseRef.current || reconnectCountRef.current >= reconnectAttempts) {
      return;
    }

    const delay = Math.min(
      reconnectDelay * Math.pow(WS_CONFIG.BACKOFF_MULTIPLIER, reconnectCountRef.current),
      WS_CONFIG.MAX_RECONNECT_DELAY_MS,
    );

    logger.info(`EventSource reconnecting in ${delay}ms`, {
      attempt: reconnectCountRef.current + 1,
      maxAttempts: reconnectAttempts,
    });

    reconnectTimerRef.current = setTimeout(() => {
      reconnectCountRef.current += 1;
      connect();
    }, delay);
  }, [reconnectAttempts, reconnectDelay]);

  const connect = useCallback(() => {
    if (esRef.current?.readyState === EventSource.OPEN) {
      logger.debug('EventSource is already connected');
      return;
    }

    setState((prev) => ({ ...prev, isConnecting: true, error: null }));
    isManualCloseRef.current = false;

    try {
      const es = new EventSource(url);
      esRef.current = es;

      es.onopen = () => {
        logger.info('EventSource connected', { url });
        setState((prev) => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null,
        }));
        reconnectCountRef.current = 0;
        onConnectRef.current?.();
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setState((prev) => ({ ...prev, lastMessage: data }));
          onMessageRef.current?.(data);
        } catch {
          setState((prev) => ({ ...prev, lastMessage: event.data }));
          onMessageRef.current?.(event.data);
        }
      };

      es.onerror = (error) => {
        logger.error('EventSource error', { url, error });
        setState((prev) => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error: new Error('EventSource connection error'),
        }));
        onErrorRef.current?.(error);
        
        // EventSource 在错误时会自动关闭，我们需要手动重连
        es.close();
        esRef.current = null;
        scheduleReconnect();
      };
    } catch (error) {
      logger.error('EventSource connection failed', { url, error });
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      }));
      scheduleReconnect();
    }
  }, [url, scheduleReconnect]);

  const disconnect = useCallback(() => {
    isManualCloseRef.current = true;
    clearTimers();

    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
    }));
    onDisconnectRef.current?.();
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
    connect,
    disconnect,
    reconnect,
  };
}
