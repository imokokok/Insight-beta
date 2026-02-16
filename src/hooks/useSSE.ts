import { useState, useEffect, useRef, useCallback } from 'react';

import { logger } from '@/shared/logger';

export interface SSEOptions {
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (data: unknown) => void;
}

export interface SSEState {
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  lastMessage: unknown | null;
}

export function useSSE(url: string, options: SSEOptions = {}) {
  const { autoConnect = true, onConnect, onDisconnect, onError, onMessage } = options;

  const [state, setState] = useState<SSEState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastMessage: null,
  });

  const esRef = useRef<EventSource | null>(null);
  const isManualCloseRef = useRef(false);

  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  const onErrorRef = useRef(onError);
  const onMessageRef = useRef(onMessage);

  onConnectRef.current = onConnect;
  onDisconnectRef.current = onDisconnect;
  onErrorRef.current = onError;
  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    if (esRef.current?.readyState === EventSource.OPEN) {
      logger.debug('SSE is already connected');
      return;
    }

    setState((prev) => ({ ...prev, isConnecting: true, error: null }));
    isManualCloseRef.current = false;

    try {
      const es = new EventSource(url);
      esRef.current = es;

      es.onopen = () => {
        logger.info('SSE connected', { url });
        setState((prev) => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null,
        }));
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
        logger.error('SSE error', { url, error });
        setState((prev) => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error: new Error('SSE connection error'),
        }));
        onErrorRef.current?.(error);
      };
    } catch (error) {
      logger.error('SSE connection failed', { url, error });
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      }));
    }
  }, [url]);

  const disconnect = useCallback(() => {
    isManualCloseRef.current = true;

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
  }, []);

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
  };
}
