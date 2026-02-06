import { useState, useEffect, useRef, useCallback } from 'react';

import { WS_CONFIG } from '@/lib/config/constants';
import { logger } from '@/lib/logger';

export interface WebSocketOptions {
  /** 重连次数 */
  reconnectAttempts?: number;
  /** 基础重连延迟（毫秒） */
  reconnectDelay?: number;
  /** 心跳间隔（毫秒） */
  heartbeatInterval?: number;
  /** 是否自动连接 */
  autoConnect?: boolean;
  /** 连接成功回调 */
  onConnect?: () => void;
  /** 断开连接回调 */
  onDisconnect?: () => void;
  /** 错误回调 */
  onError?: (error: Event) => void;
  /** 消息回调 */
  onMessage?: (data: unknown) => void;
}

export interface WebSocketState {
  /** 是否已连接 */
  isConnected: boolean;
  /** 是否正在连接 */
  isConnecting: boolean;
  /** 错误信息 */
  error: Error | null;
  /** 最后收到的消息 */
  lastMessage: unknown | null;
}

/**
 * useWebSocket Hook - 统一的 WebSocket 连接管理
 *
 * 提供自动重连、心跳检测、连接状态管理等功能
 *
 * @example
 * const { isConnected, sendMessage, lastMessage } = useWebSocket(
 *   'wss://api.example.com/ws',
 *   {
 *     onMessage: (data) => console.log('Received:', data),
 *     reconnectAttempts: 5,
 *   }
 * );
 */
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

  /**
   * 清理定时器
   */
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

  /**
   * 发送消息
   */
  const sendMessage = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      wsRef.current.send(message);
      return true;
    }
    logger.warn('WebSocket is not connected, message not sent');
    return false;
  }, []);

  /**
   * 手动连接
   */
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

        // 启动心跳
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
          // 非 JSON 消息
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

        // 自动重连（如果不是手动关闭）
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

  /**
   * 断开连接
   */
  const disconnect = useCallback(() => {
    isManualCloseRef.current = true;
    clearTimers();

    if (wsRef.current) {
      // 彻底清理事件监听器，防止内存泄漏
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

  /**
   * 重新连接
   */
  const reconnect = useCallback(() => {
    disconnect();
    reconnectCountRef.current = 0;
    setTimeout(connect, 100);
  }, [disconnect, connect]);

  // 自动连接
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

/**
 * useWebSocketChannel Hook - 带频道订阅的 WebSocket 管理
 *
 * 适用于需要订阅特定频道的场景
 *
 * @example
 * const { isConnected, subscribe, unsubscribe } = useWebSocketChannel(
 *   'wss://api.example.com/ws',
 *   {
 *     onMessage: (channel, data) => console.log(`${channel}:`, data),
 *   }
 * );
 *
 * useEffect(() => {
 *   subscribe('price-feeds');
 *   return () => unsubscribe('price-feeds');
 * }, []);
 */
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
